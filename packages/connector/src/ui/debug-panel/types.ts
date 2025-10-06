/**
 * @connector-kit/connector - Debug Panel Types
 */

import type React from 'react'

export interface DebugPanelProps {
	/** 
	 * Position of the debug panel on screen
	 * @default 'bottom-right'
	 */
	position?: 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right'
	
	/** 
	 * Whether to show the panel expanded by default
	 * @default false
	 */
	defaultOpen?: boolean
	
	/**
	 * Default tab to show
	 * @default 'overview'
	 */
	defaultTab?: TabId
	
	/**
	 * Custom styles for the panel container
	 */
	style?: React.CSSProperties
	
	/**
	 * z-index for the panel
	 * @default 9999
	 */
	zIndex?: number
	
	/**
	 * Maximum number of events to keep in history
	 * @default 50
	 */
	maxEvents?: number
}

export type TabId = 'overview' | 'transactions' | 'events'

export interface TabConfig {
	id: TabId
	icon: React.ReactNode
	label: string
}

