/**
 * Writes dist/THIRD_PARTY_LICENSES.txt for the packages that tsup bundles into this
 * package (see `devDependencies` and tsup.config.ts), then removes the esbuild
 * metafiles it was derived from so they are not published.
 */
import { readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const distDir = join(packageRoot, 'dist');
const metafiles = readdirSync(distDir).filter(name => /^metafile-.*\.json$/.test(name));
if (metafiles.length === 0) throw new Error('No esbuild metafile in dist/; run tsup with `metafile: true` first.');

/** Package root directory for a bundled input path, or null for this package's own sources. */
function findPackageDir(inputPath) {
    // esbuild lists modules stubbed out by a package's `browser` field as `(disabled):<path>`.
    if (inputPath.startsWith('(disabled):')) return null;
    const marker = 'node_modules/';
    const index = inputPath.lastIndexOf(marker);
    if (index === -1) return null;
    const [first, second] = inputPath.slice(index + marker.length).split('/');
    const name = first.startsWith('@') ? `${first}/${second}` : first;
    return resolve(packageRoot, inputPath.slice(0, index + marker.length) + name);
}

const bundled = new Map();
for (const metafile of metafiles) {
    const { outputs } = JSON.parse(readFileSync(join(distDir, metafile), 'utf8'));
    for (const output of Object.values(outputs)) {
        for (const [inputPath, input] of Object.entries(output.inputs ?? {})) {
            if (!input.bytesInOutput) continue;
            const dir = findPackageDir(inputPath);
            if (!dir || bundled.has(dir)) continue;
            const manifest = JSON.parse(readFileSync(join(dir, 'package.json'), 'utf8'));
            const licenseFile = readdirSync(dir).find(name => /^(licen[cs]e|copying)(\.|$)/i.test(name));
            bundled.set(dir, {
                id: `${manifest.name}@${manifest.version}`,
                license: typeof manifest.license === 'string' ? manifest.license : 'see package',
                homepage: manifest.homepage ?? manifest.repository?.url ?? manifest.repository ?? '',
                text: licenseFile ? readFileSync(join(dir, licenseFile), 'utf8').trim() : null,
            });
        }
    }
}

const entries = [...bundled.values()].sort((a, b) => a.id.localeCompare(b.id));
const rule = '-'.repeat(78);
const body = entries
    .map(({ id, license, homepage, text }) => {
        const header = [rule, id, `License: ${license}`];
        if (homepage) header.push(`Source: ${homepage}`);
        const notice = text ?? '(No license file is published with this package; see the source link above.)';
        return [...header, '', notice].join('\n');
    })
    .join('\n\n');

writeFileSync(
    join(distDir, 'THIRD_PARTY_LICENSES.txt'),
    `@solana/connector-debugger bundles the following third-party packages.\n\n${body}\n`,
);
for (const metafile of metafiles) rmSync(join(distDir, metafile));
console.log(`THIRD_PARTY_LICENSES.txt: ${entries.length} bundled packages`);
