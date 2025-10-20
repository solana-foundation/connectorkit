import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ConnectorProvider, useConnector, useConnectorClient } from './connector-provider';

// Mock dependencies
vi.mock('../lib/utils/polyfills', () => ({
    installPolyfills: vi.fn(),
}));

describe('ConnectorProvider', () => {
    it.skip('should render children', () => {
        render(
            <ConnectorProvider>
                <div>Test Child</div>
            </ConnectorProvider>,
        );

        expect(screen.getByText('Test Child')).toBeInTheDocument();
    });

    it.skip('should provide connector context', () => {
        function TestComponent() {
            const connector = useConnector();
            return <div>Connected: {connector.connected.toString()}</div>;
        }

        render(
            <ConnectorProvider>
                <TestComponent />
            </ConnectorProvider>,
        );

        expect(screen.getByText(/Connected:/)).toBeInTheDocument();
    });

    it.skip('should provide client context', () => {
        function TestComponent() {
            const client = useConnectorClient();
            return <div>Client: {client ? 'Available' : 'Null'}</div>;
        }

        render(
            <ConnectorProvider>
                <TestComponent />
            </ConnectorProvider>,
        );

        expect(screen.getByText(/Client:/)).toBeInTheDocument();
    });
});
