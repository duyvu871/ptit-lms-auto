import {Browser} from "./browser";
import * as dotenv from "dotenv";
import {error as errorColor, notice as noticeColor, success as successColor} from "./utils/cli-color.ts";
import {logger} from "./utils/logger.ts";
import fs from "fs";
import {LMS_DOMAIN, LMS_OAUTH, MAX_RETRY, RETRY_WAIT} from "./global/constant.ts";
import {getQueryParams} from "./utils/url-parser.ts";
import * as path from "node:path";
import {CourseService, LMSGetQuiz, Slide} from "./services/course";
import {GeminiChatService} from "./services/llm/gemini.ts";
import {contextWrapped} from "./services/llm/context.ts";
import {getRandomIntCrypto} from "./utils/random.ts";
import {Cookie} from "puppeteer";
import {delay} from "./utils/process.ts";

const ENV = dotenv.config({
    path: process.env.NODE_ENV === 'development' ? '.env.local' : '.env'
});

const browser = new Browser();
const llmService = new GeminiChatService(process.env.GEMINI_API_KEY, process.env.GEMINI_API_MODEL);

async function retryWrapper<ResponseType>(
    fn: () => Promise<ResponseType>,
    name: string,
    retryOpt: {
        retryIndex: number;
        MAX_RETRY: number;
        RETRY_WAIT: number;
        condition?: (result: ResponseType) => boolean;
        failAction?: () => void;
        fallbackAction?: () => void;
    }
): Promise<ResponseType | null> {
    const { retryIndex, MAX_RETRY, RETRY_WAIT, condition, fallbackAction, failAction } = retryOpt;
    try {
        const result = await fn();
        if (condition && !condition(result)) {
            throw new Error('Condition not met');
        }
        return result;
    } catch (error) {
        if (retryIndex < MAX_RETRY) {
            failAction && failAction();
            logger(`[${name}] Attempt ${retryIndex + 1} failed. Retrying in ${noticeColor(RETRY_WAIT / 1000)} seconds...`);
            await new Promise((resolve) => setTimeout(resolve, RETRY_WAIT));
            return retryWrapper(fn, name, { ...retryOpt, retryIndex: retryIndex + 1 });
        }
        logger(`[${name}] Failed after ${MAX_RETRY} attempts:`, error);
        fallbackAction && fallbackAction();
        return null;
    }
}

async function resolvePromiseFromClient<T>(promise: Promise<T>, timeout?: number, message?: string): Promise<T> {
    return await browser.page.evaluate(
        async (promise, timeout, message) => {
            console.log(window.location.href);
            return Promise.race([
                new Promise((resolve, reject) => {
                    try { resolve(promise); } catch (error) { reject(error); }
                }),
                new Promise((_, reject) => setTimeout(() => reject(new Error(message || 'Resolve promise timeout')), timeout || 10_000))
            ])
                .then(result => { console.log('Function completed successfully:', result); return result as T; })
                .catch(error => {
                    console.error(error.message);
                    throw error;
                })
        },
        promise,
        timeout,
        message
    ) as T;
}

async function cleanup() {
    await fs.promises.writeFile('./store/request/session.json', '');
    await fs.promises.writeFile('./store/request/request.txt', '');
}

async function fillLoginForm() {
    await browser.page.type('input[name=username]', process.env.SLINK_ID);
    await browser.page.type('input[name=password]', process.env.SLINK_PASSWORD);
    logger(noticeColor('Wait for login'));
    await Promise.all([
        browser.page.click('button[type=submit]'),
        browser.page.waitForNavigation({waitUntil: 'networkidle2'})
    ]);
}

