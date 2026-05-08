import { database } from "./firebase-config.js";
import { ref, onValue, set, update, remove } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const ENTRADAS_PATH = "contas_casa/entrada";
const ENTRADAS_POSICAO_PATH = "contas_casa/entrada_posicao";
const ENTRADAS_PERCENTUAIS_PATH = "contas_casa/entrada_percentuais";
const PERCENTUAL_FORWARD_MONTHS = 120;

const state = {
    initialized: false,
    selectedId: null,
    entradas: [],
    posicoes: {},
    percentuais: {},
    pendingPercentualChange: null,
    deselectedEntradaIds: new Set(),
    periodStart: "",
    periodEnd: "",
    stopListeners: []
};

const elements = {};

export async function initContasCasaEntrada() {
    if (state.initialized && elements.tableBody?.isConnected) {
        return;
    }

    state.initialized = true;
    initializeElements();
    setupEventListeners();
    startRealtimeListener();
}

function initializeElements() {
    elements.tableBody = document.getElementById("entradasTableBody");
    elements.entradasTable = document.querySelector(".entradas-table");
    elements.novaEntradaBtn = document.getElementById("novaEntradaBtn");
    elements.prevMonthBtn = document.getElementById("entradaPrevMonthBtn");
    elements.nextMonthBtn = document.getElementById("entradaNextMonthBtn");
    elements.periodoInicio = document.getElementById("entradaPeriodoInicio");
    elements.periodoFim = document.getElementById("entradaPeriodoFim");
    elements.searchInput = document.getElementById("entradaSearchInput");
    elements.modal = document.getElementById("entradaModal");
    elements.modalTitle = document.getElementById("entradaModalTitle");
    elements.closeModalBtn = document.getElementById("closeEntradaModalBtn");
    elements.cancelBtn = document.getElementById("cancelEntradaBtn");
    elements.saveBtn = document.getElementById("saveEntradaBtn");
    elements.titulo = document.getElementById("entradaTitulo");
    elements.data = document.getElementById("entradaData");
    elements.status = document.getElementById("entradaStatus");
    elements.observacao = document.getElementById("entradaObservacao");
    elements.acrescimosBody = document.getElementById("entradaAcrescimosBody");
    elements.descontosBody = document.getElementById("entradaDescontosBody");
    elements.addAcrescimoBtn = document.getElementById("addEntradaAcrescimoBtn");
    elements.addDescontoBtn = document.getElementById("addEntradaDescontoBtn");
    elements.totalBruto = document.getElementById("entradaTotalBruto");
    elements.totalDesconto = document.getElementById("entradaTotalDesconto");
    elements.totalLiquido = document.getElementById("entradaTotalLiquido");
    elements.resumoBruto = document.getElementById("entradaResumoBruto");
    elements.resumoDesconto = document.getElementById("entradaResumoDesconto");
    elements.resumoLiquido = document.getElementById("entradaResumoLiquido");
    elements.resumoBrutoRecebido = document.getElementById("entradaResumoBrutoRecebido");
    elements.resumoDescontoRecebido = document.getElementById("entradaResumoDescontoRecebido");
    elements.resumoLiquidoRecebido = document.getElementById("entradaResumoLiquidoRecebido");
    elements.primiciaPerc = document.getElementById("entradaPrimiciaPerc");
    elements.dizimoPerc = document.getElementById("entradaDizimoPerc");
    elements.primiciaValor = document.getElementById("entradaPrimiciaValor");
    elements.dizimoValor = document.getElementById("entradaDizimoValor");
    elements.primiciaRecebido = document.getElementById("entradaPrimiciaRecebido");
    elements.primiciaSelecionado = document.getElementById("entradaPrimiciaSelecionado");
    elements.dizimoRecebido = document.getElementById("entradaDizimoRecebido");
    elements.dizimoSelecionado = document.getElementById("entradaDizimoSelecionado");
    elements.percentualModal = document.getElementById("entradaPercentualModal");
    elements.percentualModalText = document.getElementById("entradaPercentualModalText");
    elements.percentualOnlyMonthBtn = document.getElementById("entradaPercentualOnlyMonthBtn");
    elements.percentualFromMonthBtn = document.getElementById("entradaPercentualFromMonthBtn");
    elements.closePercentualModalBtn = document.getElementById("closeEntradaPercentualModalBtn");
    ensureEntradaObservationColumn();
}

