'use client'

import { useState, useEffect, useCallback } from 'react'
import { getWallets } from '@wallet-standard/app'
import type { Wallet } from '@wallet-standard/base'
import { address, type Address, type TransactionSigner, type SignatureBytes, type Transaction, type TransactionMessageBytes } from '@solana/kit'

export class WalletStandardKitSigner {
  readonly address: Address
  
  constructor(
    private walletAccount: any,
    private wallet: Wallet
  ) {
    this.address = address(walletAccount.address)
    
  }

  async modifyAndSignTransactions<T extends Transaction>(
    transactions: readonly T[], 
    config?: any
  ): Promise<readonly T[]> {
    
    
    try {
      const signTransactionFeature = (this.wallet.features as any)['solana:signTransaction']
      if (!signTransactionFeature) {
        throw new Error(`Wallet ${this.wallet.name} does not support transaction signing`)
      }
      
      const signedTransactions = []
      
      for (const transaction of transactions) {
        
        
        if (transaction.messageBytes instanceof Uint8Array) {
          const signaturesCount = 1
          const totalLength = 1 + (signaturesCount * 64) + transaction.messageBytes.length
          const serializedTransaction = new Uint8Array(totalLength)
          
          let offset = 0
          serializedTransaction[offset] = signaturesCount
          offset += 1
          
          for (let i = 0; i < signaturesCount; i++) {
            serializedTransaction.fill(0, offset, offset + 64)
            offset += 64
          }
          
          serializedTransaction.set(transaction.messageBytes, offset)
          
          
          
          const walletResult = await signTransactionFeature.signTransaction({
            account: this.walletAccount,
            transaction: serializedTransaction
          })
          
          
          
          let signedTransactionBytes: Uint8Array
          
          if (Array.isArray(walletResult)) {
            const firstResult = walletResult[0]
            if (firstResult?.signedTransaction instanceof Uint8Array) {
              signedTransactionBytes = firstResult.signedTransaction
            } else {
              throw new Error('Wallet returned invalid array result format')
            }
          } else if (walletResult?.signedTransaction instanceof Uint8Array) {
            signedTransactionBytes = walletResult.signedTransaction
          } else if (walletResult instanceof Uint8Array) {
            signedTransactionBytes = walletResult
          } else {
            throw new Error('Wallet returned unexpected signing result format')
          }
          
          if (signedTransactionBytes.length > 65) {
            // Parse the wire format: [signature_count (short-u16)][signatures][message]
            let offset = 0
            
            // Read signature count as short-u16 (variable length 1-3 bytes)
            let signatureCount = 0
            let byteCount = 0
            while (++byteCount) {
              const byteIndex = byteCount - 1
              const currentByte = signedTransactionBytes[offset + byteIndex]
              const nextSevenBits = 0b1111111 & currentByte
              signatureCount |= nextSevenBits << (byteIndex * 7)
              if ((currentByte & 0b10000000) === 0) {
                // No continuation bit, we're done
                break
              }
            }
            offset += byteCount
            
            // Extract the first signature (64 bytes)
            const signature = signedTransactionBytes.slice(offset, offset + 64) as SignatureBytes
            
            // Extract the message bytes (everything after signatures)
            const messageStartOffset = offset + (signatureCount * 64)
            const newMessageBytes = signedTransactionBytes.slice(messageStartOffset) as Uint8Array
            
            // debug log removed
            
            // The wallet may have modified the transaction, so we need to use the new message bytes
            const signedTransaction = {
              ...transaction,
              messageBytes: newMessageBytes as unknown as TransactionMessageBytes,
              signatures: {
                ...transaction.signatures,
                [this.address]: signature
              }
            } as T
            
            signedTransactions.push(signedTransaction)
            
          } else {
            throw new Error('Wallet returned invalid signed transaction format')
          }
        } else {
          throw new Error('Transaction messageBytes must be Uint8Array for wallet signing')
        }
      }
      
          
      return signedTransactions as readonly T[]
      
    } catch (error) {
      
      throw error
    }
  }
}

export interface StandardWalletInfo {
  wallet: Wallet
  name: string
  icon: string
  installed: boolean
  connecting: boolean
}

export interface UseStandardWalletsOptions {
  autoConnect?: boolean
}

export interface UseStandardWalletsReturn {
  wallets: StandardWalletInfo[]
  selectedWallet: Wallet | null
  connecting: boolean
  connected: boolean
  address: string | null
  signer: TransactionSigner | null
  select: (walletName: string) => Promise<void>
  disconnect: () => Promise<void>
}

export function useStandardWallets(options: UseStandardWalletsOptions = {}): UseStandardWalletsReturn {
  const { autoConnect = false } = options
  
  const [wallets, setWallets] = useState<StandardWalletInfo[]>([])
  const [selectedWallet, setSelectedWallet] = useState<Wallet | null>(null)
  const [connecting, setConnecting] = useState(false)
  const [connectedAccount, setConnectedAccount] = useState<any>(null)
  const [signer, setSigner] = useState<TransactionSigner | null>(null)

  useEffect(() => {
    const walletsApi = getWallets()
    
    const updateWallets = () => {
      const detectedWallets = walletsApi.get()
      
      const uniqueWallets = detectedWallets.reduce((acc, wallet) => {
        const existing = acc.find(w => w.name === wallet.name)
        if (!existing) {
          acc.push(wallet)
        }
        return acc
      }, [] as Wallet[])
      
      const solanaCompatibleWallets = uniqueWallets.filter(wallet => {
        const features = Object.keys(wallet.features)
        const hasSolanaFeatures = features.some(feature => 
          feature.includes('solana') || 
          feature.includes('connect') || 
          feature.includes('sign') ||
          feature.includes('standard')
        )
        return hasSolanaFeatures
      })
      
      
      
      const walletInfos: StandardWalletInfo[] = solanaCompatibleWallets.map(wallet => ({
        wallet,
        name: wallet.name,
        icon: wallet.icon || '',
        installed: true,
        connecting: false
      }))
      
      setWallets(walletInfos)
    }
    
    updateWallets()
    
    const unsubscribe = walletsApi.on('register', updateWallets)
    const unsubscribe2 = walletsApi.on('unregister', updateWallets)
    
    return () => {
      unsubscribe()
      unsubscribe2()
    }
  }, [])

  const select = useCallback(async (walletName: string) => {
    const wallet = wallets.find(w => w.name === walletName)?.wallet
    if (!wallet) {
      throw new Error(`Wallet ${walletName} not found`)
    }

    
    setConnecting(true)

    try {
      const connectFeature = (wallet.features as any)['standard:connect']
      if (!connectFeature) {
        throw new Error(`Wallet ${walletName} does not support standard connect`)
      }

      const result = await connectFeature.connect()
      const account = result.accounts[0]
      const addressString = account.address
      
      
      
      const kitSigner = new WalletStandardKitSigner(account, wallet)
      
      setSelectedWallet(wallet)
      setConnectedAccount(account)
      setSigner(kitSigner)
      
    } catch (error) {
      
      throw error
    } finally {
      setConnecting(false)
    }
  }, [wallets])

  const disconnect = useCallback(async () => {
    try {
      setSelectedWallet(null)
      setConnectedAccount(null)
      setSigner(null)
      
    } catch (error) {
      
      throw error
    }
  }, [])

  return {
    wallets,
    selectedWallet,
    connecting,
    connected: !!connectedAccount,
    address: connectedAccount?.address || null,
    signer,
    select,
    disconnect
  }
}