import { spawn } from 'node:child_process';
import { createServer } from 'node:net';

const DEFAULT_PORT = 3100;
const MAX_PORT = 3199;

const requestedPort = Number.parseInt(process.env.CONNECTORKIT_NEXT_PORT ?? '', 10);
const port = Number.isInteger(requestedPort)
    ? requestedPort
    : await findOpenPort(DEFAULT_PORT, MAX_PORT);

const next = spawn('next', ['dev', '--turbopack', '-p', String(port)], {
    env: process.env,
    stdio: 'inherit',
});

next.on('exit', (code, signal) => {
    if (signal) {
        process.kill(process.pid, signal);
        return;
    }
    process.exit(code ?? 0);
});

function findOpenPort(start, end) {
    return new Promise((resolve, reject) => {
        let port = start;

        const tryPort = () => {
            if (port > end) {
                reject(new Error(`No available port found between ${start} and ${end}`));
                return;
            }

            const server = createServer();
            server.once('error', () => {
                port += 1;
                tryPort();
            });
            server.once('listening', () => {
                server.close(() => resolve(port));
            });
            server.listen(port, '::');
        };

        tryPort();
    });
}
