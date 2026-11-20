import { defineConfig } from 'tsup';

export default defineConfig({
    entry: {
        index: 'src/index.ts',
    },
    format: ['esm', 'cjs'],
    dts: true,
    sourcemap: true,
    clean: true,
    // Read (then removed) by scripts/third-party-licenses.mjs.
    metafile: true,
    treeshake: {
        moduleSideEffects: false,
        propertyReadSideEffects: false,
        tryCatchDeoptimization: false,
    },
    minify: process.env.NODE_ENV === 'production',
    // anchor, web3.js and bn.js are bundled (devDependencies) rather than installed by
    // consumers; splitting keeps the dynamically imported ones in lazy chunks.
    // rpc-websockets (LGPL-3.0, used by web3.js) stays a regular dependency so it is
    // never compiled into this MIT bundle.
    splitting: true,
    external: ['@solana/connector'],
    esbuildOptions: options => {
        options.treeShaking = true;
        options.platform = 'browser';
        // Bundled deps (anchor, web3.js) ship browser builds behind the `browser` field.
        options.mainFields = ['browser', 'module', 'main'];
        options.inject = [...(options.inject ?? []), './scripts/buffer-shim.js'];
        options.target = 'es2020';
    },
});