function setupEventListeners() {
    elements.novaEntradaBtn?.addEventListener("click", () => openEntradaModal());
    elements.prevMonthBtn?.addEventListener("click", () => changeEntradaPeriodMonth(-1));
    elements.nextMonthBtn?.addEventListener("click", () => changeEntradaPeriodMonth(1));
    elements.periodoInicio?.addEventListener("change", syncEntradaPeriodFromInputs);
    elements.periodoFim?.addEventListener("change", syncEntradaPeriodFromInputs);
    elements.searchInput?.addEventListener("input", renderEntradasTable);
    elements.closeModalBtn?.addEventListener("click", closeEntradaModal);
    elements.cancelBtn?.addEventListener("click", closeEntradaModal);
    elements.saveBtn?.addEventListener("click", saveEntrada);
    elements.addAcrescimoBtn?.addEventListener("click", () => addEntradaItemRow("acrescimo"));
    elements.addDescontoBtn?.addEventListener("click", () => addEntradaItemRow("desconto"));
    elements.primiciaPerc?.addEventListener("change", () => handleEntradaPercentualInput("primicia", "percentual"));
    elements.dizimoPerc?.addEventListener("change", () => handleEntradaPercentualInput("dizimo", "percentual"));
    elements.primiciaValor?.addEventListener("change", () => handleEntradaPercentualInput("primicia", "valor"));
    elements.dizimoValor?.addEventListener("change", () => handleEntradaPercentualInput("dizimo", "valor"));
    elements.percentualOnlyMonthBtn?.addEventListener("click", () => saveEntradaPercentualChange("somente_mes"));
    elements.percentualFromMonthBtn?.addEventListener("click", () => saveEntradaPercentualChange("mes_em_diante"));
    elements.closePercentualModalBtn?.addEventListener("click", () => closeEntradaPercentualModal(true));

    elements.modal?.addEventListener("click", (event) => {
        if (event.target === elements.modal) {
            closeEntradaModal();
        }
    });
    elements.percentualModal?.addEventListener("click", (event) => {
        if (event.target === elements.percentualModal) {
            closeEntradaPercentualModal(true);
        }
    });

    setEntradaPeriodToCurrentMonth();
}

function startRealtimeListener() {
    state.stopListeners.forEach((stop) => typeof stop === "function" && stop());
    state.stopListeners = [];

    const stopEntradas = onValue(ref(database, ENTRADAS_PATH), (snapshot) => {
        const data = snapshot.val();
        state.entradas = data
            ? Object.entries(data).map(([id, value]) => ({ id, ...value }))
            : [];
        renderEntradasTable();
    });

    const stopPosicoes = onValue(ref(database, ENTRADAS_POSICAO_PATH), (snapshot) => {
        state.posicoes = snapshot.val() || {};
        renderEntradasTable();
    });

    const stopPercentuais = onValue(ref(database, ENTRADAS_PERCENTUAIS_PATH), (snapshot) => {
        state.percentuais = snapshot.val() || {};
        syncEntradaPercentualInputs();
        renderEntradasTable();
    });

    state.stopListeners.push(stopEntradas, stopPosicoes, stopPercentuais);
}

