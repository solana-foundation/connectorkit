/**
 * @connector-kit/connector - Debug Panel UI Components
 */

'use client'

import React, { useState } from 'react'
import type { TabConfig } from './types'

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
	return (
		<div style={{ marginBottom: 12 }}>
			<div style={{ 
				opacity: 0.7, 
				fontSize: 10, 
				textTransform: 'uppercase',
				letterSpacing: 0.5,
				marginBottom: 6,
				fontWeight: 600
			}}>
				{title}
			</div>
			<div style={{ fontSize: 11 }}>
				{children}
			</div>
		</div>
	)
}

export function Divider() {
	return <div style={{ borderTop: '1px solid rgba(255, 255, 255, 0.15)', margin: '12px 0' }} />
}

export function Badge({ children, color = '#666' }: { children: React.ReactNode; color?: string }) {
	return (
		<span style={{
			display: 'inline-block',
			padding: '2px 6px',
			borderRadius: 4,
			backgroundColor: color,
			fontSize: 10,
			fontWeight: 600,
			color: '#fff'
		}}>
			{children}
		</span>
	)
}

export function Button({ children, onClick, small }: { children: React.ReactNode; onClick: () => void; small?: boolean }) {
	const [isHovered, setIsHovered] = useState(false)
	const [isPressed, setIsPressed] = useState(false)
	
	return (
		<button
			onClick={onClick}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => {
				setIsHovered(false)
				setIsPressed(false)
			}}
			onMouseDown={() => setIsPressed(true)}
			onMouseUp={() => setIsPressed(false)}
			style={{
				padding: small ? '4px 8px' : '6px 12px',
				fontSize: small ? 10 : 11,
				borderRadius: 6,
				border: `1px solid ${isHovered ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)'}`,
				backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)',
				color: '#fff',
				cursor: 'pointer',
				fontWeight: 500,
				transition: 'all 0.15s ease, transform 0.1s ease',
				transform: isPressed ? 'scale(0.98)' : 'scale(1)'
			}}
		>
			{children}
		</button>
	)
}

export function TabButton({ 
	tab, 
	isActive, 
	onClick 
}: { 
	tab: TabConfig
	isActive: boolean
	onClick: () => void 
}) {
	const [isHovered, setIsHovered] = useState(false)
	const [isPressed, setIsPressed] = useState(false)
	
	return (
		<button
			onClick={onClick}
			onMouseEnter={() => setIsHovered(true)}
			onMouseLeave={() => {
				setIsHovered(false)
				setIsPressed(false)
			}}
			onMouseDown={() => setIsPressed(true)}
			onMouseUp={() => setIsPressed(false)}
			style={{
				flex: 1,
				padding: '4px 6px',
				fontSize: 10,
				borderRadius: 8,
				margin: '4px 2px',
				background: isActive 
					? 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08))' 
					: isHovered 
						? 'rgba(255, 255, 255, 0.05)'
						: 'transparent',
				color: isActive ? 'rgba(255, 255, 255, 0.95)' : isHovered ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.6)',
				cursor: 'pointer',
				fontWeight: isActive ? 600 : 500,
				transition: 'all 0.2s ease, transform 0.1s ease',
				display: 'flex',
				flexDirection: 'row',
				alignItems: 'center',
				justifyContent: 'center',
				gap: 6,
				transform: isPressed ? 'scale(0.98)' : 'scale(1)',
				border: isActive ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid transparent'
			}}
		>
			{tab.icon}
			<span>{tab.label}</span>
		</button>
	)
}