async function handleSlide(slide: Slide, courseService: CourseService) {
    if (slide.type === 'video') {
        if (slide.completed === 1) {
            logger(successColor(`Video [${slide.title}] already completed`));
            return true;
        }
        const setCompleted =  await courseService._setCompleteLearnVideo(slide);
        if (setCompleted.result?.channel_completion) {
            logger(successColor(`video ${slide.title} completed`));
            return true;
        }
        logger(errorColor('Failed to complete video'));
        logger(setCompleted);
        throw new Error('Failed to complete video');
    } else if (slide.type === 'quiz') {
        const retryOpt = { retryIndex: 0, MAX_RETRY: 5, RETRY_WAIT: 5000 };

        const getQuizAnswers = (questions: LMSGetQuiz['slide_questions']) => {
            return questions.map(q => {
                const answer = q.answer_ids.find(id => id.is_correct);
                return answer ? answer.id : q.answer_ids[getRandomIntCrypto(0, 3)].id;
            })
        }
        if (slide.completed === 1) {
            logger(successColor(`Quiz [${slide.title}] already completed`));
            return true;
        }
        const isSubmitted =  await retryWrapper(() => courseService._checkSubmitQuiz(slide), 'isSubmitted', retryOpt)
        if (isSubmitted) {
            logger(successColor(`Quiz [${slide.title}] already completed`));
            return true;
        }
        const slideAnswers = await retryWrapper(() => courseService._fetchQuizContent(slide), 'slideAnswers', retryOpt);
        if (!slideAnswers?.result) {
            logger(errorColor('Failed to fetch quiz from LMS'));
            return null;
        }
        const answerStore = await courseService._getSlideAnswersStore(slideAnswers.result.slide_questions.map(q => q.id));
        // logger('questions:', slideAnswers.result.slide_questions.map(q => q.id));
        if (answerStore) {
            const submitQuiz = await retryWrapper(() => courseService._submitQuiz(slide, answerStore.map(a => a.id)), 'submitQuiz', retryOpt);
            if (submitQuiz?.result) {
                logger(successColor(`[store] Quiz [${slide.title}] submitted`));
                return true;
            }
            logger(errorColor('Failed to submit quiz from store'));
        }
        const answerRandom = getQuizAnswers(slideAnswers.result.slide_questions);
        const answerFromLLM = (await llmService.sendMessage(contextWrapped(
            'answer all questions in json i just provided',
            JSON.stringify(slideAnswers.result.slide_questions),
            '{id: number, question: string, answer_id: number}[]'
        ))).replace(/(```json)|(```)/g, '');
        const parsedAnswer = JSON.parse(answerFromLLM);
        if (!parsedAnswer) {
            logger(errorColor('Failed to get answer from LLM'));
            return null;
        }
        const answersId = parsedAnswer.map((a: { answer_id: number }) => a.answer_id) as number[];
        // console.log(parsedAnswer.map((a: { answer_id: number, id: number }) => [a.id, a.answer_id]));
        const submitQuiz = await retryWrapper(() => courseService._submitQuiz(slide, answersId), 'submitQuiz', retryOpt);
        if (!submitQuiz?.result) {
            logger(errorColor('Failed to submit quiz from LLM'));
            return null;
        }
        if (submitQuiz.result.error === 'slide_quiz_incomplete') {
            logger(errorColor(`Quiz [${slide.title}] incomplete or not open to learn`));
            return true;
        }
        if (submitQuiz.result.error === 'slide_quiz_done') {
            logger(successColor(`Quiz [${slide.title}] already completed`));
            return true;
        }
        logger(successColor(`Quiz [${slide.title}] submitted`));
        return true;
    }
}

async function gotoSlidePage() {
    const devtoolProtocol = await browser.page.target().createCDPSession();
    const cookies = (await devtoolProtocol.send('Network.getAllCookies')).cookies;
    const slides = await browser.page.$$('.o_wslides_js_slides_list_slide_link');
    const targetSlide = slides[0];
    const targetSlideHref = await targetSlide.evaluate((el) => el.getAttribute('href'));
    if (!targetSlideHref) {
        logger(errorColor('Slide not found'));
        throw new Error('Slide not found');
    }
    const firstSlide = path.join(LMS_DOMAIN, targetSlideHref);
    const url = new URL(firstSlide);
    if (!url.searchParams.has('fullscreen')) {
        url.searchParams.append('fullscreen', "1");
    }
    await browser.page.setBypassCSP(true);
    await browser.goto(url.toString());
    await browser.page.setCookie(...cookies as Cookie[]);
    await browser.page.waitForNavigation({waitUntil: 'networkidle2'});

    const courseSlug = await browser.page.$eval('.o_wslides_fs_sidebar_header > a', el => el.getAttribute('href'));
    const courseService = new CourseService(courseSlug, browser.page);
    let slidesData = await courseService._getSlides();

    for (let slide of slidesData) {
        // const published = await courseService._publishSlide(slide);
        await retryWrapper(() => handleSlide(slide, courseService), 'handleSlide', {retryIndex: 0, MAX_RETRY, RETRY_WAIT,});
        // const nextLearned = await courseService._checkAbleToAccessSlide(slide);
        // const searchResult = await courseService._searchRead(slide);
        await delay(process.env.DELAY_BETWEEN_SLIDE || 5000);
    }
}

