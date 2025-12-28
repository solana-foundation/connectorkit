import { describe, it, expect } from 'vitest';
import { tryCatch, tryCatchSync, isSuccess, isFailure, type Result } from './try-catch';

describe('tryCatch', () => {
    describe('async operations', () => {
        it('should return data on success', async () => {
            const promise = Promise.resolve('success');
            const result = await tryCatch(promise);

            expect(result.data).toBe('success');
            expect(result.error).toBeNull();
        });

        it('should return error on failure', async () => {
            const error = new Error('test error');
            const promise = Promise.reject(error);
            const result = await tryCatch(promise);

            expect(result.data).toBeNull();
            expect(result.error).toBe(error);
        });

        it('should handle non-Error thrown values', async () => {
            const promise = Promise.reject('string error');
            const result = await tryCatch(promise);

            expect(result.data).toBeNull();
            expect(result.error).toBe('string error');
        });

        it('should preserve error types', async () => {
            class CustomError extends Error {
                code = 'CUSTOM';
            }
            const error = new CustomError('custom');
            const promise = Promise.reject(error);
            const result = await tryCatch<string, CustomError>(promise);

            expect(result.data).toBeNull();
            expect(result.error).toBeInstanceOf(CustomError);
            expect(result.error?.code).toBe('CUSTOM');
        });

        it('should handle async functions', async () => {
            const asyncFn = async () => {
                await new Promise(resolve => setTimeout(resolve, 10));
                return 42;
            };

            const result = await tryCatch(asyncFn());
            expect(result.data).toBe(42);
            expect(result.error).toBeNull();
        });
    });

    describe('sync operations', () => {
        it('should return data on success', () => {
            const result = tryCatchSync(() => 'success');

            expect(result.data).toBe('success');
            expect(result.error).toBeNull();
        });

        it('should return error on failure', () => {
            const error = new Error('test error');
            const result = tryCatchSync(() => {
                throw error;
            });

            expect(result.data).toBeNull();
            expect(result.error).toBe(error);
        });

        it('should handle JSON parsing', () => {
            const validJson = '{"key": "value"}';
            const result = tryCatchSync(() => JSON.parse(validJson));

            expect(result.data).toEqual({ key: 'value' });
            expect(result.error).toBeNull();
        });

        it('should handle invalid JSON parsing', () => {
            const invalidJson = 'not json';
            const result = tryCatchSync(() => JSON.parse(invalidJson));

            expect(result.data).toBeNull();
            expect(result.error).toBeInstanceOf(SyntaxError);
        });
    });

    describe('type guards', () => {
        it('isSuccess should return true for success results', async () => {
            const result = await tryCatch(Promise.resolve('data'));

            expect(isSuccess(result)).toBe(true);
            expect(isFailure(result)).toBe(false);

            if (isSuccess(result)) {
                // TypeScript should narrow the type here
                expect(result.data).toBe('data');
            }
        });

        it('isFailure should return true for failure results', async () => {
            const result = await tryCatch(Promise.reject(new Error('fail')));

            expect(isFailure(result)).toBe(true);
            expect(isSuccess(result)).toBe(false);

            if (isFailure(result)) {
                // TypeScript should narrow the type here
                expect(result.error.message).toBe('fail');
            }
        });
    });

    describe('real-world patterns', () => {
        it('should support chained operations', async () => {
            const getUser = async (id: number) => ({ id, name: 'Test' });
            const getPosts = async (userId: number) => [{ id: 1, userId, title: 'Post' }];

            const { data: user, error: userError } = await tryCatch(getUser(1));
            expect(userError).toBeNull();
            expect(user).toBeDefined();

            const { data: posts, error: postsError } = await tryCatch(getPosts(user!.id));
            expect(postsError).toBeNull();
            expect(posts).toHaveLength(1);
        });

        it('should support early return pattern', async () => {
            const processData = async (): Promise<Result<string, Error>> => {
                const { data, error } = await tryCatch(Promise.resolve('step1'));
                if (error) return { data: null, error };

                const { data: data2, error: error2 } = await tryCatch(Promise.resolve(data + '-step2'));
                if (error2) return { data: null, error: error2 };

                return { data: data2, error: null };
            };

            const result = await processData();
            expect(result.data).toBe('step1-step2');
            expect(result.error).toBeNull();
        });
    });
});
