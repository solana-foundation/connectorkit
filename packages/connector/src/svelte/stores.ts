import { readable, type Readable } from 'svelte/store';
import type { ConnectorClient } from '../lib/core/connector-client';
import type { ConnectorState } from '../types';

export const createConnectorStore = (client: ConnectorClient): Readable<ConnectorState> => {
    return readable<ConnectorState>(client.getSnapshot(), set => {
        const unsubscribe = client.subscribe(state => set(state));

        return () => unsubscribe();
    });
};