async function handleLoginError() {
    let directUrl = browser.page.url();
    let url = new URL(directUrl);
    if (url.pathname === '/auth/realms/master/login-actions/authenticate') {
        const errors = await browser.page.$$eval('.mt-2.text-red-600.text-sm', el => el.map(e => e.textContent));
        const error = errors.join('\n').trim();
        logger(`${errorColor("Login failed with reason")}:`, error);
        throw new Error('Login failed');
    }
    return;
}

async function loginAction() {
    logger(noticeColor('Direct to login page'));
    await browser.goto("https://slinkid.ptit.edu.vn/auth/realms/master/protocol/openid-connect/auth?response_type=token&client_id=lms_ptit&redirect_uri=http%3A%2F%2Flms.ptit.edu.vn%2Fauth_oauth%2Fsignin&scope=profile&state=%7B%22d%22%3A+%22lms_ptit%22%2C+%22p%22%3A+4%2C+%22r%22%3A+%22http%253A%252F%252Flms.ptit.edu.vn%252Fweb%22%7D");
    browser.page.on('request', async (request) => {
        const url = new URL(request.url());
        const urlWithoutQuery = url.origin + url.pathname;
        if (urlWithoutQuery === LMS_OAUTH) {
            const queryParams = getQueryParams(url.href);
            await fs.promises.writeFile('./store/request/session.json', JSON.stringify(queryParams));
        }
    });

    await fillLoginForm();
    await handleLoginError();

    return;
}

async function bootstrap() {
    logger(`Target course: ${process.env.COURSE_URL}`);
    const initialized = await browser.initialize();
    if (!initialized) {
        logger('Failed to initialize browser');
        return;
    }
    await retryWrapper(loginAction, 'loginAction', {
        retryIndex: 0,
        MAX_RETRY,
        RETRY_WAIT,
    });

    const cookies = await browser.page.cookies();
    // fs.writeFile('./store/cookie/cookies.json', JSON.stringify(cookies), (error) => {
    //     if (error) logger(errorColor('Failed to write cookies'));
    //     else logger(successColor('Cookies saved'));
    // });
    // console.log(cookies);
    // const session_id = cookies.find(c => c.name === 'session_id');
    // if (!session_id) {
    //     logger(errorColor('Session id not found'));
    //     throw new Error('Session id not found');
    // }
    logger(successColor('Login success'));
    // await browser.goto(path.join(LMS_DOMAIN, '/slides'));
    // await browser.page.setCookie(...cookies);
    // await Promise.all([
    //     await browser.page.waitForNavigation({waitUntil: 'networkidle2'})
        await (async () => { logger(successColor('Direct to course page')); })
        await browser.goto(process.env.COURSE_URL)
        await browser.page.setCookie(...cookies)
        // await browser.page.waitForNavigation({waitUntil: 'networkidle2'})
    // ]);
    await gotoSlidePage();
    logger(successColor.bold('All slides completed'));
}

process.on('exit', () => {
    browser.uninitialize();
});

retryWrapper(bootstrap, 'bootstrap', {
    retryIndex: 0,
    MAX_RETRY: 5,
    RETRY_WAIT: 3000,
    // failAction: cleanup,
    fallbackAction: () => {
        logger(errorColor('Failed to bootstrap'));
        process.exit(1);
    }
});