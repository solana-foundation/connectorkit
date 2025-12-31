import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    resolve: {
        alias: {
            '@': path.resolve(__dirname, './src'),
            // Mock WalletConnect provider for tests (optional dependency)
            '@walletconnect/universal-provider': path.resolve(__dirname, './src/__tests__/mocks/walletconnect-mock.ts'),
        },
    },
    esbuild: {
        jsx: 'automatic',
        target: 'es2022',
    },
    define: {
        'import.meta.vitest': undefined,
        globalThis: 'globalThis',
    },
    test: {
        // Environment configuration
        environment: 'happy-dom', // Use happy-dom for both unit and React tests

        // Setup files
        setupFiles: ['./src/__tests__/setup.ts'],

        // Test timeout configuration
        testTimeout: 10000, // 10 seconds for async operations
        hookTimeout: 5000, // 5 seconds for setup/teardown

        // Prevent hanging processes
        teardownTimeout: 3000,

        // Handle unhandled promises gracefully
        dangerouslyIgnoreUnhandledErrors: false,

        // Global setup
        globals: true,

        // Pool options - use threads for better stability
        pool: 'threads',
        poolOptions: {
            threads: {
                singleThread: true,
            },
        },

        // Environment options
        environmentOptions: {
            happyDOM: {
                url: 'http://localhost:3000',
                width: 1024,
                height: 768,
                settings: {
                    disableJavaScriptFileLoading: true,
                    disableJavaScriptEvaluation: false,
                    disableCSSFileLoading: true,
                    enableFileSystemHttpRequests: false,
                },
            },
        },

        // Coverage configuration
        coverage: {
            provider: 'v8',
            reporter: ['text', 'json', 'html', 'lcov'],
            exclude: [
                'node_modules/',
                'dist/',
                '**/*.test.{ts,tsx}',
                '**/*.spec.{ts,tsx}',
                '**/__tests__/**',
                '**/types/**',
                '**/*.d.ts',
            ],
            thresholds: {
                lines: 60,
                functions: 60,
                branches: 50,
                statements: 60,
            },
        },

        // File patterns
        include: ['**/*.{test,spec}.{js,mjs,cjs,ts,mts,cts,jsx,tsx}'],
        exclude: ['node_modules/', 'dist/', '.git/', '.turbo/'],

        // Reporter configuration
        reporters: ['verbose'],

        // Retry configuration for flaky async tests
        retry: 1,
    },
});
