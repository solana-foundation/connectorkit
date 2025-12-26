import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor, act } from '@testing-library/react';
import { useSharedQuery, clearSharedQueryCache
} from './use-shared-query';

describe('useSharedQuery', () => {
    beforeEach(() => {
        clearSharedQueryCache();
    });

    describe('basic functionality', () => {
        it('should return idle state when key is null', () => {
            const queryFn = vi.fn().mockResolvedValue('data');
            const { result } = renderHook(() => useSharedQuery(null, queryFn));

            expect(result.current.status).toBe('idle');
            expect(result.current.data).toBeUndefined();
            expect(result.current.error).toBeNull();
            expect(result.current.isFetching).toBe(false);
            expect(queryFn).not.toHaveBeenCalled();
        });

        it('should fetch data when key is provided', async () => {
            const queryFn = vi.fn().mockResolvedValue('test-data');
            const { result } = renderHook(() => useSharedQuery('test-key', queryFn));

            await waitFor(() => {
                expect(result.current.status).toBe('success');
            });

            expect(result.current.data).toBe('test-data');
            expect(result.current.error).toBeNull();
            expect(queryFn).toHaveBeenCalledTimes(1);
        });

        it('should handle fetch errors', async () => {
            const error = new Error('Test error');
            const queryFn = vi.fn().mockRejectedValue(error);
            const { result } = renderHook(() => useSharedQuery('error-key', queryFn));

            await waitFor(() => {
                expect(result.current.status).toBe('error');
            });

            expect(result.current.error).toBe(error);
            expect(result.current.data).toBeUndefined();
        });
    });

    describe('deduplication', () => {
        it('should deduplicate concurrent requests with same key', async () => {
            let resolvePromise: (value: string) => void;
            const promise = new Promise<string>(resolve => {
                resolvePromise = resolve;
            });
            const queryFn = vi.fn().mockReturnValue(promise);

            const { result: result1 } = renderHook(() => useSharedQuery('dedup-key', queryFn));
            const { result: result2 } = renderHook(() => useSharedQuery('dedup-key', queryFn));

            // Both should be fetching
            expect(result1.current.isFetching).toBe(true);
            expect(result2.current.isFetching).toBe(true);

            // Resolve the promise
            await act(async () => {
                resolvePromise!('shared-data');
                await promise;
            });

            await waitFor(() => {
                expect(result1.current.data).toBe('shared-data');
                expect(result2.current.data).toBe('shared-data');
            });

            // Should only have called queryFn once
            expect(queryFn).toHaveBeenCalledTimes(1);
        });

        it('should not deduplicate requests with different keys', async () => {
            const queryFn1 = vi.fn().mockResolvedValue('data-1');
            const queryFn2 = vi.fn().mockResolvedValue('data-2');

            const { result: result1 } = renderHook(() => useSharedQuery('key-1', queryFn1));
            const { result: result2 } = renderHook(() => useSharedQuery('key-2', queryFn2));

            await waitFor(() => {
                expect(result1.current.data).toBe('data-1');
                expect(result2.current.data).toBe('data-2');
            });

            expect(queryFn1).toHaveBeenCalledTimes(1);
            expect(queryFn2).toHaveBeenCalledTimes(1);
        });
    });

    describe('caching', () => {
        it('should use cached data for subsequent hooks with same key', async () => {
            const queryFn = vi.fn().mockResolvedValue('cached-data');

            const { result: result1 } = renderHook(() => useSharedQuery('cache-key', queryFn));

            await waitFor(() => {
                expect(result1.current.data).toBe('cached-data');
            });

            // Mount second hook with same key and refetchOnMount: false
            const { result: result2 } = renderHook(() =>
                useSharedQuery('cache-key', queryFn, { refetchOnMount: false }),
            );

            // Should immediately have data from cache
            expect(result2.current.data).toBe('cached-data');
            expect(result2.current.status).toBe('success');

            // Should not trigger additional fetch
            expect(queryFn).toHaveBeenCalledTimes(1);
        });
    });

    describe('enabled option', () => {
        it('should not fetch when enabled is false', async () => {
            const queryFn = vi.fn().mockResolvedValue('data');

            const { result } = renderHook(() => useSharedQuery('disabled-key', queryFn, { enabled: false }));

            // Wait a bit to ensure no fetch happens
            await new Promise(resolve => setTimeout(resolve, 50));

            expect(queryFn).not.toHaveBeenCalled();
            expect(result.current.status).toBe('idle');
        });

        it('should fetch when enabled changes to true', async () => {
            const queryFn = vi.fn().mockResolvedValue('data');

            const { result, rerender } = renderHook(
                ({ enabled }) => useSharedQuery('toggle-key', queryFn, { enabled }),
                { initialProps: { enabled: false } },
            );

            expect(queryFn).not.toHaveBeenCalled();

            rerender({ enabled: true });

            await waitFor(() => {
                expect(result.current.data).toBe('data');
            });

            expect(queryFn).toHaveBeenCalledTimes(1);
        });
    });

    describe('refetch', () => {
        it('should refetch when called', async () => {
            let callCount = 0;
            const queryFn = vi.fn().mockImplementation(async () => {
                callCount++;
                return `data-${callCount}`;
            });

            const { result } = renderHook(() => useSharedQuery('refetch-key', queryFn));

            await waitFor(() => {
                expect(result.current.data).toBe('data-1');
            });

            expect(queryFn).toHaveBeenCalledTimes(1);

            await act(async () => {
                await result.current.refetch();
            });

            expect(queryFn).toHaveBeenCalledTimes(2);
            expect(result.current.data).toBe('data-2');
        });
    });

    describe('abort', () => {
        it('should abort in-flight request', async () => {
            let aborted = false;
            const queryFn = vi.fn().mockImplementation(async (signal: AbortSignal) => {
                signal.addEventListener('abort', () => {
                    aborted = true;
                });
                await new Promise(resolve => setTimeout(resolve, 1000));
                if (signal.aborted) throw new Error('Aborted');
                return 'data';
            });

            const { result } = renderHook(() => useSharedQuery('abort-key', queryFn));

            expect(result.current.isFetching).toBe(true);

            // Abort the request
            act(() => {
                result.current.abort();
            });

            await waitFor(() => {
                expect(aborted).toBe(true);
            });
        });
    });

    describe('cache utilities', () => {
        it('should clear cache with clearSharedQueryCache', async () => {
            const queryFn = vi.fn().mockResolvedValue('data');

            const { result: result1, unmount } = renderHook(() => useSharedQuery('clear-key', queryFn));

            await waitFor(() => {
                expect(result1.current.data).toBe('data');
            });

            unmount();
            clearSharedQueryCache();

            // Mount new hook - should fetch again because cache was cleared
            const { result: result2 } = renderHook(() => useSharedQuery('clear-key', queryFn));

            await waitFor(() => {
                expect(result2.current.data).toBe('data');
            });

            expect(queryFn).toHaveBeenCalledTimes(2);
        });
    });
});
