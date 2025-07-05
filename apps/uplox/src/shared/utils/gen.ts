import { generate } from 'short-uuid';

export function genId(prefix: string): string {
    return `${prefix}_${generate()}`;
}
