'use client'

import React, { useState, useEffect, useTransition, useDeferredValue, useCallback } from 'react'
import { AnimatePresence, motion } from "motion/react"
import { useBalance, useAirdrop, useCluster, useEnhancedCluster, useWalletAddress, WalletUiClusterDropdown } from '@armadura/sdk'
import { useConnector, ConnectorErrorBoundary } from '@connector-kit/connector'
import { Button } from './ui/button'
import { Alert, AlertDescription } from './ui/alert'
import { Spinner } from './ui/spinner'
import { Droplets, RefreshCw } from 'lucide-react'
import { WalletCard } from "./wallet-card"

/**
 * Stable version of StandardWalletDemo
 */
function StandardWalletDemoStableContent() {
  const [isPending, startWalletTransition] = useTransition()
  
  const [hasStarted, setHasStarted] = useState(false)
  const [isRevealing, setIsRevealing] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  const {
    wallets,
    selectedWallet,
    select,
    disconnect,
  } = useConnector()

  const { address, connected, connecting } = useWalletAddress()
  
  const deferredConnected = useDeferredValue(connected)
  const deferredAddress = useDeferredValue(address)

  const { 
    balance, 
    isLoading: balanceLoading, 
    error: balanceError,
    refetch: refetchBalance 
  } = useBalance({ address: deferredAddress || undefined })

  const {
    requestAirdrop,
    isLoading: airdropLoading,
    error: airdropError,
    data: airdropResult
  } = useAirdrop()

  const { 
    name: clusterName, 
    isDevnet,
    isMainnet,
    canAirdrop,
  } = useCluster()

  const { canSwitch } = useEnhancedCluster()

  const formatBalance = useCallback((lamports: bigint) => {
    return (Number(lamports) / 1e9).toFixed(4)
  }, [])

  const truncateAddress = useCallback((address: string | null) => {
    if (!address) return 'No address'
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }, [])

  const handleWalletSelect = useCallback(async (walletName: string) => {
    setHasStarted(true)
    
    startWalletTransition(() => {
      const connectWallet = async () => {
        try {
          if (select) {
            await select(walletName)
            setIsRevealing(true)
          } else {
            throw new Error('Wallet selection not available')
          }
        } catch (error) {
          console.error('❌ [StandardWalletDemo] Connection failed:', error)
          resetAnimation()
        }
      }
      
      connectWallet()
    })
  }, [select])

  const resetAnimation = useCallback(async () => {
    startWalletTransition(() => {
      const disconnectWallet = async () => {
        try {
          await disconnect()
        } catch (error) {
          console.error('❌ [StandardWalletDemo] Disconnect failed:', error)
        }
      }
      
      disconnectWallet()
    })
  }, [disconnect])

  useEffect(() => {
    if (deferredConnected && !hasStarted) {
      setHasStarted(true)
      setIsRevealing(true)
    }
  }, [deferredConnected, hasStarted, deferredAddress])

  useEffect(() => {
    if (!deferredConnected && hasStarted) {
      setHasStarted(false)
      setIsRevealing(false)
    }
  }, [deferredConnected, hasStarted])

  useEffect(() => {
    setHasMounted(true)
  }, [])

  // SSR safety - render placeholder until mounted
  if (!hasMounted) {
    return (
      <div className="space-y-6">
        <div className="flex flex-col items-center justify-center w-full h-[400px] rounded-3xl bg-white gap-6 p-6">
          <div className="text-center text-gray-500 py-8">
            <p className="mb-4">Loading wallets...</p>
            <Spinner size={24} className="mx-auto" />
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      
      {/* Cluster Switcher */}
      {canSwitch && (
        <div className="flex justify-center">
          <div className="bg-white rounded-xl border border-gray-200 p-4 shadow-sm">
            <div className="flex items-center gap-3">
              <span className="text-sm font-medium text-gray-700">Network:</span>
              <WalletUiClusterDropdown />
            </div>
          </div>
        </div>
      )}

      {/* Main Demo Container */}
      <div 
        className="relative flex flex-col items-center justify-center w-full h-[500px] rounded-xl gap-6 p-6 border border-gray-200"
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
        
        {/* Refresh Button */}
        {deferredConnected && deferredAddress && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              startWalletTransition(() => {
                refetchBalance()
              })
            }}
            disabled={balanceLoading || isPending}
            className="group absolute top-4 right-4 h-8 w-8 p-0 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-white bg-zinc-100 transition-all duration-300 ease-in-out"
          >
            {balanceLoading ? (
              <Spinner size={14} />
            ) : (
              <RefreshCw className="h-4 w-4 text-gray-500 hover:text-gray-700 group-hover:scale-110 transition-all duration-300 ease-in-out" />
            )}
          </Button>
        )}

        {/* Airdrop Button */}
        {deferredConnected && deferredAddress && Number(balance) === 0 && canAirdrop && (
          <Button 
            size="sm"
            onClick={() => {
              startWalletTransition(() => {
                const performAirdrop = async () => {
                  try {
                    if (!deferredAddress) return
                    await requestAirdrop(deferredAddress)
                    setTimeout(() => refetchBalance(), 4000)
                  } catch (error) {
                    console.error('Airdrop error:', error)
                  }
                }
                performAirdrop()
              })
            }}
            disabled={airdropLoading || isPending}
            className="absolute bottom-4 right-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 rounded-full"
          >
            {airdropLoading || isPending ? (
              <>
                <Spinner size={14} />
                Requesting...
              </>
            ) : (
              <>
                <Droplets className="h-3 w-3" />
                Airdrop
              </>
            )}
          </Button>
       )}

        {!hasStarted ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-6"
          >
            {/* Stable Wallet Selection */}
            <div className="w-full min-w-sm space-y-3">
              {wallets && wallets.length > 0 ? (
                <>
                  <div className="flex justify-between items-center text-xs text-gray-500 px-2">
                    <span>{wallets.filter((w: any) => w.installed).length} of {wallets.length} wallets installed</span>
                  </div>
                  
                  {wallets.map((walletInfo: any, index: number) => (
                    <motion.div
                      key={`${walletInfo.name}-${index}`}
                      className="flex items-center justify-between h-[60px] p-2 pr-3 border border-gray-200 rounded-full hover:border-gray-300 transition-colors bg-white"
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <div className="flex items-center text-left gap-3">
                        <img 
                          src={walletInfo.icon} 
                          alt={walletInfo.name}
                          className="w-10 h-10 rounded-full"
                          onError={(e) => {
                            e.currentTarget.src = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNDAiIGhlaWdodD0iNDAiIHZpZXdCb3g9IjAgMCA0MCA0MCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPHJlY3Qgd2lkdGg9IjQwIiBoZWlnaHQ9IjQwIiByeD0iOCIgZmlsbD0iIzY2NjZmZiIvPgo8cGF0aCBkPSJNMTIgMTZIMjhWMjRIMTJWMTZaIiBmaWxsPSJ3aGl0ZSIvPgo8L3N2Zz4K'
                          }}
                        />
                        <div>
                          <div className="font-medium text-sm text-gray-800">{walletInfo.name}</div>
                          <div className="text-xs text-gray-500">
                            {walletInfo.installed ? 'Ready to connect' : 'Not installed'}
                          </div>
                        </div>
                      </div>
                      
                      {walletInfo.installed ? (
                        <Button
                          onClick={() => handleWalletSelect(walletInfo.name)}
                          disabled={connecting || isPending}
                          className="bg-gray-950 border-t border-white/50 ring ring-gray-950 text-white rounded-full active:scale-[0.95] transition-all duration-300 ease-in-out"
                        >
                          {connecting || isPending ? (
                            <>
                              <Spinner size={16} className="mr-2" />
                              Connecting...
                            </>
                          ) : (
                            'Connect'
                          )}
                        </Button>
                      ) : (
                        <Button
                          variant="outline"
                          onClick={() => {
                            const installUrl = walletInfo.name.toLowerCase().includes('phantom') ? 'https://phantom.app' : 
                                              walletInfo.name.toLowerCase().includes('backpack') ? 'https://backpack.app' :
                                              walletInfo.name.toLowerCase().includes('solflare') ? 'https://solflare.com' :
                                              'https://phantom.app'
                            window.open(installUrl, '_blank')
                          }}
                          className="border-gray-300 text-gray-600 hover:text-gray-800"
                        >
                          Install
                        </Button>
                      )}
                    </motion.div>
                  ))}
                </>
              ) : (
                <div className="text-center text-gray-500 py-8">
                  <p className="mb-4">No wallets detected</p>
                  <p className="text-sm text-gray-400 mb-6">
                    Install a Solana wallet to get started
                  </p>
                  <div className="flex gap-3 justify-center">
                    <Button
                      onClick={() => window.open('https://phantom.app', '_blank')}
                      className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white"
                    >
                      Install Phantom
                    </Button>
                    <Button
                      onClick={() => window.open('https://backpack.app', '_blank')}
                      className="bg-gradient-to-r from-orange-600 to-red-600 hover:from-orange-700 hover:to-red-700 text-white"
                    >
                      Install Backpack
                    </Button>
                  </div>
                </div>
              )}
            </div>
          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <div className="relative">
              {/* Wallet Card */}
              <motion.div
                className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
                initial={{ opacity: 1 }}
                style={{
                  clipPath: isRevealing 
                    ? 'circle(150% at 50% 50%)' 
                    : 'circle(0% at 50% 50%)',
                  transition: 'clip-path 0.5s ease-in-out'
                }}
              >
                <WalletCard 
                  key={deferredAddress || 'default'}
                  walletName={deferredConnected ? `Connected to ${clusterName}` : selectedWallet?.name || "Wallet"}
                  ethValue={deferredConnected && balance !== null && balance !== undefined ? `${formatBalance(balance)} SOL` : 
                           deferredConnected && !deferredAddress ? "No Address Found" :
                           "0 SOL"}
                  uniqueId={deferredAddress || "1"}
                  bgColor={deferredConnected ? (isDevnet ? "#10b981" : isMainnet ? "#2d2d2d" : "#FFBE1A") : "#FFBE1A"}
                  address={deferredAddress || undefined}
                  onDisconnect={resetAnimation}
                />
              </motion.div>

              {connecting && (
                <div className="flex flex-col items-center gap-4">
                  <motion.p
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0 }}
                    className="text-gray-500 text-xl font-medium"
                  >
                    Connecting to {selectedWallet?.name || 'wallet'}...
                  </motion.p>
                  <Spinner size={32} />
                </div>
              )}
            </div>
          </AnimatePresence>
        )}
      </div>

      {/* Error/Success Messages */}
      {airdropError && (
        <Alert variant="destructive">
          <AlertDescription className="space-y-2">
            <div className="font-medium">Airdrop Failed</div>
            <div className="text-sm">{airdropError.message}</div>
          </AlertDescription>
        </Alert>
      )}

      {airdropResult && (
        <Alert>
          <AlertDescription>
            🪂 Airdrop successful! {Number(airdropResult.amount) / 1e9} SOL sent
          </AlertDescription>
        </Alert>
      )}

      {balanceError && (
        <Alert variant="destructive">
          <AlertDescription>
            Balance Error: {balanceError.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  )
}

export function StandardWalletDemo() {
  return (
    <ConnectorErrorBoundary
      maxRetries={3}
      fallback={(error, retry) => (
        <div className="flex flex-col items-center justify-center w-full h-[400px] rounded-xl bg-red-50 border border-red-200 gap-4 p-6">
          <div className="text-red-600 font-semibold">Demo Error</div>
          <div className="text-red-500 text-sm text-center max-w-md">
            {error.message}
          </div>
          <div className="flex gap-2">
            <Button onClick={retry} variant="outline" className="border-red-300 text-red-600">
              Try Again
            </Button>
            <Button onClick={() => window.location.reload()} className="bg-red-600 text-white">
              Refresh Page
            </Button>
          </div>
        </div>
      )}
    >
      <StandardWalletDemoStableContent />
    </ConnectorErrorBoundary>
  )
}
