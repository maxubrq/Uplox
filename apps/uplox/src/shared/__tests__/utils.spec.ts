import { describe, it, expect } from 'vitest';
import { generateId } from '@shared/utils';
import { ResourceType } from '@domain/resource-type';
import { generate } from 'short-uuid';

describe('utils', () => {
    describe('generateId', () => {
        describe('With identify input', () => {
            const allResourceTypes = Object.values(ResourceType);
            const identify = '123';
            const cases = allResourceTypes.map(resourceType => {
                return {
                    resourceType,
                    identify,
                    expected: `${resourceType}_${identify}`,
                };
            });
            cases.forEach(({ resourceType, identify, expected }) => {
                it(`should generate id for ${resourceType}`, () => {
                    const id = generateId(resourceType, identify);
                    expect(id).toBe(expected);
                });
            });
        });

        describe('Without identify input', () => {
            const allResourceTypes = Object.values(ResourceType);
            const randomIdentify = generate();
            const cases = allResourceTypes.map(resourceType => {
                return {
                    resourceType,
                    identify: randomIdentify,
                    expected: `${resourceType}_${randomIdentify}`,
                };
            });
            cases.forEach(({ resourceType, identify, expected }) => {
                it(`should generate id for ${resourceType}`, () => {
                    const id = generateId(resourceType, identify);
                    expect(id).toBe(expected);
                });
            });
        });
    });
});
