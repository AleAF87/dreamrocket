import { checkAuth, loadNavbar } from "./auth-check.js";

class AppCore {
    constructor() {
        if (!window.location.pathname.includes("app.html")) {
            return null;
        }

        this.pageStorageKey = "dreamrocket:last-spa-page";
        this.currentPage = null;
        this.pageModules = {
            "dashboard.html": {
                loader: () => import("./dashboard.js"),
                method: "initDashboard"
            },
            "financeiro.html": {
                loader: () => import("./financeiro.js"),
                method: "initFinanceiro"
            },
            "retirada.html": {
                loader: () => import("./retirada.js"),
                method: "initRetirada"
            },
            "contas_casa_saida.html": {
                loader: () => import("./contas-casa-saida.js"),
                method: "initContasCasaSaida"
            },
            "contas_casa_entrada.html": {
                loader: null,
                method: null
            }
        };
    }

    getRequestedPage() {
        const page = sessionStorage.getItem(this.pageStorageKey);
        return this.pageModules[page] ? page : "dashboard.html";
    }

    async init() {
        try {
            await checkAuth(1);
            await loadNavbar();
            this.setupNavigation();
            await this.loadPage(this.getRequestedPage(), { replaceState: true });
        } catch (error) {
            this.showError(error);
        }
    }

    setupNavigation() {
        document.addEventListener("click", (event) => {
            const link = event.target.closest('a[href$=".html"]');
            if (!link || link.hasAttribute("data-ignore-spa")) {
                return;
            }

            const href = link.getAttribute("href");
            if (!this.pageModules[href]) {
                return;
            }

            event.preventDefault();
            this.loadPage(href);
        });

        window.addEventListener("popstate", (event) => {
            const page = event.state?.page;
            if (page && this.pageModules[page]) {
                sessionStorage.setItem(this.pageStorageKey, page);
                this.loadPage(page, { pushState: false });
                return;
            }

            this.loadPage(this.getRequestedPage(), { pushState: false });
        });
    }

    async loadPage(pageUrl, options = {}) {
        const { pushState = true, replaceState = false } = options;
        if (!this.pageModules[pageUrl]) {
            return;
        }

        const appContent = document.getElementById("app-content");
        if (!appContent) {
            return;
        }

        try {
            await checkAuth(1);
            appContent.innerHTML = this.getLoadingHtml(pageUrl);

            const response = await fetch(pageUrl, { cache: "no-cache" });
            if (!response.ok) {
                throw new Error(`Falha ao carregar ${pageUrl}: HTTP ${response.status}`);
            }

            const html = await response.text();
            appContent.innerHTML = this.extractContent(html);

            const moduleConfig = this.pageModules[pageUrl];
            if (typeof moduleConfig.loader === "function") {
                const pageModule = await moduleConfig.loader();
                const initMethod = pageModule?.[moduleConfig.method];
                if (typeof initMethod === "function") {
                    await initMethod();
                }
            }

            this.currentPage = pageUrl;
            this.updateUrl(pageUrl, { pushState, replaceState });
            this.updateActiveNav(pageUrl);
        } catch (error) {
            console.error(`Erro ao carregar ${pageUrl}:`, error);
            appContent.innerHTML = this.getErrorHtml(pageUrl, error);
        }
    }

    extractContent(html) {
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, "text/html");

        doc.querySelectorAll("script, #navbar").forEach((node) => node.remove());

        return doc.body.innerHTML.trim() || `
            <div class="status-message error">
                Conteudo nao encontrado.
            </div>
        `;
    }

    updateUrl(pageUrl, { pushState = true, replaceState = false } = {}) {
        sessionStorage.setItem(this.pageStorageKey, pageUrl);

        if (replaceState) {
            window.history.replaceState({ page: pageUrl }, "", "app.html");
            return;
        }

        if (pushState) {
            window.history.pushState({ page: pageUrl }, "", "app.html");
        }
    }

    updateActiveNav(pageUrl) {
        if (window.updateNavbarActiveMenu) {
            window.updateNavbarActiveMenu(pageUrl);
        }
    }

    getLoadingHtml(pageUrl) {
        const pageName = pageUrl.replace(".html", "");
        return `
            <div class="app-loading-card">
                <div class="app-loading-spinner"></div>
                <h2>Carregando ${pageName}...</h2>
                <p>Por favor, aguarde.</p>
            </div>
        `;
    }

    getErrorHtml(pageUrl, error) {
        return `
            <div class="status-message error">
                <h3>Erro ao carregar a pagina</h3>
                <p>Nao foi possivel abrir <strong>${pageUrl}</strong>.</p>
                <p>${error.message}</p>
            </div>
        `;
    }

    showError(error) {
        const appContent = document.getElementById("app-content");
        if (!appContent) {
            return;
        }

        appContent.innerHTML = `
            <div class="status-message error">
                <h3>Erro de autenticacao</h3>
                <p>${error.message}</p>
                <a href="index.html" class="login-btn" data-ignore-spa="true">Voltar ao login</a>
            </div>
        `;
    }
}

if (window.location.pathname.includes("app.html")) {
    document.addEventListener("DOMContentLoaded", () => {
        window.app = new AppCore();
        if (window.app) {
            window.app.init();
        }
    });
}

export default AppCore;
