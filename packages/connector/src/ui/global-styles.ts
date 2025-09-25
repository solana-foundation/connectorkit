let hasInjectedConnectorStyles = false

function injectConnectorGlobalStyles() {
  if (hasInjectedConnectorStyles) return
  if (typeof document === 'undefined') return

  // Import CSS styles - this will be handled by the build system
  // The CSS files will be bundled and injected automatically
  try {
    // Require CSS - this enables CSS bundling
    require('../styles/index.css')
    hasInjectedConnectorStyles = true
  } catch (error) {
    // Failed to load styles silently
    
    // Fallback: Inject minimal critical styles directly
    const style = document.createElement('style')
    style.setAttribute('data-connector-styles', 'true')
    style.textContent = `
/* ConnectorKit - Critical Styles Fallback */
@keyframes connector-spin {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

@keyframes connector-fade-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.connector-animate-spin {
  animation: connector-spin 1s linear infinite;
}

.connector-animate-fade-in {
  animation: connector-fade-in 0.3s ease-out;
}

/* Focus ring utilities */
.connector-focus-ring {
  outline: 2px solid #512da8;
  outline-offset: 2px;
}

/* Reduced motion support */
@media (prefers-reduced-motion: reduce) {
  .connector-animate-spin,
  .connector-animate-fade-in {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
  }
}
`
    document.head.appendChild(style)
    hasInjectedConnectorStyles = true
  }
}

// Initialize immediately in the browser so animations are available
if (typeof window !== 'undefined' && typeof document !== 'undefined') {
  injectConnectorGlobalStyles()
}

export { injectConnectorGlobalStyles }

// Legacy export for backwards compatibility
export { injectConnectorGlobalStyles as injectArcConnectorGlobalStyles }


