export async function readFileAsText(file: File): Promise<string> {
    return await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onerror = () => reject(reader.error ?? new Error('Failed to read file'));
        reader.onload = () => resolve(String(reader.result ?? ''));
        reader.readAsText(file);
    });
}
