import { defineConfig } from 'tsup';
import esbuildPluginSvelte from 'esbuild-svelte';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
        headless: 'src/headless.ts',
        react: 'src/react.ts',
        compat: 'src/compat.ts',
        svelte: 'src/svelte.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
    },
    minify: process.env.NODE_ENV === 'production',
    splitting: true,
    external: [
        'react',
        'react-dom',
        'svelte',
        '@wallet-ui/core',
        '@wallet-standard/app',
        '@wallet-standard/base',
        '@wallet-standard/features',
        '@solana-mobile/wallet-standard-mobile',
    ],
    esbuildOptions: options => {
        // Aggressive tree-shaking optimizations
        options.treeShaking = true;
        options.minifySyntax = true;
        options.minifyIdentifiers = process.env.NODE_ENV === 'production';
        options.keepNames = process.env.NODE_ENV === 'development';

        // Optimize for modern bundlers
        options.platform = 'neutral';
        options.target = 'es2020';
    },
    esbuildPlugins: [esbuildPluginSvelte()],
});
