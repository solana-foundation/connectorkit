export function getInputKey(ixName: string, ...path: string[]): string {
    return [ixName, ...path].join('.');
}
