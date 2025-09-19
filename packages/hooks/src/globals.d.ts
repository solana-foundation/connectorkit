// Global type declarations for Arc package

declare global {
  interface Window {
    addEventListener: (event: string, callback: () => void) => void
  }
}

export {}