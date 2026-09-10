import { spawnSync } from 'node:child_process';
import { cp, mkdir, readdir, rm, lstat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const projectRoot = fileURLToPath(new URL('../', import.meta.url));
const aureaRoot = path.join(projectRoot, 'aurea_engenharia');
const publishRoot = path.resolve(projectRoot, 'dist');

function run(command, args, options = {}) {
    const result = spawnSync(command, args, { cwd: aureaRoot, stdio: 'inherit', ...options });
    if (result.error) throw result.error;
    if (result.status !== 0) process.exit(result.status || 1);
}

if (process.argv.includes('--install')) {
    run('npx', ['--yes', 'pnpm@10.34.5', 'install', '--frozen-lockfile'], {
        shell: process.platform === 'win32'
    });
}

run(process.execPath, [path.join(aureaRoot, 'node_modules/vite/bin/vite.js'), 'build']);

// Only remove the generated directory directly inside this project, never a link.
if (path.relative(projectRoot, publishRoot) !== 'dist') {
    throw new Error('Invalid publish directory.');
}
const existingOutput = await lstat(publishRoot).catch(error => {
    if (error.code !== 'ENOENT') throw error;
    return null;
});
if (existingOutput?.isSymbolicLink()) throw new Error('Publish directory cannot be a link.');
await rm(publishRoot, { recursive: true, force: true });
await mkdir(publishRoot, { recursive: true });

// Publish only the existing static app and the compiled client page.
// Source files, .env, PocketBase migrations and dependencies remain outside dist.
for (const entry of await readdir(projectRoot, { withFileTypes: true })) {
    if (entry.isFile() && entry.name.endsWith('.html')) {
        await cp(path.join(projectRoot, entry.name), path.join(publishRoot, entry.name));
    }
}
for (const name of ['css', 'img', 'js', 'components', '_redirects']) {
    await cp(path.join(projectRoot, name), path.join(publishRoot, name), { recursive: true });
}
await cp(path.join(aureaRoot, 'dist'), path.join(publishRoot, 'pagina_dev/aurea_engenharia'), {
    recursive: true
});

console.log('Site ready in dist. Public page: /pagina_dev/aurea_engenharia');
