'use client';

import { createContext, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';

interface ExampleCardHeaderActionsContextValue {
    actions: ReactNode | null;
    setActions: (actions: ReactNode | null) => void;
}

const ExampleCardHeaderActionsContext = createContext<ExampleCardHeaderActionsContextValue | null>(null);

export function ExampleCardHeaderActionsProvider({ children }: { children: ReactNode }) {
    const [actions, setActions] = useState<ReactNode | null>(null);

    const value = useMemo(
        () => ({
            actions,
            setActions,
        }),
        [actions],
    );

    return (
        <ExampleCardHeaderActionsContext.Provider value={value}>{children}</ExampleCardHeaderActionsContext.Provider>
    );
}

export function ExampleCardHeaderActionsSlot() {
    const ctx = useContext(ExampleCardHeaderActionsContext);
    if (!ctx?.actions) return null;
    return <div className="flex items-center">{ctx.actions}</div>;
}

export function useExampleCardHeaderActions(actions: ReactNode | null) {
    const ctx = useContext(ExampleCardHeaderActionsContext);

    useEffect(() => {
        if (!ctx) return;
        ctx.setActions(actions);
        return () => ctx.setActions(null);
    }, [ctx, actions]);
}
