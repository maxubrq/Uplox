import { ResourceType } from '@domain/resource-type';
import short from 'short-uuid';

/**
 * Generate a unique id for a resource
 * @param resourceType - The type of resource
 * @param identify - The identify of the resource
 * @returns The unique id
 */
export function generateId(resourceType: ResourceType, identify?: string) {
    identify ??= short.generate();
    return `${resourceType}_${identify}`;
}

/**
 * Check if a string is a valid url
 * @param url - The string to check
 * @returns True if the string is a valid url, false otherwise
 */
export function isUrl(url: string) {
    const urlRegex = /^(https?:\/\/)?([\da-z.-]+)\.([a-z.]{2,6})([/\w .-]*)*\/?$/;
    return urlRegex.test(url);
}
