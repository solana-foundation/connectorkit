export const IDL_STYLES = `
    .cdt-idl { display:flex; flex-direction: column; height: 100%; }

    .cdt-idl-toolbar {
        display:flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 8px 12px;
        border-bottom: 1px solid var(--cdt-border);
        background: var(--cdt-bg-panel);
        flex-wrap: wrap;
    }

    .cdt-idl-toolbar-left { display:flex; align-items:center; gap: 8px; flex-wrap: wrap; }
    .cdt-idl-toolbar-right { display:flex; align-items:center; gap: 8px; flex-wrap: wrap; }

    .cdt-idl-body {
        display: grid;
        grid-template-columns: 1fr 1fr;
        min-height: 0;
        flex: 1;
    }

    @media (max-width: 720px) {
        .cdt-idl-body { grid-template-columns: 1fr; grid-template-rows: 1fr 1fr; }
    }

    .cdt-idl-pane {
        min-width: 0;
        overflow: auto;
        border-right: 1px solid var(--cdt-border);
    }

    @media (max-width: 720px) {
        .cdt-idl-pane { border-right: none; border-bottom: 1px solid var(--cdt-border); }
    }

    .cdt-idl-details { min-width: 0; overflow: auto; padding: 12px; }

    .cdt-section-title {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--cdt-text-muted);
        padding: 10px 12px;
        border-bottom: 1px solid var(--cdt-border);
        background: var(--cdt-bg-panel);
    }

    .cdt-idl-item {
        display:flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 12px;
        border-bottom: 1px solid var(--cdt-border);
        cursor: pointer;
        transition: background 0.1s;
    }
    .cdt-idl-item:hover { background: var(--cdt-bg-hover); }
    .cdt-idl-item[data-selected="true"] { background: var(--cdt-bg-active); }
    .cdt-idl-item-name { font-family: ui-monospace, monospace; font-size: 12px; color: var(--cdt-text); }
    .cdt-idl-item-meta { display:flex; gap: 6px; flex-wrap: wrap; justify-content: flex-end; }

    .cdt-input {
        width: 260px;
        max-width: 100%;
        padding: 6px 10px;
        border-radius: 8px;
        border: 1px solid var(--cdt-border);
        background: var(--cdt-bg);
        color: var(--cdt-text);
        font-size: 12px;
        font-family: ui-monospace, monospace;
    }

    .cdt-input[readonly] {
        opacity: 0.85;
        background: var(--cdt-bg-panel);
        border-style: dashed;
    }

    .cdt-textarea {
        width: min(820px, 100%);
        min-height: 120px;
        padding: 8px 10px;
        border-radius: 10px;
        border: 1px solid var(--cdt-border);
        background: var(--cdt-bg);
        color: var(--cdt-text);
        font-size: 11px;
        font-family: ui-monospace, monospace;
    }

    .cdt-pill {
        display: inline-flex;
        align-items: center;
        padding: 2px 8px;
        border-radius: 999px;
        font-size: 10px;
        border: 1px solid var(--cdt-border);
        background: var(--cdt-bg);
        color: var(--cdt-text-muted);
    }
    .cdt-pill.warn { color: var(--cdt-warning); border-color: color-mix(in srgb, var(--cdt-warning) 40%, var(--cdt-border)); }
    .cdt-pill.info { color: var(--cdt-info); border-color: color-mix(in srgb, var(--cdt-info) 40%, var(--cdt-border)); }
    .cdt-pill.success { color: var(--cdt-success); border-color: color-mix(in srgb, var(--cdt-success) 40%, var(--cdt-border)); }

    .cdt-empty {
        padding: 18px;
        color: var(--cdt-text-muted);
        font-size: 12px;
        white-space: pre-wrap;
    }

    .cdt-details-header {
        display:flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        margin-bottom: 10px;
    }

    .cdt-details-title { font-size: 13px; font-weight: 700; color: var(--cdt-text); }

    .cdt-details-section {
        margin-top: 10px;
        border: 1px solid var(--cdt-border);
        border-radius: 12px;
        background: var(--cdt-bg-panel);
        overflow: hidden;
    }

    .cdt-details-section summary {
        cursor: pointer;
        padding: 10px 12px;
        font-size: 12px;
        font-weight: 700;
        color: var(--cdt-text);
        list-style: none;
        display:flex;
        align-items:center;
        gap: 6px;
    }
    .cdt-details-section summary::-webkit-details-marker { display:none; }

    .cdt-chevron {
        display: inline-flex;
        width: 14px;
        height: 14px;
        transition: transform 0.15s ease;
        transform: rotate(-90deg);
        flex-shrink: 0;
    }
    .cdt-details-section[open] .cdt-chevron { transform: rotate(0deg); }
    .cdt-details-section[open] summary { border-bottom: 1px solid var(--cdt-border); }

    .cdt-details-section-content { padding: 10px 12px; background: var(--cdt-bg); }

    .cdt-field-group {
        margin-top: 10px;
        padding: 10px;
        border: 1px dashed var(--cdt-border);
        border-radius: 12px;
        background: var(--cdt-bg-panel);
    }

    .cdt-field-group-title {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.06em;
        text-transform: uppercase;
        color: var(--cdt-text-muted);
        margin-bottom: 8px;
    }

    .cdt-field-group-body { }

    .cdt-field { padding: 10px; border: 1px solid var(--cdt-border); border-radius: 10px; background: var(--cdt-bg); }
    .cdt-field + .cdt-field { margin-top: 10px; }
    .cdt-field-head { display:flex; align-items:center; justify-content: space-between; gap: 10px; margin-bottom: 8px; }
    .cdt-field-name { font-size: 12px; color: var(--cdt-text); font-weight: 650; font-family: ui-monospace, monospace; }
    .cdt-field-badges { display:flex; gap: 6px; flex-wrap: wrap; justify-content:flex-end; }
    .cdt-field-input-row { display:flex; gap: 6px; align-items:center; }

    .cdt-status-row { margin-bottom: 8px; display:flex; justify-content:flex-end; }

    .cdt-card {
        margin-top: 10px;
        border: 1px solid var(--cdt-border);
        border-radius: 12px;
        background: var(--cdt-bg-panel);
        padding: 10px 12px;
    }
    .cdt-card-title { font-size: 12px; font-weight: 700; color: var(--cdt-text); margin-bottom: 8px; }

    .cdt-kv { display:grid; grid-template-columns: 120px 1fr; gap: 6px 12px; font-size: 11px; }
    .cdt-k { color: var(--cdt-text-muted); }
    .cdt-v { color: var(--cdt-text); font-family: ui-monospace, monospace; word-break: break-all; }
`;
