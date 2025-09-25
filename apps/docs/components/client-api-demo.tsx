'use client'

import { useState } from 'react'
import { Button } from './ui/button'
import { Badge } from './ui/badge'
import { Alert, AlertDescription } from './ui/alert'
import { Spinner } from './ui/spinner'
import { motion } from 'motion/react'
import { Code, Server, Monitor, Zap } from 'lucide-react'

// Import both client and hooks for demonstration
import { useBalance, useArcClient } from '@connector-kit/sdk'

/**
 * 🚀 Demo: Arc Client API vs React Hooks
 * 
 * Shows both backend/server usage with createArc() and 
 * frontend/React usage with hooks working side by side.
 */
// Wrapper component with error boundary
function ClientApiDemoSafe() {
  try {
    return <ClientApiDemoInner />
  } catch (error) {
    return (
      <div className="flex flex-col items-center justify-center w-full min-h-[400px] rounded-3xl bg-white gap-6 p-6">
        <div className="text-center">
          <h3 className="text-xl font-semibold text-gray-700 mb-2">Client API Demo</h3>
          <p className="text-sm text-red-600">Error loading demo. Please ensure ArcProvider is set up.</p>
        </div>
      </div>
    )
  }
}

function ClientApiDemoInner() {
  const [isSubmitted, setIsSubmitted] = useState(false)
  const [clientData, setClientData] = useState<any>(null)
  const [clientLoading, setClientLoading] = useState(false)
  const [clientError, setClientError] = useState<string | null>(null)

  // 🎯 FRONTEND: React hooks (context-aware)
  const { wallet, network } = useArcClient()
  const { balance, isLoading: hooksLoading, error: hooksError } = useBalance()
  
  // Safe access with fallbacks
  const connected = wallet?.connected || false
  const address = wallet?.address || null
  const networkName = network?.isMainnet ? 'mainnet' : 'devnet'
  const isDevnet = network?.isDevnet || false

  // 🚀 REAL SERVER API: Call actual Next.js API route
  const runClientExample = async () => {
    setClientLoading(true)
    setClientError(null)
    setClientData(null)

    try {
      console.log('🔄 [Client Demo] Calling REAL server API...')
      
      // 🎯 KEY: Use the SAME wallet address that the frontend hooks are using
      const targetAddress = address || '11111111111111111111111111111111' // Fallback to system program if no wallet
      
      console.log('🌐 [Client Demo] Making HTTP request to server API for:', targetAddress)
      
      // This is a REAL API call to our Next.js API route
      // The server runs createArc() and returns the results
      const response = await fetch(`/api/wallet/${targetAddress}`, {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        }
      })

      if (!response.ok) {
        throw new Error(`Server API returned ${response.status}: ${response.statusText}`)
      }

      const serverResults = await response.json()
      
      // Transform server response to match our UI expectations
      const results = {
        timestamp: serverResults.timestamp,
        network: serverResults.serverInfo.network,
        rpcUrl: serverResults.serverInfo.rpcUrl,
        isDevnet: serverResults.serverInfo.isDevnet,
        targetAddress: serverResults.targetAddress,
        isConnectedWallet: !!address,
        environment: serverResults.environment,
        executionTime: serverResults.executionTime,
        serverInfo: serverResults.serverInfo,
        operations: {
          balance: {
            success: serverResults.operations.balance.success,
            value: serverResults.operations.balance.success ? serverResults.operations.balance.value : null,
            solValue: serverResults.operations.balance.success ? serverResults.operations.balance.solValue : null,
            error: serverResults.operations.balance.success ? null : serverResults.operations.balance.error,
            address: serverResults.targetAddress
          },
          mint: {
            success: serverResults.operations.mint.success,
            supply: serverResults.operations.mint.success ? serverResults.operations.mint.supply : null,
            decimals: serverResults.operations.mint.success ? serverResults.operations.mint.decimals : null,
            error: serverResults.operations.mint.success ? null : serverResults.operations.mint.error
          }
        }
      }

      setClientData(results)
      console.log('✅ [Client Demo] Server API call completed')
      console.log('📊 [Client Demo] Server execution time:', serverResults.executionTime)
      
    } catch (error: any) {
      console.error('❌ [Client Demo] Server API call failed:', error)
      setClientError(`Server API Error: ${error.message}`)
    } finally {
      setClientLoading(false)
    }
  }

  const handleStart = () => {
    setIsSubmitted(true)
    runClientExample()
  }

  const handleReset = () => {
    setIsSubmitted(false)
    setClientData(null)
    setClientError(null)
  }

  return (
    <div className="space-y-6">
      {/* Main Container */}
      <div className="flex flex-col items-center justify-center w-full min-h-[400px] rounded-3xl bg-white gap-6 p-6">
        {!isSubmitted ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="flex flex-col items-center gap-6 w-full max-w-md"
          >
            <div className="text-center mb-4">
              <div className="flex items-center justify-center gap-3 mb-3">
                <div className="w-12 h-12 bg-purple-600 rounded-xl flex items-center justify-center">
                  <Code className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h3 className="text-xl font-semibold text-gray-700">Client API vs React Hooks</h3>
                  <p className="text-sm text-gray-500">Backend server API meets Frontend hooks</p>
                </div>
              </div>
              
              <div className="flex justify-center gap-2 flex-wrap mb-4">
                <Badge variant="secondary">Backend Client</Badge>
                <Badge variant="secondary">React Hooks</Badge>
                <Badge variant="secondary">Side-by-Side</Badge>
              </div>

              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-200 mb-4 text-left">
                <h4 className="font-semibold text-blue-800 mb-2">🎯 How to use this demo:</h4>
                <ol className="text-sm text-blue-700 space-y-1">
                  <li><strong>1.</strong> First, connect your wallet using the demo above ⬆️</li>
                  <li><strong>2.</strong> Then click the button below to see both APIs fetch YOUR wallet's balance</li>
                  <li><strong>3.</strong> Compare: Both should show identical SOL amounts!</li>
                </ol>
                <p className="text-xs text-blue-600 mt-2">
                  💡 This proves that <code>createArc()</code> (backend) and <code>useBalance()</code> (frontend) work with the same Solana data.
                </p>
              </div>
            </div>

            <Button
              onClick={handleStart}
              className="flex items-center gap-2 bg-purple-600 hover:bg-purple-700 text-white border-0"
            >
              <Server className="w-4 h-4" />
              {connected ? 'Compare Both APIs with My Wallet' : 'Run Demo (Connect Wallet First)'}
            </Button>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="w-full max-w-4xl space-y-6"
          >
            {/* Header */}
                          <div className="text-center mb-4">
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Real Server vs Browser Demo</h3>
                <p className="text-sm text-gray-500 mb-3">Same wallet, same data - server API vs browser hooks</p>
              
              {/* Status indicator */}
              <div className="flex items-center justify-center gap-4 text-xs">
                <div className="flex items-center gap-2">
                  <div className={`w-2 h-2 rounded-full ${connected ? 'bg-green-500' : 'bg-gray-300'}`}></div>
                  <span className={connected ? 'text-green-600' : 'text-gray-500'}>
                    Wallet: {connected ? 'Connected' : 'Not Connected'}
                  </span>
                </div>
                {connected && address && (
                  <div className="text-gray-500 font-mono">
                    Target: {address.slice(0, 8)}...{address.slice(-8)}
                  </div>
                )}
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Backend/Client API Results */}
              <div className="bg-gray-50 rounded-xl p-4 border border-gray-200">
                <div className="flex items-center gap-2 mb-4">
                  <Server className="w-5 h-5 text-purple-600" />
                  <h4 className="font-semibold text-gray-700">Real Server API</h4>
                  <Badge variant="outline" className="text-xs">Next.js API Route</Badge>
                </div>

                {clientLoading && (
                  <div className="flex items-center gap-2 text-gray-600">
                    <Spinner className="w-4 h-4" />
                    <span className="text-sm">Calling server API...</span>
                  </div>
                )}

                {clientError && (
                  <Alert className="border-red-200 bg-red-50">
                    <AlertDescription className="text-red-700 text-sm">
                      Error: {clientError}
                    </AlertDescription>
                  </Alert>
                )}

                {clientData && (
                  <div className="space-y-3">
                                    <div className="text-xs text-gray-500 font-mono">
                  Server: {clientData.environment} • {clientData.executionTime} • {clientData.timestamp}
                </div>
                    
                    <div className="space-y-2">
                      <div className="bg-white rounded-lg p-3 border">
                          <div className="text-sm font-medium text-gray-700">
                           Balance via Server API
                          {clientData.isConnectedWallet && (
                            <span className="text-green-600 text-xs ml-2">🔗 Your Wallet</span>
                          )}
                        </div>
                        {clientData.operations.balance.success ? (
                          <div className="text-sm text-gray-600">
                            ✅ {clientData.operations.balance.solValue.toFixed(4)} SOL
                            <div className="text-xs text-gray-500 font-mono">
                              {clientData.targetAddress.slice(0, 8)}...{clientData.targetAddress.slice(-8)}
                            </div>
                            <div className="text-xs text-gray-500">
                              ({clientData.operations.balance.value.toLocaleString()} lamports)
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-red-600">❌ {clientData.operations.balance.error}</div>
                        )}
                      </div>

                      <div className="bg-white rounded-lg p-3 border">
                        <div className="text-sm font-medium text-gray-700">Mint Operation</div>
                        {clientData.operations.mint.success ? (
                          <div className="text-sm text-gray-600">
                            ✅ Wrapped SOL ({clientData.operations.mint.decimals} decimals)
                            <div className="text-xs text-gray-500">
                              Supply: {(Number(clientData.operations.mint.supply) / 1e9).toFixed(0)} SOL
                            </div>
                          </div>
                        ) : (
                          <div className="text-sm text-red-600">❌ {clientData.operations.mint.error}</div>
                        )}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              {/* Frontend/React Hooks Results */}
              <div className="bg-blue-50 rounded-xl p-4 border border-blue-200">
                <div className="flex items-center gap-2 mb-4">
                  <Monitor className="w-5 h-5 text-blue-600" />
                  <h4 className="font-semibold text-gray-700">Frontend: React Hooks</h4>
                  <Badge variant="outline" className="text-xs">Client-side</Badge>
                </div>

                <div className="space-y-3">
                  <div className="text-xs text-gray-500 font-mono">
                    Network: {networkName} • Live Data
                  </div>

                  <div className="space-y-2">
                    <div className="bg-white rounded-lg p-3 border">
                      <div className="text-sm font-medium text-gray-700">
                        Balance via useBalance()
                        {connected && (
                          <span className="text-green-600 text-xs ml-2">🔗 Your Wallet</span>
                        )}
                      </div>
                      {!connected ? (
                        <div className="text-sm text-gray-500">
                          🔌 Connect wallet to see balance
                        </div>
                      ) : hooksLoading ? (
                        <div className="flex items-center gap-2 text-gray-600">
                          <Spinner className="w-3 h-3" />
                          <span className="text-sm">Loading...</span>
                        </div>
                      ) : hooksError ? (
                        <div className="text-sm text-red-600">❌ {hooksError.message}</div>
                      ) : (
                        <div className="text-sm text-gray-600">
                          ✅ {(Number(balance) / 1e9).toFixed(4)} SOL
                          <div className="text-xs text-gray-500 font-mono">
                            {address?.slice(0, 8)}...{address?.slice(-8)}
                          </div>
                          <div className="text-xs text-gray-500">
                            ({Number(balance).toLocaleString()} lamports)
                          </div>
                        </div>
                      )}
                    </div>

                    <div className="bg-white rounded-lg p-3 border">
                      <div className="text-sm font-medium text-gray-700">Context State</div>
                      <div className="text-sm text-gray-600">
                        ✅ Auto-coordinated via ArcProvider
                        <div className="text-xs text-gray-500">
                          Network: {isDevnet ? 'Devnet' : 'Other'} • Connected: {connected ? 'Yes' : 'No'}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison */}
            <div className="bg-gradient-to-r from-purple-50 to-blue-50 rounded-xl p-4 border border-purple-200">
              <div className="flex items-center gap-2 mb-3">
                <Zap className="w-5 h-5 text-purple-600" />
                <h4 className="font-semibold text-gray-700">What This Demo Shows</h4>
              </div>
              
              <div className="text-sm text-gray-700 mb-4">
                {connected ? (
                  <p className="bg-green-50 p-3 rounded border-l-4 border-green-400 text-green-800">
                    ✅ <strong>Perfect!</strong> Both APIs are fetching data for your connected wallet ({address?.slice(0, 8)}...{address?.slice(-8)}). 
                    You should see identical balance values - proving that both the backend client API and frontend hooks work with the same data source.
                  </p>
                ) : (
                  <p className="bg-yellow-50 p-3 rounded border-l-4 border-yellow-400 text-yellow-800">
                    💡 <strong>Connect your wallet first</strong> to see the real power! Without a wallet, the backend API falls back to querying the system program address for demonstration.
                  </p>
                )}
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                   <div className="font-medium text-purple-700 mb-1">Server API</div>
                  <ul className="text-gray-600 space-y-1 text-xs">
                    <li>• 🚀 Runs on Vercel/server</li>
                    <li>• 📦 No React dependencies</li>
                    <li>• ⚡ Direct Solana RPC calls</li>
                    <li>• 🔧 Perfect for serverless</li>
                    <li>• 🎯 HTTP API endpoint</li>
                  </ul>
                </div>
                <div>
                  <div className="font-medium text-blue-700 mb-1">Browser Hooks (useBalance)</div>
                  <ul className="text-gray-600 space-y-1 text-xs">
                    <li>• 🌐 Runs in your browser</li>
                    <li>• ⚛️ React Query caching</li>
                    <li>• 🔗 Context-aware state</li>
                    <li>• 🎮 Auto-wallet sync</li>
                    <li>• 💫 Real-time updates</li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="flex justify-center">
              <Button onClick={handleReset} variant="outline">
                Reset Demo
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  )
}

// Export the safe wrapper
export function ClientApiDemo() {
  return <ClientApiDemoSafe />
}