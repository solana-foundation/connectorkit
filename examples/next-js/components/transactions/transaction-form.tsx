'use client';

import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert } from '@/components/ui/alert';
import { Loader2 } from 'lucide-react';

interface TransactionFormProps {
    title: string;
    description: string;
    onSubmit: (recipient: string, amount: number) => Promise<void>;
    disabled?: boolean;
    defaultRecipient?: string;
}

export function TransactionForm({
    title,
    description,
    onSubmit,
    disabled = false,
    defaultRecipient = '',
}: TransactionFormProps) {
    const [recipient, setRecipient] = useState(defaultRecipient);
    const [amount, setAmount] = useState('0.01');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function handleSubmit(e: React.FormEvent) {
        e.preventDefault();
        setError(null);
        setLoading(true);

        try {
            const amountNum = parseFloat(amount);
            if (isNaN(amountNum) || amountNum <= 0) {
                throw new Error('Invalid amount');
            }

            await onSubmit(recipient, amountNum);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Transaction failed');
        } finally {
            setLoading(false);
        }
    }

    return (
        <Card>
            <CardHeader>
                <CardTitle>{title}</CardTitle>
                <CardDescription>{description}</CardDescription>
            </CardHeader>
            <CardContent>
                <form onSubmit={handleSubmit} className="space-y-4">
                    <div className="space-y-2">
                        <label htmlFor="recipient" className="text-sm font-medium">
                            Recipient Address
                        </label>
                        <input
                            id="recipient"
                            type="text"
                            value={recipient}
                            onChange={e => setRecipient(e.target.value)}
                            placeholder="Enter Solana address"
                            className="w-full px-3 py-2 border rounded-lg text-sm font-mono"
                            disabled={disabled || loading}
                            required
                        />
                    </div>

                    <div className="space-y-2">
                        <label htmlFor="amount" className="text-sm font-medium">
                            Amount (SOL)
                        </label>
                        <input
                            id="amount"
                            type="number"
                            step="0.001"
                            min="0.001"
                            value={amount}
                            onChange={e => setAmount(e.target.value)}
                            className="w-full px-3 py-2 border rounded-lg text-sm"
                            disabled={disabled || loading}
                            required
                        />
                    </div>

                    {error && (
                        <Alert variant="destructive">
                            <p className="text-sm">{error}</p>
                        </Alert>
                    )}

                    <Button type="submit" disabled={disabled || loading || !recipient} className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        {loading ? 'Sending...' : 'Send Transaction'}
                    </Button>
                </form>
            </CardContent>
        </Card>
    );
}
