/**
 * @solana/connector - Try-Catch Utility
 *
 * Provides a consistent pattern for async error handling,
 * returning a Result type instead of throwing errors.
 */

/**
 * Represents a failed operation
 */
export interface Failure<E> {
    data: null;
    error: E;
}

/**
 * Represents a successful operation
 */
export interface Success<T> {
    data: T;
    error: null;
}

/**
 * Result type that is either a Success or Failure
 */
export type Result<T, E = Error> = Success<T> | Failure<E>;

/**
 * Wraps an async operation and returns a Result instead of throwing.
 * This enables consistent error handling without nested try/catch blocks.
 *
 * @param promise - The promise to wrap
 * @returns A Result containing either the data or an error
 *
 * @example Basic usage
 * ```typescript
 * const { data, error } = await tryCatch(fetchData());
 * if (error) {
 *   console.error('Failed:', error.message);
 *   return;
 * }
 * console.log('Success:', data);
 * ```
 *
 * @example With typed errors
 * ```typescript
 * const { data, error } = await tryCatch<User, ApiError>(api.getUser(id));
 * if (error) {
 *   // error is typed as ApiError
 *   handleApiError(error);
 *   return;
 * }
 * // data is typed as User
 * displayUser(data);
 * ```
 *
 * @example Chaining operations
 * ```typescript
 * const { data: user, error: userError } = await tryCatch(getUser(id));
 * if (userError) return handleError(userError);
 *
 * const { data: posts, error: postsError } = await tryCatch(getPosts(user.id));
 * if (postsError) return handleError(postsError);
 *
 * return { user, posts };
 * ```
 */
export async function tryCatch<T, E = Error>(promise: Promise<T>): Promise<Result<T, E>> {
    try {
        const data = await promise;
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error as E };
    }
}

/**
 * Synchronous version of tryCatch for non-async operations
 *
 * @param fn - The function to execute
 * @returns A Result containing either the return value or an error
 *
 * @example
 * ```typescript
 * const { data, error } = tryCatchSync(() => JSON.parse(jsonString));
 * if (error) {
 *   console.error('Invalid JSON:', error.message);
 *   return defaultValue;
 * }
 * return data;
 * ```
 */
export function tryCatchSync<T, E = Error>(fn: () => T): Result<T, E> {
    try {
        const data = fn();
        return { data, error: null };
    } catch (error) {
        return { data: null, error: error as E };
    }
}

/**
 * Type guard to check if a Result is a Success
 */
export function isSuccess<T, E>(result: Result<T, E>): result is Success<T> {
    return result.error === null;
}

/**
 * Type guard to check if a Result is a Failure
 */
export function isFailure<T, E>(result: Result<T, E>): result is Failure<E> {
    return result.error !== null;
}
