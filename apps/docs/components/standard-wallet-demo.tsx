'use client'

import React, { useState, useEffect } from 'react'
import { AnimatePresence, motion } from "motion/react"
import { useBalance, useAirdrop, useCluster, useWalletAddress, WalletUiClusterDropdown } from '@connectorkit/sdk'
import { useConnector } from '@connectorkit/connector'
import { Button } from './ui/button'

import { Alert, AlertDescription } from './ui/alert'
import { Spinner } from './ui/spinner'
import { Droplets, RefreshCw } from 'lucide-react'
import { WalletCard } from "./wallet-card"

/**
 * Demo component using the Wallet Standard's auto-detection.
 * Much simpler than custom adapters - automatically detects all installed wallets!
 * Now enhanced with context for automatic state sharing!
 */
export function StandardWalletDemo() {
  const [hasStarted, setHasStarted] = useState(false)
  const [isRevealing, setIsRevealing] = useState(false)
  const [hasMounted, setHasMounted] = useState(false)

  // 🎉 Wallet list and selection from Connector Kit
  const {
    wallets,
    selectedWallet,
    select,
    disconnect,
  } = useConnector()

  const { address, connected, connecting } = useWalletAddress()

  const { 
    balance, 
    isLoading: balanceLoading, 
    error: balanceError,
    refetch: refetchBalance 
  } = useBalance({ address: address || undefined })

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
    canSwitch,
    setCluster,
    clusters
  } = useCluster()

  // Utility functions
  const formatBalance = (lamports: bigint) => {
    return (Number(lamports) / 1e9).toFixed(4)
  }

  const truncateAddress = (address: string | null) => {
    if (!address) return 'No address'
    return `${address.slice(0, 6)}...${address.slice(-6)}`
  }

  const handleWalletSelect = async (walletName: string) => {
    setHasStarted(true)
    
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

  const resetAnimation = async () => {
    try {
      await disconnect()
      console.log('✅ [StandardWalletDemo] Wallet disconnected successfully')
    } catch (error) {
      console.error('❌ [StandardWalletDemo] Disconnect failed:', error)
    }
  }

  // Auto-show wallet when connected but animation not started
  useEffect(() => {
    if (connected && !hasStarted) {
      setHasStarted(true)
      setIsRevealing(true)
    }
  }, [connected, hasStarted])

  // Reset animation state when wallet disconnects
  useEffect(() => {
    if (!connected && hasStarted) {
      setHasStarted(false)
      setIsRevealing(false)
    }
  }, [connected, hasStarted])

  // Hydration fix: Only render wallets after component has mounted on client
  useEffect(() => {
    setHasMounted(true)
  }, [])

  // Render a stable placeholder until mounted to prevent SSR/CSR mismatch
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

  // Check if any wallets are installed
  const hasInstalledWallets = wallets?.some((w: any) => w.installed) || false

  return (
    <div className="space-y-6">
      
      {/* Cluster Switcher - only shows if multiple clusters available */}
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

      {/* Main Animation Container */}
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
        
        {/* Top Right Refresh Button */}
        {connected && address && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetchBalance()}
            disabled={balanceLoading}
            className="group absolute top-4 right-4 h-8 w-8 p-0 rounded-full border border-gray-200 hover:border-gray-300 hover:bg-white bg-zinc-100 transition-all duration-300 ease-in-out"
          >
            {balanceLoading ? (
              <Spinner size={14} />
            ) : (
              <RefreshCw className="h-4 w-4 text-gray-500 hover:text-gray-700 group-hover:scale-110 transition-all duration-300 ease-in-out" />
            )}
          </Button>
        )}

        {/* Bottom Right Actions */}
        {connected && address && Number(balance) === 0 && canAirdrop && (
          <Button 
            size="sm"
            onClick={async () => {
              try {
                if (!address) return
                await requestAirdrop(address)
                setTimeout(() => refetchBalance(), 4000)
              } catch (error) {
                console.error('Airdrop error:', error)
              }
            }}
            disabled={airdropLoading}
            className="absolute bottom-4 right-4 flex items-center gap-2 bg-blue-600 hover:bg-blue-700 rounded-full"
          >
            {airdropLoading ? (
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
            {/* Wallet Selection */}
            <div className="w-full min-w-sm space-y-3">
              {!hasMounted ? (
                // Loading state that matches server-side rendering
                <div className="text-center text-gray-500 py-8">
                  <p className="mb-4">Loading wallets...</p>
                  <Spinner size={24} className="mx-auto" />
                </div>
              ) : wallets && wallets.length > 0 ? (
                wallets.map((walletInfo: any, index: number) => (
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
                          // Fallback for missing icons
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
                        disabled={connecting}
                        className="bg-gray-950 border-t border-white/50 ring ring-gray-950 text-white rounded-full active:scale-[0.95] transition-all duration-300 ease-in-out"
                      >
                        {connecting ? (
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
                          // Get install URL based on wallet name
                          const installUrl = walletInfo.name.toLowerCase().includes('phantom') ? 'https://phantom.app' : 
                                            walletInfo.name.toLowerCase().includes('backpack') ? 'https://backpack.app' :
                                            walletInfo.name.toLowerCase().includes('solflare') ? 'https://solflare.com' :
                                            'https://phantom.app' // default fallback
                          window.open(installUrl, '_blank')
                        }}
                        className="border-gray-300 text-gray-600 hover:text-gray-800"
                      >
                        Install
                      </Button>
                    )}
                  </motion.div>
                ))
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
                    <Button
                      onClick={() => window.open('https://solflare.com', '_blank')}
                      className="bg-gradient-to-r from-green-600 to-blue-600 hover:from-green-700 hover:to-blue-700 text-white"
                    >
                      Install Solflare
                    </Button>
                  </div>
                </div>
              )}
            </div>


          </motion.div>
        ) : (
          <AnimatePresence mode="wait">
            <div className="relative">
              {/* Wallet Card with mask */}
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
                  key={address || 'default'}
                  walletName={connected ? `Connected to ${clusterName}` : selectedWallet?.name || "Wallet"}
                  ethValue={connected && balance !== null && balance !== undefined ? `${formatBalance(balance)} SOL` : 
                           connected && !address ? "No Address Found" :
                           "0 SOL"}
                  uniqueId={address || "1"}
                  bgColor={connected ? (isDevnet ? "#10b981" : isMainnet ? "#2d2d2d" : "#FFBE1A") : "#FFBE1A"}
                  address={address || undefined}
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