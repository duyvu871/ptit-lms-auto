import {DOM} from "../utils/dom.ts";
import fs from "fs";
import {logger} from "../utils/logger.ts";
import {ElementHandle, Page} from "puppeteer";

export interface LMSRESTResponse<ParamsType> {
    jsonrpc: '2.0';
    result?: ParamsType;
    error?: LMSRESTResponseError['error'];
    id: number;
}

export interface LMSRESTResponseError {
    jsonrpc: '2.0';
    error: {
        code: number,
        message: string,
        data: {
            name: string,
            debug: string,
            message: string,
            arguments: any[],
            context: Record<string, any>
        }
    }
    id: number;
}

export interface Slide {
    id: string;
    slug: string;
    title?: string;
    href?: string;
    accessAllowed?: boolean;
    embedCode?: string;
    completed?: number;
    type: 'video' | 'quiz' | 'text';
}

export interface LMSGetQuiz {
    quiz_attempts_count: number;
    quiz_karma_gain: number;
    quiz_karma_max: number;
    quiz_karma_won: number;
    slide_questions: {
        id: number;
        is_question_image: boolean;
        question: string;
        question_image: string;
        answer_ids: {
            answer_client_is_correct: null | boolean | undefined;
            comment: boolean;
            id: number;
            is_correct: boolean | null;
            text_value: string;
        }[];
    }[]
}

export interface LMSQuizAnswer {

}

export interface LMSSetCompleteLearnVideo {
    channel_completion: number;
}

export type LMSSearchRead = {
    id: number;
    ke_tiep_cua: [number, string]
}[]

export interface LMSSubmitQuiz {
    channel_completion: number;
    completed: boolean;
    quizAttemptsCount: number;
    quizKarmaGain: number;
    quizKarmaWon: number
    rankProgress: {
        description: string;
        last_rank: boolean|number|string|null;
        level_up: boolean|number|string|null;
        previous_rank: {
            lower_bound: number,
            upper_bound: number,
            karma: number,
            motivational: string,
            progress: number,
        }
        new_rank: {
            lower_bound: number,
            upper_bound: number,
            karma: number,
            motivational: string,
            progress: number,
        }
    }
}

export class CourseService {
    public static headers = {
        "accept": "application/json, text/javascript, */*; q=0.01",
        "accept-language": "vi,en-US;q=0.9,en;q=0.8",
        "content-type": "application/json",
        "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Microsoft Edge\";v=\"128\"",
        "sec-ch-ua-mobile": "?0",
        "sec-ch-ua-platform": "\"Windows\"",
        "sec-fetch-dest": "empty",
        "sec-fetch-mode": "cors",
        "sec-fetch-site": "same-origin",
        "x-requested-with": "XMLHttpRequest",
        "Referer": "https://lms.ptit.edu.vn/slides",
        "Referrer-Policy": "strict-origin-when-cross-origin"
    }
    public static customHeaders = {
        "cache-control": "no-cache",
        "pragma": "no-cache",
        "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Brave\";v=\"128\"",
        "sec-fetch-mode": "navigate",
        "sec-gpc": "1",
        "upgrade-insecure-requests": "1",
    }
    public document!: Document;
    private page!: Page;
    private courseName!: string;

    constructor(curseName: string|null|undefined, page: Page) {
        this.page = page;
        this.courseName = curseName || 'defalut';
        logger(`CourseService: ${this.courseName} initialized`);
    }

    public async $(selector: string): Promise<ElementHandle | null> {
        return this.page.$(selector);
    };

    public async $$(selector: string): Promise<ElementHandle[]> {
        return this.page.$$(selector);
    };

    public async jsonRPCWrapper(url: string, method: string, headers: Record<string, any>, params: Record<string, any>): Promise<ReturnType<Response['json']> | null> {
        try {
            const request = await this.request(url, {
                method: 'POST',
                headers,
                body: JSON.stringify({
                    jsonrpc: '2.0',
                    method,
                    params,
                    id: Math.floor(Math.random() * 1000 * 1000 * 1000)
                })
            });
            if (!request.ok && request.status !== 200) {
                throw new Error(`HTTP error! status: ${request.status}`);
            }
            return await request.json;
        } catch (error) {
            console.error(error);
            throw error;
        }
    }

    public async request(url: string, options: RequestInit) {
        return await this.page.evaluate((url, options) => {
            return Promise.resolve(fetch(url, options).then(async res => ({
                ok: res.ok,
                status: res.status,
                json: await res.json(),
                headers: res.headers,
                url: res.url
            })));
        }, url, {...options, headers: {...options.headers, ...CourseService.headers}});
    }