function renderEntradasTable() {
    if (!elements.tableBody) {
        return;
    }

    ensureEntradaObservationColumn();
    const periodRows = getEntradasInPeriod();
    updateEntradaSummaryCards(periodRows);

    const rows = sortEntradasByPosition(periodRows);

    elements.tableBody.innerHTML = "";
    if (!rows.length) {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="10" class="empty-table-row">Nenhuma entrada encontrada no período.</td>
            </tr>
        `;
        return;
    }

    rows.forEach((entrada, index) => {
        const tr = document.createElement("tr");
        const isSelected = !state.deselectedEntradaIds.has(entrada.id);
        tr.innerHTML = `
            <td>${buildEntradaOrderButtons(entrada, index, rows.length)}</td>
            <td><input type="checkbox" class="entrada-row-check" data-entry-id="${escapeHtmlAttr(entrada.id)}" ${isSelected ? "checked" : ""}></td>
            <td>${escapeHtmlText(entrada.titulo || "-")}</td>
            <td>${formatDate(entrada.data)}</td>
            <td>${formatCurrency(entrada.valor_bruto)}</td>
            <td>${formatCurrency(entrada.valor_desconto)}</td>
            <td>${formatCurrency(entrada.valor_liquido)}</td>
            <td>${buildStatusBadge(entrada.status)}</td>
            <td>${escapeHtmlText(entrada.observacao || "")}</td>
            <td>
                <details class="table-actions-menu">
                    <summary aria-label="Ações">&#9776;</summary>
                    <div class="table-actions">
                        <button class="table-action-btn" type="button" data-action="edit">Editar</button>
                        <button class="table-action-btn" type="button" data-action="duplicate">Duplicar</button>
                        <button class="table-action-btn success" type="button" data-action="toggle-status">${entrada.status === "recebido" ? "Marcar não recebido" : "Marcar recebido"}</button>
                        <button class="table-action-btn" type="button" data-action="dispense">${entrada.status === "dispensado" ? "Remover dispensa" : "Dispensar"}</button>
                        <button class="table-action-btn danger" type="button" data-action="delete">Excluir</button>
                    </div>
                </details>
            </td>
        `;

        tr.querySelectorAll("[data-action]").forEach((button) => {
            button.addEventListener("click", () => handleEntradaAction(button.dataset.action, entrada));
        });
        tr.querySelector(".entrada-row-check")?.addEventListener("change", (event) => {
            if (event.target.checked) {
                state.deselectedEntradaIds.delete(entrada.id);
            } else {
                state.deselectedEntradaIds.add(entrada.id);
            }
            updateEntradaSummaryCards(getEntradasInPeriod());
        });
        tr.querySelectorAll(".table-actions-menu").forEach((menu) => setupTableActionsMenu(menu));
        elements.tableBody.appendChild(tr);
    });
}

function ensureEntradaObservationColumn() {
    const headerRow = elements.entradasTable?.querySelector("thead tr");
    if (!headerRow || Array.from(headerRow.children).some((th) => normalizeText(th.textContent) === "observacao")) {
        return;
    }

    const th = document.createElement("th");
    th.textContent = "Observação";
    headerRow.insertBefore(th, headerRow.lastElementChild);
}

function handleEntradaAction(action, entrada) {
    if (action === "move-up" || action === "move-down") {
        moveEntradaPosition(entrada, action === "move-up" ? -1 : 1);
        return;
    }

    if (action === "edit") {
        openEntradaModal(entrada);
        return;
    }

    if (action === "duplicate") {
        openEntradaModal({ ...entrada, id: null, data: "" }, { duplicate: true });
        return;
    }

    if (action === "toggle-status") {
        update(ref(database, `${ENTRADAS_PATH}/${entrada.id}`), {
            status: entrada.status === "recebido" ? "pendente" : "recebido",
            atualizado_em: new Date().toISOString()
        });
        return;
    }

    if (action === "dispense") {
        update(ref(database, `${ENTRADAS_PATH}/${entrada.id}`), {
            status: entrada.status === "dispensado" ? "pendente" : "dispensado",
            atualizado_em: new Date().toISOString()
        });
        return;
    }

    if (action === "delete") {
        deleteEntrada(entrada);
    }
}

function buildEntradaOrderButtons(entrada, index, totalRows) {
    const upButton = index > 0
        ? `<button class="conta-order-btn" type="button" data-action="move-up" aria-label="Subir entrada">↑</button>`
        : "";
    const downButton = index < totalRows - 1
        ? `<button class="conta-order-btn" type="button" data-action="move-down" aria-label="Descer entrada">↓</button>`
        : "";

    return `<span class="conta-order-controls">${upButton}${downButton}</span>`;
}

async function moveEntradaPosition(entrada, direction) {
    const rows = sortEntradasByPosition(getEntradasInPeriod());
    const currentIndex = rows.findIndex((item) => item.id === entrada.id);
    if (currentIndex < 0) {
        return;
    }

    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= rows.length) {
        return;
    }

    const reordered = [...rows];
    const [selected] = reordered.splice(currentIndex, 1);
    reordered.splice(targetIndex, 0, selected);

    const payload = {};
    reordered.forEach((item, index) => {
        payload[String(index + 1).padStart(3, "0")] = {
            id: item.id,
            titulo: item.titulo || "",
            data: item.data || ""
        };
    });

    await set(ref(database, `${ENTRADAS_POSICAO_PATH}/${getEntradaPositionKey()}`), payload);
}

function sortEntradasByPosition(rows) {
    const positionMap = getEntradaPositionMap();

    return [...rows].sort((a, b) => {
        const aPosition = positionMap.get(a.id);
        const bPosition = positionMap.get(b.id);

        if (aPosition && bPosition) {
            return aPosition - bPosition;
        }

        if (aPosition) {
            return -1;
        }

        if (bPosition) {
            return 1;
        }

        const dateCompare = String(b.data || "").localeCompare(String(a.data || ""));
        if (dateCompare !== 0) {
            return dateCompare;
        }
        return String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt-BR");
    });
}

function getEntradaPositionMap() {
    const snapshot = state.posicoes?.[getEntradaPositionKey()] || {};
    const entries = Object.entries(snapshot).sort(([a], [b]) => Number(a) - Number(b));
    return new Map(entries.map(([, value], index) => [value?.id, index + 1]).filter(([id]) => id));
}

function getEntradaPositionKey() {
    return getMonthKeyFromDateInput(state.periodStart) || getMonthKeyFromDateInput(toDateInputValue(new Date()));
}

function getMonthKeyFromDateInput(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || "")) ? String(value).slice(0, 7) : "";
}

function openEntradaModal(entrada = null, options = {}) {
    state.selectedId = options.duplicate ? null : entrada?.id || null;
    elements.modalTitle.textContent = state.selectedId ? "Editar lançamento" : "Novo lançamento";
    elements.titulo.value = entrada?.titulo || "";
    elements.data.value = entrada?.data || "";
    elements.status.value = entrada?.status || "pendente";
    elements.observacao.value = entrada?.observacao || "";
    elements.acrescimosBody.innerHTML = "";
    elements.descontosBody.innerHTML = "";

    objectToItems(entrada?.itens_acrescimos).forEach((item) => addEntradaItemRow("acrescimo", item));
    objectToItems(entrada?.itens_descontos).forEach((item) => addEntradaItemRow("desconto", item));

    if (!elements.acrescimosBody.children.length) {
        addEntradaItemRow("acrescimo");
    }
    if (!elements.descontosBody.children.length) {
        addEntradaItemRow("desconto");
    }

    updateEntradaTotalsPreview();
    elements.modal.style.display = "flex";
    elements.titulo.focus();
}

function closeEntradaModal() {
    state.selectedId = null;
    if (elements.modal) {
        elements.modal.style.display = "none";
    }
}

function addEntradaItemRow(type, item = {}) {
    const tbody = type === "desconto" ? elements.descontosBody : elements.acrescimosBody;
    if (!tbody) {
        return;
    }

    const tr = document.createElement("tr");
    tr.dataset.itemType = type;
    tr.innerHTML = `
        <td><input type="text" class="filter-select" data-field="titulo" value="${escapeHtmlAttr(item.titulo || "")}" placeholder="Título"></td>
        <td><input type="number" class="filter-select entrada-qtde-input" data-field="qtde" min="0" step="0.01" value="${escapeHtmlAttr(item.qtde ?? 1)}"></td>
        <td><input type="number" class="filter-select entrada-money-input" data-field="valor_unitario" min="0" step="0.01" value="${escapeHtmlAttr(item.valor_unitario ?? "")}" placeholder="0.00"></td>
        <td><input type="number" class="filter-select entrada-money-input" data-field="valor_total" min="0" step="0.01" value="${escapeHtmlAttr(item.valor_total ?? "")}" placeholder="0.00"></td>
        <td><input type="text" class="filter-select" data-field="observacao" value="${escapeHtmlAttr(item.observacao || "")}" placeholder="Observação curta"></td>
        <td><button type="button" class="table-action-btn danger" data-action="remove-item">Remover</button></td>
    `;

    tr.querySelector('[data-action="remove-item"]')?.addEventListener("click", () => {
        tr.remove();
        updateEntradaTotalsPreview();
    });
    tr.querySelectorAll("[data-field]").forEach((input) => {
        input.addEventListener("input", () => handleEntradaItemInput(tr, input));
    });

    tbody.appendChild(tr);
}

function handleEntradaItemInput(row, input) {
    const field = input.dataset.field;
    if (field === "qtde" || field === "valor_unitario") {
        syncEntradaItemTotal(row);
    } else if (field === "valor_total") {
        syncEntradaItemUnit(row);
    }
    updateEntradaTotalsPreview();
}

function syncEntradaItemTotal(row) {
    const qtde = Number(row.querySelector('[data-field="qtde"]')?.value || 0);
    const unitarioInput = row.querySelector('[data-field="valor_unitario"]');
    const totalInput = row.querySelector('[data-field="valor_total"]');
    const unitario = Number(unitarioInput?.value || 0);
    if (!totalInput || !unitarioInput?.value) {
        return;
    }

    totalInput.value = roundMoney(qtde * unitario).toFixed(2);
}

function syncEntradaItemUnit(row) {
    const qtde = Number(row.querySelector('[data-field="qtde"]')?.value || 0);
    const unitarioInput = row.querySelector('[data-field="valor_unitario"]');
    const totalInput = row.querySelector('[data-field="valor_total"]');
    const total = Number(totalInput?.value || 0);
    if (!unitarioInput || !totalInput?.value || qtde <= 0) {
        return;
    }

    unitarioInput.value = roundMoney(total / qtde).toFixed(2);
}

async function saveEntrada() {
    const payload = buildEntradaPayload();
    if (!payload) {
        return;
    }

    const id = state.selectedId || generateId();
    await set(ref(database, `${ENTRADAS_PATH}/${id}`), {
        ...payload,
        criado_em: state.selectedId
            ? (state.entradas.find((item) => item.id === state.selectedId)?.criado_em || new Date().toISOString())
            : new Date().toISOString(),
        atualizado_em: new Date().toISOString()
    });
    closeEntradaModal();
}

function buildEntradaPayload() {
    const titulo = elements.titulo.value.trim();
    if (!titulo) {
        alert("Informe o título da entrada.");
        elements.titulo.focus();
        return null;
    }

    if (!elements.data.value) {
        alert("Informe a data da entrada.");
        elements.data.focus();
        return null;
    }

    const acrescimos = collectEntradaItems(elements.acrescimosBody);
    const descontos = collectEntradaItems(elements.descontosBody);
    const valorBruto = sumItems(acrescimos);
    const valorDesconto = sumItems(descontos);

    if (!acrescimos.length && !descontos.length) {
        alert("Informe pelo menos um item de acréscimo ou desconto.");
        return null;
    }

    return {
        titulo,
        data: elements.data.value,
        status: elements.status.value || "pendente",
        observacao: elements.observacao.value.trim(),
        itens_acrescimos: itemsToNode(acrescimos),
        itens_descontos: itemsToNode(descontos),
        valor_bruto: valorBruto,
        valor_desconto: valorDesconto,
        valor_liquido: roundMoney(valorBruto - valorDesconto)
    };
}

function collectEntradaItems(tbody) {
    return Array.from(tbody?.querySelectorAll("tr") || [])
        .map((row) => ({
            titulo: row.querySelector('[data-field="titulo"]')?.value.trim() || "",
            qtde: Number(row.querySelector('[data-field="qtde"]')?.value || 0),
            valor_unitario: Number(row.querySelector('[data-field="valor_unitario"]')?.value || 0),
            valor_total: Number(row.querySelector('[data-field="valor_total"]')?.value || 0),
            observacao: row.querySelector('[data-field="observacao"]')?.value.trim() || ""
        }))
        .filter((item) => item.titulo || item.valor_total > 0 || item.valor_unitario > 0);
}

function itemsToNode(items) {
    return items.reduce((node, item, index) => {
        node[String(index + 1).padStart(3, "0")] = {
            titulo: item.titulo,
            qtde: item.qtde,
            valor_unitario: roundMoney(item.valor_unitario),
            valor_total: roundMoney(item.valor_total),
            observacao: item.observacao
        };
        return node;
    }, {});
}

function objectToItems(node) {
    if (!node || typeof node !== "object") {
        return [];
    }

    return Object.entries(node)
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([, value]) => value || {});
}

function updateEntradaTotalsPreview() {
    const bruto = sumItems(collectEntradaItems(elements.acrescimosBody));
    const desconto = sumItems(collectEntradaItems(elements.descontosBody));
    elements.totalBruto.textContent = formatCurrency(bruto);
    elements.totalDesconto.textContent = formatCurrency(desconto);
    elements.totalLiquido.textContent = formatCurrency(bruto - desconto);
}

function sumItems(items) {
    return roundMoney(items.reduce((total, item) => total + Number(item.valor_total || 0), 0));
}

function getEntradasInPeriod() {
    const search = normalizeText(elements.searchInput?.value || "");

    return state.entradas.filter((entrada) => {
        const data = String(entrada.data || "");
        if (!data) {
            return false;
        }

        if (state.periodStart && data < state.periodStart) {
            return false;
        }

        if (state.periodEnd && data > state.periodEnd) {
            return false;
        }

        if (!search) {
            return true;
        }

        return normalizeText(`${entrada.titulo || ""} ${entrada.observacao || ""}`).includes(search);
    });
}

function updateEntradaSummaryCards(rows) {
    const selectedRows = rows.filter((item) => !state.deselectedEntradaIds.has(item.id));
    const receivedRows = selectedRows.filter((item) => item.status === "recebido");
    const selectedTotals = calculateEntradaTotals(selectedRows);
    const receivedTotals = calculateEntradaTotals(receivedRows);
    const percentuais = getCurrentEntradaPercentuais();

    if (elements.resumoBrutoRecebido) {
        elements.resumoBrutoRecebido.textContent = formatCurrency(receivedTotals.bruto);
    }
    if (elements.resumoDescontoRecebido) {
        elements.resumoDescontoRecebido.textContent = formatCurrency(receivedTotals.desconto);
    }
    if (elements.resumoLiquidoRecebido) {
        elements.resumoLiquidoRecebido.textContent = formatCurrency(receivedTotals.liquido);
    }

    if (elements.resumoBruto) {
        elements.resumoBruto.textContent = formatCurrency(selectedTotals.bruto);
    }
    if (elements.resumoDesconto) {
        elements.resumoDesconto.textContent = formatCurrency(selectedTotals.desconto);
    }
    if (elements.resumoLiquido) {
        elements.resumoLiquido.textContent = formatCurrency(selectedTotals.liquido);
    }
    updateEntradaPercentualCards(receivedTotals.liquido, selectedTotals.liquido, percentuais);
}

function updateEntradaPercentualCards(receivedLiquid, selectedLiquid, percentuais) {
    const receivedValues = calculateEntradaPercentualValues(receivedLiquid, percentuais);
    const selectedValues = calculateEntradaPercentualValues(selectedLiquid, percentuais);

    if (elements.primiciaRecebido) {
        elements.primiciaRecebido.textContent = formatCurrency(roundMoneyUp(receivedValues.primiciaValor));
    }
    if (elements.primiciaSelecionado) {
        elements.primiciaSelecionado.textContent = formatCurrency(roundMoneyUp(selectedValues.primiciaValor));
    }
    if (elements.dizimoRecebido) {
        elements.dizimoRecebido.textContent = formatCurrency(roundMoneyUp(receivedValues.dizimoValor));
    }
    if (elements.dizimoSelecionado) {
        elements.dizimoSelecionado.textContent = formatCurrency(roundMoneyUp(selectedValues.dizimoValor));
    }
}

function calculateEntradaPercentualValues(liquido, percentuais) {
    const primiciaPerc = Number(percentuais.primicia_perc ?? percentuais.primicia ?? 0);
    const primiciaDivisor = normalizeEntradaDivisor(percentuais.primicia_divisor, primiciaPerc);
    const primiciaValor = primiciaDivisor > 0
        ? roundMoneyUp(Number(liquido || 0) / primiciaDivisor)
        : roundMoneyUp((liquido * primiciaPerc) / 100);
    const dizimoBase = Math.max(Number(liquido || 0) - primiciaValor, 0);
    const dizimoPerc = Number(percentuais.dizimo_perc ?? percentuais.dizimo ?? 0);
    const dizimoDivisor = normalizeEntradaDivisor(percentuais.dizimo_divisor, dizimoPerc);
    const dizimoValor = dizimoDivisor > 0
        ? roundMoneyUp(dizimoBase / dizimoDivisor)
        : roundMoneyUp((dizimoBase * dizimoPerc) / 100);

    return {
        primiciaValor: roundMoneyUp(primiciaValor),
        primiciaPerc: primiciaDivisor > 0 ? roundMoney(100 / primiciaDivisor) : primiciaPerc,
        primiciaDivisor,
        dizimoValor: roundMoneyUp(dizimoValor),
        dizimoPerc: dizimoDivisor > 0 ? roundMoney(100 / dizimoDivisor) : dizimoPerc,
        dizimoDivisor
    };
}

function normalizeEntradaDivisor(divisor, percentual) {
    const explicitDivisor = Number(divisor || 0);
    if (explicitDivisor > 0) {
        return explicitDivisor;
    }

    const perc = Number(percentual || 0);
    return perc > 0 ? roundMoney(100 / perc) : 0;
}

function calculateEntradaTotals(rows) {
    return {
        bruto: roundMoney(rows.reduce((total, item) => total + Number(item.valor_bruto || 0), 0)),
        desconto: roundMoney(rows.reduce((total, item) => total + Number(item.valor_desconto || 0), 0)),
        liquido: roundMoney(rows.reduce((total, item) => total + Number(item.valor_liquido || 0), 0))
    };
}

function setEntradaPeriodToCurrentMonth() {
    const today = new Date();
    setEntradaPeriodByMonth(today.getFullYear(), today.getMonth());
}

function changeEntradaPeriodMonth(increment) {
    const base = parseDateOnly(state.periodStart) || new Date();
    const target = new Date(base.getFullYear(), base.getMonth() + increment, 1, 12, 0, 0);
    setEntradaPeriodByMonth(target.getFullYear(), target.getMonth());
}

function setEntradaPeriodByMonth(year, monthIndex) {
    const start = new Date(year, monthIndex, 1, 12, 0, 0);
    const end = new Date(year, monthIndex + 1, 0, 12, 0, 0);
    state.periodStart = toDateInputValue(start);
    state.periodEnd = toDateInputValue(end);
    syncEntradaPeriodInputs();
    renderEntradasTable();
}

function syncEntradaPeriodFromInputs() {
    state.periodStart = elements.periodoInicio?.value || "";
    state.periodEnd = elements.periodoFim?.value || "";
    renderEntradasTable();
}

function syncEntradaPeriodInputs() {
    if (elements.periodoInicio) {
        elements.periodoInicio.value = state.periodStart;
    }
    if (elements.periodoFim) {
        elements.periodoFim.value = state.periodEnd;
    }
    syncEntradaPercentualInputs();
}

function getCurrentEntradaPercentuais() {
    const monthKey = getEntradaPositionKey();
    return state.percentuais?.[monthKey] || { primicia_perc: 0, primicia_divisor: 0, dizimo_perc: 0, dizimo_divisor: 0 };
}

function syncEntradaPercentualInputs() {
    const percentuais = getCurrentEntradaPercentuais();
    const primiciaPerc = Number(percentuais.primicia_perc ?? percentuais.primicia ?? 0);
    const dizimoPerc = Number(percentuais.dizimo_perc ?? percentuais.dizimo ?? 0);
    if (elements.primiciaPerc && document.activeElement !== elements.primiciaPerc) {
        elements.primiciaPerc.value = primiciaPerc;
    }
    if (elements.dizimoPerc && document.activeElement !== elements.dizimoPerc) {
        elements.dizimoPerc.value = dizimoPerc;
    }
    if (elements.primiciaValor && document.activeElement !== elements.primiciaValor) {
        elements.primiciaValor.value = normalizeEntradaDivisor(percentuais.primicia_divisor, primiciaPerc) || 0;
    }
    if (elements.dizimoValor && document.activeElement !== elements.dizimoValor) {
        elements.dizimoValor.value = normalizeEntradaDivisor(percentuais.dizimo_divisor, dizimoPerc) || 0;
    }
}

function handleEntradaPercentualInput(field, source) {
    const totals = calculateCurrentEntradaSummaryTotals();
    const percentuais = getCurrentEntradaPercentuais();
    const liquidBase = totals.received.liquido;
    const primiciaInputDivisor = Number(elements.primiciaValor?.value || 0);
    const primiciaValue = field === "primicia" && source === "valor" && primiciaInputDivisor > 0
        ? roundMoneyUp(liquidBase / primiciaInputDivisor)
        : calculateEntradaPercentualValues(liquidBase, percentuais).primiciaValor;
    const dizimoBase = Math.max(liquidBase - primiciaValue, 0);

    if (field === "primicia") {
        if (source === "percentual") {
            const percentual = Number(elements.primiciaPerc?.value || 0);
            const divisor = percentual > 0 ? roundMoney(100 / percentual) : 0;
            const value = divisor > 0 ? roundMoneyUp(liquidBase / divisor) : 0;
            if (elements.primiciaValor) elements.primiciaValor.value = divisor ? divisor.toFixed(2) : "0";
            openEntradaPercentualModal("primicia", percentual, divisor, value);
        } else {
            const divisor = Number(elements.primiciaValor?.value || 0);
            const percentual = divisor > 0 ? roundMoney(100 / divisor) : 0;
            const value = divisor > 0 ? roundMoneyUp(liquidBase / divisor) : 0;
            if (elements.primiciaPerc) elements.primiciaPerc.value = percentual.toFixed(2);
            openEntradaPercentualModal("primicia", percentual, divisor, value);
        }
        return;
    }

    if (source === "percentual") {
        const percentual = Number(elements.dizimoPerc?.value || 0);
        const divisor = percentual > 0 ? roundMoney(100 / percentual) : 0;
        const value = divisor > 0 ? roundMoneyUp(dizimoBase / divisor) : 0;
        if (elements.dizimoValor) elements.dizimoValor.value = divisor ? divisor.toFixed(2) : "0";
        openEntradaPercentualModal("dizimo", percentual, divisor, value);
    } else {
        const divisor = Number(elements.dizimoValor?.value || 0);
        const percentual = divisor > 0 ? roundMoney(100 / divisor) : 0;
        const value = divisor > 0 ? roundMoneyUp(dizimoBase / divisor) : 0;
        if (elements.dizimoPerc) elements.dizimoPerc.value = percentual.toFixed(2);
        openEntradaPercentualModal("dizimo", percentual, divisor, value);
    }
}

function calculateCurrentEntradaSummaryTotals() {
    const rows = getEntradasInPeriod();
    const selectedRows = rows.filter((item) => !state.deselectedEntradaIds.has(item.id));
    const receivedRows = selectedRows.filter((item) => item.status === "recebido");
    return {
        selected: calculateEntradaTotals(selectedRows),
        received: calculateEntradaTotals(receivedRows)
    };
}

function openEntradaPercentualModal(field, percentual, divisor, calculatedValue) {
    const monthKey = getEntradaPositionKey();
    const percentuais = getCurrentEntradaPercentuais();
    const nextPercentual = Number(percentual || 0);
    const nextDivisor = Number(divisor || 0);
    const nextCalculatedValue = Number(calculatedValue || 0);
    state.pendingPercentualChange = {
        field,
        percentual: nextPercentual,
        divisor: nextDivisor,
        previousPercentual: Number(percentuais[`${field}_perc`] ?? percentuais[field] ?? 0),
        previousDivisor: normalizeEntradaDivisor(percentuais[`${field}_divisor`], percentuais[`${field}_perc`] ?? percentuais[field] ?? 0),
        monthKey
    };

    if (elements.percentualModalText) {
        elements.percentualModalText.textContent = `Aplicar ${nextPercentual.toFixed(2)}% (divisor ${nextDivisor.toFixed(2)}, resultado ${formatCurrency(nextCalculatedValue)}) em ${field === "primicia" ? "Primícia" : "Dízimo"} para ${formatMonthKeyLabel(monthKey)}?`;
    }
    if (elements.percentualModal) {
        elements.percentualModal.style.display = "flex";
    }
}

function closeEntradaPercentualModal(restoreValue = false) {
    if (restoreValue && state.pendingPercentualChange) {
        const percInput = state.pendingPercentualChange.field === "primicia" ? elements.primiciaPerc : elements.dizimoPerc;
        const valueInput = state.pendingPercentualChange.field === "primicia" ? elements.primiciaValor : elements.dizimoValor;
        if (percInput) {
            percInput.value = state.pendingPercentualChange.previousPercentual;
        }
        if (valueInput) {
            valueInput.value = state.pendingPercentualChange.previousDivisor;
        }
    }

    state.pendingPercentualChange = null;
    if (elements.percentualModal) {
        elements.percentualModal.style.display = "none";
    }
    renderEntradasTable();
}

async function saveEntradaPercentualChange(scope) {
    const pending = state.pendingPercentualChange;
    if (!pending) {
        closeEntradaPercentualModal();
        return;
    }

    const updates = {};
    if (scope === "mes_em_diante") {
        let monthKey = pending.monthKey;
        for (let index = 0; index < PERCENTUAL_FORWARD_MONTHS; index += 1) {
            updates[`${monthKey}/${pending.field}_perc`] = pending.percentual;
            updates[`${monthKey}/${pending.field}_divisor`] = pending.divisor;
            updates[`${monthKey}/${pending.field}_valor`] = null;
            monthKey = addMonthsToMonthKey(monthKey, 1);
        }
    } else {
        updates[`${pending.monthKey}/${pending.field}_perc`] = pending.percentual;
        updates[`${pending.monthKey}/${pending.field}_divisor`] = pending.divisor;
        updates[`${pending.monthKey}/${pending.field}_valor`] = null;
    }

    await update(ref(database, ENTRADAS_PERCENTUAIS_PATH), updates);
    closeEntradaPercentualModal();
}

function addMonthsToMonthKey(monthKey, increment) {
    const [year, month] = String(monthKey || "").split("-").map(Number);
    if (!year || !month) {
        return "";
    }

    const date = new Date(year, month - 1, 1, 12, 0, 0);
    date.setMonth(date.getMonth() + increment);
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function formatMonthKeyLabel(monthKey) {
    const [year, month] = String(monthKey || "").split("-").map(Number);
    if (!year || !month) {
        return monthKey || "-";
    }

    return new Date(year, month - 1, 1, 12, 0, 0).toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
    });
}

function parseDateOnly(value) {
    if (!value) {
        return null;
    }

    const [year, month, day] = String(value).split("-").map(Number);
    if (!year || !month || !day) {
        return null;
    }

    return new Date(year, month - 1, day, 12, 0, 0);
}

function toDateInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}

async function deleteEntrada(entrada) {
    if (!confirm(`Excluir a entrada "${entrada.titulo || "sem título"}"?`)) {
        return;
    }

    await remove(ref(database, `${ENTRADAS_PATH}/${entrada.id}`));
}

function setupTableActionsMenu(menu) {
    menu.querySelectorAll("button").forEach((button) => {
        button.addEventListener("click", () => {
            menu.open = false;
        });
    });

    menu.addEventListener("toggle", () => {
        const actions = menu.querySelector(".table-actions");
        if (!actions) {
            return;
        }

        if (!menu.open) {
            actions.removeAttribute("style");
            teardownTableActionsMenuPosition(menu);
            return;
        }

        positionTableActionsMenu(menu);
        setupTableActionsMenuPosition(menu);
    });
}

function setupTableActionsMenuPosition(menu) {
    teardownTableActionsMenuPosition(menu);

    let pendingFrame = null;
    const reposition = () => {
        if (pendingFrame) {
            return;
        }

        pendingFrame = requestAnimationFrame(() => {
            pendingFrame = null;
            if (menu.open) {
                positionTableActionsMenu(menu);
            }
        });
    };

    menu._actionsPositionHandler = reposition;
    window.addEventListener("scroll", reposition, true);
    window.addEventListener("resize", reposition);
}

function teardownTableActionsMenuPosition(menu) {
    if (!menu._actionsPositionHandler) {
        return;
    }

    window.removeEventListener("scroll", menu._actionsPositionHandler, true);
    window.removeEventListener("resize", menu._actionsPositionHandler);
    menu._actionsPositionHandler = null;
}

function positionTableActionsMenu(menu) {
    const actions = menu.querySelector(".table-actions");
    const summary = menu.querySelector("summary");
    if (!actions || !summary) {
        return;
    }

    const gap = 4;
    const viewportPadding = 8;
    const rect = summary.getBoundingClientRect();
    const actionWidth = actions.offsetWidth || 150;
    const actionHeight = actions.offsetHeight || 0;
    const spaceBelow = window.innerHeight - rect.bottom - viewportPadding;
    const spaceAbove = rect.top - viewportPadding;
    const openAbove = actionHeight > spaceBelow && spaceAbove > spaceBelow;
    const top = openAbove
        ? Math.max(viewportPadding, rect.top - actionHeight - gap)
        : Math.max(viewportPadding, Math.min(rect.bottom + gap, window.innerHeight - actionHeight - viewportPadding));

    actions.style.left = `${Math.round(Math.max(viewportPadding, rect.right - actionWidth))}px`;
    actions.style.top = `${Math.round(top)}px`;
}

function buildStatusBadge(status) {
    if (status === "dispensado") {
        return `<span class="conta-status-badge status-dismissed">Dispensado</span>`;
    }

    const received = status === "recebido";
    return `<span class="conta-status-badge ${received ? "status-paid" : "status-pending"}">${received ? "Recebido" : "Não recebido"}</span>`;
}

function generateId() {
    const now = new Date();
    return [
        now.getFullYear(),
        String(now.getMonth() + 1).padStart(2, "0"),
        String(now.getDate()).padStart(2, "0"),
        String(now.getHours()).padStart(2, "0"),
        String(now.getMinutes()).padStart(2, "0"),
        String(now.getSeconds()).padStart(2, "0"),
        String(now.getMilliseconds()).padStart(3, "0")
    ].join("");
}

function roundMoney(value) {
    return Number((Number(value || 0)).toFixed(2));
}

function roundMoneyUp(value) {
    const numericValue = Number(value || 0);
    return Math.ceil((numericValue - Number.EPSILON) * 100) / 100;
}

function formatCurrency(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatDate(value) {
    if (!value) {
        return "-";
    }

    const [year, month, day] = String(value).split("-").map(Number);
    if (!year || !month || !day) {
        return value;
    }

    return new Date(year, month - 1, day, 12, 0, 0).toLocaleDateString("pt-BR");
}

function escapeHtmlAttr(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/"/g, "&quot;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function escapeHtmlText(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;");
}

function normalizeText(value) {
    return String(value || "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .toLowerCase();
}
