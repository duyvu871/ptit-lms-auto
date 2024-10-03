import puppeteer from "puppeteer-extra";
import {Browser as BrowserType, Page, ContinueRequestOverrides, ElementHandle} from "puppeteer";
import StealthPlugin from "puppeteer-extra-plugin-stealth";
import { DOM } from "./utils/dom.ts";
import {logger} from "./utils/logger.ts";
import * as clc from "./utils/cli-color.ts";

export type BrowserOptions = {

}

export type RequestOptions = {
    method: 'GET' | 'POST' | 'PUT' | 'DELETE';
    body: any;
    headers: Record<string, string>;
}

export class Browser {
    public initialized = false;
    public browser!: BrowserType;
    public page!: Page;
    public document!: ElementHandle<Document>;
    public DOM!: DOM;
    public instance!: Browser;
    public hasDisplayed = false;
    public headless = process.env.NODE_ENV !== 'development';
    public puppeteerPath = undefined;

    public isInitialized(headless = "new") {
        return this.initialized;
    }

    public async uninitialize() {
        // Handle Chromium tabs cleanup
        try {
            await this.browser.close();
            logger("browser closed");
        } catch {
            logger("browser already closed");
        }
    }

    public async initialize() {
        if (this.isInitialized()) return this.initialized;
        // uninitialized when headless is set to "new"
        logger(clc.success("initialize browser"));
        // Initialize puppeteer with stealth plugin to avoid bot detection
        puppeteer.use(StealthPlugin());
        const browser = await puppeteer.launch({
            headless: false,//(this.headless),
            args: [
                '--disable-web-security',
                '--fast-start',
                '--disable-extensions',
                '--no-sandbox',
                '--disable-setuid-sandbox',
                '--no-gpu',
                '--disable-background-timer-throttling',
                '--disable-renderer-backgrounding',
                '--override-plugin-power-saver-for-testing=never',
                '--disable-extensions-http-throttling',
                '--user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36'
            ],
            executablePath: this.puppeteerPath || puppeteer.executablePath(),
            channel: 'chrome',
        });
        // Set browser instance
        this.browser = browser;
        let pages: Page[] = await browser.pages();
        let page = pages[0];

        this.document = await page.evaluateHandle(() => document);
        this.page = page;

        await page.setRequestInterception(false);
        if (process.env.NODE_ENV === 'development') {
            await page.setViewport({
                width: 0,
                height: 0,
                deviceScaleFactor: 1,
                hasTouch: true,
                isLandscape: false,
                isMobile: false,
            });
        }
        await page.setJavaScriptEnabled(true);
        page.setDefaultNavigationTimeout(0);

        const userAgent = 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/115.0.0.0 Safari/537.36';
        await page.setUserAgent(userAgent);
        this.initialized = true;
        logger(clc.success("browser done setting up"));
        return this.initialized;
    }

    public async waitingPageLoad(page: Page) {
        return new Promise(async (resolve) => {
            try {
                let interval: NodeJS.Timeout;
                let pass = true;

                const minute = 1000 * 60; // Update every minute

                // Keep waiting until false
                async function check() {
                    if (pass) {
                        pass = false;

                        const waitingRoomTimeLeft = await page.evaluate(async() => {
                            try {
                                const contentContainer = document.querySelector(".content-container");
                                if (!contentContainer) return;
                                const sections = contentContainer.querySelectorAll("section");
                                const h2Element = sections[0].querySelector("h2");
                                const h2Text = h2Element?.innerText || "";
                                const regex = /\d+/g;
                                const matches = h2Text.match(regex);

                                if (matches) return matches[0];
                            } catch (error) {return}
                        }, minute);

                        const waiting = (waitingRoomTimeLeft != null);
                        if (waiting) {
                            logger(`Currently in cloudflare's waiting room. Time left: ${clc.warn(waitingRoomTimeLeft)}`);
                        } else {
                            clearInterval(interval);
                            resolve('done');
                        }
                        pass = true;
                    };
                }

                interval = setInterval(check, minute);
                await check();
            } catch (error) {
                logger(`There was a fatal error while checking for cloudflare's waiting room.`);
                console.log(error);
            }
        });
    }

    public async request(url: string, options: RequestOptions) {
        const page = this.page;

        const method = options.method;

        const body = (method == 'GET' ? {} : options.body);
        const headers = options.headers;

        let response;
        // Intercept request to set custom headers
        await page.setRequestInterception(true);
        let initialRequest = true;

        page.once('request', request => {
            const data = {
                'method': method,
                'postData': body,
                'headers': headers
            };

            if (request.isNavigationRequest() && !initialRequest) {
                return request.abort();
            }

            try {
                initialRequest = false;
                request.continue(data);
            } catch (error) {
                logger("Non fatal error: " + error);
            }
        });
        response = await page.goto(url, { waitUntil: 'networkidle2' });

        return response;
    }

    public async goto(url: string, extraHeader?: Record<string, string>) {
        const page = this.page;
        if (!page) {
            logger("page not found");
            return;
        }
        logger(`go to ${url}`);
        await page.setExtraHTTPHeaders(extraHeader ? extraHeader : {
            "accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8",
            "accept-language": "vi;q=0.9",
            "cache-control": "no-cache",
            "pragma": "no-cache",
            "sec-ch-ua": "\"Chromium\";v=\"128\", \"Not;A=Brand\";v=\"24\", \"Brave\";v=\"128\"",
            "sec-ch-ua-mobile": "?0",
            "sec-ch-ua-platform": "\"Windows\"",
            "sec-fetch-dest": "document",
            "sec-fetch-mode": "navigate",
            "sec-fetch-site": "same-origin",
            "sec-fetch-user": "?1",
            "sec-gpc": "1",
            "upgrade-insecure-requests": "1",
        });
        await page.goto(url)
        this.document = await page.evaluateHandle(() => document);
        this.DOM = new DOM(this.page);
    }
}