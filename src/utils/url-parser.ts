// utils.ts

/**
 * Checks if a URL is valid.
 * @param url The URL to check.
 * @returns `true` if the URL is valid, `false` otherwise.
 */
export function isValidUrl(url: string): boolean {
    try {
        new URL(url);
        return true;
    } catch (error) {
        return false;
    }
}

/**
 * Gets the domain name from a URL.
 * @param url The URL to get the domain name from.
 * @returns The domain name of the URL, or `null` if the URL is invalid.
 */
export function getDomainName(url: string): string | null {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.hostname;
    } catch (error) {
        return null;
    }
}

/**
 * Adds query parameters to a URL.
 * @param url The base URL.
 * @param params An object containing the query parameters.
 * @returns The new URL with the added query parameters.
 */
export function addQueryParams(
    url: string,
    params: { [key: string]: string | number | boolean }
): string {
    try {
        const parsedUrl = new URL(url);
        const searchParams = new URLSearchParams(parsedUrl.search);

        for (const [key, value] of Object.entries(params)) {
            searchParams.set(key, value.toString());
        }

        parsedUrl.search = searchParams.toString();
        return parsedUrl.toString();
    } catch (error) {
        return url;
    }
}

/**
 * Gets the path from a URL.
 * @param url The URL to get the path from.
 * @returns The path of the URL, or `null` if the URL is invalid.
 */
export function getPath(url: string): string | null {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.pathname;
    } catch (error) {
        return null;
    }
}

/**
 * Gets the query parameters from a URL.
 * @param url The URL to get the query parameters from.
 * @returns An object containing the query parameters,
 * or `null` if the URL is invalid.
 */
export function getQueryParams(url: string): { [key: string]: string } | null {
    try {
        const parsedUrl = new URL(url);
        const params: { [key: string]: string } = {};
        parsedUrl.searchParams.forEach((value, key) => {
            params[key] = value;
        });
        return params;
    } catch (error) {
        return null;
    }
}

/**
 * Removes query parameters from a URL.
 * @param url The URL to remove query parameters from.
 * @param params An array of parameter names to remove.
 * @returns The new URL with the specified query parameters removed.
 */
export function removeQueryParams(url: string, params: string[]): string {
    try {
        const parsedUrl = new URL(url);
        const searchParams = new URLSearchParams(parsedUrl.search);

        params.forEach((param) => {
            searchParams.delete(param);
        });

        parsedUrl.search = searchParams.toString();
        return parsedUrl.toString();
    } catch (error) {
        return url;
    }
}

/**
 * Checks if a URL has a specific query parameter.
 * @param url The URL to check.
 * @param param The name of the query parameter.
 * @returns `true` if the URL has the parameter, `false` otherwise.
 */
export function hasQueryParam(url: string, param: string): boolean {
    try {
        const parsedUrl = new URL(url);
        return parsedUrl.searchParams.has(param);
    } catch (error) {
        return false;
    }
}