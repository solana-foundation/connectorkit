'use client'

import { useEffect, useMemo, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import { useArcClient, useSwap, useBalance } from '@connectorkit/hooks'
import { Button } from './ui/button'
import { Input } from './ui/input'
import { Spinner } from './ui/spinner'
import { ArrowUpDown, CheckCircle } from 'lucide-react'
import { IconGamecontrollerFill } from 'symbols-react'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from './ui/select'

interface TokenOption {
  symbol: string
  mint: string
  decimals: number
}

const TOKENS: TokenOption[] = [
  { symbol: 'SOL', mint: 'So11111111111111111111111111111111111111112', decimals: 9 }, // WSOL
  { symbol: 'USDC', mint: 'EPjFWdd5AufqSSqeM2qN1xzybapC8G4wEGGkZwyTDt1v', decimals: 6 },
  { symbol: 'USDT', mint: 'Es9vMFrzaCERmJfrF4H2FYD4KCoNkY11McCe8BenwNYB', decimals: 6 },
]

function findTokenByMint(mint: string): TokenOption | undefined {
  return TOKENS.find(t => t.mint === mint)
}

function formatAmount(amount: bigint, decimals: number): string {
  const divisor = 10 ** decimals
  return (Number(amount) / divisor).toFixed(Math.min(decimals, 6))
}

function solToLamportsBigInt(amountSol: string): bigint {
  const trimmed = amountSol.trim()
  if (!trimmed) return 0n
  const [ints, frac = ''] = trimmed.split('.')
  const fracPadded = (frac + '000000000').slice(0, 9)
  const big = BigInt(ints || '0') * 1000000000n + BigInt(fracPadded || '0')
  return big
}

export function SwapDemo() {
  const [mounted, setMounted] = useState(false)
  const { wallet } = useArcClient()
  const { balance, isLoading: balanceLoading, refetch: refetchBalance } = useBalance({ address: wallet.address || undefined })

  // UI state
  const [fromMint, setFromMint] = useState(TOKENS[0].mint) // SOL (WSOL)
  const [toMint, setToMint] = useState(TOKENS[1].mint) // USDC
  const [amountSol, setAmountSol] = useState('0.001')
  const [slippageBps, setSlippageBps] = useState(50)
  const [swapResult, setSwapResult] = useState<{ signature: string; confirmed: boolean } | null>(null)
  const [isExecuting, setIsExecuting] = useState(false)

  const { isLoading, quotes, error, getQuotes, executeSwap, selectQuote } = useSwap({ strategy: 'best-price' })

  useEffect(() => { setMounted(true) }, [])

  // Debounced auto-quote on changes
  useEffect(() => {
    if (!wallet.connected) return
    const handle = setTimeout(() => {
      const lamports = solToLamportsBigInt(amountSol)
      if (lamports <= 0n) return
      void getQuotes({
        inputMint: fromMint as any,
        outputMint: toMint as any,
        amount: lamports as any,
        slippageBps,
      })
    }, 400)
    return () => clearTimeout(handle)
  }, [wallet.connected, fromMint, toMint, amountSol, slippageBps])

  const bestQuote = quotes?.[0]
  const toToken = useMemo(() => findTokenByMint(toMint), [toMint])
  const estimatedOut = useMemo(() => {
    if (!bestQuote || !toToken) return null
    return `${formatAmount(bestQuote.outputAmount, toToken.decimals)} ${toToken.symbol}`
  }, [bestQuote, toToken])

  function resetSwap() {
    setSwapResult(null)
  }

  if (!mounted) return null

  return (
    <div className="space-y-6">
      <div 
        className="flex flex-col items-center justify-center w-full h-[400px] rounded-xl gap-6 p-6 border border-gray-200"
        style={{
          backgroundImage: `repeating-linear-gradient(45deg, transparent, transparent 10px, rgba(46, 77, 97, 0.08) 10px, rgba(46, 77, 97, 0.08) 11px)`
        }}
      >
        {!wallet.connected ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-4 rounded-full p-4 py-2 border border-gray-300 bg-zinc-100 border-dashed"
          >
            <div className="text-center text-gray-500 text-sm">
              <div className="flex flex-row items-center gap-2">
                <IconGamecontrollerFill className="h-4.5 w-4.5 translate-x-0 translate-y-0 fill-gray-300" />
                <span className="text-gray-500 font-mono">Connect a wallet to swap</span>
              </div>
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            {!swapResult ? (
              <motion.div
                key="swap-form"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className="w-full max-w-md space-y-4 p-6 py-4 rounded-3xl bg-white border border-gray-200"
              >
              <div className="flex items-center justify-between w-full">
                <div className="text-sm font-medium text-gray-700 flex items-center w-full">
                  <div className="flex items-center gap-2 w-full">
                    <span className="text-xl font-bold sr-only">Swap</span>
                    <span className="text-sm text-gray-300">Balance:</span>
                    <span className="text-sm text-gray-500">
                        {fromMint === TOKENS[0].mint
                        ? (balanceLoading ? 'Loading…' : balance != null ? `${(Number(balance) / 1e9).toFixed(6)} SOL` : '—')
                        : '—'}
                    </span>                        
                  </div>
                  <div className="flex items-center justify-center text-[11px] text-gray-500">
                    {fromMint === TOKENS[0].mint && balance != null && balance > 0n && (
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        className="h-6 px-2 py-0 text-[10px]"
                        onClick={() => {
                          const feeBuffer = 5000n
                          const spendable = balance > feeBuffer ? balance - feeBuffer : 0n
                          const solAmt = Number(spendable) / 1e9
                          setAmountSol(solAmt.toFixed(6))
                        }}
                      >
                        Max
                      </Button>
                    )}
                  </div>
                  {(isLoading || isExecuting) && <Spinner size={16} />}
                </div>
              </div>

              <div className="space-y-2">
                {/* From */}
                <div className="rounded-3xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="w-40">
                      <Select value={fromMint} onValueChange={setFromMint}>
                        <SelectTrigger className="h-9 text-sm rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TOKENS.map((t) => (
                            <SelectItem key={t.mint} value={t.mint}>{t.symbol}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <Input
                      value={amountSol}
                      onChange={e => setAmountSol(e.target.value)}
                      placeholder="0.00"
                      className="text-right text-base"
                      inputMode="decimal"
                    />
                  </div>
                </div>

                {/* Flip */}
                <div className="flex justify-center">
                  <Button type="button" variant="outline" size="icon" onClick={() => { setFromMint(toMint); setToMint(fromMint) }} className="h-8 w-8">
                    <ArrowUpDown className="h-4 w-4" />
                  </Button>
                </div>

                {/* To */}
                <div className="rounded-3xl border border-gray-200 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div className="">
                      <Select value={toMint} onValueChange={setToMint}>
                        <SelectTrigger className="h-9 text-sm rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          {TOKENS.map((t) => (
                            <SelectItem key={t.mint} value={t.mint}>{t.symbol}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex items-center gap-2 mr-1">
                      <div className="text-right text-[15px] text-gray-400 font-bold">
                        {estimatedOut ? estimatedOut : '—'}
                      </div>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-6 w-6"
                        onClick={() => {
                          const lamports = solToLamportsBigInt(amountSol)
                          if (lamports <= 0n) return
                          void getQuotes({
                            inputMint: fromMint as any,
                            outputMint: toMint as any,
                            amount: lamports as any,
                            slippageBps,
                          })
                        }}
                        disabled={!wallet.connected || isLoading}
                        aria-label="Refresh quotes"
                      >
                        <svg className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="23 4 23 10 17 10" />
                          <polyline points="1 20 1 14 7 14" />
                          <path d="M3.51 9a9 9 0 0114.13-3.36L23 10" />
                          <path d="M20.49 15a9 9 0 01-14.13 3.36L1 14" />
                        </svg>
                      </Button>
                    </div>
                  </div>
                </div>

                {/* Slippage */}
                <div className="flex items-center justify-between text-xs text-gray-600">
                  <div>Slippage</div>
                  <div className="flex items-center gap-2">
                    <Input
                      value={(slippageBps / 100).toString()}
                      onChange={e => {
                        const pct = Number(e.target.value)
                        if (Number.isFinite(pct) && pct >= 0) setSlippageBps(Math.round(pct * 100))
                      }}
                      className="h-7 w-16 text-right"
                    />
                    <span>%</span>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-2">
                  <Button
                    variant="default"
                    size="lg"
                    className="w-full py-4 text-white flex items-center justify-center gap-2 rounded-xl bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300"

                    onClick={async () => {
                      const target = quotes[0]
                      if (!target) return
                      setIsExecuting(true)
                      setSwapResult(null)
                      try {
                        const result = await executeSwap(target)
                        setSwapResult(result)
                        setTimeout(() => { refetchBalance() }, 2000)
                      } catch (err: any) {
                        if (err?.code !== 'USER_CANCELLED') console.error('Swap failed:', err)
                      } finally {
                        setIsExecuting(false)
                      }
                    }}
                    disabled={!wallet.connected || !quotes[0] || isExecuting}
                  >
                    {(isLoading || isExecuting) ? (<><Spinner size={16} className="mr-2" /> Processing...</>) : 'Swap'}
                  </Button>
                </div>

                {error && <div className="text-xs text-red-600">{error.message}</div>}
              </div>
              </motion.div>
            ) : (
              <motion.div
                key="swap-result"
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center space-y-4 p-6 rounded-3xl bg-white border border-gray-200"
              >
              <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.2 }} className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto">
                <CheckCircle className="w-8 h-8 text-green-600" />
              </motion.div>
              <div>
                <h3 className="text-lg font-semibold text-gray-700 mb-2">Swap Successful!</h3>
                <div className="space-y-2 text-sm text-gray-600">
                  <div><span className="font-medium">From:</span> {findTokenByMint(fromMint)?.symbol}</div>
                  <div><span className="font-medium">To:</span> {findTokenByMint(toMint)?.symbol}</div>
                  <div>
                    <span className="font-medium">Signature:</span>
                    <code className="ml-1 text-xs bg-gray-100 px-2 py-1 rounded">{swapResult.signature.slice(0, 8)}...{swapResult.signature.slice(-8)}</code>
                  </div>
                  <div>
                    <span className="font-medium">Status:</span>
                    <span className="ml-1 text-green-600">{swapResult.confirmed ? 'Confirmed' : 'Pending'}</span>
                  </div>
                </div>
              </div>
              <Button onClick={resetSwap} variant="outline" className="w-full py-3 rounded-xl">Make Another Swap</Button>
              </motion.div>
            )}
          </AnimatePresence>
        )}
      </div>
    </div>
  )
}

