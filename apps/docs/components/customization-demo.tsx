'use client'

import React, { useState } from 'react'
import { 
  ConnectButton, 
  useModal, 
  useConnector,
  themes,
  solanaTheme,
  phantomTheme,
  minimalTheme,
  darkTheme,
  getPopularWallets,
  getMobileWallets,
  mergeThemeOverrides,
  modalRoutes,
  type ThemeName 
} from '@connector-kit/connector'

export function CustomizationDemo() {
  const [selectedTheme, setSelectedTheme] = useState<ThemeName | 'custom'>('solana')
  const [showAdvanced, setShowAdvanced] = useState(false)
  const modal = useModal()
  const { connected, selectedWallet, accounts } = useConnector()
  
  const popularWallets = getPopularWallets()
  const mobileWallets = getMobileWallets()
  
  // Custom theme with brand colors
  const customTheme = mergeThemeOverrides(solanaTheme, {
    colors: {
      ...solanaTheme.colors,
      primary: '#FF6B35',
      secondary: '#F7931E', 
      accent: '#FFD23F',
    },
    button: {
      ...solanaTheme.button,
      height: 56,
      shadow: 'xl',
    },
    name: 'Custom Brand',
  })

  const handleThemeChange = (theme: ThemeName) => {
    setSelectedTheme(theme)
  }

  const currentTheme = selectedTheme === 'solana' ? solanaTheme :
                       selectedTheme === 'phantom' ? phantomTheme :
                       selectedTheme === 'minimal' ? minimalTheme :
                       selectedTheme === 'dark' ? darkTheme :
                       selectedTheme === 'custom' ? customTheme : solanaTheme

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-8">
      {/* Theme Showcase */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-2xl font-bold">Theme Customization</h2>
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-blue-600 hover:text-blue-800"
          >
            {showAdvanced ? 'Hide' : 'Show'} Advanced
          </button>
        </div>
        
        {/* Theme Selector */}
        <div className="flex flex-wrap gap-2 mb-4">
          {Object.keys(themes).map((themeName) => (
            <button
              key={themeName}
              onClick={() => handleThemeChange(themeName as ThemeName)}
              className={`px-4 py-2 rounded-lg border transition-colors ${
                selectedTheme === themeName
                  ? 'bg-purple-600 text-white border-purple-600'
                  : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
              }`}
            >
              {themeName.charAt(0).toUpperCase() + themeName.slice(1)}
            </button>
          ))}
          <button
            onClick={() => setSelectedTheme('custom')}
            className={`px-4 py-2 rounded-lg border transition-colors ${
              selectedTheme === 'custom'
                ? 'bg-orange-600 text-white border-orange-600'
                : 'bg-gray-100 hover:bg-gray-200 border-gray-300'
            }`}
          >
            Custom Brand
          </button>
        </div>
        
        {/* Connect Buttons Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div className="p-6 border rounded-lg bg-white">
            <h3 className="font-semibold mb-3">Default Size</h3>
            <ConnectButton theme={selectedTheme === 'custom' ? customTheme : currentTheme} />
          </div>
          
          <div className="p-6 border rounded-lg bg-gray-50">
            <h3 className="font-semibold mb-3">Icon Only</h3>
            <ConnectButton 
              variant="icon-only" 
              theme={selectedTheme === 'custom' ? customTheme : currentTheme}
            />
          </div>
          
          <div className="p-6 border rounded-lg bg-gray-900">
            <h3 className="font-semibold mb-3 text-white">On Dark Background</h3>
            <ConnectButton 
              theme={selectedTheme === 'custom' ? customTheme : darkTheme}
              label="Connect Wallet"
            />
          </div>
        </div>
      </section>

      {/* Modal Management */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Modal Management</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <button
            onClick={modal.openWallets}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Open Wallets
          </button>
          <button
            onClick={modal.openProfile}
            disabled={!connected}
            className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Profile
          </button>
          <button
            onClick={() => modal.open(modalRoutes.ACCOUNT_SETTINGS)}
            disabled={!connected}
            className="px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            Settings
          </button>
          <button
            onClick={() => modal.open(modalRoutes.NETWORK_SETTINGS)}
            className="px-4 py-2 bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
          >
            Network
          </button>
        </div>
        
        {/* Modal Status */}
        <div className="p-4 bg-gray-100 rounded-lg">
          <p className="text-sm">
            <strong>Modal Status:</strong> {modal.isOpen ? 'Open' : 'Closed'} 
            {modal.isOpen && (
              <span className="ml-2">
                | <strong>Route:</strong> {modal.route}
              </span>
            )}
          </p>
        </div>
      </section>

      {/* Wallet Registry */}
      <section className="space-y-4">
        <h2 className="text-2xl font-bold">Wallet Registry</h2>
        
        <div className="grid md:grid-cols-2 gap-6">
          {/* Popular Wallets */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              🌟 Popular Wallets 
              <span className="text-sm font-normal text-gray-600">({popularWallets.length})</span>
            </h3>
            <div className="space-y-2">
              {popularWallets.map((wallet) => (
                <div key={wallet.name} className="flex items-center gap-3 p-3 border rounded-lg">
                  <img 
                    src={wallet.icon} 
                    alt={wallet.name}
                    className="w-8 h-8 rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{wallet.name}</div>
                    <div className="text-xs text-gray-500 flex gap-1">
                      {wallet.capabilities?.supportsVersionedTransactions && (
                        <span className="bg-green-100 text-green-700 px-1 py-0.5 rounded">V0</span>
                      )}
                      {wallet.capabilities?.supportsSignIn && (
                        <span className="bg-blue-100 text-blue-700 px-1 py-0.5 rounded">SignIn</span>
                      )}
                    </div>
                  </div>
                  {wallet.isPopular && (
                    <span className="text-xs bg-yellow-100 text-yellow-800 px-2 py-1 rounded-full">
                      Popular
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Mobile Wallets */}
          <div className="space-y-3">
            <h3 className="text-lg font-semibold flex items-center gap-2">
              📱 Mobile Wallets
              <span className="text-sm font-normal text-gray-600">({mobileWallets.length})</span>
            </h3>
            <div className="space-y-2">
              {mobileWallets.map((wallet) => (
                <div key={wallet.name} className="flex items-center gap-3 p-3 border rounded-lg">
                  <img 
                    src={wallet.icon} 
                    alt={wallet.name}
                    className="w-8 h-8 rounded-full"
                    onError={(e) => {
                      e.currentTarget.style.display = 'none'
                    }}
                  />
                  <div className="flex-1">
                    <div className="font-medium">{wallet.name}</div>
                    <div className="text-xs text-gray-500">
                      {wallet.downloadUrls?.ios && wallet.downloadUrls?.android ? 'iOS & Android' :
                       wallet.downloadUrls?.ios ? 'iOS' :
                       wallet.downloadUrls?.android ? 'Android' : 'Mobile'}
                    </div>
                  </div>
                  <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded-full">
                    Mobile
                  </span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Connection State */}
      {connected && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Connection State</h2>
          <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
            <div className="flex items-center gap-3 mb-3">
              <img 
                src={selectedWallet?.icon} 
                alt={selectedWallet?.name}
                className="w-10 h-10 rounded-full"
                onError={(e) => {
                  e.currentTarget.style.display = 'none'
                }}
              />
              <div>
                <div className="font-semibold text-green-800">{selectedWallet?.name}</div>
                <div className="text-sm text-green-600">Connected</div>
              </div>
            </div>
            
            {accounts.length > 1 && (
              <div className="mt-3">
                <div className="text-sm font-medium text-green-800 mb-1">
                  Accounts ({accounts.length})
                </div>
                <div className="space-y-1">
                  {accounts.map((account, index) => (
                    <div key={account.address} className="text-xs text-green-700 font-mono">
                      {index + 1}. {account.address.slice(0, 8)}...{account.address.slice(-8)}
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </section>
      )}

      {/* Advanced Customization */}
      {showAdvanced && (
        <section className="space-y-4">
          <h2 className="text-2xl font-bold">Advanced Customization</h2>
          
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Custom Theme Code</h3>
              <pre className="text-xs bg-gray-100 p-4 rounded-lg overflow-x-auto">
{`const customTheme = mergeThemeOverrides(solanaTheme, {
  colors: {
    primary: '#FF6B35',
    secondary: '#F7931E', 
    accent: '#FFD23F',
  },
  button: {
    height: 56,
    shadow: 'xl',
  },
  name: 'Custom Brand',
})`}
              </pre>
            </div>
            
            <div className="space-y-3">
              <h3 className="text-lg font-semibold">Modal Hook Usage</h3>
              <pre className="text-xs bg-gray-100 p-4 rounded-lg overflow-x-auto">
{`const modal = useModal()

// Open specific routes
modal.openWallets()
modal.openProfile()
modal.open(modalRoutes.ACCOUNT_SETTINGS)

// Check state
modal.isOpen // boolean
modal.route  // current route`}
              </pre>
            </div>
          </div>
        </section>
      )}
    </div>
  )
}
