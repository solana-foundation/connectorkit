import { escapeAttr, escapeHtml } from '../utils/dom';
import { ICONS } from './icons';

export interface CdtDropdownOption {
    value: string;
    label: string;
}

export interface RenderCdtDropdownParams {
    id: string;
    value: string;
    options: readonly CdtDropdownOption[];
    ariaLabel: string;
    /**
     * Extra classes applied to the outer wrapper.
     * Use for layout only (styling is provided by shared tokens).
     */
    className?: string;
    /**
     * Classes applied to the trigger button.
     * Defaults to `cdt-select cdt-select-compact` to match existing styling.
     */
    triggerClassName?: string;
}

export function renderCdtDropdown({
    id,
    value,
    options,
    ariaLabel,
    className,
    triggerClassName,
}: RenderCdtDropdownParams): string {
    const selected = options.find(o => o.value === value) ?? null;
    const selectedLabel = selected?.label ?? options[0]?.label ?? value;

    return `
        <div
            class="cdt-dropdown ${escapeAttr(className ?? '')}"
            id="${escapeAttr(id)}"
            data-cdt-dropdown="true"
            data-open="false"
            data-value="${escapeAttr(value)}"
        >
            <button
                type="button"
                class="cdt-dropdown-trigger ${escapeAttr(triggerClassName ?? 'cdt-select cdt-select-compact')}"
                data-cdt-dropdown-trigger
                aria-haspopup="listbox"
                aria-expanded="false"
                aria-label="${escapeAttr(ariaLabel)}"
            >
                <span class="cdt-dropdown-trigger-text">${escapeHtml(selectedLabel)}</span>
            </button>
            <div class="cdt-dropdown-menu" role="listbox" aria-label="${escapeAttr(ariaLabel)}">
                ${options
                    .map(
                        option => `
                    <button
                        type="button"
                        class="cdt-dropdown-item"
                        role="option"
                        data-cdt-dropdown-option
                        data-value="${escapeAttr(option.value)}"
                        data-selected="${option.value === value ? 'true' : 'false'}"
                        aria-selected="${option.value === value ? 'true' : 'false'}"
                    >
                        <span class="cdt-dropdown-item-label">${escapeHtml(option.label)}</span>
                        <span class="cdt-dropdown-check">${ICONS.check}</span>
                    </button>
                `,
                    )
                    .join('')}
            </div>
        </div>
    `;
}
