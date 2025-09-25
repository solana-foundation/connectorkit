'use client'

import React from 'react'
import { ConnectButton, solanaTheme, mergeThemeOverrides } from '@connector-kit/connector'
import { StandardWalletDemo } from './standard-wallet-demo'
import { TransactionStandardDemo } from './transaction-standard-demo'
import { SwapDemo } from './swap-demo'

export function ArcDemo() {
  return (
    <div className="h-full flex flex-col gap-4 p-4 overflow-y-auto">        
      <div className="flex-1 space-y-4">
        <div className="space-y-4 grid grid-cols-1 md:grid-cols-2 gap-4">
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
            <ConnectButton
              variant="default"
              label="Connect"
              theme={mergeThemeOverrides(solanaTheme, {
                colors: {
                  ...solanaTheme.colors,
                  primary: '#111827',
                  secondary: '#334155',
                  border: '#e2e8f0',
                },
                borderRadius: {
                  ...solanaTheme.borderRadius,
                  md: 10,
                },
                button: {
                  ...solanaTheme.button,
                  height: 80,
                  shadow: 'md',
                  border: '1px solid #e2e8f0',
                },
              })}
            />
          </div>
          <StandardWalletDemo />
          <TransactionStandardDemo />
          <SwapDemo />
        </div>
      </div>
    </div>
  )
}