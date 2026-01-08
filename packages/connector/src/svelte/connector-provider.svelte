<script lang="ts">
    import {setContext, onDestroy} from "svelte"
    import  { ConnectorClient } from "../lib/core/connector-client"
    import { createConnectorStore } from "./stores"
    import type {ConnectorConfig} from "../types/connector"
    import {installPolyfills} from "../lib/utils/polyfills"
    import { CONNECTOR_CLIENT_CONTEXT_KEY, CONNECTOR_STORE_CONTEXT_KEY } from "./constants"

    export let config: ConnectorConfig;

    installPolyfills();

    const client = new ConnectorClient(config);
    const store = createConnectorStore(client);

    setContext(CONNECTOR_CLIENT_CONTEXT_KEY, client);
    setContext(CONNECTOR_STORE_CONTEXT_KEY, store);

    onDestroy(() => {
        client.destroy();
    });
    
</script>

<slot />