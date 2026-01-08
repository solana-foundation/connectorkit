import { SvelteComponent } from 'svelte';
import type { ConnectorConfig } from '../types/connector';

export default class ConnectorProvider extends SvelteComponent<
    {
        config: ConnectorConfig;
    },
    {
        // Events (none)
    },
    {
        // Slots
        default: {};
    }
> {}
