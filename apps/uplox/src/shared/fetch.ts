/**
 * Fetch a file from a url
 * @param url - The url of the file
 * @param timeout - The timeout in milliseconds
 * @returns The response from the fetch
 */
export async function fetchFile(url: string, timeout: number = 10000): Promise<File> {
    try {
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), timeout);
        const response = await fetch(url, { signal: controller.signal });
        clearTimeout(timeoutId);
        const blob = await response.blob();
        return new File([blob], url.split('/').pop() ?? 'file', { type: blob.type });
    } catch (e) {
        throw new Error('Failed to fetch file', { cause: e });
    }
}
