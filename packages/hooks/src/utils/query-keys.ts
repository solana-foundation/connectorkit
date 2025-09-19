export const queryKeys = {
  all: ['arc'] as const,
  
  // Account queries
  account: (address?: string) => [...queryKeys.all, 'account', { address }] as const,
  balance: (address?: string, rpcUrl?: string) => [...queryKeys.all, 'balance', { address, rpcUrl }] as const,
  
  // Token queries
  tokenAccount: (address?: string, mint?: string) => [...queryKeys.all, 'tokenAccount', { address, mint }] as const,
  tokenAccountsByOwner: (owner?: string) => [...queryKeys.all, 'tokenAccountsByOwner', { owner }] as const,
  tokenBalance: (tokenAccount?: string) => [...queryKeys.all, 'tokenBalance', { tokenAccount }] as const,
  
  // Mint/Program queries
  mint: (mintAddress?: string) => [...queryKeys.all, 'mint', { mintAddress }] as const,
  programAccount: (programId?: string, address?: string) => [...queryKeys.all, 'programAccount', { programId, address }] as const,
  multipleAccounts: (addresses?: string[]) => [...queryKeys.all, 'multipleAccounts', { addresses }] as const,
  
  // Network queries
  blockHeight: (rpcUrl?: string) => [...queryKeys.all, 'blockHeight', { rpcUrl }] as const,
  epochInfo: (rpcUrl?: string) => [...queryKeys.all, 'epochInfo', { rpcUrl }] as const,
  slot: (rpcUrl?: string) => [...queryKeys.all, 'slot', { rpcUrl }] as const,
  latestBlockhash: (rpcUrl?: string) => [...queryKeys.all, 'latestBlockhash', { rpcUrl }] as const,
  prioritizationFees: (rpcUrl?: string) => [...queryKeys.all, 'prioritizationFees', { rpcUrl }] as const,
  
  // Transaction queries
  signatureStatuses: (signatures?: string[]) => [...queryKeys.all, 'signatureStatuses', { signatures }] as const,
  
  // Stake queries
  stakeAccount: (address?: string) => [...queryKeys.all, 'stakeAccount', { address }] as const,
  
  // Wallet queries
  standardWallets: () => [...queryKeys.all, 'standardWallets'] as const,
} as const
