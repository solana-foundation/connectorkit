/**
 * Image URL helpers.
 */

/**
 * Transform an image URL through a proxy prefix if configured.
 *
 * Matches `ConnectorConfig.imageProxy` semantics:
 * `${imageProxy}${encodeURIComponent(originalUrl)}`
 */
export function transformImageUrl(url: string | undefined, imageProxy: string | undefined): string | undefined {
    if (!url) return undefined;
    if (!imageProxy) return url;
    return `${imageProxy}${encodeURIComponent(url)}`;
}
