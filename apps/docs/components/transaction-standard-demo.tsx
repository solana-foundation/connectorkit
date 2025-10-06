'use client'

import { AnimatePresence, motion } from "motion/react";
import { useEffect, useState } from "react";
import { useTransaction, useBalance, useArmaClient } from '@armadura/sdk'
import { useArmaduraTransaction, useConnectorClient } from '@connector-kit/connector/react'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Spinner } from './ui/spinner'
import { CheckCircle } from 'lucide-react'
import { 
  address, 
  lamports,
} from '@solana/kit'
import { getTransferSolInstruction } from '@solana-program/system'
import { IconGamecontrollerFill } from "symbols-react";
import { Input } from "./ui/input";

export function TransactionStandardDemo() {
    const [hasMounted, setHasMounted] = useState(false)
    const [showTransaction, setShowTransaction] = useState(false);
    const [amount, setAmount] = useState('0.001');
    const [toAddress, setToAddress] = useState('');
    const [isProcessing, setIsProcessing] = useState(false);
    const [txResult, setTxResult] = useState<{ signature: string; confirmed: boolean } | null>(null);

    // 🎉 Shared wallet state through ArcClient context (replacement for deprecated useWallet)
    const { wallet: { connected, selectedAccount: walletAddress, signer } } = useArmaClient()
    const { balance, isLoading: balanceLoading, refetch: refetchBalance } = useBalance({ address: walletAddress || undefined }) // Explicit address from standard wallets
    
    // 🔍 Wrap with auto-tracking for debug panel
    const armaduraTx = useTransaction()
    const { sendTransaction, isLoading, error } = useArmaduraTransaction(armaduraTx)
    const connectorClient = useConnectorClient()

    useEffect(() => { setHasMounted(true) }, [])

    const formatBalance = (lamports: bigint) => {
        return (Number(lamports) / 1e9).toFixed(4)
    }

    const truncateAddress = (address: string) => {
        return `${address.slice(0, 6)}...${address.slice(-6)}`
    }

    const truncateSignature = (signature: string) => {
        return `${signature.slice(0, 8)}...${signature.slice(-8)}`
    }

    const handlePercentageSelect = (percentage: number) => {
        if (balance && balance > 0) {
            const balanceInSol = Number(balance) / 1e9
            const percentAmount = balanceInSol * (percentage / 100)
            
            // Leave a small buffer for fees if 100%
            const finalAmount = percentage === 100 ? 
                Math.max(0, percentAmount - 0.001) : percentAmount
            
            setAmount(finalAmount.toFixed(4))
        }
    }

    // Components
    const ToSection = () => (
        <div className="space-y-2">
            <div className="relative">
                <Input
                    type="text"
                    value={toAddress}
                    onChange={(e) => setToAddress(e.target.value)}
                    placeholder="Destination address"
                    className="font-mono text-xs pl-12 placeholder:text-gray-300"
                />
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-md font-rounded font-bold text-gray-400 pointer-events-none">
                    To
                </div>
            </div>
        </div>
    )

    const FromSection = () => (
        <div className="space-y-2">
            <div className="relative">
                <div className="font-mono pl-12 pr-3 py-2 bg-gray-50 rounded-xl border border-[#EBEBEB] hover:border-[#D8D8D8] min-h-[40px] flex items-center">
                        <div className="flex flex-col flex-1">
                        <div className="text-sm font-rounded font-bold text-gray-800 text-left ml-4">
                            {walletAddress ? truncateAddress(walletAddress) : 'Unknown'}
                        </div>
                    </div>
                </div>
                <div className="absolute left-3 top-1/2 transform -translate-y-1/2 text-md font-rounded font-bold text-gray-400 pointer-events-none">
                    From
                </div>
            </div>
        </div>
    )

    const BigNumberInput = () => (
        <div className="space-y-3">
            <div className="relative">
                <input
                    type="number"
                    step="0.001"
                    value={amount}
                    onChange={(e) => setAmount(e.target.value)}
                    placeholder="0.0000"
                    className="w-full text-5xl font-bold text-center border-0 bg-transparent focus:outline-none text-gray-800 placeholder:text-gray-300"
                />
            </div>
        </div>
    )

    const PresetButtons = () => (
        <div className="space-y-2">
            <div className="flex flex-row justify-between items-center gap-2">
                <span className="block text-xs font-mono font-medium text-gray-600">
                    Balance
                </span>
                <span className="text-xs text-gray-500 font-mono">
                    {balanceLoading ? 'Loading...' : balance !== null && balance !== undefined ? `${formatBalance(balance)} SOL` : '0.0000 SOL'}
                </span>
            </div>
            <div className="grid grid-cols-4 gap-2">
                {[10, 25, 50, 100].map((percentage) => (
                    <Button
                        key={percentage}
                        variant="outline"
                        size="sm"
                        onClick={() => handlePercentageSelect(percentage)}
                        disabled={!balance || balance === 0n}
                        className="text-xs font-mono"
                    >
                        {percentage}%
                    </Button>
                ))}
            </div>
        </div>
    )

    // Auto-show transaction form when a wallet is connected and signer is ready
    useEffect(() => {
        if (connected && signer) {
            setShowTransaction(true)
        } else {
            setShowTransaction(false)
        }
    }, [connected, signer])

    const handleSendTransaction = async () => {
        if (!signer || !walletAddress) {
            alert('Please connect wallet first')
            return
        }

        // Check if user has enough balance
        const transferAmountLamports = BigInt(Math.floor(parseFloat(amount) * 1_000_000_000))
        const minimumRequired = transferAmountLamports + BigInt(5000) // Transfer amount + ~0.000005 SOL for fees
        
        if (balance !== null && balance !== undefined && balance < minimumRequired) {
            alert(`Insufficient balance! You need at least ${Number(minimumRequired) / 1e9} SOL (${amount} SOL + fees). Current balance: ${formatBalance(balance)} SOL.`)
            return
        }

        setIsProcessing(true);
        
        try {
            // Create transfer instruction
            const transferInstruction = getTransferSolInstruction({
                source: signer,
                destination: address(toAddress),
                amount: lamports(transferAmountLamports),
            })
            
            const transactionConfig = {
                instructions: [transferInstruction],
                config: {
                    feePayer: signer || undefined
                }
            }
            
            // 🎉 Explicit signer from standard wallets
            const result = await sendTransaction(transactionConfig)
            
            setTxResult(result)
            
            // Refresh balance after successful transaction
            setTimeout(() => refetchBalance(), 2000)
            
        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : String(error)
            if (errorMessage.includes('simulation') || errorMessage.includes('no record of a prior credit')) {
                alert(`Transaction failed: Account has no SOL!\n\nThis happened because the wallet address (${walletAddress ? truncateAddress(walletAddress) : 'Unknown'}) might not have enough SOL.\n\nPlease fund your wallet and try again.`)
            } else {
                alert(`Transaction failed: ${errorMessage}`)
            }
        } finally {
            setIsProcessing(false)
        }
    }

    const resetDemo = () => {
        setShowTransaction(false);
        setTxResult(null);
        setAmount('0.001');
        setToAddress('11111111111111111111111111111112');
    }

    if (!hasMounted) {
        return (
            <div className="space-y-6">
                <div className="flex flex-col items-center justify-center w-full h-[400px] rounded-3xl bg-white gap-6 p-6">
                    <div className="text-center text-gray-500 py-8">
                        <p className="mb-4">Preparing transaction demo...</p>
                        <Spinner size={24} className="mx-auto" />
                    </div>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            {/* Main Demo Container */}
            <div 
                className="flex flex-col items-center justify-center w-full h-[400px] rounded-xl gap-6 p-6 border border-gray-200"
                style={{
                    backgroundImage: `repeating-linear-gradient(
                        45deg,
                        transparent,
                        transparent 10px,
                        rgba(46, 77, 97, 0.08) 10px,
                        rgba(46, 77, 97, 0.08) 11px
                    )`
                }}
            >
                {!showTransaction ? (
                    <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="flex flex-col items-center gap-4 rounded-full p-4 py-2 border border-gray-300 bg-zinc-100 border-dashed"
                    >
                        <div className="text-center text-gray-500 text-sm">
                            {connected ? (
                                <div className="flex flex-col items-center gap-2">
                                    <Spinner size={16} />
                                    <span>Preparing wallet…</span>
                                </div>
                            ) : (
                                <div className="flex flex-row items-center gap-2">
                                    <IconGamecontrollerFill className="h-4.5 w-4.5 translate-x-0 translate-y-0 fill-gray-300" />
                                    <span className="text-gray-500 font-mono">Connect a wallet to send</span>
                                </div>
                            )}
                        </div>

                    </motion.div>
                ) : (
                    <AnimatePresence mode="wait">
                        {!txResult ? (
                            <motion.div
                                key="transaction-form"
                                initial={{ opacity: 0, y: 20 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -20 }}
                                className="w-full max-w-md space-y-4 p-6 rounded-3xl bg-white border border-gray-200"
                            >
                                {/* Big Number Input */}
                                <div className="py-1">
                                    <BigNumberInput />
                                </div>

                                {/* Preset Buttons */}
                                <PresetButtons />

                                {/* From Section */}
                                <FromSection />

                                {/* To Section */}
                                <ToSection />
                            

                                
                                
                                {/* Send Button */}
                                <Button
                                    variant="default"
                                    size="lg"
                                    onClick={handleSendTransaction}
                                    disabled={isLoading || isProcessing || !signer || !amount || parseFloat(amount) <= 0}
                                    className="w-full py-4 text-white flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"
                                >
                                    {(isLoading || isProcessing) ? (
                                        <>
                                            <Spinner size={16} />
                                            Sending Transaction...
                                        </>
                                    ) : (
                                        <>
                                            Send Transaction
                                        </>
                                    )}
                                </Button>
                            </motion.div>
                        ) : (
                            <motion.div
                                key="transaction-result"
                                initial={{ opacity: 0, scale: 0.9 }}
                                animate={{ opacity: 1, scale: 1 }}
                                className="text-center space-y-4 p-6 rounded-3xl bg-white border border-gray-200"
                            >
                                <motion.div
                                    initial={{ scale: 0 }}
                                    animate={{ scale: 1 }}
                                    transition={{ delay: 0.2 }}
                                    className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto"
                                >
                                    <CheckCircle className="w-8 h-8 text-green-600" />
                                </motion.div>

                                <div>
                                    <h3 className="text-lg font-semibold text-gray-700 mb-2">
                                        Transaction Successful!
                                    </h3>
                                    <div className="space-y-2 text-sm text-gray-600">
                                        <div>
                                            <span className="font-medium">Amount:</span> {amount} SOL
                                        </div>
                                        <div>
                                            <span className="font-medium">To:</span> {truncateAddress(toAddress)}
                                        </div>
                                        <div>
                                            <span className="font-medium">Signature:</span> 
                                            <code className="ml-1 text-xs bg-gray-100 px-2 py-1 rounded">
                                                {truncateSignature(txResult.signature)}
                                            </code>
                                        </div>
                                        <div>
                                            <span className="font-medium">Status:</span> 
                                            <span className="ml-1 text-green-600">
                                                {txResult.confirmed ? 'Confirmed' : 'Pending'}
                                            </span>
                                        </div>
                                    </div>
                                </div>

                                <Button
                                    onClick={resetDemo}
                                    variant="outline"
                                    className="w-full py-3 rounded-xl"
                                >
                                    Send Another Transaction
                                </Button>
                            </motion.div>
                        )}
                    </AnimatePresence>
                )}
            </div>

            {/* Error Display */}
            {error && (
                <Alert variant="destructive">
                    <AlertDescription>
                        <div className="font-medium">Transaction Failed</div>
                        <div className="text-sm mt-1">{error.message}</div>
                    </AlertDescription>
                </Alert>
            )}

            {/* Info Footer */}
            <div className="hidden text-center text-xs text-gray-500 space-y-1">
                <div>✨ Powered by Wallet Standard + Solana Kit 2.0</div>
                <div>🔗 Real transactions on devnet</div>
            </div>
        </div>
    )
}