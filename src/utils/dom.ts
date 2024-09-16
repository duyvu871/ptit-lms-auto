import type {
    Page,
    ElementHandle,
    WaitForSelectorOptions,
} from 'puppeteer';

interface ElementData {
    textContent?: string;
    className?: string;
    id?: string;
    style?: CSSStyleDeclaration;
}

export class DOM {
    private page: Page;

    constructor(page: Page) {
        this.page = page;
    }

    static async getTextContentFromElement(
        element: ElementHandle
    ): Promise<string | null> {
        return element.evaluate((el) => el.textContent?.trim() || null);
    }

    static async getAttributeFromElement(
        element: ElementHandle,
        attribute: string
    ): Promise<string | null> {
        return element.evaluate((el, attr) => el.getAttribute(attr) || null, attribute);
    }

    async $(selector: string): Promise<ElementHandle | null> {
        return this.page.$(selector);
    }

    async $$(selector: string): Promise<ElementHandle[]> {
        return this.page.$$(selector);
    }

    async getText(selector: string): Promise<string | null> {
        return this.page.$eval(selector, (el) => el.textContent?.trim() || null);
    }

    async getAttribute(
        selector: string,
        attribute: string
    ): Promise<string | null> {
        return this.page.$eval(
            selector,
            (el, attr) => el.getAttribute(attr) || null,
            attribute
        );
    }

    async getStyle(
        selector: string,
        property: string
    ): Promise<string | null> {
        return this.page.$eval(
            selector,
            (el, prop) => getComputedStyle(el)[prop as unknown as number] || null,
            property
        );
    }

    async getElementData(selector: string): Promise<ElementData | null> {
        return this.page.$eval(
            selector,
            (el) => {
                if (!el) return null;
                return {
                    textContent: el.textContent?.trim(),
                    className: el.className,
                    id: el.id,
                    style: window.getComputedStyle(el),
                };
            },
            selector
        );
    }

    async click(selector: string): Promise<void> {
        return this.page.click(selector);
    }

    async type(selector: string, text: string): Promise<void> {
        return this.page.type(selector, text);
    }

    async value(selector: string, value: string) {
        return this.page.$eval(
            selector,
            // @ts-ignore
            (el, val) => (el.value = val),
            value
        );
    }

    async isChecked(selector: string): Promise<boolean> {
        // @ts-ignore
        return this.page.$eval(selector, (el) => !!el.checked);
    }

    async isVisible(selector: string): Promise<boolean> {
        return this.page.$eval(selector, (el) => {
            if (!el || !el.getBoundingClientRect) return false;

            const rect = el.getBoundingClientRect();
            const viewHeight = Math.max(document.documentElement.clientHeight, window.innerHeight || 0);

            // Check if the element is fully or partially visible in the viewport
            return !(rect.bottom < 0 || rect.top > viewHeight);
        });
    }

    async waitForSelector(
        selector: string,
        options?: WaitForSelectorOptions
    ) {
        return this.page.waitForSelector(selector, options);
    }
}