    public async _storeSlideAnswers(answer: LMSGetQuiz['slide_questions'], slide: Slide) {
        const path = `./store/quizs/${this.courseName}/${slide.slug}.json`;
        const data = JSON.stringify(answer);
        await fs.promises.mkdir(`./store/quizs/${this.courseName}`, {recursive: true});
        await fs.promises.writeFile(path, data, 'utf-8');
    }

    public async _getSlideAnswersStore(quizIds: number[]): Promise<{id: number, question: string , answer_id: number}[]|null> {
        const path = `./store/quizs/${this.courseName}/all.json`;
        const checkExist = await fs.promises.access(path).then(() => true).catch(() => false);
        if (!checkExist) {
            return null;
        }
        const fileContent = await fs.promises.readFile(path, 'utf-8');
        const jsonParsed = JSON.parse(fileContent) as {id: number, question: string , answer_id: number}[][];
        const items = [];
        console.log(jsonParsed.length);
        for (const i of jsonParsed) {
           for (const j of i) {
               if (quizIds.includes(j.id)) {
                   items.push(j);
               }
           }
        }
        return items.length > 0 ? items : null;
    }

    public async _getSlideAnswers(slide: Slide) {
        const response = {
            answers: [],
            plainTextAnswers: ''
        };
        if (!slide) {
            console.log('Slide not found or provided');
            return response
        }
        if (slide.type !== 'quiz' && !!slide.type) {
            console.log('Slide is not a quiz');
            return response;
        }
        const quizContent = await this._fetchQuizContent(slide);
        if (!quizContent) {
            console.log('No quiz content found');
            return response;
        }
        if (!quizContent.result) {
            console.log('No quiz content found');
            return response;
        }
        const answers = quizContent.result.slide_questions.map(question => {
            return {
                id: question.id,
                question: question.question,
                answer_ids: question.answer_ids.map(answer => {
                    return {
                        id: answer.id,
                        text_value: answer.text_value
                    }
                })
            }
        });
        const plainTextAnswers = answers.map((item, index) =>
            `${index+1}, ${item.question}: \n${item.answer_ids.map((answer, index) => `${String.fromCharCode(65 + index)}. ${answer.text_value}`).join('\n')}`).join('\n');
        console.log(plainTextAnswers);

        return {
            ...response,
            answers,
            plainTextAnswers
        }
    }

    public async _checkSubmitQuiz(slide: Slide) {
        const quizContent = await this._fetchQuizContent(slide);
        if (!quizContent) return false;
        if (quizContent?.result?.error) return false;
        return !quizContent.result?.slide_questions.every(question => {
            return question.answer_ids.every(answer => answer.is_correct === null);
        });
    }

    public async _getSlides(id?: string) {
        const $slides = await this.$$('.o_wslides_fs_sidebar_list_item');
        const slideList = [];
        for (const $slide of $slides) {
            const slide_id = await DOM.getAttributeFromElement($slide, 'data-id') || '';
            const slide_type = await DOM.getAttributeFromElement($slide, 'data-type') as 'video' | 'quiz' | 'text';
            const slide_slug = await DOM.getAttributeFromElement($slide, 'data-slug') || '';
            const slide_title = await DOM.getAttributeFromElement($slide, 'data-name') || '';
            const slide_href = `https://lms.ptit.edu.vn/slides/slide/${slide_slug}?fullscreen=1`;
            const slide_accessAllowed = (await DOM.getAttributeFromElement($slide, 'data-can-access')) === 'True';
            const slide_embedCode = await DOM.getAttributeFromElement($slide, 'data-embed-code') || '';
            const slide_completed = parseInt(await DOM.getAttributeFromElement($slide, 'data-completed') || '0');
            const slide: Slide = {
                id: slide_id,
                type: slide_type,
                slug: slide_slug,
                title: slide_title,
                href: slide_href,
                accessAllowed: slide_accessAllowed,
                embedCode: slide_embedCode,
                completed: slide_completed
            };
            if (slide.id === id && id) return [slide];
            slideList.push(slide);
        }
        return slideList;
    }

    public async _submitQuiz(slide: Slide, answers: number[]): Promise<LMSRESTResponse<LMSSubmitQuiz & {error?: any}>> {
        const customHeaders = {
            "accept": "application/json, text/javascript, */*; q=0.01",
            "accept-language": "vi,en-US;q=0.9,en;q=0.8",
            "content-type": "application/json",
            "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Microsoft Edge\";v=\"128\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "x-requested-with": "XMLHttpRequest"
        };
        return await this.jsonRPCWrapper('https://lms.ptit.edu.vn/slides/slide/quiz/submit', 'call', customHeaders, {
            slide_id: slide.id,
            answer_ids: answers
        });
    }

