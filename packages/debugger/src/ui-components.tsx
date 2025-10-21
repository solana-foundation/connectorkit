/**
 * @solana/connector-debugger - Debug Panel UI Components
 */

'use client';

import React, { useState } from 'react';
import type { TabConfig } from './types';

export function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <div style={{ marginBottom: 12 }}>
            <div
                style={{
                    opacity: 0.7,
                    fontSize: 10,
                    textTransform: 'uppercase',
                    letterSpacing: 0.5,
                    marginBottom: 6,
                    fontWeight: 400,
                }}
            >
                {title}
            </div>
            <div style={{ fontSize: 11 }}>{children}</div>
        </div>
    );
}

export function Divider() {
    return (
        <div
            style={{
                borderTop: '1px solid rgba(255, 255, 255, 0.15)',
                margin: '12px 0',
            }}
        />
    );
}

export function Badge({ children, color = '#666' }: { children: React.ReactNode; color?: string }) {
    return (
        <span
            style={{
                display: 'inline-block',
                padding: '2px 6px',
                borderRadius: 4,
                backgroundColor: color,
                fontSize: 10,
                fontWeight: 600,
                color: '#fff',
            }}
        >
            {children}
        </span>
    );
}

export function Button({
    children,
    onClick,
    small,
    icon,
}: {
    children: React.ReactNode;
    onClick: () => void;
    small?: boolean;
    icon?: boolean;
}) {
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                setIsPressed(false);
            }}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            style={{
                padding: icon ? (small ? '6px' : '6px') : small ? '4px 8px' : '6px 12px',
                fontSize: small ? 10 : 11,
                borderRadius: 6,
                border: `1px solid ${isHovered ? 'rgba(255, 255, 255, 0.3)' : 'rgba(255, 255, 255, 0.2)'}`,
                backgroundColor: isHovered ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.1)',
                color: '#fff',
                cursor: 'pointer',
                fontWeight: 500,
                transition: 'all 0.15s ease, transform 0.1s ease',
                transform: isPressed ? 'scale(0.98)' : 'scale(1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
            }}
        >
            {children}
        </button>
    );
}

export function TabButton({ tab, isActive, onClick }: { tab: TabConfig; isActive: boolean; onClick: () => void }) {
    const [isHovered, setIsHovered] = useState(false);
    const [isPressed, setIsPressed] = useState(false);

    return (
        <button
            onClick={onClick}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => {
                setIsHovered(false);
                setIsPressed(false);
            }}
            onMouseDown={() => setIsPressed(true)}
            onMouseUp={() => setIsPressed(false)}
            style={{
                flex: 1,
                padding: '4px 6px',
                fontSize: 12,
                borderRadius: 8,
                margin: '4px 2px',
                background: isActive
                    ? 'linear-gradient(135deg, rgba(255, 255, 255, 0.15), rgba(255, 255, 255, 0.08))'
                    : isHovered
                      ? 'rgba(255, 255, 255, 0.05)'
                      : 'transparent',
                color: isActive
                    ? 'rgba(255, 255, 255, 0.95)'
                    : isHovered
                      ? 'rgba(255, 255, 255, 0.9)'
                      : 'rgba(255, 255, 255, 0.6)',
                cursor: 'pointer',
                fontWeight: isActive ? 600 : 500,
                transition: 'all 0.2s ease, transform 0.1s ease',
                display: 'flex',
                flexDirection: 'row',
                alignItems: 'center',
                justifyContent: 'center',
                gap: 6,
                transform: isPressed ? 'scale(0.98)' : 'scale(1)',
                border: isActive ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid transparent',
            }}
        >
            {tab.icon}
            <span>{tab.label}</span>
        </button>
    );
}

export function EmptyState({
    icon,
    title,
    description,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
}) {
    return (
        <div
            style={{
                textAlign: 'center',
                padding: '40px 20px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: 8,
            }}
        >
            <div style={{ opacity: 0.5 }}>{icon}</div>
            <div style={{ color: '#fff', fontSize: 12, fontWeight: 500 }}>{title}</div>
            <div style={{ fontSize: 10, opacity: 0.5, maxWidth: 200 }}>{description}</div>
        </div>
    );
}

export function CollapsibleSection({
    icon,
    title,
    children,
    defaultExpanded = false,
    badge,
    warning = false,
}: {
    icon?: React.ReactNode;
    title: string;
    children: React.ReactNode;
    defaultExpanded?: boolean;
    badge?: React.ReactNode;
    warning?: boolean;
}) {
    const [isExpanded, setIsExpanded] = useState(defaultExpanded);

    return (
        <div
            style={{
                border: '1px solid rgba(255, 255, 255, 0.1)',
                borderRadius: 6,
                marginBottom: 12,
                overflow: 'hidden',
            }}
        >
            <div
                style={{
                    padding: '10px 12px',
                    backgroundColor: warning ? 'rgba(255, 165, 0, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    userSelect: 'none',
                    border: warning ? '1px solid rgba(255, 165, 0, 0.3)' : 'none',
                }}
                onClick={() => setIsExpanded(!isExpanded)}
            >
                <div
                    style={{
                        fontWeight: 600,
                        fontSize: 11,
                        display: 'flex',
                        alignItems: 'center',
                        gap: 6,
                    }}
                >
                    {icon && <span>{icon}</span>}
                    {title}
                    {badge && <span style={{ marginLeft: 4 }}>{badge}</span>}
                </div>
                <span style={{ fontSize: 10, opacity: 0.6 }}>{isExpanded ? '▼' : '▶'}</span>
            </div>

            {isExpanded && <div style={{ padding: 12 }}>{children}</div>}
        </div>
    );
}
