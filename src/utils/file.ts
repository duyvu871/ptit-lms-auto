import fs from "fs";

export function fileExists(filePath: string): Promise<boolean> {
    return new Promise((resolve) => {
        fs.access(filePath, fs.constants.F_OK, (error :any) => {
            resolve(!error as boolean);
        });
    });
}

export async function appendToJSONFile(
    filePath: string,
    data: any
): Promise<void> {
    const isExists = await fileExists(filePath);
    if (!isExists) {
        await fs.promises.writeFile(filePath, JSON.stringify(data, null, 2));
        return;
    }
    const file = await fs.promises.readFile(filePath, 'utf-8');
    const currentData = JSON.parse(file);
    await fs.promises.writeFile(
        filePath,
        JSON.stringify({...currentData, data}, null, 2)
    );
}