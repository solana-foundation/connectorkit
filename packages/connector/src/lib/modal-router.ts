/**
 * Modal Router with Route-Based Navigation
 */

// Modal routes
export const modalRoutes = {
  WALLETS: 'wallets',
  PROFILE: 'profile', 
  ACCOUNT_SELECTOR: 'account-selector',
  NETWORK_SWITCHER: 'network-switcher',
  WALLET_INFO: 'wallet-info',
  TRANSACTION_PREVIEW: 'tx-preview',
  ONBOARDING: 'onboarding',
  SETTINGS: 'settings',
  ABOUT: 'about'
} as const

export type ModalRoute = (typeof modalRoutes)[keyof typeof modalRoutes]

// Modal state with history and transitions
export interface ModalState {
  isOpen: boolean
  route: ModalRoute
  history: ModalRoute[]
  data?: Record<string, unknown>
  isTransitioning?: boolean
  direction?: 'forward' | 'backward'
}

// Modal router for managing navigation
export class ModalRouter {
  private state: ModalState
  private listeners = new Set<(state: ModalState) => void>()

  constructor() {
    this.state = {
      isOpen: false,
      route: modalRoutes.WALLETS,
      history: [],
      isTransitioning: false,
      direction: 'forward'
    }
  }

  // Get current state
  getState(): ModalState {
    return { ...this.state }
  }

  // Subscribe to state changes
  subscribe(listener: (state: ModalState) => void): () => void {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  // Notify all listeners
  private notify() {
    this.listeners.forEach(listener => listener(this.getState()))
  }

  // Open modal with optional route
  open(route: ModalRoute = modalRoutes.WALLETS, data?: Record<string, unknown>) {
    this.state = {
      ...this.state,
      isOpen: true,
      route,
      history: [],
      data,
      isTransitioning: false,
      direction: 'forward'
    }
    this.notify()
  }

  // Close modal
  close() {
    this.state = {
      ...this.state,
      isOpen: false,
      isTransitioning: false
    }
    this.notify()
  }

  // Navigate to route
  navigate(route: ModalRoute, data?: Record<string, unknown>) {
    if (!this.state.isOpen) {
      this.open(route, data)
      return
    }

    this.state = {
      ...this.state,
      history: [...this.state.history, this.state.route],
      route,
      data,
      isTransitioning: true,
      direction: 'forward'
    }
    this.notify()

    // Clear transition state after animation
    setTimeout(() => {
      this.state = { ...this.state, isTransitioning: false }
      this.notify()
    }, 200)
  }

  // Go back to previous route
  back() {
    if (this.state.history.length === 0) {
      this.close()
      return
    }

    const previousRoute = this.state.history[this.state.history.length - 1]
    const newHistory = this.state.history.slice(0, -1)

    this.state = {
      ...this.state,
      route: previousRoute,
      history: newHistory,
      data: undefined,
      isTransitioning: true,
      direction: 'backward'
    }
    this.notify()

    // Clear transition state after animation
    setTimeout(() => {
      this.state = { ...this.state, isTransitioning: false }
      this.notify()
    }, 200)
  }

  // Check if can go back
  canGoBack(): boolean {
    return this.state.history.length > 0
  }

  // Reset to initial route
  reset() {
    this.state = {
      ...this.state,
      route: modalRoutes.WALLETS,
      history: [],
      data: undefined,
      isTransitioning: false,
      direction: 'forward'
    }
    this.notify()
  }
}

// Route validation based on connection state
export function validateRoute(route: ModalRoute, connected: boolean): ModalRoute {
  // If not connected, only allow certain routes
  if (!connected) {
    const allowedRoutes: ModalRoute[] = [
      modalRoutes.WALLETS,
      modalRoutes.ONBOARDING,
      modalRoutes.ABOUT
    ]
    return allowedRoutes.includes(route) ? route : modalRoutes.WALLETS
  }

  // If connected, all routes are valid
  return route
}

// Default router instance
export const defaultModalRouter = new ModalRouter()

/**
 * Usage Examples:
 * 
 * ```typescript
 * // Open wallet selection
 * modalRouter.open(modalRoutes.WALLETS)
 * 
 * // Navigate to profile with smooth transition
 * modalRouter.navigate(modalRoutes.PROFILE)
 * 
 * // Go back with animation
 * modalRouter.back()
 * 
 * // Pass data between routes
 * modalRouter.navigate(modalRoutes.WALLET_INFO, { 
 *   walletName: 'Phantom',
 *   features: ['signing', 'encryption']
 * })
 * ```
 */
