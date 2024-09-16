import * as crypto from 'crypto';

export function getRandomIntCrypto(min: number, max: number): number {
    // Ensure min and max are integers
    min = Math.ceil(min);
    max = Math.floor(max);

    // Calculate the range
    const range = max - min + 1;

    // Determine the number of bytes needed to represent the range
    const byteLength = Math.ceil(Math.log2(range) / 8);

    // Generate random bytes until a value within the range is found
    let randomNumber: number;
    do {
        const randomBytes = crypto.randomBytes(byteLength);
        randomNumber = parseInt(randomBytes.toString('hex'), 16); // Convert to integer
    } while (randomNumber >= range); // Retry if outside the range

    return randomNumber + min;
}