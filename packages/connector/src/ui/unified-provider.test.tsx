import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UnifiedProvider, AppProvider } from './unified-provider';

describe('UnifiedProvider', () => {
    it('should render children', () => {
        render(
            <UnifiedProvider>
                <div>Test Child</div>
            </UnifiedProvider>,
        );

        expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it('should accept config prop', () => {
        const config = { clusters: [] };

        expect(() => {
            render(
                <UnifiedProvider config={config}>
                    <div>Test</div>
                </UnifiedProvider>,
            );
        }).not.toThrow();
    });

    it('should export AppProvider alias', () => {
        expect(AppProvider).toBe(UnifiedProvider);
    });
});
