import { describe, it, expect, vi } from 'vitest';
import { z } from 'zod';
import { getDefaults } from '../zod';

describe('getDefaults', () => {
    it('should return default values for schema with defaults', () => {
        const schema = z.object({
            name: z.string().default('John Doe'),
            age: z.number().default(25),
            isActive: z.boolean().default(true),
        });

        const result = getDefaults(schema);

        expect(result).toEqual({
            name: 'John Doe',
            age: 25,
            isActive: true,
        });
    });

    it('should return undefined for fields without defaults', () => {
        const schema = z.object({
            name: z.string(),
            age: z.number(),
            isActive: z.boolean(),
        });

        const result = getDefaults(schema);

        expect(result).toEqual({
            name: undefined,
            age: undefined,
            isActive: undefined,
        });
    });

    it('should handle mixed schema with some defaults and some without', () => {
        const schema = z.object({
            name: z.string().default('Jane Doe'),
            age: z.number(),
            email: z.string().default('jane@example.com'),
            isVerified: z.boolean(),
        });

        const result = getDefaults(schema);

        expect(result).toEqual({
            name: 'Jane Doe',
            age: undefined,
            email: 'jane@example.com',
            isVerified: undefined,
        });
    });

    it('should handle empty schema', () => {
        const schema = z.object({});

        const result = getDefaults(schema);

        expect(result).toEqual({});
    });

    it('should handle different types of default values', () => {
        const schema = z.object({
            stringField: z.string().default('default string'),
            numberField: z.number().default(42),
            booleanField: z.boolean().default(false),
            arrayField: z.array(z.string()).default(['item1', 'item2']),
            objectField: z.object({ nested: z.string() }).default({ nested: 'value' }),
            nullField: z.string().nullable().default(null),
        });

        const result = getDefaults(schema);

        expect(result).toEqual({
            stringField: 'default string',
            numberField: 42,
            booleanField: false,
            arrayField: ['item1', 'item2'],
            objectField: { nested: 'value' },
            nullField: null,
        });
    });

    it('should handle default values that are functions', () => {
        const schema = z.object({
            timestamp: z.number().default(() => Date.now()),
            id: z.string().default(() => Math.random().toString(36)),
        });

        const result = getDefaults(schema);

        expect(typeof result.timestamp).toBe('number');
        expect(typeof result.id).toBe('string');
        expect(result.timestamp).toBeGreaterThan(0);
        expect(result.id).toMatch(/^0\./);
    });

    it('should call defaultValue function for ZodDefault instances', () => {
        const mockFunction = vi.fn().mockReturnValue('dynamic value');
        
        const schema = z.object({
            normalField: z.string(),
            dynamicField: z.string().default(mockFunction),
        });

        const result = getDefaults(schema);

        expect(mockFunction).toHaveBeenCalledTimes(1);
        expect(result.dynamicField).toBe('dynamic value');
        expect(result.normalField).toBeUndefined();
    });

    it('should handle complex nested default values', () => {
        const schema = z.object({
            user: z.object({
                profile: z.object({
                    preferences: z.object({
                        theme: z.string().default('dark'),
                        notifications: z.boolean().default(true),
                    }).default({
                        theme: 'light',
                        notifications: false,
                    }),
                }).default({
                    preferences: {
                        theme: 'system',
                        notifications: true,
                    },
                }),
            }).default({
                profile: {
                    preferences: {
                        theme: 'auto',
                        notifications: false,
                    },
                },
            }),
            settings: z.array(z.string()).default(['setting1', 'setting2']),
        });

        const result = getDefaults(schema);

        expect(result).toEqual({
            user: {
                profile: {
                    preferences: {
                        theme: 'auto',
                        notifications: false,
                    },
                },
            },
            settings: ['setting1', 'setting2'],
        });
    });

    it('should preserve object references for default values', () => {
        const defaultArray = ['shared', 'array'];
        const defaultObject = { shared: 'object' };

        const schema = z.object({
            arrayField: z.array(z.string()).default(defaultArray),
            objectField: z.object({ shared: z.string() }).default(defaultObject),
        });

        const result = getDefaults(schema);

        expect(result.arrayField).toBe(defaultArray);
        expect(result.objectField).toBe(defaultObject);
    });
});
