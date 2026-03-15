import { isRecord } from './guards';

const DEFAULT_ARG_VALUES_PER_TYPE: Record<string, string> = {
    bool: 'false',
    u8: '1',
    u16: '1',
    u32: '1',
    u64: '1',
    u128: '1',
    i8: '1',
    i16: '1',
    i32: '1',
    i64: '1',
    i128: '1',
    f32: '1.0',
    f64: '1.0',
    string: 'default',
    bytes: 'data',
    pubkey: '11111111111111111111111111111111',
    publicKey: '11111111111111111111111111111111',
} as const;

export function findDefaultValueForArgumentType(type: unknown, walletAddress: string | null): string {
    if (typeof type === 'string') {
        if (type === 'pubkey' || type === 'publicKey') return walletAddress ?? DEFAULT_ARG_VALUES_PER_TYPE[type];
        return DEFAULT_ARG_VALUES_PER_TYPE[type] ?? '';
    }

    if (!isRecord(type)) return '';

    if ('vec' in type) return findDefaultValueForArgumentType((type as any).vec, walletAddress);
    if ('option' in type) return findDefaultValueForArgumentType((type as any).option, walletAddress);
    if ('coption' in type) return findDefaultValueForArgumentType((type as any).coption, walletAddress);
    if ('array' in type && Array.isArray((type as any).array) && (type as any).array.length >= 1) {
        const [innerType, length] = (type as any).array as [unknown, unknown];
        const innerDefault = findDefaultValueForArgumentType(innerType, walletAddress);
        if (typeof length === 'number' && length > 1) return Array.from({ length }, () => innerDefault).join(', ');
        return innerDefault;
    }

    return '';
}
