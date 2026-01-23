export function generateNameVariations(words: string[], additionalKeys: string[] = []): string[] {
    return [...generateConventions(words), ...additionalKeys];
}

export function generateConventions(words: string[]): string[] {
    const lowerWords = words.map(w => w.toLowerCase());
    const capitalize = (word: string) => word.charAt(0).toUpperCase() + word.slice(1);

    return [
        lowerWords[0] + lowerWords.slice(1).map(capitalize).join(''), // camelCase
        lowerWords.join('_'), // snake_case
        lowerWords.join(' '), // space separated
        lowerWords.join(''), // concatenated
    ];
}

export function normalizePatternKey(value: string): string {
    return value.toLowerCase().replace(/[^a-z0-9]/g, '');
}

export function camelCase(value: string): string {
    const trimmed = value.trim();
    if (!trimmed) return '';

    // If it already looks like camelCase / PascalCase (no separators), keep internal capitals.
    if (!/[\s._-]/.test(trimmed) && /[A-Z]/.test(trimmed)) {
        return trimmed.charAt(0).toLowerCase() + trimmed.slice(1);
    }

    const parts = trimmed.split(/[^a-zA-Z0-9]+/g).filter(Boolean);
    if (!parts.length) return '';
    const head = parts[0].toLowerCase();
    const tail = parts
        .slice(1)
        .map(p => p.charAt(0).toUpperCase() + p.slice(1).toLowerCase())
        .join('');
    return `${head}${tail}`;
}
