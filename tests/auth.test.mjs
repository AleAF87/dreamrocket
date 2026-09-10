import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { test } from 'node:test';
import vm from 'node:vm';

// Execute the browser code with Firebase and browser boundaries replaced by fakes.
const sources = await Promise.all(['auth-check', 'index'].map(async name =>
    (await readFile(new URL(`../js/${name}.js`, import.meta.url), 'utf8'))
        .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '')
));

function setup(records = {}, user = { uid: 'existing' }, denyReads = false) {
    const writes = [], reads = [], alerts = [];
    let signOuts = 0;
    const storage = () => {
        const values = new Map();
        return {
            getItem: key => values.get(key) ?? null,
            setItem: (key, value) => values.set(key, value),
            removeItem: key => values.delete(key)
        };
    };
    const context = vm.createContext({
        auth: {}, database: {}, provider: {},
        console: { error() {} },
        sessionStorage: storage(), localStorage: storage(),
        window: { location: { href: 'index.html', replace(url) { this.href = url; } } },
        document: {
            body: { classList: { remove() {} } },
            getElementById: () => null,
            addEventListener() {}
        },
        alert: message => alerts.push(message),
        ref: (_, path = '') => path,
        get: async path => {
            reads.push(path);
            if (denyReads) throw new Error('PERMISSION_DENIED');
            return { exists: () => records[path] != null, val: () => records[path] };
        },
        update: async (_, values) => writes.push(values),
        serverTimestamp: () => ({ '.sv': 'timestamp' }),
        signOut: async () => { signOuts++; },
        signInWithPopup: async () => ({ user }),
        onAuthStateChanged: (_, callback) => {
            queueMicrotask(() => callback(user));
            return () => {};
        }
    });
    sources.forEach(source => vm.runInContext(source, context));
    return { context, writes, reads, alerts, signOuts: () => signOuts };
}

const existing = {
    'login/existing': { status: 'ativo' },
    'usuarios/existing': { nome: 'Existing user', status: 'ativo', nivel: 1 }
};

test('existing active user enters; only last-access timestamps are written', async () => {
    const state = setup(existing);
    await state.context.loginWithGoogle();
    assert.equal(state.context.window.location.href, 'app.html');
    assert.equal(state.writes.length, 1);
    assert.deepEqual(Object.keys(state.writes[0]).sort(), [
        'login/existing/ultimoAcesso', 'usuarios/existing/ultimoAcesso'
    ]);
    assert.equal(state.context.sessionStorage.getItem('userKey'), 'existing');
    assert.equal(state.signOuts(), 0);
});

for (const [name, records, user, denyReads] of [
    ['new user', {}, { uid: 'new' }],
    ['missing login record', { 'usuarios/existing': existing['usuarios/existing'] }],
    ['missing profile', { 'login/existing': existing['login/existing'] }],
    ['inactive user', { ...existing, 'login/existing': { status: 'inativo' } }],
    ['missing status', { 'login/existing': { nome: 'User' }, 'usuarios/existing': { nivel: 1 } }],
    ['insufficient level', { ...existing, 'usuarios/existing': { nivel: 2 } }],
    ['invalid level', { ...existing, 'usuarios/existing': { nivel: 'invalid' } }],
    ['database read denied', existing, undefined, true]
]) {
    test(`${name}: popup login denies access, signs out and writes nothing`, async () => {
        const state = setup(records, user, denyReads);
        state.context.sessionStorage.setItem('userKey', 'stale');
        state.context.localStorage.setItem('userKey', 'stale');
        await state.context.loginWithGoogle();
        assert.equal(state.context.window.location.href, 'index.html');
        assert.equal(state.writes.length, 0);
        assert.equal(state.signOuts(), 1);
        assert.equal(state.alerts.length, 1);
        assert.equal(state.context.sessionStorage.getItem('userKey'), null);
        assert.equal(state.context.localStorage.getItem('userKey'), null);
    });
}

test('restored unauthorized session cannot redirect to the app', async () => {
    const state = setup({});
    assert.equal(await state.context.redirectIfAuthenticated(), null);
    assert.equal(state.context.window.location.href, 'index.html');
    assert.equal(state.signOuts(), 1);
    assert.equal(state.writes.length, 0);
});

test('restored existing session still enters the app', async () => {
    const state = setup(existing);
    await state.context.redirectIfAuthenticated();
    assert.equal(state.context.window.location.href, 'app.html');
});

test('protected page uses authenticated UID even with another UID in storage', async () => {
    const state = setup(existing, { uid: 'new' });
    state.context.sessionStorage.setItem('userKey', 'existing');
    state.context.localStorage.setItem('userKey', 'existing');
    await assert.rejects(state.context.checkAuth(1), /Novos cadastros estão bloqueados/);
    assert.deepEqual(state.reads.sort(), ['login/new', 'usuarios/new']);
    assert.equal(state.writes.length, 0);
    assert.equal(state.signOuts(), 1);
    assert.equal(state.context.window.location.href, 'index.html');
});

test('unauthenticated access returns to login', async () => {
    const state = setup(existing, null);
    await assert.rejects(state.context.checkAuth(1), /não autenticado/);
    assert.equal(state.reads.length, 0);
    assert.equal(state.context.window.location.href, 'index.html');
});
