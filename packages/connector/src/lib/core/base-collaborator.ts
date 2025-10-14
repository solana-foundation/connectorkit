/**
 * Base class for connector collaborators
 * Provides shared dependencies and utilities for all manager classes
 */

import type { StateManager } from './state-manager';
import type { EventEmitter } from './event-emitter';

/**
 * Configuration for base collaborator
 */
export interface BaseCollaboratorConfig {
    stateManager: StateManager;
    eventEmitter: EventEmitter;
    debug?: boolean;
}

/**
 * Base collaborator class that all managers extend
 * Provides common functionality and reduces boilerplate
 */
export abstract class BaseCollaborator {
    protected readonly stateManager: StateManager;
    protected readonly eventEmitter: EventEmitter;
    protected readonly debug: boolean;

    constructor(config: BaseCollaboratorConfig) {
        this.stateManager = config.stateManager;
        this.eventEmitter = config.eventEmitter;
        this.debug = config.debug ?? false;
    }

    /**
     * Log debug message if debug mode is enabled
     */
    protected log(message: string, ...args: unknown[]): void {
        if (this.debug) {
            console.log(message, ...args);
        }
    }

    /**
     * Log error message if debug mode is enabled
     */
    protected error(message: string, ...args: unknown[]): void {
        if (this.debug) {
            console.error(message, ...args);
        }
    }

    /**
     * Get current state snapshot
     */
    protected getState() {
        return this.stateManager.getSnapshot();
    }
}
