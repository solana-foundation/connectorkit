import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
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
    splitting: false,
    external: ['@solana/connector'],
    esbuildOptions: options => {
        options.treeShaking = true;
        options.platform = 'browser';
        options.target = 'es2020';
    },
});
