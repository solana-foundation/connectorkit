import { defineConfig } from 'tsup'

export default defineConfig({
  entry: {
    index: 'src/index.ts',
    headless: 'src/headless.ts',
    react: 'src/react.ts'
  },
  format: ['esm', 'cjs'],
  dts: true,
  sourcemap: true,
  clean: true,
  treeshake: true,
  minify: process.env.NODE_ENV === 'production',
  splitting: true,
  external: ['react', 'react-dom', '@connector-kit/sdk'],
  esbuildOptions: (options) => {
    // React 19 optimizations
    options.treeShaking = true
    options.minifySyntax = true
    options.minifyIdentifiers = process.env.NODE_ENV === 'production'
    options.keepNames = process.env.NODE_ENV === 'development'
  }
})