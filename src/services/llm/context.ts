export function contextWrapped(require: string, input: string, output: string) {
    return `
    I have a piece of data to process: ${input} with a request of ${require}.
    Here is the output format that I wrote to process it: ${output}.
    Please process it and return the result in the ${output} format to me!
    IMPORTANT: return the result in the correct ${output} format!, just that and no other information.
    No comments, no markdown code just return the text of result in the ${output} format.
    `;
}