    public async _publishSlide(slide: Slide): Promise<LMSRESTResponse<any>> {
        const customHeaders = {
            "cache-control": "no-cache",
            "pragma": "no-cache",
            "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Brave\";v=\"128\"",
            "sec-fetch-mode": "cors",
            "sec-gpc": "1",
            "upgrade-insecure-requests": "1",
            "Referer": slide.href || ''
        };
        return await this.jsonRPCWrapper('https://lms.ptit.edu.vn/website/publish/slide', 'call', customHeaders, {
            id: parseInt(slide.id)
        })
    }

    public async _fetchQuizContent(slide: Slide): Promise<LMSRESTResponse<LMSGetQuiz & {error?:any}>|null> {
        const customHeaders = {
            "cache-control": "no-cache",
            "pragma": "no-cache",
            "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Brave\";v=\"128\"",
            "sec-fetch-mode": "cors",
            "sec-gpc": "1",
            "upgrade-insecure-requests": "1",
            "Referer": slide.href || ''
        };
        const request = await this.jsonRPCWrapper('https://lms.ptit.edu.vn/slides/slide/quiz/get', 'call', customHeaders, {
            slide_id: slide.id
        }) as LMSRESTResponse<LMSGetQuiz>;
        if (!request.result) return null;
        return request;
    }

    public async _setCompleteLearnVideo(slide: Slide): Promise<LMSRESTResponse<LMSSetCompleteLearnVideo>> {
        const customHeaders = {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "accept-language": "vi;q=0.9",
            "cache-control": "no-cache",
            "content-type": "application/json",
            "pragma": "no-cache",
            "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Microsoft Edge\";v=\"128\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "empty",
            "sec-fetch-mode": "cors",
            "sec-fetch-site": "same-origin",
            "upgrade-insecure-requests": "1",
            "x-requested-with": "XMLHttpRequest"
        };
        return await this.jsonRPCWrapper('https://lms.ptit.edu.vn/slides/slide/set_completed', 'call', customHeaders, {
            slide_id: slide.id
        });
    }

    public async _checkAbleToAccessSlide(slide: Slide): Promise<LMSRESTResponse<boolean>> {
        const customHeaders = {
            "cache-control": "no-cache",
            "pragma": "no-cache",
            "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Brave\";v=\"128\"",
            "sec-fetch-mode": "cors",
            "sec-gpc": "1",
            "upgrade-insecure-requests": "1",
            "Referer": slide.href || ''
        };
        return await this.jsonRPCWrapper('https://lms.ptit.edu.vn/web/dataset/call_kw/slide.slide/check_duoc_hoc_slide', 'call', customHeaders, {
            args: [slide.id],
            kwargs: {context: {website_id: 1, lang: "vi_VN"}},
            method: "check_duoc_hoc_slide",
            model: "slide.slide"
        });
    }

    public async _searchRead(slide: Slide): Promise<LMSRESTResponse<LMSSearchRead>> {
        const customHeaders = {
            "cache-control": "no-cache",
            "pragma": "no-cache",
            "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Brave\";v=\"128\"",
            "sec-fetch-mode": "cors",
            "sec-gpc": "1",
            "upgrade-insecure-requests": "1",
            "Referer": slide.href || ''
        };
        return await this.jsonRPCWrapper('https://lms.ptit.edu.vn/web/dataset/call_kw/slide.slide/search_read', 'call', customHeaders, {
            args: [],
            model: "slide.slide",
            method: "search_read",
            kwargs: {
                domain: [["ke_tiep_cua", "=", slide.id]],
                fields: ["id", "ke_tiep_cua"],
                context: {
                    website_id: 1,
                    lang: "vi_VN"
                }
            }
        });
    }

    public async _logTime(slide: Slide, time: number): Promise<LMSRESTResponse<any>> {
        const customHeaders = {
            "cache-control": "no-cache",
            "pragma": "no-cache",
            "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Brave\";v=\"128\"",
            "sec-fetch-mode": "navigate",
            "sec-gpc": "1",
            "upgrade-insecure-requests": "1",
            "referer": slide.href || ''
        };
        const request = await this.jsonRPCWrapper('https://lms.ptit.edu.vn/slides/slide/log_time', 'call', customHeaders, {
            slide_id: slide.id,
        });
        return await request.json();
    }
}