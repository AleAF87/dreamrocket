import assert from 'node:assert/strict';
import { readFile, access } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';
import { matchRoutes } from '../aurea_engenharia/node_modules/react-router-dom/dist/index.mjs';

// Run after building: exercise the actual generated HTML, not a copy of its logic.
const output = new URL('../dist/pagina_dev/aurea_engenharia/', import.meta.url);
const html = await readFile(new URL('index.html', output), 'utf8');
const bootstrap = html.match(/<script>([\s\S]*?)<\/script>/)?.[1];
assert.ok(bootstrap, 'The base must be resolved before the asset tags.');
assert.ok(html.indexOf('<script>') < html.indexOf('type="module"'));
const app = await readFile(new URL('../aurea_engenharia/src/App.tsx', import.meta.url), 'utf8');
const routes = [...app.matchAll(/<Route\s+path="([^"]+)"/g)].map(([, path]) => ({ path }));

for (const [pathname, mount, expectedRoute] of [
    ['/Github-Ale/dreamrocket/dist/pagina_dev/aurea_engenharia/index.html', '/Github-Ale/dreamrocket/dist/pagina_dev/aurea_engenharia/', '/index.html'],
    ['/Github-Ale/dreamrocket/dist/pagina_dev/aurea_engenharia/', '/Github-Ale/dreamrocket/dist/pagina_dev/aurea_engenharia/', '/'],
    ['/pagina_dev/aurea_engenharia', '/pagina_dev/aurea_engenharia/', '/'],
    ['/pagina_dev/aurea_engenharia/', '/pagina_dev/aurea_engenharia/', '/'],
    ['/pagina_dev/aurea_engenharia/index.html', '/pagina_dev/aurea_engenharia/', '/index.html'],
    ['/pagina_dev/aurea_engenharia/admin/login', '/pagina_dev/aurea_engenharia/', '/admin/login'],
    ['/pagina_dev/aurea_engenharia/admin/visitas', '/pagina_dev/aurea_engenharia/', '/admin/visitas']
]) {
    test(`assets and routes resolve at ${pathname}`, async () => {
        const location = new URL(pathname, 'http://127.0.0.1:5500');
        const document = {
            baseURI: location.href,
            createElement: () => ({}),
            head: { appendChild(element) { document.baseURI = element.href; } }
        };
        vm.runInNewContext(bootstrap, { location, document, URL });
        const basename = new URL('.', document.baseURI).pathname;
        assert.equal(basename, mount);
        const match = matchRoutes(routes, pathname, basename.replace(/\/$/, ''));
        assert.equal(match?.at(-1).route.path, expectedRoute);

        for (const [, asset] of html.matchAll(/(?:src|href|content)="((?:\.\/)?(?:assets\/|og-image)[^"]+)"/g)) {
            const url = new URL(asset, document.baseURI);
            assert.ok(url.pathname.startsWith(mount), `Asset outside mount: ${url}`);
            await access(new URL(url.pathname.slice(mount.length), output));
        }
        for (const image of ['residencia-anoitecer.jpg', 'escada-emergencia.jpg']) {
            await access(new URL(`images/${image}`, output));
        }
        if (pathname.endsWith('/index.html')) {
            assert.equal(new URL('#contato', document.baseURI).pathname, pathname);
        }
    });
}
