// Injected by tsup (see tsup.config.ts). Bundled CommonJS deps such as buffer-layout
// read `Buffer` as a free global, while @solana/web3.js imports it from the `buffer`
// package. Routing both to the one bundled copy keeps `instanceof Buffer` checks true
// and means consumers need no Buffer polyfill of their own.
export { Buffer } from 'buffer';
