export function runWithTimeout<T>(fn: () => T, timeoutMs: number, message = 'Function timed out'): Promise<T> {
    let timeoutId: NodeJS.Timeout;

    const functionPromise: Promise<T> = new Promise((resolve, reject) => {
        try {
            const result = fn();
            resolve(result);
        } catch (error) {
            reject(error);
        }
    });

    const timeoutPromise: Promise<never> = new Promise((_, reject) => {
        timeoutId = setTimeout(() => {
            reject(new Error(message));
        }, timeoutMs);
    });

    return Promise.race([functionPromise, timeoutPromise])
        .then((result) => {
            clearTimeout(timeoutId);
            console.log('Function completed successfully:', result);
            return result;
        })
        .catch((error) => {
            console.error(error.message);
            throw error;
        });
}

export async function delay(ms: number) {
    return new Promise(resolve => setTimeout(resolve, ms));
}
