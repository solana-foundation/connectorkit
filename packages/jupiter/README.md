# @connector-kit/jupiter

Jupiter DEX integration for token swapping functionality with ConnectorKit.

## Installation

```bash
npm install @connector-kit/jupiter @connector-kit/sdk
```

## 🎯 Purpose

Provides seamless Jupiter DEX integration for ConnectorKit applications:
- Token swapping with Jupiter aggregator
- Quote fetching and price comparison  
- Transaction building and execution
- Token list management

## 🏗️ Usage Pattern

```typescript
// 1. Setup with SDK
import { ArcProvider } from '@connector-kit/sdk'
import { createJupiter } from '@connector-kit/jupiter'

<ArcProvider 
  network="mainnet-beta"
  providers={[createJupiter()]}
>
  <YourApp />
</ArcProvider>

// 2. Use Jupiter swap hooks
import { useSwap } from '@connector-kit/jupiter'

function SwapComponent() {
  const { 
    quote, 
    swap, 
    isLoading,
    supportedTokens 
  } = useSwap()

  const handleSwap = async () => {
    const quoteResponse = await quote({
      inputMint: 'SOL',
      outputMint: 'USDC',
      amount: 1000000 // 0.001 SOL
    })
    
    if (quoteResponse) {
      await swap(quoteResponse)
    }
  }

  return (
    <button onClick={handleSwap} disabled={isLoading}>
      {isLoading ? 'Swapping...' : 'Swap SOL to USDC'}
    </button>
  )
}
```

## 🔧 Configuration

```typescript
import { createJupiter } from '@connector-kit/jupiter'

const jupiterProvider = createJupiter({
  apiUrl: 'https://quote-api.jup.ag/v6',
  slippageBps: 50, // 0.5%
  computeUnitPriceMicroLamports: 1000,
})
```

## 🚀 Extension Examples

Following this pattern, you can create additional DeFi integrations:

- `@connector-kit/marinade` - Liquid staking with Marinade
- `@connector-kit/kamino` - Yield farming with Kamino  
- `@connector-kit/drift` - Perpetuals trading with Drift
- `@connector-kit/phoenix` - Order book trading with Phoenix
- `@connector-kit/orca` - AMM swaps with Orca

Each follows the same provider interface pattern for consistency.
