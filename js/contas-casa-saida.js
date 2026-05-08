import { database } from "./firebase-config.js";
import { uploadImagemCloudinary, deletarImagemCloudinary } from "./cloudinary-config.js";
import { ref, onValue, set, update, remove } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const PATHS = {
    abertasFixas: "contas_casa/saida/abertas/fixas",
    abertasParceladas: "contas_casa/saida/abertas/parceladas",
    abertasAtrasadas: "contas_casa/saida/abertas/atrasadas",
    quitadasFixas: "contas_casa/saida/quitadas/fixas",
    quitadasParceladas: "contas_casa/saida/quitadas/parceladas",
    excluidas: "contas_casa/saida/excluidas",
    posicao: "contas_casa/saida/abertas/posicao",
    cartoes: "contas_casa/cartoes"
};

const state = {
    selectedId: null,
    selectedPath: null,
    selectedCardId: null,
    selectedFaturaCardId: null,
    selectedFaturaLancamento: null,
    selectedMensalidadeConta: null,
    selectedAnexosConta: null,
    selectedDeleteConta: null,
    viewMonthKey: "",
    contas: [],
    contasAtrasadas: [],
    contasExcluidas: [],
    contasAtrasadasSort: { field: "data", direction: "asc" },
    cartoes: [],
    posicoes: {},
    faturaJurosSource: "",
    stopListeners: [],
    initialized: false
};

const elements = {};
const PENDING_PAGO_POR_FOCUS_KEY = "dreamrocket:pendingPagoPorFocus";
const PENDING_PAGO_DATA_FOCUS_KEY = "dreamrocket:pendingPagoDataFocus";

export async function initContasCasaSaida() {
    if (state.initialized && elements.tableBody?.isConnected) {
        return;
    }

    state.initialized = true;

    initializeElements();
    setupEventListeners();
    startRealtimeListeners();
    setDefaultMonth();
    updateParceladoVisibility();
    updatePagamentoCartaoVisibility();
    updateFaturaDetails();
}

export async function initContasCasaAtrasadas() {
    if (state.initialized && elements.contasAtrasadasTableBody?.isConnected && !elements.tableBody?.isConnected) {
        return;
    }

    state.initialized = true;
    initializeElements();
    setupEventListeners();
    startAtrasadasRealtimeListener();
}

export async function initContasCasaExcluidas() {
    if (state.initialized && elements.contasExcluidasTableBody?.isConnected && !elements.tableBody?.isConnected) {
        return;
    }

    state.initialized = true;
    initializeElements();
    setupEventListeners();
    startExcluidasRealtimeListener();
}

function initializeElements() {
    elements.tableBody = document.getElementById("contasCasaTableBody");
    elements.contasAtrasadasTableBody = document.getElementById("contasAtrasadasTableBody");
    elements.contasAtrasadasSummary = document.getElementById("contasAtrasadasSummary");
    elements.contasQuitadasTableBody = document.getElementById("contasQuitadasTableBody");
    elements.contasQuitadasSummary = document.getElementById("contasQuitadasSummary");
    elements.searchAtrasadasInput = document.getElementById("searchAtrasadasInput");
    elements.contasAtrasadasSortButtons = Array.from(document.querySelectorAll("[data-late-sort]"));
    elements.contasPendentesAcaoTableBody = document.getElementById("contasPendentesAcaoTableBody");
    elements.contasPendentesAcaoSummary = document.getElementById("contasPendentesAcaoSummary");
    elements.contasExcluidasTableBody = document.getElementById("contasExcluidasTableBody");
    elements.contasExcluidasSummary = document.getElementById("contasExcluidasSummary");
    elements.prevMonthBtn = document.getElementById("prevMonthBtn");
    elements.nextMonthBtn = document.getElementById("nextMonthBtn");
    elements.currentMonthLabel = document.getElementById("currentMonthLabel");
    elements.viewMonthSelect = document.getElementById("viewMonthSelect");
    elements.monthActionWarning = document.getElementById("monthActionWarning");
    elements.filterQuitadas = document.getElementById("filterQuitadas");
    elements.filterFixas = document.getElementById("filterFixas");
    elements.filterParceladas = document.getElementById("filterParceladas");
    elements.filterCartoes = document.getElementById("filterCartoes");
    elements.filterAtrasadasStatus = document.getElementById("filterAtrasadasStatus");
    elements.filterPagasStatus = document.getElementById("filterPagasStatus");
    elements.filterPendentesStatus = document.getElementById("filterPendentesStatus");
    elements.searchContaInput = document.getElementById("searchContaInput");
    elements.contasMonthSummary = document.getElementById("contasMonthSummary");
    elements.tipoConta = document.getElementById("tipoConta");
    elements.titulo = document.getElementById("titulo");
    elements.dataPrimeiraParcela = document.getElementById("dataPrimeiraParcela");
    elements.dataPrimeiraParcelaLabel = document.getElementById("dataPrimeiraParcelaLabel");
    elements.parceladoTotal = document.getElementById("parceladoTotal");
    elements.parceladoPagas = document.getElementById("parceladoPagas");
    elements.parceladoPagasTotal = document.getElementById("parceladoPagasTotal");
    elements.parceladoSaldo = document.getElementById("parceladoSaldo");
    elements.jurosAtrasoValor = document.getElementById("jurosAtrasoValor");
    elements.jurosAtrasoPerc = document.getElementById("jurosAtrasoPerc");
    elements.valorMensal = document.getElementById("valorMensal");
    elements.prazoDia = document.getElementById("prazoDia");
    elements.pagoData = document.getElementById("pagoData");
    elements.pagoPor = document.getElementById("pagoPor");
    elements.linkConta = document.getElementById("linkConta");
    elements.quitarJuros = document.getElementById("quitarJuros");
    elements.quitarDesconto = document.getElementById("quitarDesconto");
    elements.observacao = document.getElementById("observacao");
    elements.formaPagamento = document.getElementById("formaPagamento");
    elements.cartaoContaId = document.getElementById("cartaoContaId");
    elements.contaFixaMesUnico = document.getElementById("contaFixaMesUnico");
    elements.contaFixaMesUnicoWrapper = document.getElementById("contaFixaMesUnicoWrapper");
    elements.modoPagamentoCartao = document.getElementById("modoPagamentoCartao");
    elements.saveBtn = document.getElementById("saveContaBtn");
    elements.updateBtn = document.getElementById("updateContaBtn");
    elements.clearBtn = document.getElementById("clearContaBtn");
    elements.parcelasManagementSection = document.getElementById("parcelasManagementSection");
    elements.parcelasManagementList = document.getElementById("parcelasManagementList");
    elements.parcelasRangeStart = document.getElementById("parcelasRangeStart");
    elements.parcelasRangeEnd = document.getElementById("parcelasRangeEnd");
    elements.parcelasBulkPaymentDay = document.getElementById("parcelasBulkPaymentDay");
    elements.parcelasBulkPaidBy = document.getElementById("parcelasBulkPaidBy");
    elements.parcelasSelectRangeBtn = document.getElementById("parcelasSelectRangeBtn");
    elements.parcelasClearSelectionBtn = document.getElementById("parcelasClearSelectionBtn");
    elements.parcelasApplyPaymentBtn = document.getElementById("parcelasApplyPaymentBtn");
    elements.parcelasApplyLateBtn = document.getElementById("parcelasApplyLateBtn");

    elements.cartoesTableBody = document.getElementById("cartoesTableBody");
    elements.cartaoTitulo = document.getElementById("cartaoTitulo");
    elements.cartaoUltimosDigitos = document.getElementById("cartaoUltimosDigitos");
    elements.cartaoVencimentoDia = document.getElementById("cartaoVencimentoDia");
    elements.cartaoMelhorDiaCompra = document.getElementById("cartaoMelhorDiaCompra");
    elements.saveCartaoBtn = document.getElementById("saveCartaoBtn");
    elements.updateCartaoBtn = document.getElementById("updateCartaoBtn");
    elements.clearCartaoBtn = document.getElementById("clearCartaoBtn");

    elements.faturaCompetenciaLabel = document.getElementById("faturaCompetenciaLabel");
    elements.faturasTableBody = document.getElementById("cartoesFaturasTableBody");
    elements.faturaDetailsSection = document.getElementById("faturaDetailsSection");
    elements.faturaDetailsTitle = document.getElementById("faturaDetailsTitle");
    elements.faturaSummary = document.getElementById("faturaSummary");
    elements.faturaLancamentos = document.getElementById("faturaLancamentos");
    elements.faturaValorPago = document.getElementById("faturaValorPago");
    elements.faturaJurosValor = document.getElementById("faturaJurosValor");
    elements.faturaJurosPerc = document.getElementById("faturaJurosPerc");
    elements.saveFaturaBtn = document.getElementById("saveFaturaBtn");
    elements.clearFaturaBtn = document.getElementById("clearFaturaBtn");
    elements.faturaLancamentoModal = document.getElementById("faturaLancamentoModal");
    elements.closeFaturaLancamentoModalBtn = document.getElementById("closeFaturaLancamentoModalBtn");
    elements.cancelFaturaLancamentoBtn = document.getElementById("cancelFaturaLancamentoBtn");
    elements.saveFaturaLancamentoBtn = document.getElementById("saveFaturaLancamentoBtn");
    elements.deleteFaturaLancamentoBtn = document.getElementById("deleteFaturaLancamentoBtn");
    elements.faturaLancamentoTitulo = document.getElementById("faturaLancamentoTitulo");
    elements.faturaLancamentoData = document.getElementById("faturaLancamentoData");
    elements.faturaLancamentoValor = document.getElementById("faturaLancamentoValor");
    elements.faturaLancamentoObservacao = document.getElementById("faturaLancamentoObservacao");
    elements.faturaLancamentoHelper = document.getElementById("faturaLancamentoHelper");

    elements.mensalidadeModal = document.getElementById("mensalidadeModal");
    elements.closeMensalidadeModalBtn = document.getElementById("closeMensalidadeModalBtn");
    elements.cancelMensalidadeChangeBtn = document.getElementById("cancelMensalidadeChangeBtn");
    elements.saveMensalidadeChangeBtn = document.getElementById("saveMensalidadeChangeBtn");
    elements.mensalidadeValorAtual = document.getElementById("mensalidadeValorAtual");
    elements.mensalidadeEscopo = document.getElementById("mensalidadeEscopo");
    elements.mensalidadeOperacao = document.getElementById("mensalidadeOperacao");
    elements.mensalidadeValorAlteracao = document.getElementById("mensalidadeValorAlteracao");
    elements.mensalidadeResultado = document.getElementById("mensalidadeResultado");
    elements.mensalidadeMotivo = document.getElementById("mensalidadeMotivo");
    elements.mensalidadeChangesList = document.getElementById("mensalidadeChangesList");

    elements.anexosContaModal = document.getElementById("anexosContaModal");
    elements.anexosContaTitle = document.getElementById("anexosContaTitle");
    elements.closeAnexosContaModalBtn = document.getElementById("closeAnexosContaModalBtn");
    elements.cancelAnexosContaBtn = document.getElementById("cancelAnexosContaBtn");
    elements.anexosContaInput = document.getElementById("anexosContaInput");
    elements.uploadAnexosContaBtn = document.getElementById("uploadAnexosContaBtn");
    elements.anexosContaList = document.getElementById("anexosContaList");

    elements.deleteContaModal = document.getElementById("deleteContaModal");
    elements.deleteContaTitle = document.getElementById("deleteContaTitle");
    elements.deleteContaScope = document.getElementById("deleteContaScope");
    elements.confirmDeleteContaBtn = document.getElementById("confirmDeleteContaBtn");
    elements.cancelDeleteContaBtn = document.getElementById("cancelDeleteContaBtn");
    elements.closeDeleteContaModalBtn = document.getElementById("closeDeleteContaModalBtn");
}

function setupEventListeners() {
    elements.prevMonthBtn?.addEventListener("click", () => changeViewMonth(-1));
    elements.nextMonthBtn?.addEventListener("click", () => changeViewMonth(1));
    elements.viewMonthSelect?.addEventListener("change", () => {
        if (!elements.viewMonthSelect.value) {
            return;
        }
        setViewMonth(elements.viewMonthSelect.value);
    });

    [
        elements.filterQuitadas,
        elements.filterFixas,
        elements.filterParceladas,
        elements.filterCartoes,
        elements.filterAtrasadasStatus,
        elements.filterPagasStatus,
        elements.filterPendentesStatus
    ].forEach((checkbox) => {
        checkbox?.addEventListener("change", renderTable);
    });

    elements.searchContaInput?.addEventListener("input", renderTable);
    elements.searchAtrasadasInput?.addEventListener("input", renderAtrasadasTable);
    elements.tipoConta?.addEventListener("change", updateParceladoVisibility);
    elements.dataPrimeiraParcela?.addEventListener("change", applyAutomaticParceladoProgress);
    elements.formaPagamento?.addEventListener("change", () => {
        updatePagamentoCartaoVisibility();
        updateParceladoVisibility();
        applyAutomaticParceladoProgress();
    });
    elements.cartaoContaId?.addEventListener("change", applyAutomaticParceladoProgress);
    elements.valorMensal?.addEventListener("input", () => {
        syncJurosFields("valor");
        syncQuitarJurosPreview();
    });
    elements.jurosAtrasoValor?.addEventListener("input", () => {
        syncJurosFields("valor");
    });
    elements.jurosAtrasoPerc?.addEventListener("input", () => {
        syncJurosFields("perc");
    });
    elements.parceladoTotal?.addEventListener("input", () => {
        applyAutomaticParceladoProgress();
        syncParceladoSaldo();
    });
    elements.parceladoPagasTotal?.addEventListener("input", syncParceladoSaldo);
    elements.saveBtn?.addEventListener("click", saveConta);
    elements.updateBtn?.addEventListener("click", updateConta);
    elements.clearBtn?.addEventListener("click", clearForm);
    elements.parcelasSelectRangeBtn?.addEventListener("click", selectParcelasRange);
    elements.parcelasClearSelectionBtn?.addEventListener("click", clearParcelasSelection);
    elements.parcelasApplyPaymentBtn?.addEventListener("click", applySelectedParcelasPayment);
    elements.parcelasApplyLateBtn?.addEventListener("click", applySelectedParcelasLate);

    elements.saveCartaoBtn?.addEventListener("click", saveCartao);
    elements.updateCartaoBtn?.addEventListener("click", updateCartao);
    elements.clearCartaoBtn?.addEventListener("click", clearCartaoForm);

    elements.faturaValorPago?.addEventListener("input", syncFaturaJurosFields);
    elements.faturaJurosValor?.addEventListener("input", () => syncFaturaJurosFields("valor"));
    elements.faturaJurosPerc?.addEventListener("input", () => syncFaturaJurosFields("perc"));
    elements.saveFaturaBtn?.addEventListener("click", saveFatura);
    elements.clearFaturaBtn?.addEventListener("click", clearFaturaSelection);
    elements.closeFaturaLancamentoModalBtn?.addEventListener("click", closeFaturaLancamentoModal);
    elements.cancelFaturaLancamentoBtn?.addEventListener("click", closeFaturaLancamentoModal);
    elements.saveFaturaLancamentoBtn?.addEventListener("click", saveFaturaLancamentoEdit);
    elements.deleteFaturaLancamentoBtn?.addEventListener("click", deleteSelectedFaturaLancamento);
    elements.closeMensalidadeModalBtn?.addEventListener("click", closeMensalidadeModal);
    elements.cancelMensalidadeChangeBtn?.addEventListener("click", closeMensalidadeModal);
    elements.saveMensalidadeChangeBtn?.addEventListener("click", saveMensalidadeChange);
    elements.mensalidadeOperacao?.addEventListener("change", updateMensalidadeResult);
    elements.mensalidadeValorAlteracao?.addEventListener("input", updateMensalidadeResult);
    elements.mensalidadeModal?.addEventListener("click", (event) => {
        if (event.target === elements.mensalidadeModal) {
            closeMensalidadeModal();
        }
    });
    elements.closeAnexosContaModalBtn?.addEventListener("click", closeAnexosContaModal);
    elements.cancelAnexosContaBtn?.addEventListener("click", closeAnexosContaModal);
    elements.uploadAnexosContaBtn?.addEventListener("click", uploadAnexosConta);
    elements.confirmDeleteContaBtn?.addEventListener("click", confirmDeleteConta);
    elements.cancelDeleteContaBtn?.addEventListener("click", closeDeleteContaModal);
    elements.closeDeleteContaModalBtn?.addEventListener("click", closeDeleteContaModal);
    elements.contasAtrasadasSortButtons?.forEach((button) => {
        button.addEventListener("click", () => setAtrasadasSort(button.dataset.lateSort));
    });
    elements.anexosContaModal?.addEventListener("click", (event) => {
        if (event.target === elements.anexosContaModal) {
            closeAnexosContaModal();
        }
    });
    elements.deleteContaModal?.addEventListener("click", (event) => {
        if (event.target === elements.deleteContaModal) {
            closeDeleteContaModal();
        }
    });
    elements.faturaLancamentoModal?.addEventListener("click", (event) => {
        if (event.target === elements.faturaLancamentoModal) {
            closeFaturaLancamentoModal();
        }
    });
}

function startRealtimeListeners() {
    state.stopListeners.forEach((stop) => typeof stop === "function" && stop());
    state.stopListeners = [];

    Object.entries(PATHS).forEach(([category, path]) => {
        const stop = onValue(ref(database, path), (snapshot) => {
            const data = snapshot.val();

            if (category === "cartoes") {
                state.cartoes = data
                    ? Object.entries(data).map(([id, value]) => ({ id, ...value }))
                    : [];

                renderCardOptions();
                renderCartoesTable();
                renderTable();
                renderFaturasTable();
                updateFaturaDetails();
                return;
            }

            if (category === "posicao") {
                state.posicoes = data || {};
                renderTable();
                return;
            }

            if (category === "excluidas") {
                return;
            }

            if (category === "abertasAtrasadas") {
                state.contasAtrasadas = flattenAtrasadasNode(data);
                renderAtrasadasTable();
                renderTable();
                updateMonthActionWarning();
                return;
            }

            state.contas = state.contas.filter((item) => item.category !== category);

            if (data) {
                Object.entries(data).forEach(([id, value]) => {
                    state.contas.push({
                        id,
                        path,
                        category,
                        ...value
                    });
                });
            }

            renderTable();
            refreshAnexosContaModal();
            renderAtrasadasTable();
            renderFaturasTable();
            updateFaturaDetails();
        });

        state.stopListeners.push(stop);
    });
}

function startAtrasadasRealtimeListener() {
    state.stopListeners.forEach((stop) => typeof stop === "function" && stop());
    state.stopListeners = [];

    const stopAtrasadas = onValue(ref(database, PATHS.abertasAtrasadas), (snapshot) => {
        const data = snapshot.val();
        state.contasAtrasadas = flattenAtrasadasNode(data);
        renderAtrasadasTable();
        renderPendentesAcaoTable();
    });

    state.stopListeners.push(stopAtrasadas);

    ["abertasFixas", "abertasParceladas"].forEach((category) => {
        const path = PATHS[category];
        const stop = onValue(ref(database, path), (snapshot) => {
            state.contas = state.contas.filter((item) => item.category !== category);
            const data = snapshot.val();
            if (data) {
                Object.entries(data).forEach(([id, value]) => {
                    state.contas.push({
                        id,
                        path,
                        category,
                        ...value
                    });
                });
            }
            renderPendentesAcaoTable();
        });

        state.stopListeners.push(stop);
    });
}

function startExcluidasRealtimeListener() {
    state.stopListeners.forEach((stop) => typeof stop === "function" && stop());
    state.stopListeners = [];

    const stopExcluidas = onValue(ref(database, PATHS.excluidas), (snapshot) => {
        const data = snapshot.val();
        state.contasExcluidas = data
            ? Object.entries(data).map(([id, value]) => ({
                id,
                path: PATHS.excluidas,
                category: "excluidas",
                ...value
            }))
            : [];
        renderExcluidasTable();
    });

    state.stopListeners.push(stopExcluidas);
}

function flattenAtrasadasNode(data) {
    if (!data) {
        return [];
    }

    return Object.entries(data).flatMap(([contaId, competenciasNode]) => {
        if (!competenciasNode || typeof competenciasNode !== "object") {
            return [];
        }

        return Object.entries(competenciasNode).map(([competenciaId, value]) => ({
            id: competenciaId,
            competencia_id: competenciaId,
            conta_group_id: contaId,
            ...value
        }));
    });
}

function getAtrasadaRefPath(item) {
    const contaId = item.conta_group_id || item.conta_id;
    const competenciaId = item.competencia_id || item.id || String(item.mes_referencia || "").replace("-", "");
    return `${PATHS.abertasAtrasadas}/${contaId}/${competenciaId}`;
}

function getCategoryLabel(category) {
    const labels = {
        abertasFixas: "Fixa aberta",
        abertasParceladas: "Parcelada aberta",
        abertasAtrasadas: "Atrasada",
        quitadasFixas: "Fixa quitada",
        quitadasParceladas: "Parcelada quitada"
    };

    return labels[category] || category;
}

function renderTable() {
    if (!elements.tableBody) {
        return;
    }

    const selectedMonthKey = state.viewMonthKey || getCurrentMonthKey();
    const filtered = getVisibleRowsForMonth(selectedMonthKey);

    elements.tableBody.innerHTML = "";
    updateContasMonthSummary(filtered, selectedMonthKey);

        if (!filtered.length) {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="17" class="empty-table-row">Nenhuma conta encontrada.</td>
            </tr>
        `;
        return;
    }

    filtered.forEach((item, index) => {
        const monthlyView = getMonthlyView(item, selectedMonthKey);

        const tr = document.createElement("tr");
        tr.dataset.rowId = item.id || "";
        tr.dataset.rowPath = item.path || "";
        const statusMes = getRowMonthStatus(item, selectedMonthKey);
        if (statusMes?.status === "atrasada") {
            tr.classList.add("conta-atrasada-row");
        } else if (statusMes?.status === "paga" || statusMes?.status === "paga_atrasada" || statusMes?.status === "feito") {
            tr.classList.add("conta-paga-row");
        } else if (statusMes?.status === "dispensada") {
            tr.classList.add("conta-dispensada-row");
        }
        if (isLastInstallmentMonth(item, monthlyView)) {
            tr.classList.add("conta-ultima-parcela-row");
        }
        const monthlyData = getRowMonthlyData(item, selectedMonthKey);
        const valorComJuros = Number(monthlyData.juros_atraso_valor || 0) > 0 ? formatCurrency(monthlyData.valor_com_juros_calculado) : "-";
        const valorPago = statusMes?.valor_pago ?? monthlyData.valor_com_juros_calculado;

        tr.innerHTML = `
            <td>${buildContaOrderButtons(item, index, filtered.length)}${buildContaTitle(item)}</td>
            <td>${monthlyView.parceladoTotalText}</td>
            <td>${monthlyView.parceladoPosicaoText}</td>
            <td>${monthlyView.parcelasPagasText}</td>
            <td>${monthlyView.parceladoSaldoText}</td>
            <td class="valor-mensal-text">${isContaFixa(item) ? buildInlineNumberInput("valor_mensal", monthlyData.valor_mensal, "0.00", "monthly") : formatCurrency(monthlyData.valor_mensal)}</td>
            <td>${isCartaoResumoRow(item) ? "-" : buildInlineJurosInputs(monthlyData)}</td>
            <td data-valor-com-juros>${valorComJuros}</td>
            <td>${isCartaoResumoRow(item) ? formatCurrency(valorPago) : buildInlineNumberInput("valor_pago", valorPago, "0.00", "paid")}</td>
            <td>${monthlyView.prazoText}</td>
            <td>${isCartaoResumoRow(item) ? "-" : buildInlineDateInput("pago_data", statusMes?.pago_data || "")}</td>
            <td>${isCartaoResumoRow(item) ? "-" : buildInlinePagoPorSelect(statusMes?.pago_por || "")}</td>
            <td>${buildLinkIcon(monthlyData.link_conta)}</td>
            <td>${isCartaoResumoRow(item) ? "-" : buildInlineNumberInput("valor_para_quitar", monthlyData.valor_para_quitar, "0.00", "settlement")}</td>
            <td>${isCartaoResumoRow(item) ? escapeHtmlText(monthlyData.observacao || "") : buildInlineTextarea("observacao", monthlyData.observacao, "Observações")}</td>
            <td data-status-cell>${getStatusBadge(statusMes?.status)}</td>
            <td>
                <details class="table-actions-menu">
                    <summary aria-label="Ações">&#9776;</summary>
                    <div class="table-actions">
                    ${isCartaoResumoRow(item) ? `
                    <button class="table-action-btn" data-action="view-card-invoice" data-id="${item.id}" data-path="${item.path}">Ver fatura</button>
                    ${statusMes?.status === "feito" || statusMes?.status === "paga" ? "" : `<button class="table-action-btn success" data-action="card-done" data-id="${item.id}" data-path="${item.path}">Feito</button>`}
                    <button class="table-action-btn danger" data-action="card-abandon" data-id="${item.id}" data-path="${item.path}">Abandonar</button>` : `
                    <button class="table-action-btn" data-action="edit" data-id="${item.id}" data-path="${item.path}">Editar</button>
                    <button class="table-action-btn" data-action="attachments" data-id="${item.id}" data-path="${item.path}">Anexos</button>
                    <button class="table-action-btn" data-action="change-monthly" data-id="${item.id}" data-path="${item.path}">Alterar mensalidade</button>
                    ${(!isContaFixa(item) && item.category !== "quitadasParceladas" && item.category !== "quitadasFixas") ? `<button class="table-action-btn success" data-action="quitar" data-id="${item.id}" data-path="${item.path}">Quitar</button>` : ""}
                    ${(statusMes?.status !== "dispensada" && item.category !== "quitadasParceladas" && item.category !== "quitadasFixas") ? `<button class="table-action-btn" data-action="dispense" data-id="${item.id}" data-path="${item.path}">Dispensada</button>` : ""}
                    ${(statusMes?.status !== "atrasada" && item.category !== "abertasAtrasadas" && item.category !== "quitadasParceladas" && item.category !== "quitadasFixas") ? `<button class="table-action-btn" data-action="late" data-id="${item.id}" data-path="${item.path}">Atrasada</button>` : ""}
                    <button class="table-action-btn danger" data-action="delete" data-id="${item.id}" data-path="${item.path}">Excluir</button>`}
                    </div>
                </details>
            </td>
        `;

        tr.querySelectorAll("button[data-action]").forEach((button) => {
            button.addEventListener("click", () => handleTableAction(button.dataset.action, item.id, item.path, button));
        });

        tr.querySelectorAll(".table-actions-menu").forEach((menu) => {
            setupTableActionsMenu(menu);
        });

        tr.querySelectorAll("[data-inline-field]").forEach((field) => {
            if (field.dataset.inlineField === "juros_atraso_valor" || field.dataset.inlineField === "juros_atraso_perc") {
                field.addEventListener("input", () => syncInlineJurosFields(item, field));
            }
            if (field.dataset.inlineField === "valor_pago") {
                field.addEventListener("input", () => {
                    field.dataset.userEdited = "true";
                });
                field.addEventListener("blur", async () => {
                    queueInlinePagoDataFocus(item);
                    await saveInlineContaField(item, field);
                });
                field.addEventListener("keydown", (event) => {
                    if (event.key === "Enter") {
                        field.blur();
                    }
                });
                return;
            }
            if (field.dataset.inlineField === "pago_data") {
                field.addEventListener("blur", async () => {
                    queueInlinePagoPorFocus(item, field);
                    await saveInlineContaField(item, field);
                    focusPendingPagoPor();
                });
                field.addEventListener("keydown", (event) => {
                    if (event.key === "Enter") {
                        field.blur();
                    }
                });
            } else {
                field.addEventListener("change", () => saveInlineContaField(item, field));
            }
        });

        elements.tableBody.appendChild(tr);
    });

    if (!elements.tableBody.children.length) {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="17" class="empty-table-row">Nenhuma conta encontrada para o mês selecionado.</td>
            </tr>
        `;
    }

    updateMonthActionWarning();
    focusPendingPagoData();
    focusPendingPagoPor();
}

function queueInlinePagoDataFocus(item) {
    try {
        localStorage.setItem(PENDING_PAGO_DATA_FOCUS_KEY, JSON.stringify({
            id: item.id || "",
            path: item.path || "",
            monthKey: state.viewMonthKey || getCurrentMonthKey()
        }));
    } catch (error) {
        console.warn("Não foi possível salvar foco pendente:", error);
    }
}

function focusPendingPagoData() {
    const pending = getPendingFocus(PENDING_PAGO_DATA_FOCUS_KEY);
    if (!pending || pending.monthKey !== (state.viewMonthKey || getCurrentMonthKey())) {
        return;
    }

    requestAnimationFrame(() => {
        const row = findPendingFocusRow(pending);
        const pagoDataInput = row?.querySelector('[data-inline-field="pago_data"]');
        if (!pagoDataInput) {
            return;
        }

        pagoDataInput.focus();
        selectDateInputDay(pagoDataInput);
        clearPendingFocus(PENDING_PAGO_DATA_FOCUS_KEY);
    });
}

function queueInlinePagoPorFocus(item, fieldElement) {
    const pagoPorSelect = fieldElement.closest("tr")?.querySelector('[data-inline-field="pago_por"]');
    if (!pagoPorSelect || pagoPorSelect.value) {
        clearPendingPagoPorFocus();
        return;
    }

    try {
        localStorage.setItem(PENDING_PAGO_POR_FOCUS_KEY, JSON.stringify({
            id: item.id || "",
            path: item.path || "",
            monthKey: state.viewMonthKey || getCurrentMonthKey()
        }));
    } catch (error) {
        console.warn("Não foi possível salvar foco pendente:", error);
    }
}

function focusPendingPagoPor() {
    const pending = getPendingFocus(PENDING_PAGO_POR_FOCUS_KEY);
    if (!pending || pending.monthKey !== (state.viewMonthKey || getCurrentMonthKey())) {
        return;
    }

    requestAnimationFrame(() => {
        const row = findPendingFocusRow(pending);
        const pagoPorSelect = row?.querySelector('[data-inline-field="pago_por"]');
        if (!pagoPorSelect) {
            return;
        }

        if (!pagoPorSelect.value) {
            pagoPorSelect.focus();
        }
        clearPendingFocus(PENDING_PAGO_POR_FOCUS_KEY);
    });
}

function findPendingFocusRow(pending) {
    return Array.from(elements.tableBody?.querySelectorAll("tr") || [])
        .find((item) => item.dataset.rowId === pending.id && item.dataset.rowPath === pending.path);
}

function getPendingFocus(storageKey) {
    try {
        const rawValue = localStorage.getItem(storageKey);
        return rawValue ? JSON.parse(rawValue) : null;
    } catch (error) {
        console.warn("Não foi possível ler foco pendente:", error);
        return null;
    }
}

function clearPendingFocus(storageKey) {
    try {
        localStorage.removeItem(storageKey);
    } catch (error) {
        console.warn("Não foi possível limpar foco pendente:", error);
    }
}

function clearPendingPagoPorFocus() {
    clearPendingFocus(PENDING_PAGO_POR_FOCUS_KEY);
}

function selectDateInputDay(input) {
    try {
        input.setSelectionRange(8, 10);
    } catch (error) {
        // Alguns navegadores não permitem seleção parcial em input type="date".
    }
}

function getVisibleContasForMonth(monthKey) {
    const search = (elements.searchContaInput?.value || "").trim().toLowerCase();
    const filtered = state.contas.filter((item) => {
        if (item.pagamento?.metodo === "cartao") {
            return false;
        }

        const quitadaEnabled = elements.filterQuitadas?.checked;
        const fixaEnabled = elements.filterFixas?.checked;
        const parceladaEnabled = elements.filterParceladas?.checked;
        const statusMes = getContaMonthStatus(item, monthKey);
        const statusFilter = normalizeContaMonthStatus(statusMes?.status);

        if (!getMonthlyView(item, monthKey)) {
            return false;
        }

        if ((item.category === "quitadasFixas" || item.category === "quitadasParceladas") && !quitadaEnabled) {
            return false;
        }

        if (isContaFixa(item) && !fixaEnabled) {
            return false;
        }

        if (!isContaFixa(item) && !parceladaEnabled) {
            return false;
        }

        if (statusFilter === "atrasada" && !elements.filterAtrasadasStatus?.checked) {
            return false;
        }

        if ((statusFilter === "paga" || statusFilter === "paga_atrasada" || statusFilter === "quitada" || statusFilter === "dispensada" || statusFilter === "feito") && !elements.filterPagasStatus?.checked) {
            return false;
        }

        if (statusFilter === "pendente" && !elements.filterPendentesStatus?.checked) {
            return false;
        }

        if (!search) {
            return true;
        }

        return String(item.titulo || "").toLowerCase().includes(search);
    });

    return sortContasByMonthPosition(filtered, monthKey);
}

function getVisibleRowsForMonth(monthKey) {
    const contas = getVisibleContasForMonth(monthKey);
    const cartoes = getVisibleCartaoResumoRowsForMonth(monthKey);
    return sortContasByMonthPosition([...contas, ...cartoes], monthKey);
}

function getVisibleCartaoResumoRowsForMonth(monthKey) {
    if (!elements.filterCartoes?.checked) {
        return [];
    }

    const search = (elements.searchContaInput?.value || "").trim().toLowerCase();

    return state.cartoes
        .map((cartao) => buildCardMonthSummary(cartao, monthKey))
        .filter((summary) => summary.lancamentos.length > 0)
        .filter((summary) => !isCartaoAbandonedFrom(summary.cartao, monthKey))
        .map((summary) => buildCartaoResumoRow(summary))
        .filter((row) => {
            const statusFilter = normalizeContaMonthStatus(row.status_mensal?.[monthKey]?.status);
            if ((statusFilter === "paga" || statusFilter === "paga_atrasada" || statusFilter === "quitada" || statusFilter === "dispensada" || statusFilter === "feito") && !elements.filterPagasStatus?.checked) {
                return false;
            }

            if (statusFilter === "pendente" && !elements.filterPendentesStatus?.checked) {
                return false;
            }

            if (!search) {
                return true;
            }

            return String(row.titulo || "").toLowerCase().includes(search);
        });
}

function buildCartaoResumoRow(summary) {
    const status = getCartaoFaturaStatus(summary);
    return {
        id: summary.cartao.id,
        path: PATHS.cartoes,
        category: "cartaoResumo",
        titulo: summary.cartao.titulo || "Cartão",
        cartao: summary.cartao,
        fatura_summary: summary,
        valor_mensal: Number(summary.totalLancamentos || 0),
        status_mensal: {
            [summary.competencia]: {
                status,
                valor_pago: Number(summary.valorPago || 0),
                pago_data: summary.cartao.faturas?.[summary.competencia]?.pago_data || "",
                pago_por: summary.cartao.faturas?.[summary.competencia]?.pago_por || ""
            }
        }
    };
}

function normalizeContaMonthStatus(status) {
    if (status === "paga" || status === "paga_atrasada" || status === "quitada" || status === "atrasada" || status === "dispensada" || status === "feito") {
        return status;
    }

    return "pendente";
}

function sortContasByMonthPosition(items, monthKey) {
    const positionMap = getPositionMapForMonth(monthKey);

    return [...items].sort((a, b) => {
        const aPosition = positionMap.get(getContaRefPath(a));
        const bPosition = positionMap.get(getContaRefPath(b));

        if (aPosition && bPosition) {
            return aPosition - bPosition;
        }

        if (aPosition) {
            return -1;
        }

        if (bPosition) {
            return 1;
        }

        return String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt-BR");
    });
}

function getPositionMapForMonth(monthKey) {
    const snapshot = getPositionSnapshotForMonth(monthKey);
    const entries = Object.entries(snapshot || {}).sort(([a], [b]) => Number(a) - Number(b));

    return new Map(entries.map(([, value], index) => [normalizePositionRef(value), index + 1]).filter(([refPath]) => refPath));
}

function getPositionSnapshotForMonth(monthKey) {
    const availableMonth = Object.keys(state.posicoes || {})
        .filter((key) => key <= monthKey)
        .sort()
        .pop();

    return availableMonth ? state.posicoes[availableMonth] || {} : {};
}

function normalizePositionRef(value) {
    if (!value) {
        return "";
    }

    if (typeof value === "string") {
        return value;
    }

    return value.ref_path || [value.path, value.id].filter(Boolean).join("/");
}

function getContaRefPath(item) {
    return [item.path, item.id].filter(Boolean).join("/");
}

function isCartaoResumoRow(item) {
    return item?.category === "cartaoResumo";
}

function getRowMonthStatus(item, monthKey) {
    return isCartaoResumoRow(item) ? item.status_mensal?.[monthKey] || null : getContaMonthStatus(item, monthKey);
}

function getRowMonthlyData(item, monthKey) {
    if (!isCartaoResumoRow(item)) {
        return getMonthlyContaData(item, monthKey);
    }

    const summary = item.fatura_summary || buildCardMonthSummary(item.cartao, monthKey);
    return {
        valor_mensal: Number(summary.totalLancamentos || 0),
        juros_atraso_valor: Number(summary.jurosValor || 0),
        juros_atraso_perc: Number(summary.jurosPerc || 0),
        valor_com_juros_calculado: Number(summary.totalFatura || 0),
        link_conta: "",
        valor_para_quitar: Number(summary.saldoParaProximo || 0),
        observacao: `${summary.lancamentos.length} lançamento(s) na fatura`
    };
}

function updateContasMonthSummary(items, monthKey) {
    if (!elements.contasMonthSummary) {
        return;
    }

    const totals = items.reduce((acc, item) => {
        const monthlyView = getMonthlyView(item, monthKey);
        if (!monthlyView) {
            return acc;
        }

        const monthlyData = getRowMonthlyData(item, monthKey);
        const valor = Number(monthlyData.valor_mensal || 0);
        const statusMes = getRowMonthStatus(item, monthKey) || {};
        const valorPago = Number(statusMes.valor_pago ?? monthlyData.valor_com_juros_calculado ?? valor);
        if (isContaFixa(item)) {
            acc.fixas += valor;
            acc.fixasPagas += valorPago;
        } else {
            acc.parceladas += valor;
            acc.parceladasPagas += valorPago;
        }
        return acc;
    }, { fixas: 0, parceladas: 0, fixasPagas: 0, parceladasPagas: 0 });

    const total = totals.fixas + totals.parceladas;
    const totalPago = totals.fixasPagas + totals.parceladasPagas;
    elements.contasMonthSummary.innerHTML = `
        <div class="contas-summary-card"><strong>Total fixas</strong><span>${formatCurrency(totals.fixas)}</span><small>Valor pago: ${formatCurrency(totals.fixasPagas)}</small></div>
        <div class="contas-summary-card"><strong>Total parc</strong><span>${formatCurrency(totals.parceladas)}</span><small>Valor pago: ${formatCurrency(totals.parceladasPagas)}</small></div>
        <div class="contas-summary-card total"><strong>Total</strong><span>${formatCurrency(total)}</span><small>Valor pago: ${formatCurrency(totalPago)}</small></div>
    `;
}

function renderCardOptions() {
    if (!elements.cartaoContaId) {
        return;
    }

    const currentValue = elements.cartaoContaId.value;
    const options = ['<option value="">Selecione</option>']
        .concat(
            state.cartoes
                .sort((a, b) => String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt-BR"))
                .map((cartao) => `<option value="${cartao.id}">${buildCartaoLabel(cartao)}</option>`)
        )
        .join("");

    elements.cartaoContaId.innerHTML = options;
    elements.cartaoContaId.value = state.cartoes.some((item) => item.id === currentValue) ? currentValue : "";
}

function buildInlineNumberInput(field, value, placeholder = "0.00", size = "", readonly = false) {
    const sizeClass = size ? ` inline-${size}` : "";
    return `<input type="number" class="filter-select${sizeClass}" min="0" step="0.01" data-inline-field="${field}" value="${escapeHtmlAttr(value ?? "")}" placeholder="${placeholder}" ${readonly ? "readonly" : ""}>`;
}

function buildContaOrderButtons(item, index, totalRows) {
    const upButton = index > 0
        ? `<button class="conta-order-btn" type="button" data-action="move-up" data-id="${item.id}" data-path="${item.path}" aria-label="Subir conta">↑</button>`
        : "";
    const downButton = index < totalRows - 1
        ? `<button class="conta-order-btn" type="button" data-action="move-down" data-id="${item.id}" data-path="${item.path}" aria-label="Descer conta">↓</button>`
        : "";

    return `<span class="conta-order-controls">${upButton}${downButton}</span>`;
}

function buildContaTitle(item) {
    if (isCartaoResumoRow(item)) {
        const titulo = item.cartao ? buildCartaoLabel(item.cartao) : (item.titulo || "Cartão");
        return `<span class="conta-title-card-main">Cartão ${escapeHtmlText(titulo)}</span>`;
    }

    const titulo = escapeHtmlText(item.titulo || "-");
    if (item.pagamento?.metodo !== "cartao") {
        return titulo;
    }

    const cartaoTitulo = item.pagamento?.cartao_titulo || state.cartoes.find((cartao) => cartao.id === item.pagamento?.cartao_id)?.titulo || "";
    if (!cartaoTitulo) {
        return `${titulo}<small class="conta-title-card">Cartão</small>`;
    }

    return `${titulo}<small class="conta-title-card">Cartão ${escapeHtmlText(cartaoTitulo)}</small>`;
}

function isLastInstallmentMonth(item, monthlyView) {
    return !isCartaoResumoRow(item) && !isContaFixa(item) && Number(monthlyView?.parceladoSaldoText || 0) === 0;
}

function buildInlineJurosInputs(monthlyData) {
    return `
        <div class="juros-inline-group">
            <input type="number" class="filter-select inline-percent" min="0" step="0.01" data-inline-field="juros_atraso_perc" value="${escapeHtmlAttr(monthlyData.juros_atraso_perc ?? "")}" placeholder="%">
            <input type="number" class="filter-select inline-money" min="0" step="0.01" data-inline-field="juros_atraso_valor" value="${escapeHtmlAttr(monthlyData.juros_atraso_valor ?? "")}" placeholder="R$">
        </div>
    `;
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
            actions.style.left = "";
            actions.style.top = "";
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

    const rect = summary.getBoundingClientRect();
    const actionWidth = actions.offsetWidth || 126;
    actions.style.left = `${Math.max(8, rect.right - actionWidth)}px`;
    actions.style.top = `${rect.bottom + 4}px`;
}

function buildInlineDateInput(field, value) {
    return `<input type="date" class="filter-select inline-date-short" data-inline-field="${field}" value="${escapeHtmlAttr(normalizeDateInput(value))}">`;
}

function buildInlineTextInput(field, value, placeholder = "") {
    return `<input type="text" class="filter-select" data-inline-field="${field}" value="${escapeHtmlAttr(value ?? "")}" placeholder="${placeholder}">`;
}

function buildLinkIcon(value) {
    const link = String(value || "").trim();
    if (!link) {
        return "-";
    }

    return `<a class="conta-link-icon" href="${escapeHtmlAttr(link)}" target="_blank" rel="noreferrer" title="Abrir link">&#128279;</a>`;
}

function buildInlineTextarea(field, value, placeholder = "") {
    return `<textarea class="filter-select" data-inline-field="${field}" rows="2" placeholder="${placeholder}">${escapeHtmlText(value ?? "")}</textarea>`;
}

function buildInlinePagoPorSelect(value) {
    const options = [
        { value: "", label: "Selecione" },
        { value: "eu", label: "Eu" },
        { value: "conjuge", label: "Cônjuge" },
        { value: "ambos", label: "Ambos" },
        { value: "outro", label: "Outro" }
    ];

    return `
        <select class="filter-select" data-inline-field="pago_por">
            ${options.map((option) => `<option value="${option.value}" ${option.value === value ? "selected" : ""}>${option.label}</option>`).join("")}
        </select>
    `;
}

function formatPagoPorLabel(value) {
    const labels = {
        eu: "Eu",
        conjuge: "Cônjuge",
        ambos: "Ambos",
        outro: "Outro"
    };

    return labels[value] || "-";
}

function getStatusLabel(status) {
    const labels = {
        paga: "Paga",
        paga_atrasada: "Paga atrasada",
        atrasada: "Atrasada",
        quitada: "Quitada",
        dispensada: "Dispensada",
        feito: "Feito"
    };

    return labels[status] || "Pendente";
}

function getStatusBadge(status) {
    const normalizedStatus = status || "pendente";
    return `<span class="conta-status-badge status-${escapeHtmlAttr(normalizedStatus)}">${getStatusLabel(status)}</span>`;
}

function getMonthlyContaData(item, monthKey) {
    const monthData = item.dados_mensais?.[monthKey] || {};
    const valorMensal = Number(monthData.valor_mensal ?? item.valor_mensal ?? 0);
    const jurosValor = Number(monthData.juros_atraso_valor ?? item.juros_atraso_valor ?? 0);
    return {
        valor_mensal: valorMensal,
        juros_atraso_valor: jurosValor,
        juros_atraso_perc: Number(monthData.juros_atraso_perc ?? item.juros_atraso_perc ?? 0),
        valor_com_juros_calculado: Number((valorMensal + jurosValor).toFixed(2)),
        link_conta: monthData.link_conta ?? item.link_conta ?? "",
        valor_para_quitar: Number(monthData.valor_para_quitar ?? item.valor_para_quitar ?? 0),
        observacao: monthData.observacao ?? item.observacao ?? ""
    };
}

function getContaEffectiveDueAmount(monthlyData) {
    const jurosValor = Number(monthlyData?.juros_atraso_valor || 0);
    if (jurosValor > 0) {
        return Number(monthlyData?.valor_com_juros_calculado || 0);
    }
    return Number(monthlyData?.valor_mensal || 0);
}

function getAtrasadaEffectiveDueAmount(atrasoLike) {
    const jurosValor = Number(atrasoLike?.juros_valor || 0);
    if (jurosValor > 0) {
        return Number(atrasoLike?.total || (Number(atrasoLike?.valor_mensal || 0) + jurosValor));
    }
    return Number(atrasoLike?.valor_mensal || 0);
}

function renderCartoesTable() {
    if (!elements.cartoesTableBody) {
        return;
    }

    elements.cartoesTableBody.innerHTML = "";

    const sorted = [...state.cartoes].sort((a, b) => String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt-BR"));
    if (!sorted.length) {
        elements.cartoesTableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-table-row">Nenhum cartão cadastrado.</td>
            </tr>
        `;
        return;
    }

    sorted.forEach((cartao) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${cartao.titulo || "-"}</td>
            <td>${formatLastFour(cartao.ultimos_digitos)}</td>
            <td>Dia ${Number(cartao.vencimento_dia || 0)}</td>
            <td>Dia ${Number(cartao.melhor_dia_compra || 0)}</td>
            <td>
                <div class="table-actions">
                    <button class="table-action-btn" data-action="edit-card" data-id="${cartao.id}">Editar</button>
                    <button class="table-action-btn danger" data-action="delete-card" data-id="${cartao.id}">Excluir</button>
                </div>
            </td>
        `;

        tr.querySelector('[data-action="edit-card"]')?.addEventListener("click", () => fillCartaoForm(cartao));
        tr.querySelector('[data-action="delete-card"]')?.addEventListener("click", () => deleteCartao(cartao.id, cartao.titulo));

        elements.cartoesTableBody.appendChild(tr);
    });
}

function renderFaturasTable() {
    if (!elements.faturasTableBody) {
        return;
    }

    const competencia = state.viewMonthKey || getCurrentMonthKey();
    if (elements.faturaCompetenciaLabel) {
        elements.faturaCompetenciaLabel.textContent = formatMonthKeyLabel(competencia);
    }
    const rows = state.cartoes
        .map((cartao) => buildCardMonthSummary(cartao, competencia))
        .sort((a, b) => String(a.cartao.titulo || "").localeCompare(String(b.cartao.titulo || ""), "pt-BR"));

    elements.faturasTableBody.innerHTML = "";

    if (!rows.length) {
        elements.faturasTableBody.innerHTML = `
            <tr>
                <td colspan="9" class="empty-table-row">Cadastre um cartão para acompanhar as faturas.</td>
            </tr>
        `;
        return;
    }

    rows.forEach((summary) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${buildCartaoLabel(summary.cartao)}</td>
            <td>${formatCurrency(summary.totalLancamentos)}</td>
            <td>${formatCurrency(summary.saldoAnteriorPendente)}</td>
            <td>${formatCurrency(summary.jurosAnterior)}</td>
            <td>${formatCurrency(summary.totalFatura)}</td>
            <td>${formatCurrency(summary.valorPago)}</td>
            <td>${formatCurrency(summary.jurosValor)}</td>
            <td>${formatCurrency(summary.saldoParaProximo)}</td>
            <td>
                <div class="table-actions">
                    <button class="table-action-btn" data-id="${summary.cartao.id}">Lançamentos</button>
                    <button class="table-action-btn success" data-role="pay" data-id="${summary.cartao.id}">Pagamento</button>
                </div>
            </td>
        `;

        tr.querySelectorAll("button[data-id]").forEach((button) => {
            button.addEventListener("click", () => {
                state.selectedFaturaCardId = button.dataset.id;
                updateFaturaDetails();
            });
        });

        elements.faturasTableBody.appendChild(tr);
    });
}

function renderAtrasadasTableLegacy() {
    if (!elements.contasAtrasadasTableBody) {
        return;
    }

    const rows = sortAtrasadasRows(getFilteredAtrasadasRows());
    updateAtrasadasSortHeaders();

    elements.contasAtrasadasTableBody.innerHTML = "";
    if (elements.contasAtrasadasSummary) {
        elements.contasAtrasadasSummary.textContent = `${rows.length} conta(s) atrasada(s)`;
    }

    if (!rows.length) {
        elements.contasAtrasadasTableBody.innerHTML = `
            <tr>
                <td colspan="13" class="empty-table-row">Nenhuma conta atrasada.</td>
            </tr>
        `;
        return;
    }

    rows.forEach((item) => {
        const tr = document.createElement("tr");
        const jurosValor = item.juros_valor ?? "";
        const jurosPerc = item.juros_perc ?? "";
        const total = Number(item.valor_mensal || 0) + Number(item.juros_valor || 0);
        const valorPagoTotal = item.valor_pago_total ?? total;
        tr.innerHTML = `
            <td>${item.titulo || "-"}</td>
            <td>${formatDate(item.data_vencida || item.prazo)}</td>
            <td>${formatCurrency(item.valor_mensal)}</td>
            <td>${buildLateNumberInput("juros_valor", jurosValor)}</td>
            <td>${buildLateNumberInput("juros_perc", jurosPerc)}</td>
            <td data-late-total>${formatCurrency(total)}</td>
            <td>${buildLateNumberInput("valor_pago_total", valorPagoTotal)}</td>
            <td>${buildLateDateInput("pago_data", item.pago_data)}</td>
            <td>${buildLatePagoPorSelect(item.pago_por || "")}</td>
            <td>${buildLateLinkIcon(item.link_conta)}</td>
            <td>${buildLateTextarea("observacao", item.observacao, "Observações")}</td>
            <td>${getStatusLabel(item.status || "atrasada")}</td>
            <td>
                <div class="table-actions late-actions">
                    ${(item.status === "quitada") ? "" : `<button class="table-action-btn success" data-action="pay-late" data-id="${item.id}">Pagar</button>`}
                    ${(item.origem === "pagamento_parcial") ? "" : `<button class="table-action-btn late-return-btn" data-action="return-pending" data-id="${item.id}" title="Voltar para pendentes" aria-label="Voltar para pendentes">↩</button>`}
                </div>
            </td>
        `;

        tr.querySelectorAll("[data-late-field]").forEach((field) => {
            field.addEventListener("change", () => saveLateContaField(item, field, tr));
        });
        tr.querySelector('[data-action="pay-late"]')?.addEventListener("click", () => pagarContaAtrasada(item, tr));
        tr.querySelector('[data-action="return-pending"]')?.addEventListener("click", () => devolverContaAtrasadaParaPendente(item));
        elements.contasAtrasadasTableBody.appendChild(tr);
    });
}

function getFilteredAtrasadasRows() {
    const search = (elements.searchAtrasadasInput?.value || "").trim().toLowerCase();
    if (!search) {
        return state.contasAtrasadas;
    }

    return state.contasAtrasadas.filter((item) => {
        const haystack = [
            item.titulo,
            item.observacao,
            item.link_conta,
            item.mes_referencia,
            formatMonthKeyLabel(item.mes_referencia),
            item.data_vencida,
            item.prazo,
            item.status,
            formatPagoPorLabel(item.pago_por)
        ].join(" ").toLowerCase();
        return haystack.includes(search);
    });
}

function renderAtrasadasTable() {
    if (!elements.contasAtrasadasTableBody && !elements.contasQuitadasTableBody) {
        return;
    }

    const filteredRows = getFilteredAtrasadasRows();
    const rows = sortAtrasadasRows(filteredRows.filter((item) => item.status !== "paga_atrasada" && item.status !== "quitada"));
    const quitadasRows = sortAtrasadasRows(filteredRows.filter((item) => item.status === "paga_atrasada" || item.status === "quitada"));
    updateAtrasadasSortHeaders();

    if (elements.contasAtrasadasTableBody) {
        elements.contasAtrasadasTableBody.innerHTML = "";
    }
    if (elements.contasQuitadasTableBody) {
        elements.contasQuitadasTableBody.innerHTML = "";
    }

    if (elements.contasAtrasadasSummary) {
        elements.contasAtrasadasSummary.textContent = `${rows.length} conta(s) atrasada(s)`;
    }
    if (elements.contasQuitadasSummary) {
        elements.contasQuitadasSummary.textContent = `${quitadasRows.length} conta(s) quitada(s)`;
    }

    if (elements.contasAtrasadasTableBody && !rows.length) {
        elements.contasAtrasadasTableBody.innerHTML = `
            <tr>
                <td colspan="13" class="empty-table-row">Nenhuma conta atrasada.</td>
            </tr>
        `;
    }

    if (elements.contasQuitadasTableBody && !quitadasRows.length) {
        elements.contasQuitadasTableBody.innerHTML = `
            <tr>
                <td colspan="13" class="empty-table-row">Nenhuma conta quitada.</td>
            </tr>
        `;
    }

    rows.forEach((item) => appendAtrasadaRowClean(item, elements.contasAtrasadasTableBody));
    quitadasRows.forEach((item) => appendAtrasadaRowClean(item, elements.contasQuitadasTableBody));
}

function appendAtrasadaRowClean(item, tableBody) {
    if (!tableBody) {
        return;
    }

    const tr = document.createElement("tr");
    const jurosValor = item.juros_valor ?? "";
    const jurosPerc = item.juros_perc ?? "";
    const total = Number(item.valor_mensal || 0) + Number(item.juros_valor || 0);
    const valorPagoTotal = item.valor_pago_total ?? total;

    tr.innerHTML = `
        <td>${item.titulo || "-"}</td>
        <td>${formatDate(item.data_vencida || item.prazo)}</td>
        <td>${formatCurrency(item.valor_mensal)}</td>
        <td>${buildLateNumberInput("juros_valor", jurosValor)}</td>
        <td>${buildLateNumberInput("juros_perc", jurosPerc)}</td>
        <td data-late-total>${formatCurrency(total)}</td>
        <td>${buildLateNumberInput("valor_pago_total", valorPagoTotal)}</td>
        <td>${buildLateDateInput("pago_data", item.pago_data)}</td>
        <td>${buildLatePagoPorSelect(item.pago_por || "")}</td>
        <td>${buildLateLinkIcon(item.link_conta)}</td>
        <td>${buildLateTextarea("observacao", item.observacao, "Observações")}</td>
        <td>${getStatusLabel(item.status || "atrasada")}</td>
        <td>
            <div class="table-actions late-actions">
                ${(item.status === "paga_atrasada" || item.status === "quitada") ? "" : `<button class="table-action-btn success" data-action="pay-late" data-id="${item.id}">Pagar</button>`}
                ${(item.origem === "pagamento_parcial") ? "" : `<button class="table-action-btn late-return-btn" data-action="return-pending" data-id="${item.id}" title="Voltar para pendentes" aria-label="Voltar para pendentes">↩</button>`}
            </div>
        </td>
    `;

    tr.querySelectorAll("[data-late-field]").forEach((field) => {
        field.addEventListener("change", () => saveLateContaField(item, field, tr));
    });
    tr.querySelector('[data-action="pay-late"]')?.addEventListener("click", () => pagarContaAtrasada(item, tr));
    tr.querySelector('[data-action="return-pending"]')?.addEventListener("click", () => devolverContaAtrasadaParaPendente(item));
    tableBody.appendChild(tr);
}

function appendAtrasadaRow(item, tableBody) {
    if (!tableBody) {
        return;
    }

    const tr = document.createElement("tr");
    const jurosValor = item.juros_valor ?? "";
    const jurosPerc = item.juros_perc ?? "";
    const total = Number(item.valor_mensal || 0) + Number(item.juros_valor || 0);
    const valorPagoTotal = item.valor_pago_total ?? total;
    tr.innerHTML = `
        <td>${item.titulo || "-"}</td>
        <td>${formatDate(item.data_vencida || item.prazo)}</td>
        <td>${formatCurrency(item.valor_mensal)}</td>
        <td>${buildLateNumberInput("juros_valor", jurosValor)}</td>
        <td>${buildLateNumberInput("juros_perc", jurosPerc)}</td>
        <td data-late-total>${formatCurrency(total)}</td>
        <td>${buildLateNumberInput("valor_pago_total", valorPagoTotal)}</td>
        <td>${buildLateDateInput("pago_data", item.pago_data)}</td>
        <td>${buildLatePagoPorSelect(item.pago_por || "")}</td>
        <td>${buildLateLinkIcon(item.link_conta)}</td>
        <td>${buildLateTextarea("observacao", item.observacao, "Observações")}</td>
        <td>${getStatusLabel(item.status || "atrasada")}</td>
        <td>
            <div class="table-actions late-actions">
                ${(item.status === "paga_atrasada" || item.status === "quitada") ? "" : `<button class="table-action-btn success" data-action="pay-late" data-id="${item.id}">Pagar</button>`}
                ${(item.origem === "pagamento_parcial") ? "" : `<button class="table-action-btn late-return-btn" data-action="return-pending" data-id="${item.id}" title="Voltar para pendentes" aria-label="Voltar para pendentes">↩</button>`}
            </div>
        </td>
    `;

    tr.querySelectorAll("[data-late-field]").forEach((field) => {
        field.addEventListener("change", () => saveLateContaField(item, field, tr));
    });
    tr.querySelector('[data-action="pay-late"]')?.addEventListener("click", () => pagarContaAtrasada(item, tr));
    tr.querySelector('[data-action="return-pending"]')?.addEventListener("click", () => devolverContaAtrasadaParaPendente(item));
    tableBody.appendChild(tr);
}

function setAtrasadasSort(field) {
    if (!field) {
        return;
    }

    if (state.contasAtrasadasSort.field === field) {
        state.contasAtrasadasSort.direction = state.contasAtrasadasSort.direction === "asc" ? "desc" : "asc";
    } else {
        state.contasAtrasadasSort = { field, direction: "asc" };
    }

    renderAtrasadasTable();
}

function sortAtrasadasRows(rows) {
    const { field, direction } = state.contasAtrasadasSort;
    const directionMultiplier = direction === "desc" ? -1 : 1;
    return [...rows].sort((a, b) => {
        if (field === "titulo") {
            const titleCompare = String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt-BR");
            if (titleCompare !== 0) {
                return titleCompare * directionMultiplier;
            }
            return getAtrasadaDateSortValue(a).localeCompare(getAtrasadaDateSortValue(b)) * directionMultiplier;
        }

        const dateCompare = getAtrasadaDateSortValue(a).localeCompare(getAtrasadaDateSortValue(b));
        if (dateCompare !== 0) {
            return dateCompare * directionMultiplier;
        }
        return String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt-BR") * directionMultiplier;
    });
}

function updateAtrasadasSortHeaders() {
    elements.contasAtrasadasSortButtons?.forEach((button) => {
        const field = button.dataset.lateSort;
        const icon = button.querySelector("[data-late-sort-icon]");
        const isActive = field === state.contasAtrasadasSort.field;
        button.classList.toggle("active", isActive);
        if (icon) {
            icon.textContent = isActive ? (state.contasAtrasadasSort.direction === "asc" ? "↑" : "↓") : "";
        }
    });
}

function getAtrasadaDateSortValue(item) {
    return item.data_vencida || item.prazo || item.mes_referencia || "";
}

function renderPendentesAcaoTable() {
    if (!elements.contasPendentesAcaoTableBody) {
        return;
    }

    const rows = buildPendingActionRows();
    elements.contasPendentesAcaoTableBody.innerHTML = "";
    if (elements.contasPendentesAcaoSummary) {
        elements.contasPendentesAcaoSummary.textContent = `${rows.length} pendência(s)`;
    }

    if (!rows.length) {
        elements.contasPendentesAcaoTableBody.innerHTML = `
            <tr>
                <td colspan="6" class="empty-table-row">Nenhuma conta pendente de ação.</td>
            </tr>
        `;
        return;
    }

    rows.forEach((row) => {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td>${row.conta.titulo || "-"}</td>
            <td>${formatMonthKeyLabel(row.monthKey)}</td>
            <td>${formatDate(row.dueDate)}</td>
            <td>${formatCurrency(getMonthlyContaData(row.conta, row.monthKey).valor_mensal)}</td>
            <td><span class="pending-status-badge">Pendente</span></td>
            <td>
                <div class="table-actions pending-actions">
                    <button class="table-action-btn" data-action="send-late">Enviar</button>
                </div>
            </td>
        `;

        tr.querySelector('[data-action="send-late"]')?.addEventListener("click", () => marcarContaAtrasada(row.conta, row.monthKey));
        elements.contasPendentesAcaoTableBody.appendChild(tr);
    });
}

function buildPendingActionRows() {
    const currentMonthKey = getCurrentMonthKey();
    const lateIds = new Set(state.contasAtrasadas.map((item) => `${item.conta_id}:${item.mes_referencia}`));
    const rows = [];

    state.contas.forEach((conta) => {
        if (conta.pagamento?.metodo === "cartao") {
            return;
        }

        getPendingMonthsForConta(conta, currentMonthKey).forEach((monthKey) => {
            if (lateIds.has(`${conta.id}:${monthKey}`)) {
                return;
            }

            const status = conta.status_mensal?.[monthKey]?.status;
            if (status === "paga" || status === "paga_atrasada" || status === "atrasada" || status === "quitada" || status === "dispensada" || status === "feito") {
                return;
            }

            rows.push({
                conta,
                monthKey,
                dueDate: getContaDueDateValue(conta, monthKey)
            });
        });
    });

    return rows.sort((a, b) => {
        if (a.monthKey === b.monthKey) {
            return String(a.conta.titulo || "").localeCompare(String(b.conta.titulo || ""), "pt-BR");
        }
        return a.monthKey.localeCompare(b.monthKey);
    });
}

function getPendingMonthsForConta(conta, currentMonthKey) {
    const months = [];
    const firstMonth = getFirstContaMonthKey(conta);
    if (!firstMonth) {
        return months;
    }

    let monthKey = firstMonth;
    let guard = 0;
    while (monthKey && monthKey < currentMonthKey && guard < 600) {
        if (getMonthlyView(conta, monthKey)) {
            months.push(monthKey);
        }
        monthKey = addMonthsToMonthKey(monthKey, 1);
        guard += 1;
    }

    return months;
}

function renderExcluidasTable() {
    if (!elements.contasExcluidasTableBody) {
        return;
    }

    const rows = [...state.contasExcluidas].sort((a, b) => {
        const dateCompare = String(b.excluida_em || "").localeCompare(String(a.excluida_em || ""));
        if (dateCompare !== 0) {
            return dateCompare;
        }
        return String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt-BR");
    });

    elements.contasExcluidasTableBody.innerHTML = "";
    if (elements.contasExcluidasSummary) {
        elements.contasExcluidasSummary.textContent = `${rows.length} conta(s) excluída(s)`;
    }

    if (!rows.length) {
        elements.contasExcluidasTableBody.innerHTML = `
            <tr>
                <td colspan="11" class="empty-table-row">Nenhuma conta excluída.</td>
            </tr>
        `;
        return;
    }

    rows.forEach((item) => {
        const tr = document.createElement("tr");
        const parcelamento = isContaFixa(item)
            ? "Fixa"
            : `${Number(item.parcelado?.pagas || 0)}/${Number(item.parcelado?.total || 0)} (saldo ${Number(item.parcelado?.saldo || 0)})`;
        tr.innerHTML = `
            <td>${escapeHtmlText(item.titulo || "-")}</td>
            <td>${parcelamento}</td>
            <td>${escapeHtmlText(getRestoredMonthsLabel(item))}</td>
            <td>${formatCurrency(item.valor_mensal)}</td>
            <td>${item.prazo_dia ? `Dia ${Number(item.prazo_dia)}` : "-"}</td>
            <td>${formatPagoPorLabel(item.pago_por)}</td>
            <td>${buildLinkIcon(item.link_conta)}</td>
            <td>${formatCurrency(item.valor_para_quitar || item.quitar_desconto || 0)}</td>
            <td>${escapeHtmlText(item.observacao || "")}</td>
            <td>${formatDateTime(item.excluida_em)}</td>
            <td><button class="table-action-btn success" type="button" data-action="restore-deleted" data-id="${item.id}">Recuperar</button></td>
        `;

        tr.querySelector('[data-action="restore-deleted"]')?.addEventListener("click", () => restoreContaExcluida(item));
        elements.contasExcluidasTableBody.appendChild(tr);
    });
}

function getRestoredMonthsLabel(conta) {
    if (conta.exclusao_escopo === "somente_mes" && conta.mes_referencia) {
        return formatMonthKeyLabel(conta.mes_referencia);
    }

    if (conta.exclusao_escopo === "mes_em_diante" && conta.mes_referencia) {
        return `A partir de ${formatMonthKeyLabel(conta.mes_referencia)}`;
    }

    const firstMonth = conta.inicio_mes || getFirstContaMonthKey(conta);
    if (!firstMonth) {
        return "-";
    }

    if (isContaFixa(conta)) {
        return `A partir de ${formatMonthKeyLabel(firstMonth)}`;
    }

    const totalParcelas = Number(conta.parcelado?.total || 0);
    if (!totalParcelas) {
        return formatMonthKeyLabel(firstMonth);
    }

    const lastMonth = addMonthsToMonthKey(firstMonth, totalParcelas - 1);
    if (!lastMonth || lastMonth === firstMonth) {
        return formatMonthKeyLabel(firstMonth);
    }

    return `${formatMonthKeyLabel(firstMonth)} até ${formatMonthKeyLabel(lastMonth)}`;
}

function getFirstContaMonthKey(conta) {
    if (isContaFixa(conta) && conta.inicio_mes) {
        return conta.inicio_mes;
    }

    const dateValue = conta.data_primeira_parcela || conta.data_contrato;
    const parsed = parseDateOnly(dateValue);
    if (parsed) {
        return toMonthKey(parsed);
    }

    return conta.inicio_mes || "";
}

function buildLateNumberInput(field, value, placeholder = "0.00") {
    const hasValue = value !== "" && value !== null && typeof value !== "undefined";
    const normalizedValue = hasValue ? Number(value || 0).toFixed(2) : "";
    return `<input type="number" class="filter-select" min="0" step="0.01" data-late-field="${field}" value="${escapeHtmlAttr(normalizedValue)}" placeholder="${placeholder}">`;
}

function buildLateDateInput(field, value) {
    return `<input type="date" class="filter-select" data-late-field="${field}" value="${escapeHtmlAttr(value ?? "")}">`;
}

function buildLateTextInput(field, value, placeholder = "") {
    return `<input type="text" class="filter-select" data-late-field="${field}" value="${escapeHtmlAttr(value ?? "")}" placeholder="${placeholder}">`;
}

function buildLateLinkIcon(value) {
    const link = String(value || "").trim();
    if (!link) {
        return "-";
    }

    return `<a class="conta-link-icon" href="${escapeHtmlAttr(link)}" target="_blank" rel="noreferrer" title="Abrir link">&#128279;</a>`;
}

function buildLateTextarea(field, value, placeholder = "") {
    return `<textarea class="filter-select" data-late-field="${field}" rows="2" placeholder="${placeholder}">${escapeHtmlText(value ?? "")}</textarea>`;
}

function buildLatePagoPorSelect(value) {
    const options = [
        { value: "", label: "Selecione" },
        { value: "eu", label: "Eu" },
        { value: "conjuge", label: "Cônjuge" },
        { value: "ambos", label: "Ambos" },
        { value: "outro", label: "Outro" }
    ];

    return `
        <select class="filter-select" data-late-field="pago_por">
            ${options.map((option) => `<option value="${option.value}" ${option.value === value ? "selected" : ""}>${option.label}</option>`).join("")}
        </select>
    `;
}

function handleTableAction(action, id, path, sourceButton = null) {
    if (action === "view-card-invoice") {
        state.selectedFaturaCardId = id;
        updateFaturaDetails();
        elements.faturaDetailsSection?.scrollIntoView({ behavior: "smooth", block: "start" });
        return;
    }

    if (action === "card-done") {
        marcarCartaoFeito(id);
        return;
    }

    if (action === "card-abandon") {
        abandonarCartaoFatura(id);
        return;
    }

    const conta = state.contas.find((item) => item.id === id && item.path === path);
    if (!conta) {
        return;
    }

    if (action === "edit") {
        fillForm(conta);
        return;
    }

    if (action === "delete") {
        openDeleteContaModal(conta);
        return;
    }

    if (action === "change-monthly") {
        openMensalidadeModal(conta);
        return;
    }

    if (action === "attachments") {
        openAnexosContaModal(conta);
        return;
    }

    if (action === "move-up" || action === "move-down") {
        moveContaPosition(conta, action === "move-up" ? -1 : 1);
        return;
    }

    if (action === "late") {
        marcarContaAtrasada(conta);
        return;
    }

    if (action === "dispense") {
        dispensarContaMes(conta);
        return;
    }

    if (action === "quitar") {
        quitarContaParcelada(conta, sourceButton);
    }
}

async function moveContaPosition(conta, direction) {
    const monthKey = state.viewMonthKey || getCurrentMonthKey();
    const visibleRows = getVisibleRowsForMonth(monthKey);
    const currentIndex = visibleRows.findIndex((item) => item.id === conta.id && item.path === conta.path);

    if (currentIndex < 0) {
        return;
    }

    const targetIndex = currentIndex + direction;
    if (targetIndex < 0 || targetIndex >= visibleRows.length) {
        return;
    }

    const reorderedVisibleRows = [...visibleRows];
    const [selected] = reorderedVisibleRows.splice(currentIndex, 1);
    reorderedVisibleRows.splice(targetIndex, 0, selected);
    const allRows = getOrderableContasForMonth(monthKey);
    const visibleRefs = new Set(visibleRows.map(getContaRefPath));
    let visibleIndex = 0;
    const reordered = allRows.map((item) => {
        if (!visibleRefs.has(getContaRefPath(item))) {
            return item;
        }

        const visibleItem = reorderedVisibleRows[visibleIndex];
        visibleIndex += 1;
        return visibleItem;
    });

    const payload = {};
    reordered.forEach((item, index) => {
        payload[String(index + 1).padStart(3, "0")] = buildPositionPayload(item);
    });

    await set(ref(database, `${PATHS.posicao}/${monthKey}`), payload);
}

async function dispensarContaMes(conta) {
    const monthKey = state.viewMonthKey || getCurrentMonthKey();
    if (!confirm(`Marcar "${conta.titulo}" como dispensada em ${formatMonthKeyLabel(monthKey)}?`)) {
        return;
    }

    const partialAtrasoId = `${monthKey.replace("-", "")}_parcial`;
    await Promise.all([
        update(ref(database, `${conta.path}/${conta.id}`), {
            [`status_mensal/${monthKey}`]: {
                ...(conta.status_mensal?.[monthKey] || {}),
                status: "dispensada",
                valor_pago: 0,
                dispensada_em: new Date().toISOString()
            },
            atualizado_em: new Date().toISOString()
        }),
        remove(ref(database, `${PATHS.abertasAtrasadas}/${conta.id}/${partialAtrasoId}`))
    ]);
}

function getOrderableContasForMonth(monthKey) {
    const directContas = state.contas.filter((item) => item.pagamento?.metodo !== "cartao" && getMonthlyView(item, monthKey));
    return sortContasByMonthPosition([...directContas, ...getVisibleCartaoResumoRowsForMonth(monthKey)], monthKey);
}

function buildPositionPayload(item) {
    return {
        ref_path: getContaRefPath(item),
        path: item.path,
        id: item.id,
        titulo: item.titulo || ""
    };
}

async function appendContaToCurrentMonthPosition(conta) {
    const monthKey = state.viewMonthKey || getCurrentMonthKey();
    const refPath = getContaRefPath(conta);
    const rows = getOrderableContasForMonth(monthKey);
    if (rows.some((item) => getContaRefPath(item) === refPath)) {
        return;
    }

    rows.push(conta);

    const payload = {};
    rows.forEach((item, index) => {
        payload[String(index + 1).padStart(3, "0")] = buildPositionPayload(item);
    });

    await set(ref(database, `${PATHS.posicao}/${monthKey}`), payload);
}

function isContaFixa(conta) {
    if (isCartaoResumoRow(conta)) {
        return false;
    }

    return conta.category === "abertasFixas"
        || conta.category === "quitadasFixas"
        || Number(conta.parcelado?.total || 0) <= 0;
}

function fillForm(conta) {
    state.selectedId = conta.id;
    state.selectedPath = conta.path;

    elements.tipoConta.value = isContaFixa(conta) ? "fixa" : "parcelada";
    elements.titulo.value = conta.titulo || "";
    elements.dataPrimeiraParcela.value = conta.data_primeira_parcela || conta.data_contrato || "";
    elements.parceladoTotal.value = conta.parcelado?.total ?? "";
    const monthSnapshot = getParceladoSnapshot(conta, state.viewMonthKey || getCurrentMonthKey());
    elements.parceladoPagas.value = String(monthSnapshot.posicao || 0);
    elements.parceladoPagasTotal.value = conta.parcelas_pagas_total ?? "";
    elements.parceladoSaldo.value = String(monthSnapshot.saldo || 0);
    if (elements.jurosAtrasoValor) elements.jurosAtrasoValor.value = conta.juros_atraso_valor ?? "";
    if (elements.jurosAtrasoPerc) elements.jurosAtrasoPerc.value = conta.juros_atraso_perc ?? "";
    elements.valorMensal.value = conta.valor_mensal ?? "";
    elements.valorMensal.readOnly = true;
    elements.prazoDia.value = conta.prazo_dia ?? "";
    if (elements.pagoData) elements.pagoData.value = conta.pago_data || "";
    if (elements.pagoPor) elements.pagoPor.value = conta.pago_por || "";
    elements.linkConta.value = conta.link_conta || "";
    elements.quitarDesconto.value = conta.quitar_desconto ?? "";
    elements.observacao.value = conta.observacao || "";
    elements.formaPagamento.value = conta.pagamento?.metodo || "direto";
    elements.cartaoContaId.value = conta.pagamento?.cartao_id || "";
    if (elements.contaFixaMesUnico) {
        elements.contaFixaMesUnico.value = isContaFixa(conta) && conta.inicio_mes && conta.fim_mes && conta.inicio_mes === conta.fim_mes ? "sim" : "nao";
    }
    if (elements.modoPagamentoCartao) elements.modoPagamentoCartao.value = conta.pagamento?.modo || "avista";

    elements.saveBtn.style.display = "none";
    elements.updateBtn.style.display = "block";
    updateParceladoVisibility();
    updatePagamentoCartaoVisibility();
    syncQuitarJurosPreview();
    renderParcelasManagement(conta);
}

function clearForm() {
    state.selectedId = null;
    state.selectedPath = null;

    elements.tipoConta.value = "parcelada";
    elements.titulo.value = "";
    elements.dataPrimeiraParcela.value = "";
    elements.parceladoTotal.value = "";
    elements.parceladoPagas.value = "";
    elements.parceladoPagasTotal.value = "";
    elements.parceladoSaldo.value = "";
    if (elements.jurosAtrasoValor) elements.jurosAtrasoValor.value = "";
    if (elements.jurosAtrasoPerc) elements.jurosAtrasoPerc.value = "";
    elements.valorMensal.value = "";
    elements.valorMensal.readOnly = false;
    elements.prazoDia.value = "";
    if (elements.pagoData) elements.pagoData.value = "";
    if (elements.pagoPor) elements.pagoPor.value = "";
    elements.linkConta.value = "";
    syncQuitarJurosPreview();
    elements.quitarDesconto.value = "";
    elements.observacao.value = "";
    elements.formaPagamento.value = "direto";
    elements.cartaoContaId.value = "";
    if (elements.contaFixaMesUnico) elements.contaFixaMesUnico.value = "nao";
    if (elements.modoPagamentoCartao) elements.modoPagamentoCartao.value = "avista";

    elements.saveBtn.style.display = "block";
    elements.updateBtn.style.display = "none";
    updateParceladoVisibility();
    updatePagamentoCartaoVisibility();
    renderParcelasManagement(null);
}

function fillCartaoForm(cartao) {
    state.selectedCardId = cartao.id;
    elements.cartaoTitulo.value = cartao.titulo || "";
    elements.cartaoUltimosDigitos.value = cartao.ultimos_digitos || "";
    elements.cartaoVencimentoDia.value = cartao.vencimento_dia || "";
    elements.cartaoMelhorDiaCompra.value = cartao.melhor_dia_compra || "";
    elements.saveCartaoBtn.style.display = "none";
    elements.updateCartaoBtn.style.display = "block";
}

function clearCartaoForm() {
    state.selectedCardId = null;
    elements.cartaoTitulo.value = "";
    elements.cartaoUltimosDigitos.value = "";
    elements.cartaoVencimentoDia.value = "";
    elements.cartaoMelhorDiaCompra.value = "";
    elements.saveCartaoBtn.style.display = "block";
    elements.updateCartaoBtn.style.display = "none";
}

function clearFaturaSelection() {
    state.selectedFaturaCardId = null;
    state.faturaJurosSource = "";
    closeFaturaLancamentoModal();
    if (elements.faturaValorPago) elements.faturaValorPago.value = "";
    if (elements.faturaJurosValor) elements.faturaJurosValor.value = "";
    if (elements.faturaJurosPerc) elements.faturaJurosPerc.value = "";
    updateFaturaDetails();
}

function updateParceladoVisibility() {
    const isParcelada = elements.tipoConta?.value === "parcelada";
    const isCartao = elements.formaPagamento?.value === "cartao";
    const showDateField = isParcelada || isCartao;
    if (elements.dataPrimeiraParcelaLabel) {
        elements.dataPrimeiraParcelaLabel.textContent = isCartao ? "Data da compra" : "Data da 1ª parcela";
    }
    ["dataPrimeiraParcela"].forEach((id) => {
        const field = document.getElementById(id);
        const wrapper = field?.closest("div");
        if (wrapper) {
            wrapper.style.display = showDateField ? "flex" : "none";
        }
    });
    ["parceladoTotal", "parceladoPagas", "parceladoPagasTotal", "parceladoSaldo", "quitarJuros", "quitarDesconto"].forEach((id) => {
        const field = document.getElementById(id);
        const wrapper = field?.closest("div");
        if (wrapper) {
            wrapper.style.display = isParcelada ? "flex" : "none";
        }
    });
    if (elements.parcelasManagementSection) {
        elements.parcelasManagementSection.style.display = isParcelada ? "block" : "none";
    }
    if (elements.contaFixaMesUnicoWrapper) {
        elements.contaFixaMesUnicoWrapper.style.display = isParcelada ? "none" : "flex";
    }
}

function updatePagamentoCartaoVisibility() {
    const isCartao = elements.formaPagamento?.value === "cartao";
    ["cartaoContaId"].forEach((id) => {
        const field = document.getElementById(id);
        const wrapper = field?.closest("div");
        if (wrapper) {
            wrapper.style.display = isCartao ? "flex" : "none";
        }
    });
}

function setDefaultMonth() {
    state.viewMonthKey = getCurrentMonthKey();
    updateCurrentMonthLabel();
}

function changeViewMonth(increment) {
    setViewMonth(addMonthsToMonthKey(state.viewMonthKey || getCurrentMonthKey(), increment));
}

function setViewMonth(monthKey) {
    if (!monthKey) {
        return;
    }
    state.viewMonthKey = monthKey;
    updateCurrentMonthLabel();
    applyAutomaticParceladoProgress();
    renderTable();
    renderFaturasTable();
    updateFaturaDetails();
    updateMonthActionWarning();
}

function updateCurrentMonthLabel() {
    if (elements.currentMonthLabel) {
        elements.currentMonthLabel.textContent = formatMonthKeyLabel(state.viewMonthKey || getCurrentMonthKey());
    }
    if (elements.viewMonthSelect) {
        elements.viewMonthSelect.value = state.viewMonthKey || getCurrentMonthKey();
    }
    if (elements.faturaCompetenciaLabel) {
        elements.faturaCompetenciaLabel.textContent = formatMonthKeyLabel(state.viewMonthKey || getCurrentMonthKey());
    }
}

function applyAutomaticParceladoProgress() {
    if (elements.tipoConta?.value !== "parcelada") {
        return;
    }

    const total = Number(elements.parceladoTotal?.value || 0);
    if (!total || !elements.dataPrimeiraParcela?.value) {
        if (elements.parceladoPagas) {
            elements.parceladoPagas.value = "0";
        }
        if (elements.parceladoSaldo) {
            elements.parceladoSaldo.value = total ? String(total) : "0";
        }
        syncQuitarJurosPreview();
        return;
    }

    const posicao = getAutoPaidInstallmentsForForm(total);
    if (elements.parceladoPagas) {
        elements.parceladoPagas.value = String(posicao);
    }
    if (elements.parceladoSaldo) {
        elements.parceladoSaldo.value = String(Math.max(total - posicao, 0));
    }
    syncQuitarJurosPreview();
}

function syncParceladoSaldo() {
    const total = Number(elements.parceladoTotal?.value || 0);
    const posicao = getAutoPaidInstallmentsForForm(total);
    if (elements.parceladoPagas) {
        elements.parceladoPagas.value = String(posicao);
    }
    const saldo = Math.max(total - posicao, 0);
    if (elements.parceladoSaldo) {
        elements.parceladoSaldo.value = String(saldo);
    }
    syncQuitarJurosPreview();
}

function syncQuitarJurosPreview() {
    if (!elements.quitarJuros) {
        return;
    }

    const saldo = Number(elements.parceladoSaldo?.value || 0);
    const valorMensal = Number(elements.valorMensal?.value || 0);
    elements.quitarJuros.value = (saldo * valorMensal).toFixed(2);
}

function syncJurosFields(source) {
    if (!elements.jurosAtrasoValor || !elements.jurosAtrasoPerc) {
        return;
    }

    const baseValue = Number(elements.valorMensal?.value || 0);
    if (!baseValue) {
        if (source === "valor" && elements.jurosAtrasoPerc) elements.jurosAtrasoPerc.value = "";
        if (source === "perc" && elements.jurosAtrasoValor) elements.jurosAtrasoValor.value = "";
        return;
    }

    if (source === "valor") {
        const valor = Number(elements.jurosAtrasoValor?.value || 0);
        elements.jurosAtrasoPerc.value = valor ? ((valor / baseValue) * 100).toFixed(2) : "";
        return;
    }

    const perc = Number(elements.jurosAtrasoPerc?.value || 0);
    elements.jurosAtrasoValor.value = perc ? ((baseValue * perc) / 100).toFixed(2) : "";
}

function syncFaturaJurosFields(source) {
    if (!state.selectedFaturaCardId || !source) {
        return;
    }

    const cartao = state.cartoes.find((item) => item.id === state.selectedFaturaCardId);
    if (!cartao) {
        return;
    }

    const competencia = state.viewMonthKey || getCurrentMonthKey();
    const summary = buildCardMonthSummary(cartao, competencia);
    const sourceType = source === "valor" || source === "perc" ? source : "";
    if (sourceType) {
        state.faturaJurosSource = sourceType;
    }
    const effectiveSource = sourceType || state.faturaJurosSource || (elements.faturaJurosPerc?.value ? "perc" : "valor");
    const valorPago = Number(elements.faturaValorPago?.value || 0);
    const base = roundMoney(Math.max(Number(summary.totalFatura || 0) - valorPago, 0));

    if (!base) {
        if (elements.faturaJurosPerc) elements.faturaJurosPerc.value = "";
        if (elements.faturaJurosValor) elements.faturaJurosValor.value = "";
        return;
    }

    if (effectiveSource === "valor") {
        const valor = Number(elements.faturaJurosValor?.value || 0);
        elements.faturaJurosPerc.value = valor ? ((valor / base) * 100).toFixed(2) : "";
        return;
    }

    const perc = Number(elements.faturaJurosPerc?.value || 0);
    elements.faturaJurosValor.value = perc ? ((base * perc) / 100).toFixed(2) : "";
}

function updateFaturaDetails() {
    if (!elements.faturaDetailsSection) {
        return;
    }

    if (!state.selectedFaturaCardId) {
        elements.faturaDetailsSection.style.display = "none";
        return;
    }

    const cartao = state.cartoes.find((item) => item.id === state.selectedFaturaCardId);
    if (!cartao) {
        elements.faturaDetailsSection.style.display = "none";
        return;
    }

    const competencia = state.viewMonthKey || getCurrentMonthKey();
    const summary = buildCardMonthSummary(cartao, competencia);
    state.faturaJurosSource = summary.jurosPerc ? "perc" : (summary.jurosValor ? "valor" : "");

    elements.faturaDetailsSection.style.display = "block";
    elements.faturaDetailsTitle.textContent = `${buildCartaoLabel(cartao)} - ${formatMonthKeyLabel(competencia)}`;
    elements.faturaSummary.innerHTML = `
        <div class="fatura-summary-chip"><strong>Fatura</strong><span>${formatCurrency(summary.totalFatura)}</span></div>
        <div class="fatura-summary-chip"><strong>Pago</strong><span>${formatCurrency(summary.valorPago)}</span></div>
        <div class="fatura-summary-chip"><strong>Pendente anterior</strong><span>${formatCurrency(summary.saldoAnteriorPendente)}</span></div>
        <div class="fatura-summary-chip"><strong>Juros anterior</strong><span>${formatCurrency(summary.jurosAnterior)}</span></div>
        <div class="fatura-summary-chip"><strong>Saldo atual</strong><span>${formatCurrency(summary.saldoAtual)}</span></div>
        <div class="fatura-summary-chip"><strong>Saldo p/ próximo</strong><span>${formatCurrency(summary.saldoParaProximo)}</span></div>
    `;

    elements.faturaLancamentos.innerHTML = summary.lancamentos.length
        ? summary.lancamentos.map((item) => `
            <tr>
                <td>${escapeHtmlText(item.titulo || "-")}</td>
                <td>${escapeHtmlText(item.descricao || "-")}</td>
                <td>${formatDateShort(item.vencimento || "") || "-"}</td>
                <td>${formatCurrency(item.valor)}</td>
                <td>
                    <details class="table-actions-menu">
                        <summary aria-label="Ações">&#9776;</summary>
                        <div class="table-actions">
                            <button class="table-action-btn" type="button" data-fatura-edit-id="${escapeHtmlAttr(item.id || "")}">Editar</button>
                            <button class="table-action-btn" type="button" data-fatura-anexo-id="${escapeHtmlAttr(item.conta_id || "")}" data-fatura-anexo-path="${escapeHtmlAttr(item.conta_path || "")}">Anexos</button>
                            <button class="table-action-btn danger" type="button" data-fatura-delete-id="${escapeHtmlAttr(item.id || "")}">Excluir</button>
                        </div>
                    </details>
                </td>
            </tr>
        `).join("")
        : '<tr><td colspan="5" class="empty-table-row">Nenhum lançamento nesta competência.</td></tr>';

    elements.faturaLancamentos.querySelectorAll(".table-actions-menu").forEach((menu) => {
        setupTableActionsMenu(menu);
    });
    elements.faturaLancamentos.querySelectorAll("[data-fatura-edit-id]").forEach((button) => {
        button.addEventListener("click", () => openFaturaLancamentoModal(button.dataset.faturaEditId));
    });
    elements.faturaLancamentos.querySelectorAll("[data-fatura-anexo-id]").forEach((button) => {
        button.addEventListener("click", () => {
            const conta = state.contas.find((item) => item.id === button.dataset.faturaAnexoId && item.path === button.dataset.faturaAnexoPath);
            if (conta) {
                openAnexosContaModal(conta);
            }
        });
    });
    elements.faturaLancamentos.querySelectorAll("[data-fatura-delete-id]").forEach((button) => {
        button.addEventListener("click", () => deleteFaturaLancamentoById(button.dataset.faturaDeleteId));
    });

    elements.faturaValorPago.value = summary.valorPago || "";
    elements.faturaJurosValor.value = summary.jurosValor || "";
    elements.faturaJurosPerc.value = summary.jurosPerc || "";
}

function getAutoPaidInstallmentsForForm(totalParcelas) {
    const monthKey = state.viewMonthKey || getCurrentMonthKey();
    const dateInput = elements.dataPrimeiraParcela?.value || "";
    if (elements.formaPagamento?.value !== "cartao") {
        return getAutoPaidInstallments(dateInput, monthKey, totalParcelas);
    }

    const cartao = state.cartoes.find((item) => item.id === elements.cartaoContaId?.value);
    return getCardInstallmentPositionForInvoiceMonth(dateInput, monthKey, totalParcelas, cartao);
}

function getCurrentFaturaSummary() {
    if (!state.selectedFaturaCardId) {
        return null;
    }

    const cartao = state.cartoes.find((item) => item.id === state.selectedFaturaCardId);
    if (!cartao) {
        return null;
    }

    return buildCardMonthSummary(cartao, state.viewMonthKey || getCurrentMonthKey());
}

function findFaturaLancamento(lancamentoId) {
    const summary = getCurrentFaturaSummary();
    return summary?.lancamentos.find((item) => item.id === lancamentoId) || null;
}

function openFaturaLancamentoModal(lancamentoId) {
    const lancamento = findFaturaLancamento(lancamentoId);
    const conta = lancamento ? state.contas.find((item) => item.id === lancamento.conta_id && item.path === lancamento.conta_path) : null;
    if (!lancamento || !conta) {
        alert("Não foi possível localizar o lançamento da fatura.");
        return;
    }

    state.selectedFaturaLancamento = { ...lancamento, conta };
    if (elements.faturaLancamentoTitulo) elements.faturaLancamentoTitulo.value = conta.titulo || lancamento.titulo || "";
    if (elements.faturaLancamentoData) elements.faturaLancamentoData.value = lancamento.data_compra || lancamento.vencimento || "";
    if (elements.faturaLancamentoValor) elements.faturaLancamentoValor.value = Number(lancamento.valor || 0).toFixed(2);
    if (elements.faturaLancamentoObservacao) elements.faturaLancamentoObservacao.value = lancamento.observacao || getMonthlyContaData(conta, lancamento.source_month_key || state.viewMonthKey || getCurrentMonthKey()).observacao || "";
    if (elements.faturaLancamentoHelper) {
        elements.faturaLancamentoHelper.textContent = `${lancamento.descricao || "Lançamento"} | Competência da fatura: ${formatMonthKeyLabel(state.viewMonthKey || getCurrentMonthKey())}`;
    }
    if (elements.faturaLancamentoModal) {
        elements.faturaLancamentoModal.style.display = "flex";
    }
}

function closeFaturaLancamentoModal() {
    state.selectedFaturaLancamento = null;
    if (elements.faturaLancamentoModal) {
        elements.faturaLancamentoModal.style.display = "none";
    }
}

async function saveFaturaLancamentoEdit() {
    const selected = state.selectedFaturaLancamento;
    if (!selected?.conta) {
        closeFaturaLancamentoModal();
        return;
    }

    const titulo = elements.faturaLancamentoTitulo?.value.trim() || "";
    const data = elements.faturaLancamentoData?.value || "";
    const valor = Number(elements.faturaLancamentoValor?.value || 0);
    const observacao = elements.faturaLancamentoObservacao?.value.trim() || "";
    if (!titulo) {
        alert("Informe o título do lançamento.");
        elements.faturaLancamentoTitulo?.focus();
        return;
    }
    if (!data) {
        alert("Informe a data do lançamento.");
        elements.faturaLancamentoData?.focus();
        return;
    }
    if (valor <= 0) {
        alert("Informe um valor válido.");
        elements.faturaLancamentoValor?.focus();
        return;
    }

    const conta = selected.conta;
    const sourceMonthKey = isContaFixa(conta)
        ? (selected.source_month_key || getMonthKeyFromDateInput(data) || state.viewMonthKey || getCurrentMonthKey())
        : (getMonthKeyFromDateInput(data) || selected.source_month_key || state.viewMonthKey || getCurrentMonthKey());
    const updates = {
        titulo,
        atualizado_em: new Date().toISOString()
    };

    if (isContaFixa(conta)) {
        updates[`dados_mensais/${sourceMonthKey}/data_compra`] = data;
        updates[`dados_mensais/${sourceMonthKey}/valor_mensal`] = valor;
        updates[`dados_mensais/${sourceMonthKey}/observacao`] = observacao;
    } else {
        const totalParcelas = Number(conta.parcelado?.total || 0);
        const installmentNumber = Number(selected.installment_number || 0);
        if (installmentNumber > 0) {
            updates[`parcelas/${installmentNumber}/data`] = data;
        } else {
            updates.data_primeira_parcela = data;
            updates.parcelas = buildParcelasNode(data, totalParcelas, conta.parcelas || {}, Number(conta.parcelado?.pagas || 0));
        }
        updates[`dados_mensais/${sourceMonthKey}/valor_mensal`] = valor;
        updates[`dados_mensais/${sourceMonthKey}/observacao`] = observacao;
    }

    await update(ref(database, `${conta.path}/${conta.id}`), updates);
    closeFaturaLancamentoModal();
}

async function deleteSelectedFaturaLancamento() {
    const selected = state.selectedFaturaLancamento;
    if (!selected) {
        closeFaturaLancamentoModal();
        return;
    }

    await deleteFaturaLancamento(selected);
    closeFaturaLancamentoModal();
}

async function deleteFaturaLancamentoById(lancamentoId) {
    const lancamento = findFaturaLancamento(lancamentoId);
    if (!lancamento) {
        alert("Não foi possível localizar o lançamento da fatura.");
        return;
    }

    await deleteFaturaLancamento(lancamento);
}

async function deleteFaturaLancamento(lancamento) {
    const conta = lancamento.conta || state.contas.find((item) => item.id === lancamento.conta_id && item.path === lancamento.conta_path);
    if (!conta) {
        alert("Não foi possível localizar a conta vinculada ao lançamento.");
        return;
    }

    openDeleteContaModal(conta);
}

async function saveInlineContaField(item, fieldElement) {
    const field = fieldElement.dataset.inlineField;
    if (!field) {
        return;
    }

    const rawValue = fieldElement.value;
    const monthKey = state.viewMonthKey || getCurrentMonthKey();
    const updates = {
        atualizado_em: new Date().toISOString()
    };
    let lateFinancialSync = null;

    if (field === "valor_mensal") {
        if (!isContaFixa(item)) {
            fieldElement.value = getMonthlyContaData(item, monthKey).valor_mensal;
            alert("Use o botão Alterar mensalidade no menu de ações.");
            return;
        }

        const valorMensal = Number(rawValue || 0);
        updates[`dados_mensais/${monthKey}/valor_mensal`] = valorMensal;
        updates[`dados_mensais/${monthKey}/valor_c_juros`] = null;
        if (shouldApplyInlineChangeForward(field, monthKey)) {
            updates.valor_mensal = valorMensal;
        }
        const currentStatus = getContaMonthStatus(item, monthKey) || {};
        const currentJuros = Number(getMonthlyContaData(item, monthKey).juros_atraso_valor || 0);
        lateFinancialSync = {
            valor_mensal: valorMensal,
            juros_valor: currentJuros
        };
        if (currentStatus.pago_data && currentStatus.pago_por) {
            await syncPartialPaymentAtrasada(item, monthKey, Number(currentStatus.valor_pago || valorMensal || 0), currentStatus.pago_data, currentStatus.pago_por, valorMensal + currentJuros);
        }
    } else if (field === "juros_atraso_valor" || field === "juros_atraso_perc") {
        const monthlyData = getMonthlyContaData(item, monthKey);
        const valorMensal = Number(monthlyData.valor_mensal || 0);
        let jurosValor = Number(rawValue || 0);
        let jurosPerc = Number(rawValue || 0);
        if (field === "juros_atraso_valor") {
            jurosPerc = valorMensal ? Number(((jurosValor / valorMensal) * 100).toFixed(2)) : 0;
            setInlineRowFieldValue(fieldElement, "juros_atraso_perc", jurosPerc);
        } else {
            jurosValor = Number(((valorMensal * jurosPerc) / 100).toFixed(2));
            setInlineRowFieldValue(fieldElement, "juros_atraso_valor", jurosValor);
        }
        const valorComJuros = Number((valorMensal + jurosValor).toFixed(2));
        updates[`dados_mensais/${monthKey}/juros_atraso_valor`] = jurosValor;
        updates[`dados_mensais/${monthKey}/juros_atraso_perc`] = jurosPerc;
        updates[`dados_mensais/${monthKey}/valor_c_juros`] = null;
        updateInlineValorComJuros(fieldElement, jurosValor > 0 ? valorComJuros : "");
        lateFinancialSync = {
            valor_mensal: valorMensal,
            juros_valor: jurosValor,
            juros_perc: jurosPerc
        };
        const currentStatus = getContaMonthStatus(item, monthKey) || {};
        if (currentStatus.pago_data && currentStatus.pago_por) {
            await syncPartialPaymentAtrasada(item, monthKey, Number(currentStatus.valor_pago || valorMensal || 0), currentStatus.pago_data, currentStatus.pago_por, valorComJuros);
        }
    } else if (field === "valor_pago" || field === "pago_data" || field === "pago_por") {
        const currentStatus = getContaMonthStatus(item, monthKey) || {};
        const row = fieldElement.closest("tr");
        const pagoData = normalizeDateInput(row?.querySelector('[data-inline-field="pago_data"]')?.value || "");
        const pagoPor = row?.querySelector('[data-inline-field="pago_por"]')?.value || "";
        const monthlyData = getMonthlyContaData(item, monthKey);
        const valorMaximoPermitido = getContaEffectiveDueAmount(monthlyData);
        const valorPagoInput = row?.querySelector('[data-inline-field="valor_pago"]');
        const valorPago = Number(valorPagoInput?.value || 0);
        const pagoDataInput = row?.querySelector('[data-inline-field="pago_data"]');
        if (pagoDataInput) {
            pagoDataInput.value = formatDateShort(pagoData);
        }
        if (valorPago > valorMaximoPermitido) {
            if (valorPagoInput) {
                valorPagoInput.value = valorMaximoPermitido.toFixed(2);
                delete valorPagoInput.dataset.userEdited;
            }
            alert(`O valor pago não pode ser maior que o valor devido do mês (${formatCurrency(valorMaximoPermitido)}). Para alterar esse valor, use os botões de ação da conta.`);
            return;
        }
        const nextStatusValue = pagoData && pagoPor ? "paga" : "pendente";
        const nextStatus = {
            ...currentStatus,
            status: nextStatusValue,
            pago_data: pagoData,
            pago_por: pagoPor,
            valor_pago: valorPago
        };

        updates[`status_mensal/${monthKey}`] = nextStatus;
        updateInlineStatusDisplay(fieldElement, nextStatusValue);
        await syncPartialPaymentAtrasada(item, monthKey, valorPago, pagoData, pagoPor);
        await syncExistingAtrasadaWithInlinePayment(item, monthKey, valorPago, pagoData, pagoPor);
    } else if (field === "link_conta" || field === "observacao") {
        updates[`dados_mensais/${monthKey}/${field}`] = rawValue.trim();
        if (shouldApplyInlineChangeForward(field, monthKey)) {
            updates[field] = rawValue.trim();
        }
    } else if (field === "valor_para_quitar") {
        const valorParaQuitar = Number(rawValue || 0);
        updates[`dados_mensais/${monthKey}/valor_para_quitar`] = valorParaQuitar;
        if (shouldApplyInlineChangeForward(field, monthKey)) {
            updates.valor_para_quitar = valorParaQuitar;
        }
    } else {
        return;
    }

    await update(ref(database, `${item.path}/${item.id}`), updates);
    if (lateFinancialSync) {
        await syncExistingAtrasadaFinancialData(item, monthKey, lateFinancialSync);
    }
}

function syncInlineJurosFields(item, fieldElement) {
    const field = fieldElement.dataset.inlineField;
    if (field !== "juros_atraso_valor" && field !== "juros_atraso_perc") {
        return;
    }

    const monthKey = state.viewMonthKey || getCurrentMonthKey();
    const monthlyData = getMonthlyContaData(item, monthKey);
    const valorMensal = Number(monthlyData.valor_mensal || 0);
    let jurosValor = Number(fieldElement.value || 0);
    let jurosPerc = Number(fieldElement.value || 0);

    if (field === "juros_atraso_valor") {
        jurosPerc = valorMensal ? Number(((jurosValor / valorMensal) * 100).toFixed(2)) : 0;
        setInlineRowFieldValue(fieldElement, "juros_atraso_perc", jurosPerc);
    } else {
        jurosValor = Number(((valorMensal * jurosPerc) / 100).toFixed(2));
        setInlineRowFieldValue(fieldElement, "juros_atraso_valor", jurosValor);
    }

    updateInlineValorComJuros(fieldElement, jurosValor > 0 ? Number((valorMensal + jurosValor).toFixed(2)) : "");
}

function setInlineRowFieldValue(fieldElement, field, value) {
    const row = fieldElement.closest("tr");
    const input = row?.querySelector(`[data-inline-field="${field}"]`);
    if (input) {
        input.value = value === "" ? "" : String(value);
    }
}

function updateInlineValorComJuros(fieldElement, value) {
    const row = fieldElement.closest("tr");
    const totalCell = row?.querySelector("[data-valor-com-juros]");
    if (totalCell) {
        totalCell.textContent = value === "" ? "-" : formatCurrency(value);
    }

    const valorPagoInput = row?.querySelector('[data-inline-field="valor_pago"]');
    if (valorPagoInput && !valorPagoInput.dataset.userEdited) {
        valorPagoInput.value = value === "" ? "" : String(Number(value || 0).toFixed(2));
    }
}

function updateInlineStatusDisplay(fieldElement, status) {
    const row = fieldElement.closest("tr");
    if (!row) {
        return;
    }

    row.classList.toggle("conta-paga-row", status === "paga");
    row.classList.toggle("conta-atrasada-row", status === "atrasada");
    row.classList.toggle("conta-dispensada-row", status === "dispensada");
    const statusCell = row.querySelector("[data-status-cell]");
    if (statusCell) {
        statusCell.innerHTML = getStatusBadge(status);
    }
}

async function syncPartialPaymentAtrasada(conta, monthKey, valorPago, pagoData, pagoPor, totalDevidoOverride = null) {
    const atrasoId = `${monthKey.replace("-", "")}_parcial`;
    const atrasoPath = `${PATHS.abertasAtrasadas}/${conta.id}/${atrasoId}`;
    const monthlyData = getMonthlyContaData(conta, monthKey);
    const totalDevido = Number(totalDevidoOverride ?? monthlyData.valor_com_juros_calculado ?? monthlyData.valor_mensal ?? 0);
    const diferenca = Number(Math.max(totalDevido - Number(valorPago || 0), 0).toFixed(2));

    if (!pagoData || !pagoPor || diferenca <= 0) {
        await remove(ref(database, atrasoPath));
        return;
    }

    const monthlyView = getMonthlyView(conta, monthKey);
    const vencidaData = getContaDueDateValue(conta, monthKey);
    const parcelaNumber = getContaInstallmentNumber(conta, monthKey);
    await set(ref(database, atrasoPath), {
        conta_id: conta.id,
        conta_path: conta.path,
        titulo: conta.titulo || "",
        mes_referencia: monthKey,
        parcela_numero: parcelaNumber || "",
        prazo: monthlyView?.prazoText || "",
        data_vencida: vencidaData,
        valor_mensal: diferenca,
        valor_original: totalDevido,
        valor_pago_no_mes: Number(valorPago || 0),
        juros_valor: "",
        juros_perc: "",
        status: "atrasada",
        origem: "pagamento_parcial",
        pago_data: "",
        pago_por: "",
        link_conta: monthlyData.link_conta || "",
        observacao: `Diferença de pagamento parcial em ${formatMonthKeyLabel(monthKey)}`,
        criado_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
    });
}

async function syncExistingAtrasadaWithInlinePayment(conta, monthKey, valorPago, pagoData, pagoPor) {
    if (!pagoData || !pagoPor) {
        return;
    }

    const atrasadas = state.contasAtrasadas.filter((item) => {
        const contaId = item.conta_id || item.conta_group_id;
        return contaId === conta.id
            && item.mes_referencia === monthKey
            && item.origem !== "pagamento_parcial"
            && item.status !== "quitada"
            && item.status !== "paga_atrasada";
    });

    if (!atrasadas.length) {
        return;
    }

    await Promise.all(atrasadas.map((atraso) => {
        const jurosValor = Number(atraso.juros_valor || 0);
        const total = Number(valorPago || (Number(atraso.valor_mensal || 0) + jurosValor));
        return update(ref(database, getAtrasadaRefPath(atraso)), {
            status: "paga_atrasada",
            total,
            valor_pago_total: total,
            pago_data: pagoData,
            pago_mes: getMonthKeyFromDateInput(pagoData),
            pago_por: pagoPor,
            quitada_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
        });
    }));
}

async function syncExistingAtrasadaFinancialData(conta, monthKey, data = {}) {
    const atrasadas = state.contasAtrasadas.filter((item) => {
        const contaId = item.conta_id || item.conta_group_id;
        return contaId === conta.id
            && item.mes_referencia === monthKey
            && item.origem !== "pagamento_parcial"
            && item.status !== "quitada"
            && item.status !== "paga_atrasada";
    });

    if (!atrasadas.length) {
        return;
    }

    await Promise.all(atrasadas.map((atraso) => {
        const valorMensal = Number(data.valor_mensal ?? atraso.valor_mensal ?? 0);
        const jurosValor = Number(data.juros_valor ?? atraso.juros_valor ?? 0);
        const jurosPerc = data.juros_perc ?? (valorMensal ? Number(((jurosValor / valorMensal) * 100).toFixed(2)) : 0);
        return update(ref(database, getAtrasadaRefPath(atraso)), {
            valor_mensal: valorMensal,
            juros_valor: jurosValor,
            juros_perc: jurosPerc,
            total: Number((valorMensal + jurosValor).toFixed(2)),
            atualizado_em: new Date().toISOString()
        });
    }));
}

function shouldApplyInlineChangeForward(field, monthKey) {
    const fieldLabels = {
        valor_mensal: "valor mensalidade",
        link_conta: "link",
        valor_para_quitar: "valor para quitar",
        observacao: "observação"
    };

    if (!fieldLabels[field]) {
        return false;
    }

    return confirm(`Deseja aplicar a alteração de ${fieldLabels[field]} também para ${formatMonthKeyLabel(monthKey)} e os meses seguintes?`);
}

async function saveLateContaField(item, fieldElement, row) {
    const field = fieldElement.dataset.lateField;
    if (!field) {
        return;
    }

    const updates = {
        atualizado_em: new Date().toISOString()
    };
    const valorMensal = Number(item.valor_mensal || 0);
    const contaUpdates = {};
    let shouldSyncConta = false;
    if (field === "juros_valor") {
        const jurosValor = Number(fieldElement.value || 0);
        updates.juros_valor = jurosValor;
        updates.juros_perc = valorMensal ? Number(((jurosValor / valorMensal) * 100).toFixed(2)) : 0;
        setLateRowFieldValue(row, "juros_perc", updates.juros_perc);
        updateLateRowTotal(row, valorMensal, jurosValor);
    } else if (field === "juros_perc") {
        const jurosPerc = Number(fieldElement.value || 0);
        const jurosValor = Number(((valorMensal * jurosPerc) / 100).toFixed(2));
        updates.juros_perc = jurosPerc;
        updates.juros_valor = jurosValor;
        setLateRowFieldValue(row, "juros_valor", jurosValor);
        updateLateRowTotal(row, valorMensal, jurosValor);
    } else if (field === "valor_pago_total") {
        const jurosValorAtual = Number(row?.querySelector('[data-late-field="juros_valor"]')?.value || item.juros_valor || 0);
        const valorReferencia = getAtrasadaEffectiveDueAmount({
            valor_mensal: valorMensal,
            juros_valor: jurosValorAtual,
            total: Number((valorMensal + jurosValorAtual).toFixed(2))
        });
        const valorPagoTotal = Number(fieldElement.value || 0);

        if (Math.abs(valorPagoTotal - valorReferencia) > 0.009) {
            const warningMessage = [
                "O valor pago informado está diferente do valor devido desta conta.",
                "",
                `Valor de referência: ${formatCurrency(valorReferencia)}`,
                `Valor pago informado: ${formatCurrency(valorPagoTotal)}`,
                "",
                "Clique em OK para manter esse valor pago diferente, ou em Cancelar para voltar ao valor de referência."
            ].join("\n");

            if (!confirm(warningMessage)) {
                fieldElement.value = valorReferencia.toFixed(2);
                updates.valor_pago_total = valorReferencia;
            } else {
                updates.valor_pago_total = valorPagoTotal;
            }
        } else {
            updates.valor_pago_total = valorPagoTotal;
        }
        fieldElement.value = Number(updates.valor_pago_total || 0).toFixed(2);
    } else if (field === "pago_data") {
        updates.pago_data = normalizeDateInput(fieldElement.value || "");
    } else if (field === "pago_por") {
        updates.pago_por = fieldElement.value || "";
    } else if (field === "link_conta") {
        updates.link_conta = fieldElement.value.trim();
    } else if (field === "observacao") {
        updates.observacao = fieldElement.value.trim();
    } else {
        return;
    }

    if (false && (field === "juros_valor" || field === "juros_perc") && Number(updates.juros_valor || 0) > 0) {
        const totalAtualizado = Number((valorMensal + Number(updates.juros_valor || 0)).toFixed(2));
        const valorBaseComparacao = getAtrasadaEffectiveDueAmount(item);
        if (totalAtualizado > valorBaseComparacao) {
            const replicateMessage = [
                "O total desta conta atrasada ficou maior que o valor de referência atual.",
                "",
                `Valor de referência atual: ${formatCurrency(valorBaseComparacao)}`,
                `Novo total: ${formatCurrency(totalAtualizado)}`,
                "",
                "Deseja atualizar o valor mensalidade para esse novo total?",
                "OK: incorporar no valor mensalidade e zerar o juros separado.",
                "Cancelar: manter o valor mensalidade atual e o juros em separado."
            ].join("\n");

            if (confirm(replicateMessage)) {
                updates.valor_mensal = totalAtualizado;
                updates.juros_valor = 0;
                updates.juros_perc = 0;
                setLateRowFieldValue(row, "juros_valor", 0);
                setLateRowFieldValue(row, "juros_perc", 0);
                updateLateRowTotal(row, totalAtualizado, 0);
                contaUpdates[`dados_mensais/${item.mes_referencia}/valor_mensal`] = totalAtualizado;
                contaUpdates[`dados_mensais/${item.mes_referencia}/juros_atraso_valor`] = 0;
                contaUpdates[`dados_mensais/${item.mes_referencia}/juros_atraso_perc`] = 0;
                shouldSyncConta = true;
            }
        }
    }

    await update(ref(database, getAtrasadaRefPath(item)), updates);
    if (shouldSyncConta && item.conta_path && item.conta_id) {
        await update(ref(database, `${item.conta_path}/${item.conta_id}`), contaUpdates);
    }
}

function setLateRowFieldValue(row, field, value) {
    const input = row?.querySelector(`[data-late-field="${field}"]`);
    if (input) {
        input.value = value === "" ? "" : String(value);
    }
}

function updateLateRowTotal(row, valorMensal, jurosValor) {
    const totalCell = row?.querySelector("[data-late-total]");
    if (totalCell) {
        totalCell.textContent = formatCurrency(Number(valorMensal || 0) + Number(jurosValor || 0));
    }
}

function openMensalidadeModal(conta) {
    if (!elements.mensalidadeModal) {
        return;
    }

    const monthKey = state.viewMonthKey || getCurrentMonthKey();
    const monthlyData = getMonthlyContaData(conta, monthKey);
    state.selectedMensalidadeConta = {
        id: conta.id,
        path: conta.path,
        monthKey,
        valorAtual: Number(monthlyData.valor_mensal || 0),
        jurosAtual: Number(monthlyData.juros_atraso_valor || 0),
        saldoAtual: getParceladoSnapshot(conta, getCurrentMonthKey()).saldo,
        alteracoes: conta.alteracoes_mensalidade || {}
    };

    elements.mensalidadeValorAtual.value = state.selectedMensalidadeConta.valorAtual.toFixed(2);
    elements.mensalidadeEscopo.value = "somente_mes";
    elements.mensalidadeOperacao.value = "adicionar";
    elements.mensalidadeValorAlteracao.value = "";
    elements.mensalidadeMotivo.value = "";
    renderMensalidadeChangesList();
    updateMensalidadeResult();
    elements.mensalidadeModal.style.display = "flex";
}

function closeMensalidadeModal() {
    state.selectedMensalidadeConta = null;
    if (elements.mensalidadeModal) {
        elements.mensalidadeModal.style.display = "none";
    }
}

function openAnexosContaModal(conta) {
    state.selectedAnexosConta = {
        id: conta.id,
        path: conta.path,
        monthKey: state.viewMonthKey || getCurrentMonthKey()
    };

    if (elements.anexosContaTitle) {
        elements.anexosContaTitle.textContent = `Anexos - ${conta.titulo || "Conta"} (${formatMonthKeyLabel(state.selectedAnexosConta.monthKey)})`;
    }
    if (elements.anexosContaInput) {
        elements.anexosContaInput.value = "";
    }
    renderAnexosContaList(conta);
    if (elements.anexosContaModal) {
        elements.anexosContaModal.style.display = "flex";
    }
}

function closeAnexosContaModal() {
    state.selectedAnexosConta = null;
    if (elements.anexosContaInput) {
        elements.anexosContaInput.value = "";
    }
    if (elements.anexosContaModal) {
        elements.anexosContaModal.style.display = "none";
    }
}

function refreshAnexosContaModal() {
    const selected = state.selectedAnexosConta;
    if (!selected || !elements.anexosContaModal || elements.anexosContaModal.style.display === "none") {
        return;
    }

    const conta = state.contas.find((item) => item.id === selected.id && item.path === selected.path);
    renderAnexosContaList(conta);
}

function renderAnexosContaList(conta = null) {
    if (!elements.anexosContaList) {
        return;
    }

    const selected = state.selectedAnexosConta;
    const targetConta = conta || state.contas.find((item) => item.id === selected?.id && item.path === selected?.path);
    const monthKey = selected?.monthKey || state.viewMonthKey || getCurrentMonthKey();
    const anexos = Object.entries(targetConta?.anexos_mensais?.[monthKey] || {})
        .map(([id, value]) => ({ id, ...value }))
        .sort((a, b) => String(b.enviado_em || "").localeCompare(String(a.enviado_em || "")));

    if (!anexos.length) {
        elements.anexosContaList.innerHTML = '<div class="empty-table-row">Nenhum anexo neste mês.</div>';
        return;
    }

    elements.anexosContaList.innerHTML = anexos.map((anexo) => `
        <div class="anexo-conta-item">
            <div>
                <strong>${escapeHtmlText(anexo.nome || anexo.publicId || "Anexo")}</strong>
                <small>${escapeHtmlText(anexo.tipo || anexo.format || "arquivo")} ${anexo.tamanho ? `- ${formatFileSize(anexo.tamanho)}` : ""}</small>
            </div>
            <div class="anexo-conta-actions">
                <a class="table-action-btn" href="${escapeHtmlAttr(anexo.url || "#")}" target="_blank" rel="noreferrer">Abrir</a>
                <button class="table-action-btn danger" type="button" data-anexo-id="${escapeHtmlAttr(anexo.id)}">Excluir</button>
            </div>
        </div>
    `).join("");

    elements.anexosContaList.querySelectorAll("[data-anexo-id]").forEach((button) => {
        button.addEventListener("click", () => deleteAnexoConta(button.dataset.anexoId));
    });
}

async function uploadAnexosConta() {
    const selected = state.selectedAnexosConta;
    const files = Array.from(elements.anexosContaInput?.files || []);
    if (!selected || !files.length) {
        alert("Selecione ao menos um anexo.");
        return;
    }

    elements.uploadAnexosContaBtn.disabled = true;
    elements.uploadAnexosContaBtn.textContent = "Enviando...";
    try {
        const updates = {
            atualizado_em: new Date().toISOString()
        };
        for (const file of files) {
            if (!isValidContaAttachment(file)) {
                throw new Error(`Arquivo inválido: ${file.name}`);
            }

            const uploadResult = await uploadImagemCloudinary(file, `contas/${selected.id}/${selected.monthKey}`);
            const anexoId = generateId();
            updates[`anexos_mensais/${selected.monthKey}/${anexoId}`] = {
                nome: file.name,
                tipo: file.type || uploadResult.resourceType || "",
                tamanho: Number(file.size || uploadResult.bytes || 0),
                url: uploadResult.url,
                publicId: uploadResult.publicId,
                resourceType: uploadResult.resourceType || "image",
                format: uploadResult.format || "",
                enviado_em: new Date().toISOString()
            };
        }

        await update(ref(database, `${selected.path}/${selected.id}`), updates);
        if (elements.anexosContaInput) {
            elements.anexosContaInput.value = "";
        }
    } catch (error) {
        console.error("Erro ao enviar anexos:", error);
        alert(error.message || "Não foi possível enviar os anexos.");
    } finally {
        elements.uploadAnexosContaBtn.disabled = false;
        elements.uploadAnexosContaBtn.textContent = "Enviar anexos";
    }
}

async function deleteAnexoConta(anexoId) {
    const selected = state.selectedAnexosConta;
    const conta = state.contas.find((item) => item.id === selected?.id && item.path === selected?.path);
    const anexo = conta?.anexos_mensais?.[selected?.monthKey]?.[anexoId];
    if (!selected || !anexo || !confirm(`Excluir o anexo "${anexo.nome || anexoId}"?`)) {
        return;
    }

    try {
        await deletarImagemCloudinary(anexo.publicId, anexo.resourceType);
        await remove(ref(database, `${selected.path}/${selected.id}/anexos_mensais/${selected.monthKey}/${anexoId}`));
    } catch (error) {
        console.error("Erro ao excluir anexo:", error);
        alert(error.message || "Não foi possível excluir o anexo.");
    }
}

function updateMensalidadeResult() {
    if (!state.selectedMensalidadeConta || !elements.mensalidadeResultado) {
        return;
    }

    const baseValue = Number(state.selectedMensalidadeConta.valorAtual || 0);
    const valorAlteracao = Number(elements.mensalidadeValorAlteracao?.value || 0);
    const operacao = elements.mensalidadeOperacao?.value || "adicionar";
    const resultado = operacao === "subtrair" ? Math.max(baseValue - valorAlteracao, 0) : baseValue + valorAlteracao;

    elements.mensalidadeResultado.value = resultado.toFixed(2);
}

async function saveMensalidadeChange() {
    if (!state.selectedMensalidadeConta) {
        return;
    }

    const valorAlteracao = Number(elements.mensalidadeValorAlteracao?.value || 0);
    const motivo = (elements.mensalidadeMotivo?.value || "").trim();
    if (valorAlteracao <= 0) {
        alert("Informe o valor da alteração.");
        elements.mensalidadeValorAlteracao?.focus();
        return;
    }

    if (!motivo) {
        alert("Informe o motivo da alteração.");
        elements.mensalidadeMotivo?.focus();
        return;
    }

    const { id, path, monthKey, valorAtual, jurosAtual, saldoAtual } = state.selectedMensalidadeConta;
    const operacao = elements.mensalidadeOperacao?.value || "adicionar";
    const escopo = elements.mensalidadeEscopo?.value || "somente_mes";
    const valorResultante = Number(elements.mensalidadeResultado?.value || 0);
    const changeId = generateId();
    const updates = {
        atualizado_em: new Date().toISOString()
    };

    const changePayload = {
        escopo,
        operacao,
        valor_alteracao: valorAlteracao,
        valor_anterior: valorAtual,
        valor_resultante: valorResultante,
        motivo,
        criado_em: new Date().toISOString()
    };
    Object.assign(updates, {
        [`alteracoes_mensalidade/${changeId}`]: changePayload,
    });

    if (escopo === "mes_em_diante") {
        updates.valor_mensal = valorResultante;
        updates.valor_quitar_juros = Number((Number(saldoAtual || 0) * valorResultante).toFixed(2));
        updates.valor_c_juros = null;
    } else {
        updates[`dados_mensais/${monthKey}/valor_mensal`] = valorResultante;
        updates[`dados_mensais/${monthKey}/valor_c_juros`] = null;
    }

    await update(ref(database, `${path}/${id}`), updates);
    await syncExistingAtrasadaFinancialData({ id, path }, monthKey, {
        valor_mensal: valorResultante,
        juros_valor: jurosAtual
    });

    closeMensalidadeModal();
}

function renderMensalidadeChangesList() {
    if (!elements.mensalidadeChangesList || !state.selectedMensalidadeConta) {
        return;
    }

    const entries = normalizeMensalidadeChanges(state.selectedMensalidadeConta.alteracoes)
        .sort((a, b) => String(b.criado_em || "").localeCompare(String(a.criado_em || "")));

    if (!entries.length) {
        elements.mensalidadeChangesList.innerHTML = '<div class="empty-table-row">Nenhuma alteração registrada.</div>';
        return;
    }

    const totalAumentado = entries
        .filter((item) => item.operacao === "adicionar")
        .reduce((acc, item) => acc + Number(item.valor_alteracao || 0), 0);
    const totalDiminuido = entries
        .filter((item) => item.operacao === "subtrair")
        .reduce((acc, item) => acc + Number(item.valor_alteracao || 0), 0);

    elements.mensalidadeChangesList.innerHTML = `
        <div class="mensalidade-changes-summary">
            <strong>Total aumentado: ${formatCurrency(totalAumentado)}</strong>
            <strong>Total diminuído: ${formatCurrency(totalDiminuido)}</strong>
        </div>
        ${entries.map((item) => `
        <div class="mensalidade-change-item">
            <div class="mensalidade-change-top">
                <strong>${formatMonthKeyLabel(item.monthKey)} - ${formatCurrency(item.valor_anterior)} para ${formatCurrency(item.valor_resultante)}</strong>
                <button type="button" class="mensalidade-delete-btn" data-delete-mensalidade-change="${escapeHtmlAttr(item.storagePath || "")}" title="Excluir lançamento" aria-label="Excluir lançamento">🗑</button>
            </div>
            <small>${item.operacao || "-"} ${formatCurrency(item.valor_alteracao)} | ${item.escopo === "mes_em_diante" ? "mês em diante" : "somente mês"}</small>
            <span>${escapeHtmlText(item.motivo || "")}</span>
        </div>
    `).join("")}`;

    elements.mensalidadeChangesList.querySelectorAll("[data-delete-mensalidade-change]").forEach((button) => {
        button.addEventListener("click", () => deleteMensalidadeChange(button.dataset.deleteMensalidadeChange));
    });
}

function normalizeMensalidadeChanges(alteracoes) {
    if (!alteracoes || typeof alteracoes !== "object") {
        return [];
    }

    return Object.entries(alteracoes).flatMap(([key, value]) => {
        if (!value || typeof value !== "object") {
            return [];
        }

        if (value.monthKey || value.criado_em || value.valor_alteracao !== undefined) {
            return [{ id: key, storagePath: `alteracoes_mensalidade/${key}`, monthKey: value.monthKey || "", ...value }];
        }

        return Object.entries(value).map(([nestedId, nestedValue]) => ({
            id: nestedId,
            storagePath: `alteracoes_mensalidade/${key}/${nestedId}`,
            monthKey: key,
            ...(nestedValue || {})
        }));
    });
}

async function deleteMensalidadeChange(storagePath) {
    if (!storagePath || !state.selectedMensalidadeConta?.path || !state.selectedMensalidadeConta?.id) {
        return;
    }

    if (!confirm("Deseja mesmo excluir este lançamento de alteração de mensalidade?")) {
        return;
    }

    await remove(ref(database, `${state.selectedMensalidadeConta.path}/${state.selectedMensalidadeConta.id}/${storagePath}`));
}

function getParceladoSnapshot(item, monthKey) {
    const total = Number(item.parcelado?.total || 0);
    if (!total) {
        return { total: 0, posicao: 0, pagas: 0, saldo: 0 };
    }

    const cartao = item.pagamento?.metodo === "cartao"
        ? state.cartoes.find((card) => card.id === item.pagamento?.cartao_id)
        : null;
    const autoPosicao = cartao
        ? getCardInstallmentPositionForInvoiceMonth(item.data_primeira_parcela || item.data_contrato, monthKey, total, cartao, item.parcelas || {})
        : getAutoPaidInstallments(item.data_primeira_parcela || item.data_contrato, monthKey, total);
    const posicao = clampNumber(autoPosicao, 0, total, 0);
    const pagas = clampNumber(item.parcelas_pagas_total, 0, total, 0);
    const saldo = Math.max(total - posicao, 0);
    return { total, posicao, pagas, saldo };
}

function buildParcelasNode(primeiraParcela, totalParcelas, existingParcelas = {}, posicaoAtual = 0) {
    const parcelas = {};
    const baseDate = parseDateOnly(primeiraParcela);

    for (let index = 1; index <= totalParcelas; index += 1) {
        const existing = existingParcelas?.[index] || existingParcelas?.[String(index)] || {};
        const dueDate = baseDate ? addMonthsToDateInput(primeiraParcela, index - 1) : (existing.data || "");
        parcelas[index] = {
            posicao: index,
            data: dueDate,
            saldo: Math.max(totalParcelas - index, 0),
            paga_data: existing.paga_data || "",
            paga_mes: existing.paga_mes || "",
            paga_manual: Boolean(existing.paga_data),
            status: existing.status || (index <= posicaoAtual ? "prevista" : "pendente")
        };
    }

    return parcelas;
}

function renderParcelasManagement(conta) {
    if (!elements.parcelasManagementList || !elements.parcelasManagementSection) {
        return;
    }

    const isParcelada = elements.tipoConta?.value === "parcelada";
    if (!isParcelada || !conta) {
        elements.parcelasManagementList.innerHTML = '<div class="empty-table-row">Salve ou edite uma conta parcelada para gerenciar as parcelas.</div>';
        return;
    }

    const parcelas = Object.entries(conta.parcelas || {})
        .map(([numero, parcela]) => ({ numero: Number(numero), ...parcela }))
        .filter((parcela) => !parcela.paga_data)
        .sort((a, b) => a.numero - b.numero);

    if (!parcelas.length) {
        elements.parcelasManagementList.innerHTML = '<div class="empty-table-row">Não há parcelas em aberto para marcar.</div>';
        return;
    }

    autofillParcelasBulkRange(parcelas);

    elements.parcelasManagementList.innerHTML = parcelas.map((parcela) => {
        const isAtrasada = parcela.status === "atrasada";
        return `
            <div class="parcela-management-item ${isAtrasada ? "parcela-atrasada-item" : ""}">
                <label>
                    ${isAtrasada ? "" : `<input type="checkbox" data-parcela-checkbox data-parcela-month="${escapeHtmlAttr(getMonthKeyFromDateInput(parcela.data))}" value="${parcela.numero}">`}
                    <span class="parcela-management-content">
                        <span class="parcela-management-main">
                            <strong>${parcela.numero}</strong>
                            <small>Saldo ${parcela.saldo ?? "-"}</small>
                        </span>
                        ${isAtrasada ? '<em class="parcela-atrasada-badge">Atrasada</em>' : ""}
                        <span class="parcela-management-date">${formatDate(parcela.data)}</span>
                    </span>
                </label>
            </div>
        `;
    }).join("");

    getParcelasCheckboxes().forEach((checkbox) => {
        checkbox.addEventListener("change", () => {
            checkbox.closest(".parcela-management-item")?.classList.toggle("parcela-selected-item", checkbox.checked);
        });
    });
}

function autofillParcelasBulkRange(parcelas) {
    const openMonths = parcelas
        .map((parcela) => getMonthKeyFromDateInput(parcela.data))
        .filter(Boolean)
        .sort();

    if (openMonths.length && elements.parcelasRangeStart) {
        elements.parcelasRangeStart.value = openMonths[0];
    }

    const currentMonthKey = getCurrentMonthKey();
    const overdueMonths = openMonths.filter((monthKey) => monthKey < currentMonthKey);
    if (elements.parcelasRangeEnd) {
        elements.parcelasRangeEnd.value = overdueMonths.length
            ? overdueMonths[overdueMonths.length - 1]
            : "";
    }
}

function selectParcelasRange() {
    const startMonth = elements.parcelasRangeStart?.value || "";
    const endMonth = elements.parcelasRangeEnd?.value || "";
    if (!startMonth || !endMonth) {
        return;
    }

    getParcelasCheckboxes().forEach((checkbox) => {
        const parcelaMonth = checkbox.dataset.parcelaMonth || "";
        checkbox.checked = parcelaMonth >= startMonth && parcelaMonth <= endMonth;
        checkbox.closest(".parcela-management-item")?.classList.toggle("parcela-selected-item", checkbox.checked);
    });
}

function clearParcelasSelection() {
    getParcelasCheckboxes().forEach((checkbox) => {
        checkbox.checked = false;
        checkbox.closest(".parcela-management-item")?.classList.remove("parcela-selected-item");
    });
}

function getParcelasCheckboxes() {
    return Array.from(elements.parcelasManagementList?.querySelectorAll('[data-parcela-checkbox]') || []);
}

async function applySelectedParcelasPayment() {
    if (!state.selectedId || !state.selectedPath) {
        return;
    }

    const paymentDay = Number(elements.parcelasBulkPaymentDay?.value || 0);
    const paidBy = elements.parcelasBulkPaidBy?.value || "";

    if (paymentDay < 1 || paymentDay > 28) {
        alert("Informe um dia de pagamento entre 1 e 28.");
        elements.parcelasBulkPaymentDay?.focus();
        return;
    }

    if (!paidBy) {
        alert("Informe quem realizou o pagamento em massa.");
        elements.parcelasBulkPaidBy?.focus();
        return;
    }

    const conta = state.contas.find((item) => item.id === state.selectedId && item.path === state.selectedPath);
    if (!conta) {
        return;
    }

    const parcelas = { ...(conta.parcelas || {}) };
    const statusMensal = { ...(conta.status_mensal || {}) };
    const selectedNumbers = getSelectedParcelaNumbers();

    if (!selectedNumbers.length) {
        alert("Selecione ao menos uma parcela para lançar o pagamento.");
        return;
    }

    const selectedLabels = selectedNumbers.map((numero) => formatShortMonthYear(parcelas[String(numero)]?.data || ""));
    if (!confirm(`Confirmar pagamento em massa das parcelas: ${selectedLabels.join(", ")}?`)) {
        return;
    }

    selectedNumbers.forEach((numero) => {
        const key = String(numero);
        const parcela = parcelas[key] || {};
        const paymentDate = buildPaymentDateFromMonth(parcela.data, paymentDay);
        const paymentMonth = getMonthKeyFromDateInput(paymentDate);
        parcelas[key] = {
            ...parcela,
            paga_data: paymentDate,
            paga_mes: paymentMonth,
            paga_manual: true,
            observacao: prependMassPaymentNote(parcela.observacao),
            status: "paga"
        };

        statusMensal[paymentMonth] = {
            ...(statusMensal[paymentMonth] || {}),
            status: "paga",
            pago_data: paymentDate,
            pago_por: paidBy
        };
    });

    const parcelasPagasTotal = Object.values(parcelas).filter((parcela) => parcela?.paga_data).length;
    const latestPaymentMonth = selectedNumbers
        .map((numero) => getMonthKeyFromDateInput(parcelas[String(numero)]?.data || ""))
        .filter(Boolean)
        .sort()
        .at(-1) || getCurrentMonthKey();
    const latestPaymentDate = buildPaymentDateFromMonth(`${latestPaymentMonth}-01`, paymentDay);
    await update(ref(database, `${state.selectedPath}/${state.selectedId}`), {
        parcelas,
        parcelas_pagas_total: parcelasPagasTotal,
        status_mensal: statusMensal,
        pago_data: latestPaymentDate,
        pago_por: paidBy,
        atualizado_em: new Date().toISOString()
    });

    clearParcelasBulkPaymentFields();
    focusContasTable();
}

function clearParcelasBulkPaymentFields() {
    if (elements.parcelasRangeStart) elements.parcelasRangeStart.value = "";
    if (elements.parcelasRangeEnd) elements.parcelasRangeEnd.value = "";
    if (elements.parcelasBulkPaymentDay) elements.parcelasBulkPaymentDay.value = "";
    if (elements.parcelasBulkPaidBy) elements.parcelasBulkPaidBy.value = "";
    clearParcelasSelection();
}

function focusContasTable() {
    const table = elements.tableBody?.closest("table");
    if (!table) {
        return;
    }

    if (!table.hasAttribute("tabindex")) {
        table.setAttribute("tabindex", "-1");
    }
    table.scrollIntoView({ behavior: "smooth", block: "start" });
    table.focus({ preventScroll: true });
}

async function applySelectedParcelasLate() {
    if (!state.selectedId || !state.selectedPath) {
        return;
    }

    const conta = state.contas.find((item) => item.id === state.selectedId && item.path === state.selectedPath);
    if (!conta) {
        return;
    }

    const selectedNumbers = getSelectedParcelaNumbers();
    if (!selectedNumbers.length) {
        alert("Selecione ao menos uma parcela para lançar como atrasada.");
        return;
    }

    const selectedLabels = selectedNumbers.map((numero) => formatShortMonthYear(conta.parcelas?.[String(numero)]?.data || ""));
    if (!confirm(`Confirmar envio para atrasadas das parcelas: ${selectedLabels.join(", ")}?`)) {
        return;
    }

    for (const numero of selectedNumbers) {
        const parcela = conta.parcelas?.[String(numero)] || {};
        const monthKey = getMonthKeyFromDateInput(parcela.data);
        if (monthKey) {
            await marcarContaAtrasada(conta, monthKey, { confirmAction: false });
        }
    }

    clearParcelasBulkPaymentFields();
    focusContasTable();
}

function getSelectedParcelaNumbers() {
    return getParcelasCheckboxes()
        .filter((checkbox) => checkbox.checked)
        .map((checkbox) => Number(checkbox.value))
        .filter(Boolean)
        .sort((a, b) => a - b);
}

function getContaMonthStatus(item, monthKey) {
    return item.status_mensal?.[monthKey] || null;
}

function updateMonthActionWarning() {
    if (!elements.monthActionWarning) {
        return;
    }

    const previousMonthKey = addMonthsToMonthKey(state.viewMonthKey || getCurrentMonthKey(), -1);
    const pendingContas = state.contas.filter((item) => shouldWarnPendingAction(item, previousMonthKey));
    const pendingCartoes = state.cartoes.filter((cartao) => shouldWarnPendingCardAction(cartao, previousMonthKey));
    const pending = [...pendingContas, ...pendingCartoes];

    if (!pending.length) {
        elements.monthActionWarning.style.display = "none";
        elements.monthActionWarning.textContent = "";
        return;
    }

    elements.monthActionWarning.style.display = "block";
    elements.monthActionWarning.textContent = `Há contas no mês ${formatMonthKeyLabel(previousMonthKey)} faltando ação.`;
}

function shouldWarnPendingAction(item, monthKey) {
    if (item.category === "quitadasFixas" || item.category === "quitadasParceladas" || item.category === "abertasAtrasadas") {
        return false;
    }

    if (item.pagamento?.metodo === "cartao") {
        return false;
    }

    const monthlyView = getMonthlyView(item, monthKey);
    if (!monthlyView) {
        return false;
    }

    const monthStatus = getContaMonthStatus(item, monthKey);
    return !monthStatus?.status;
}

function shouldWarnPendingCardAction(cartao, monthKey) {
    if (!monthKey || isCartaoAbandonedFrom(cartao, monthKey)) {
        return false;
    }

    const summary = buildCardMonthSummary(cartao, monthKey);
    if (!summary.lancamentos.length) {
        return false;
    }

    const status = getCartaoFaturaStatus(summary);
    return status === "pendente";
}

function getAutoPaidInstallments(dataContrato, monthKey, totalParcelas) {
    const contrato = parseDateOnly(dataContrato);
    const monthDate = monthKeyToDate(monthKey);
    if (!contrato || !monthDate || !totalParcelas) {
        return 0;
    }

    const monthDiff = (monthDate.getFullYear() - contrato.getFullYear()) * 12 + (monthDate.getMonth() - contrato.getMonth());
    const installmentPosition = monthDiff + 1;
    return Math.max(Math.min(installmentPosition, totalParcelas), 0);
}

function getCardInstallmentPositionForInvoiceMonth(dataCompra, monthKey, totalParcelas, cartao, parcelas = {}) {
    if (!cartao) {
        return getAutoPaidInstallments(dataCompra, monthKey, totalParcelas);
    }

    for (let index = 0; index < Number(totalParcelas || 0); index += 1) {
        const position = index + 1;
        const parcela = parcelas?.[position] || parcelas?.[String(position)] || {};
        const installmentDate = parcela.data || addMonthsToDateInput(dataCompra, index);
        if (resolveInvoiceMonthKey(installmentDate, cartao) === monthKey) {
            return position;
        }
    }

    return 0;
}

function addMonthsToDateInput(dateInput, increment) {
    const date = parseDateOnly(dateInput);
    if (!date) {
        return "";
    }

    const targetYear = date.getFullYear();
    const targetMonth = date.getMonth() + increment;
    const targetDate = new Date(targetYear, targetMonth, 1, 12, 0, 0);
    const maxDay = new Date(targetDate.getFullYear(), targetDate.getMonth() + 1, 0).getDate();
    targetDate.setDate(Math.min(date.getDate(), maxDay));
    return toDateInputValue(targetDate);
}

function normalizeDateInput(value) {
    const parsed = parseDateOnly(value);
    return parsed ? toDateInputValue(parsed) : "";
}

function getMonthKeyFromDateInput(value) {
    const parsed = parseDateOnly(value);
    return parsed ? toMonthKey(parsed) : "";
}

function buildPaymentDateFromMonth(referenceDate, day) {
    const parsed = parseDateOnly(referenceDate);
    if (!parsed) {
        return "";
    }

    return toDateInputValue(new Date(parsed.getFullYear(), parsed.getMonth(), Number(day), 12, 0, 0));
}

function prependMassPaymentNote(currentText) {
    const note = "Pagamento em massa";
    const trimmed = String(currentText || "").trim();
    if (!trimmed) {
        return note;
    }
    if (trimmed.startsWith(note)) {
        return trimmed;
    }

    return `${note} - ${trimmed}`;
}

function clampNumber(value, min, max, fallback = min) {
    const numeric = Number(value);
    if (Number.isNaN(numeric)) {
        return fallback;
    }

    return Math.min(Math.max(numeric, min), max);
}

function roundMoney(value) {
    return Number(Number(value || 0).toFixed(2));
}

function validateForm() {
    if (!elements.titulo.value.trim()) {
        alert("Informe o título da conta.");
        elements.titulo.focus();
        return false;
    }

    if (!elements.valorMensal.value || Number(elements.valorMensal.value) <= 0) {
        alert("Informe o valor mensal.");
        elements.valorMensal.focus();
        return false;
    }

    if (elements.tipoConta.value === "parcelada" && !elements.parceladoTotal.value) {
        alert("Informe o total de parcelas.");
        elements.parceladoTotal.focus();
        return false;
    }

    if (elements.formaPagamento.value === "cartao" && !elements.dataPrimeiraParcela.value) {
        alert("Informe a data da compra para lançar no cartão.");
        elements.dataPrimeiraParcela.focus();
        return false;
    }

    if (elements.tipoConta.value === "parcelada" && !elements.dataPrimeiraParcela.value) {
        alert("Informe a data da 1ª parcela para gerar as parcelas mensais.");
        elements.dataPrimeiraParcela.focus();
        return false;
    }

    if (elements.tipoConta.value === "parcelada") {
        const total = Number(elements.parceladoTotal.value || 0);
        const pagasTotal = Number(elements.parceladoPagasTotal.value || 0);
        if (pagasTotal < 0 || pagasTotal > total) {
            alert("A quantidade de parcelas pagas deve estar entre 0 e o total contratado.");
            elements.parceladoPagasTotal.focus();
            return false;
        }
    }

    if (elements.formaPagamento.value === "cartao" && !elements.cartaoContaId.value) {
        alert("Selecione o cartão usado no pagamento.");
        elements.cartaoContaId.focus();
        return false;
    }

    return true;
}

function validateCartaoForm() {
    if (!elements.cartaoTitulo.value.trim()) {
        alert("Informe o título do cartão.");
        elements.cartaoTitulo.focus();
        return false;
    }

    if (!/^\d{4}$/.test(String(elements.cartaoUltimosDigitos.value || "").trim())) {
        alert("Informe os 4 últimos dígitos do cartão.");
        elements.cartaoUltimosDigitos.focus();
        return false;
    }

    const vencimento = Number(elements.cartaoVencimentoDia.value || 0);
    const melhorDia = Number(elements.cartaoMelhorDiaCompra.value || 0);
    if (vencimento < 1 || vencimento > 31) {
        alert("Informe um dia de vencimento válido.");
        elements.cartaoVencimentoDia.focus();
        return false;
    }

    if (melhorDia < 1 || melhorDia > 31) {
        alert("Informe um melhor dia para compra válido.");
        elements.cartaoMelhorDiaCompra.focus();
        return false;
    }

    return true;
}

function buildContaPayload(existingConta = null) {
    const cartao = state.cartoes.find((item) => item.id === elements.cartaoContaId.value);
    const selectedMonthKey = state.viewMonthKey || getCurrentMonthKey();
    const primeiraParcela = elements.dataPrimeiraParcela.value || "";
    const valorMensal = Number(elements.valorMensal.value || 0);
    const parceladoSaldo = Number(elements.parceladoSaldo.value || 0);
    const parcelasNode = buildParcelasNode(
        primeiraParcela,
        Number(elements.parceladoTotal.value || 0),
        existingConta?.parcelas || {},
        Number(elements.parceladoPagas.value || 0)
    );
    const payload = {
        titulo: elements.titulo.value.trim(),
        data_primeira_parcela: primeiraParcela,
        parcelado: {
            total: Number(elements.parceladoTotal.value || 0),
            pagas: Number(elements.parceladoPagas.value || 0),
            saldo: Number(elements.parceladoSaldo.value || 0)
        },
        parcelas_pagas_total: Number(elements.parceladoPagasTotal.value || 0),
        parcelas: parcelasNode,
        valor_para_quitar: Number(existingConta?.valor_para_quitar || 0),
        valor_quitar_juros: Number((parceladoSaldo * valorMensal).toFixed(2)),
        juros_atraso_valor: Number(elements.jurosAtrasoValor?.value || existingConta?.juros_atraso_valor || 0),
        juros_atraso_perc: Number(elements.jurosAtrasoPerc?.value || existingConta?.juros_atraso_perc || 0),
        valor_mensal: valorMensal,
        valor_c_juros: null,
        prazo_dia: Number(elements.prazoDia.value || 0),
        pago_data: existingConta?.pago_data || "",
        pago_por: existingConta?.pago_por || "",
        link_conta: elements.linkConta.value.trim(),
        quitar_juros: Number((parceladoSaldo * valorMensal).toFixed(2)),
        quitar_desconto: Number(elements.quitarDesconto.value || 0),
        observacao: elements.observacao.value.trim(),
        historico_mensal: { ...(existingConta?.historico_mensal || {}) },
        status_mensal: { ...(existingConta?.status_mensal || {}) },
        pagamento: {
            metodo: elements.formaPagamento.value || "direto",
            cartao_id: elements.formaPagamento.value === "cartao" ? elements.cartaoContaId.value : "",
            cartao_titulo: elements.formaPagamento.value === "cartao" ? cartao?.titulo || "" : ""
        },
        atualizado_em: new Date().toISOString()
    };

    if (elements.tipoConta.value !== "parcelada") {
        const fixedStartDate = primeiraParcela || existingConta?.data_primeira_parcela || existingConta?.data_contrato || "";
        payload.inicio_mes = existingConta?.inicio_mes || getMonthKeyFromDateInput(fixedStartDate) || selectedMonthKey;
        payload.fim_mes = elements.contaFixaMesUnico?.value === "sim" ? payload.inicio_mes : "";
        payload.data_primeira_parcela = elements.formaPagamento.value === "cartao" ? primeiraParcela : (existingConta?.data_primeira_parcela || "");
        if (elements.formaPagamento.value === "cartao" && primeiraParcela && !Number(payload.prazo_dia || 0)) {
            payload.prazo_dia = parseDateOnly(primeiraParcela)?.getDate() || 0;
        }
        payload.parcelado = { total: 0, pagas: 0, saldo: 0 };
        payload.parcelas_pagas_total = 0;
        payload.parcelas = {};
        payload.valor_quitar_juros = 0;
        payload.quitar_juros = 0;
        payload.quitar_desconto = 0;
    } else {
        payload.fim_mes = "";
        payload.historico_mensal[selectedMonthKey] = {
            posicao: Number(elements.parceladoPagas.value || 0),
            saldo: Number(elements.parceladoSaldo.value || 0)
        };
    }

    return payload;
}

function buildCartaoPayload(existingCard = {}) {
    const { id, ...persistedCard } = existingCard;
    return {
        ...persistedCard,
        titulo: elements.cartaoTitulo.value.trim(),
        ultimos_digitos: String(elements.cartaoUltimosDigitos.value || "").trim(),
        vencimento_dia: Number(elements.cartaoVencimentoDia.value || 0),
        melhor_dia_compra: Number(elements.cartaoMelhorDiaCompra.value || 0),
        atualizado_em: new Date().toISOString()
    };
}

function getDestinationPathByType(tipoConta) {
    return getDestinationPathByTypeAndStatus(tipoConta, "abertas");
}

function getDestinationPathByTypeAndStatus(tipoConta, statusGrupo = "abertas") {
    if (tipoConta === "fixa") {
        return statusGrupo === "quitadas" ? PATHS.quitadasFixas : PATHS.abertasFixas;
    }

    if (tipoConta === "parcelada") {
        return statusGrupo === "quitadas" ? PATHS.quitadasParceladas : PATHS.abertasParceladas;
    }

    return PATHS.abertasParceladas;
}

async function saveConta() {
    if (!validateForm()) {
        return;
    }

    const payload = buildContaPayload();
    const path = getDestinationPathByType(elements.tipoConta.value);
    const duplicate = findDuplicateConta(payload, path);
    if (duplicate) {
        alert(`Já existe uma conta "${duplicate.titulo}" cadastrada para este tipo no mês ${formatMonthKeyLabel(getNewContaStartMonth(payload))}.`);
        elements.titulo.focus();
        return;
    }

    const id = generateId();

    await set(ref(database, `${path}/${id}`), payload);
    if (payload.pagamento?.metodo === "cartao" && payload.pagamento?.cartao_id) {
        const cartao = state.cartoes.find((item) => item.id === payload.pagamento.cartao_id);
        await appendContaToCurrentMonthPosition({
            id: payload.pagamento.cartao_id,
            path: PATHS.cartoes,
            category: "cartaoResumo",
            titulo: cartao?.titulo || payload.pagamento.cartao_titulo || "Cartão"
        });
    } else {
        await appendContaToCurrentMonthPosition({
            id,
            path,
            category: elements.tipoConta.value === "fixa" ? "abertasFixas" : "abertasParceladas",
            ...payload
        });
    }
    clearForm();
}

function findDuplicateConta(payload, path) {
    const normalizedTitle = normalizeDuplicateTitle(payload.titulo);
    const startMonth = getNewContaStartMonth(payload);
    if (!normalizedTitle || !startMonth) {
        return null;
    }

    return state.contas.find((item) => {
        if (item.path !== path || normalizeDuplicateTitle(item.titulo) !== normalizedTitle) {
            return false;
        }

        return Boolean(getMonthlyView(item, startMonth));
    }) || null;
}

function getNewContaStartMonth(payload) {
    if (Number(payload.parcelado?.total || 0) > 0) {
        return getMonthKeyFromDateInput(payload.data_primeira_parcela);
    }

    return payload.inicio_mes || state.viewMonthKey || getCurrentMonthKey();
}

function normalizeDuplicateTitle(value) {
    return String(value || "")
        .trim()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "")
        .replace(/\s+/g, " ")
        .toLowerCase();
}

async function updateConta() {
    if (!state.selectedId || !state.selectedPath) {
        return;
    }

    if (!validateForm()) {
        return;
    }

    const payload = buildContaPayload(state.contas.find((item) => item.id === state.selectedId && item.path === state.selectedPath));
    const currentStatusGroup = state.selectedPath?.includes("/quitadas/") ? "quitadas" : "abertas";
    const destinationPath = getDestinationPathByTypeAndStatus(elements.tipoConta.value, currentStatusGroup);

    if (destinationPath !== state.selectedPath) {
        await remove(ref(database, `${state.selectedPath}/${state.selectedId}`));
        await set(ref(database, `${destinationPath}/${state.selectedId}`), payload);
    } else {
        await update(ref(database, `${state.selectedPath}/${state.selectedId}`), payload);
    }

    clearForm();
}

async function deleteConta(id, path, titulo) {
    const conta = state.contas.find((item) => item.id === id && item.path === path);
    if (!conta) {
        return;
    }

    openDeleteContaModal(conta);
}

function openDeleteContaModal(conta) {
    state.selectedDeleteConta = conta;
    const monthKey = state.viewMonthKey || getCurrentMonthKey();

    if (elements.deleteContaTitle) {
        elements.deleteContaTitle.textContent = `Conta: ${conta.titulo || "Sem título"} | Mês em visualização: ${formatMonthKeyLabel(monthKey)}`;
    }
    if (elements.deleteContaScope) {
        elements.deleteContaScope.value = "somente_mes";
    }
    if (elements.deleteContaModal) {
        elements.deleteContaModal.style.display = "flex";
    }
}

function closeDeleteContaModal() {
    state.selectedDeleteConta = null;
    if (elements.deleteContaModal) {
        elements.deleteContaModal.style.display = "none";
    }
}

async function confirmDeleteConta() {
    const conta = state.selectedDeleteConta;
    if (!conta) {
        closeDeleteContaModal();
        return;
    }

    const scope = elements.deleteContaScope?.value || "somente_mes";
    const deleted = await deleteContaByScope(conta, scope);
    if (deleted) {
        closeDeleteContaModal();
    }
}

async function deleteContaByScope(conta, scope) {
    const monthKey = state.viewMonthKey || getCurrentMonthKey();
    const title = conta.titulo || "conta";
    const monthLabel = formatMonthKeyLabel(monthKey);

    if (scope === "todas") {
        if (!confirm(`Excluir "${title}" de todos os meses, anteriores e futuros? Ela será movida para contas_casa/saida/excluidas.`)) {
            return false;
        }

        if (!confirm(`Confirme novamente: deseja mover "${title}" inteira para excluídas?`)) {
            return false;
        }
    } else if (scope === "mes_em_diante") {
        if (!confirm(`Excluir "${title}" de ${monthLabel} em diante?`)) {
            return false;
        }
    } else if (!confirm(`Excluir "${title}" somente em ${monthLabel}?`)) {
        return false;
    }

    const id = conta.id;
    const path = conta.path;
    const { path: _path, category: _category, id: _id, ...contaPayload } = conta;
    const excluidaPayload = {
        ...contaPayload,
        conta_id: id,
        origem_path: path,
        origem_category: conta.category || "",
        exclusao_escopo: scope,
        mes_referencia: monthKey,
        excluida_em: new Date().toISOString()
    };

    if (scope === "todas") {
        await set(ref(database, `${PATHS.excluidas}/${id}`), excluidaPayload);
        await remove(ref(database, `${path}/${id}`));
    } else if (scope === "mes_em_diante") {
        const recordId = buildExcluidaRecordId(id, scope, monthKey);
        await Promise.all([
            set(ref(database, `${PATHS.excluidas}/${recordId}`), {
                ...excluidaPayload,
                previous_excluida_a_partir_mes: conta.excluida_a_partir_mes || null
            }),
            update(ref(database, `${path}/${id}`), {
                excluida_a_partir_mes: monthKey,
                atualizado_em: new Date().toISOString()
            })
        ]);
    } else {
        const recordId = buildExcluidaRecordId(id, scope, monthKey);
        await Promise.all([
            set(ref(database, `${PATHS.excluidas}/${recordId}`), {
                ...excluidaPayload,
                previous_status_mensal: conta.status_mensal?.[monthKey] || null
            }),
            update(ref(database, `${path}/${id}`), {
                [`status_mensal/${monthKey}`]: {
                    ...(conta.status_mensal?.[monthKey] || {}),
                    status: "excluida",
                    excluida_em: new Date().toISOString()
                },
                atualizado_em: new Date().toISOString()
            })
        ]);
    }

    if (state.selectedId === conta.id) {
        clearForm();
    }

    return true;
}

function buildExcluidaRecordId(id, scope, monthKey) {
    if (scope === "todas") {
        return id;
    }

    const suffix = String(monthKey || getCurrentMonthKey()).replace("-", "");
    return scope === "mes_em_diante" ? `${id}_${suffix}_futuras` : `${id}_${suffix}`;
}

async function restoreContaExcluida(conta) {
    const title = conta.titulo || "conta";
    if (!confirm(`Recuperar "${title}" para contas de saída?`)) {
        return;
    }

    const originalId = conta.conta_id || conta.id;
    const originalPath = conta.origem_path || getDestinationPathByTypeAndStatus(isContaFixa(conta) ? "fixa" : "parcelada", "abertas");
    const scope = conta.exclusao_escopo || "todas";
    const monthKey = conta.mes_referencia || "";

    if (scope === "somente_mes" && monthKey) {
        await Promise.all([
            update(ref(database, `${originalPath}/${originalId}`), {
                [`status_mensal/${monthKey}`]: conta.previous_status_mensal || null,
                atualizado_em: new Date().toISOString()
            }),
            remove(ref(database, `${PATHS.excluidas}/${conta.id}`))
        ]);
        return;
    }

    if (scope === "mes_em_diante" && monthKey) {
        await Promise.all([
            update(ref(database, `${originalPath}/${originalId}`), {
                excluida_a_partir_mes: conta.previous_excluida_a_partir_mes || null,
                atualizado_em: new Date().toISOString()
            }),
            remove(ref(database, `${PATHS.excluidas}/${conta.id}`))
        ]);
        return;
    }

    const {
        id,
        conta_id: _contaId,
        path: _path,
        category: _category,
        origem_path: _origemPath,
        origem_category: _origemCategory,
        exclusao_escopo: _exclusaoEscopo,
        mes_referencia: _mesReferencia,
        previous_status_mensal: _previousStatusMensal,
        previous_excluida_a_partir_mes: _previousExcluidaAPartirMes,
        excluida_em: _excluidaEm,
        ...payload
    } = conta;
    const destinationPath = getDestinationPathByTypeAndStatus(isContaFixa(conta) ? "fixa" : "parcelada", "abertas");

    await Promise.all([
        set(ref(database, `${destinationPath}/${originalId}`), {
            ...payload,
            restaurada_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
        }),
        remove(ref(database, `${PATHS.excluidas}/${id}`))
    ]);
}

async function saveCartao() {
    if (!validateCartaoForm()) {
        return;
    }

    const id = generateId();
    await set(ref(database, `${PATHS.cartoes}/${id}`), buildCartaoPayload({ criado_em: new Date().toISOString() }));
    clearCartaoForm();
}

async function updateCartao() {
    if (!state.selectedCardId) {
        return;
    }

    if (!validateCartaoForm()) {
        return;
    }

    const existing = state.cartoes.find((item) => item.id === state.selectedCardId) || {};
    await update(ref(database, `${PATHS.cartoes}/${state.selectedCardId}`), buildCartaoPayload(existing));
    clearCartaoForm();
}

async function deleteCartao(id, titulo) {
    const hasLinkedAccounts = state.contas.some((conta) => conta.pagamento?.cartao_id === id);
    if (hasLinkedAccounts) {
        alert("Esse cartão está vinculado a contas cadastradas. Remova ou troque o cartão nas contas antes de excluir.");
        return;
    }

    if (!confirm(`Excluir o cartão "${titulo}"?`)) {
        return;
    }

    await remove(ref(database, `${PATHS.cartoes}/${id}`));
    if (state.selectedCardId === id) {
        clearCartaoForm();
    }
    if (state.selectedFaturaCardId === id) {
        clearFaturaSelection();
    }
}

async function saveFatura() {
    if (!state.selectedFaturaCardId) {
        alert("Selecione um cartão na tabela de faturas.");
        return;
    }

    const cartao = state.cartoes.find((item) => item.id === state.selectedFaturaCardId);
    if (!cartao) {
        return;
    }

    const competencia = state.viewMonthKey || getCurrentMonthKey();
    const summary = buildCardMonthSummary(cartao, competencia);
    const valorPago = Number(elements.faturaValorPago?.value || 0);
    let jurosValor = Number(elements.faturaJurosValor?.value || 0);
    let jurosPerc = Number(elements.faturaJurosPerc?.value || 0);

    if (valorPago < 0) {
        alert("Informe um valor pago válido.");
        elements.faturaValorPago.focus();
        return;
    }

    const saldoNaoPago = roundMoney(Math.max(Number(summary.totalFatura || 0) - valorPago, 0));
    if (saldoNaoPago <= 0) {
        jurosValor = 0;
        jurosPerc = 0;
    } else if (jurosPerc > 0 && !jurosValor) {
        jurosValor = roundMoney((saldoNaoPago * jurosPerc) / 100);
    } else if (jurosValor > 0 && !jurosPerc) {
        jurosPerc = roundMoney((jurosValor / saldoNaoPago) * 100);
    }

    const status = valorPago > 0 ? "paga" : (cartao.faturas?.[competencia]?.status || "pendente");
    const updates = {
        valor_pago: valorPago,
        juros_valor: jurosValor,
        juros_perc: jurosPerc,
        status,
        atualizado_em: new Date().toISOString()
    };

    if (status === "paga") {
        updates.pago_em = new Date().toISOString();
    }

    await Promise.all([
        update(ref(database, `${PATHS.cartoes}/${cartao.id}/faturas/${competencia}`), updates),
        status === "paga"
            ? remove(ref(database, `${PATHS.abertasAtrasadas}/${cartao.id}/${competencia.replace("-", "")}_cartao`))
            : Promise.resolve()
    ]);

    state.selectedFaturaCardId = cartao.id;
}

async function marcarCartaoFeito(cartaoId) {
    const cartao = state.cartoes.find((item) => item.id === cartaoId);
    if (!cartao) {
        return;
    }

    const competencia = state.viewMonthKey || getCurrentMonthKey();
    if (!confirm(`Marcar a fatura de "${buildCartaoLabel(cartao)}" em ${formatMonthKeyLabel(competencia)} como feita?`)) {
        return;
    }

    await update(ref(database, `${PATHS.cartoes}/${cartao.id}/faturas/${competencia}`), {
        status: "feito",
        feito_em: new Date().toISOString(),
        atualizado_em: new Date().toISOString()
    });
}

async function abandonarCartaoFatura(cartaoId) {
    const cartao = state.cartoes.find((item) => item.id === cartaoId);
    if (!cartao) {
        return;
    }

    const competencia = state.viewMonthKey || getCurrentMonthKey();
    const summary = buildCardMonthSummary(cartao, competencia);
    const message = [
        `Abandonar a fatura de "${buildCartaoLabel(cartao)}" em ${formatMonthKeyLabel(competencia)}?`,
        "Ela vai sair das tabelas dos meses seguintes e ficará apenas na página dos atrasados, levando os lançamentos futuros para consulta."
    ].join("\n\n");
    if (!confirm(message)) {
        return;
    }

    const atrasoId = `${competencia.replace("-", "")}_cartao`;
    const futureLaunches = buildCardFutureLaunchesSnapshot(cartao, competencia);
    const atrasoPayload = {
        conta_id: cartao.id,
        conta_path: PATHS.cartoes,
        origem: "cartao_abandonado",
        titulo: buildCartaoLabel(cartao),
        mes_referencia: competencia,
        parcela_numero: "",
        prazo: `Fatura ${formatMonthKeyLabel(competencia)}`,
        data_vencida: buildCardInvoiceDueDate(cartao, competencia),
        valor_mensal: Number(summary.totalFatura || 0),
        juros_valor: Number(summary.jurosValor || 0),
        juros_perc: Number(summary.jurosPerc || 0),
        valor_pago_total: Number(summary.valorPago || 0),
        status: "atrasada",
        pago_data: "",
        pago_por: "",
        link_conta: "",
        observacao: `Cartão abandonado em ${formatMonthKeyLabel(competencia)}. Lançamentos futuros anexados para consulta.`,
        lancamentos: summary.lancamentos,
        lancamentos_futuros: futureLaunches,
        criado_em: new Date().toISOString()
    };

    await Promise.all([
        set(ref(database, `${PATHS.abertasAtrasadas}/${cartao.id}/${atrasoId}`), atrasoPayload),
        update(ref(database, `${PATHS.cartoes}/${cartao.id}/faturas/${competencia}`), {
            status: "abandonada",
            abandonada_em: new Date().toISOString(),
            valor_pago: Number(summary.valorPago || 0),
            juros_valor: Number(summary.jurosValor || 0),
            juros_perc: Number(summary.jurosPerc || 0),
            atualizado_em: new Date().toISOString()
        })
    ]);
}

async function marcarContaAtrasada(conta, monthOverride = "", options = {}) {
    const monthKey = monthOverride || state.viewMonthKey || getCurrentMonthKey();
    const shouldConfirm = options.confirmAction ?? true;
    if (shouldConfirm && !confirm(`Marcar "${conta.titulo}" como atrasada em ${formatMonthKeyLabel(monthKey)}?`)) {
        return;
    }

    const monthlyView = getMonthlyView(conta, monthKey);
    const vencidaData = getContaDueDateValue(conta, monthKey);
    const monthlyData = getMonthlyContaData(conta, monthKey);
    const parcelaNumber = getContaInstallmentNumber(conta, monthKey);
    const atrasoId = monthKey.replace("-", "");
    const atrasoPayload = {
        conta_id: conta.id,
        conta_path: conta.path,
        titulo: conta.titulo || "",
        mes_referencia: monthKey,
        parcela_numero: parcelaNumber || "",
        prazo: monthlyView?.prazoText || "",
        data_vencida: vencidaData,
        valor_mensal: Number(monthlyData.valor_mensal || 0),
        juros_valor: "",
        juros_perc: "",
        status: "atrasada",
        pago_data: "",
        pago_por: "",
        link_conta: monthlyData.link_conta || "",
        observacao: "",
        criado_em: new Date().toISOString()
    };

    const contaUpdates = {
        [`status_mensal/${monthKey}`]: {
            ...(conta.status_mensal?.[monthKey] || {}),
            status: "atrasada",
            marcado_em: new Date().toISOString()
        },
        atualizado_em: new Date().toISOString()
    };

    if (parcelaNumber) {
        contaUpdates[`parcelas/${parcelaNumber}/status`] = "atrasada";
        contaUpdates[`parcelas/${parcelaNumber}/atrasada_mes`] = monthKey;
        contaUpdates[`parcelas/${parcelaNumber}/atrasada_em`] = new Date().toISOString();
    }

    await Promise.all([
        set(ref(database, `${PATHS.abertasAtrasadas}/${conta.id}/${atrasoId}`), atrasoPayload),
        update(ref(database, `${conta.path}/${conta.id}`), contaUpdates)
    ]);
}

function getContaDueDateValue(conta, monthKey) {
    if (isContaFixa(conta)) {
        return buildCurrentMonthDueDate(conta.prazo_dia, conta.data_primeira_parcela || conta.data_contrato, monthKey);
    }

    const totalParcelas = Number(conta.parcelado?.total || 0);
    return getCurrentMonthInstallment(conta.data_primeira_parcela || conta.data_contrato, totalParcelas, monthKey)?.vencimento || "";
}

function getContaInstallmentNumber(conta, monthKey) {
    if (isContaFixa(conta)) {
        return null;
    }

    const totalParcelas = Number(conta.parcelado?.total || 0);
    return getCurrentMonthInstallment(conta.data_primeira_parcela || conta.data_contrato, totalParcelas, monthKey)?.numero || null;
}

async function pagarContaAtrasada(atraso, row) {
    const jurosValorRaw = row?.querySelector('[data-late-field="juros_valor"]')?.value ?? atraso.juros_valor;
    const valorPagoTotalRaw = row?.querySelector('[data-late-field="valor_pago_total"]')?.value ?? atraso.valor_pago_total;
    const pagoData = normalizeDateInput(row?.querySelector('[data-late-field="pago_data"]')?.value || atraso.pago_data || "");
    const pagoPor = row?.querySelector('[data-late-field="pago_por"]')?.value || atraso.pago_por || "";
    const linkConta = row?.querySelector('[data-late-field="link_conta"]')?.value?.trim() || atraso.link_conta || "";
    const observacao = row?.querySelector('[data-late-field="observacao"]')?.value?.trim() || atraso.observacao || "";

    if (jurosValorRaw === "" || jurosValorRaw === null || typeof jurosValorRaw === "undefined") {
        alert("Informe o juros valor antes de pagar. Se não houver juros, informe 0.");
        return;
    }

    if (!pagoData) {
        alert("Informe a data paga antes de pagar.");
        return;
    }

    if (!pagoPor) {
        alert("Informe quem pagou antes de pagar.");
        return;
    }

    if (atraso.origem === "cartao_abandonado") {
        await pagarCartaoAtrasado(atraso, {
            jurosValorRaw,
            valorPagoTotalRaw,
            pagoData,
            pagoPor,
            linkConta,
            observacao
        });
        return;
    }

    const conta = state.contas.find((item) => item.id === atraso.conta_id && item.path === atraso.conta_path);
    const monthStatus = conta?.status_mensal?.[atraso.mes_referencia] || {};
    const jurosValor = Number(jurosValorRaw || 0);
    const valorMensal = Number(atraso.valor_mensal || 0);
    const jurosPerc = valorMensal ? Number(((jurosValor / valorMensal) * 100).toFixed(2)) : 0;
    const total = Number((valorMensal + jurosValor).toFixed(2));
    const valorPagoTotal = Number(valorPagoTotalRaw || total);
    const contaUpdates = {
        [`status_mensal/${atraso.mes_referencia}`]: {
            ...monthStatus,
            status: "paga_atrasada",
            pago_data: pagoData,
            pago_por: pagoPor.trim(),
            valor_pago: valorPagoTotal
        },
        pago_data: pagoData,
        pago_por: pagoPor.trim(),
        atualizado_em: new Date().toISOString()
    };

    if (atraso.parcela_numero) {
        contaUpdates[`parcelas/${atraso.parcela_numero}/status`] = "paga";
        contaUpdates[`parcelas/${atraso.parcela_numero}/paga_data`] = pagoData;
        contaUpdates[`parcelas/${atraso.parcela_numero}/paga_mes`] = getMonthKeyFromDateInput(pagoData);
    }

    await Promise.all([
        update(ref(database, `${atraso.conta_path}/${atraso.conta_id}`), contaUpdates),
        update(ref(database, getAtrasadaRefPath(atraso)), {
            status: "paga_atrasada",
            juros_valor: jurosValor,
            juros_perc: jurosPerc,
            total,
            valor_pago_total: valorPagoTotal,
            pago_data: pagoData,
            pago_mes: getMonthKeyFromDateInput(pagoData),
            pago_por: pagoPor,
            link_conta: linkConta,
            observacao,
            quitada_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
        })
    ]);
}

async function devolverContaAtrasadaParaPendente(atraso) {
    if (!atraso?.conta_id || !atraso?.conta_path || !atraso?.mes_referencia) {
        return;
    }

    if (!confirm(`Devolver "${atraso.titulo || "conta"}" de ${formatMonthKeyLabel(atraso.mes_referencia)} para pendente?`)) {
        return;
    }

    if (atraso.origem === "cartao_abandonado") {
        await Promise.all([
            update(ref(database, `${PATHS.cartoes}/${atraso.conta_id}/faturas/${atraso.mes_referencia}`), {
                status: "pendente",
                abandonada_em: null,
                devolvida_para_pendente_em: new Date().toISOString(),
                atualizado_em: new Date().toISOString()
            }),
            remove(ref(database, getAtrasadaRefPath(atraso)))
        ]);
        return;
    }

    const conta = state.contas.find((item) => item.id === atraso.conta_id && item.path === atraso.conta_path);
    const monthStatus = conta?.status_mensal?.[atraso.mes_referencia] || {};
    const contaUpdates = {
        [`status_mensal/${atraso.mes_referencia}`]: {
            ...monthStatus,
            status: "pendente",
            pago_data: "",
            pago_por: "",
            valor_pago: null,
            devolvida_para_pendente_em: new Date().toISOString()
        },
        pago_data: "",
        pago_por: "",
        atualizado_em: new Date().toISOString()
    };

    if (atraso.parcela_numero) {
        contaUpdates[`parcelas/${atraso.parcela_numero}/status`] = null;
        contaUpdates[`parcelas/${atraso.parcela_numero}/atrasada_mes`] = null;
        contaUpdates[`parcelas/${atraso.parcela_numero}/atrasada_em`] = null;
        contaUpdates[`parcelas/${atraso.parcela_numero}/paga_data`] = null;
        contaUpdates[`parcelas/${atraso.parcela_numero}/paga_mes`] = null;
    }

    await Promise.all([
        update(ref(database, `${atraso.conta_path}/${atraso.conta_id}`), contaUpdates),
        remove(ref(database, getAtrasadaRefPath(atraso)))
    ]);
}

async function pagarCartaoAtrasado(atraso, paymentData) {
    const jurosValor = Number(paymentData.jurosValorRaw || 0);
    const valorMensal = Number(atraso.valor_mensal || 0);
    const jurosPerc = valorMensal ? Number(((jurosValor / valorMensal) * 100).toFixed(2)) : 0;
    const total = Number((valorMensal + jurosValor).toFixed(2));
    const valorPagoTotal = Number(paymentData.valorPagoTotalRaw || total);

    await Promise.all([
        update(ref(database, `${PATHS.cartoes}/${atraso.conta_id}/faturas/${atraso.mes_referencia}`), {
            status: "paga_atrasada",
            valor_pago: valorPagoTotal,
            juros_valor: jurosValor,
            juros_perc: jurosPerc,
            pago_data: paymentData.pagoData,
            pago_por: paymentData.pagoPor,
            atualizado_em: new Date().toISOString()
        }),
        update(ref(database, getAtrasadaRefPath(atraso)), {
            status: "paga_atrasada",
            juros_valor: jurosValor,
            juros_perc: jurosPerc,
            total,
            valor_pago_total: valorPagoTotal,
            pago_data: paymentData.pagoData,
            pago_mes: getMonthKeyFromDateInput(paymentData.pagoData),
            pago_por: paymentData.pagoPor,
            link_conta: paymentData.linkConta,
            observacao: paymentData.observacao,
            quitada_em: new Date().toISOString(),
            atualizado_em: new Date().toISOString()
        })
    ]);
}

function getCartaoFaturaStatus(summary) {
    const savedInvoice = summary.cartao.faturas?.[summary.competencia] || {};
    if (Number(summary.valorPago || 0) > 0) {
        return "paga";
    }

    if (savedInvoice.status === "abandonada") {
        return "atrasada";
    }

    return savedInvoice.status || "pendente";
}

function isCartaoAbandonedFrom(cartao, monthKey) {
    const abandonedMonth = Object.entries(cartao.faturas || {})
        .filter(([, fatura]) => fatura?.status === "abandonada")
        .map(([competencia]) => competencia)
        .filter((competencia) => competencia <= monthKey)
        .sort()
        .pop();

    return Boolean(abandonedMonth);
}

function buildCardInvoiceDueDate(cartao, monthKey) {
    const baseDate = monthKeyToDate(monthKey);
    if (!baseDate) {
        return "";
    }

    const dueDay = clampNumber(cartao?.vencimento_dia, 1, 31, 1);
    const maxDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
    return toDateInputValue(new Date(baseDate.getFullYear(), baseDate.getMonth(), Math.min(dueDay, maxDay), 12, 0, 0));
}

function buildCardFutureLaunchesSnapshot(cartao, fromMonthKey, monthsAhead = 24) {
    const snapshot = {};
    for (let index = 1; index <= monthsAhead; index += 1) {
        const monthKey = addMonthsToMonthKey(fromMonthKey, index);
        if (!monthKey) {
            continue;
        }

        const summary = buildCardMonthSummary(cartao, monthKey);
        if (!summary.lancamentos.length) {
            continue;
        }

        snapshot[monthKey] = summary.lancamentos.map((item) => ({
            id: item.id || "",
            conta_id: item.conta_id || "",
            conta_path: item.conta_path || "",
            titulo: item.titulo || "",
            descricao: item.descricao || "",
            data_compra: item.data_compra || item.vencimento || "",
            valor: Number(item.valor || 0)
        }));
    }

    return snapshot;
}

async function quitarContaParcelada(conta, sourceButton = null) {
    const monthKey = state.viewMonthKey || getCurrentMonthKey();
    const row = sourceButton?.closest("tr");
    const pagoData = normalizeDateInput(row?.querySelector('[data-inline-field="pago_data"]')?.value || conta.status_mensal?.[monthKey]?.pago_data || "");
    const pagoPor = row?.querySelector('[data-inline-field="pago_por"]')?.value || conta.status_mensal?.[monthKey]?.pago_por || "";

    if (!pagoData) {
        alert("Informe a data de pagamento na tabela antes de quitar.");
        row?.querySelector('[data-inline-field="pago_data"]')?.focus();
        return;
    }

    if (!pagoPor) {
        alert("Informe quem pagou na tabela antes de quitar.");
        row?.querySelector('[data-inline-field="pago_por"]')?.focus();
        return;
    }

    if (!confirm(`Quitar "${conta.titulo}" de ${formatMonthKeyLabel(monthKey)} em diante?`)) {
        return;
    }

    const totalParcelas = Number(conta.parcelado?.total || 0);
    const snapshot = getParceladoSnapshot(conta, monthKey);
    const updates = {
        quitada_a_partir_mes: monthKey,
        quitada_em: new Date().toISOString(),
        [`status_mensal/${monthKey}`]: {
            ...(conta.status_mensal?.[monthKey] || {}),
            status: "paga",
            pago_data: pagoData,
            pago_por: pagoPor
        },
        pago_data: pagoData,
        pago_por: pagoPor,
        atualizado_em: new Date().toISOString()
    };

    if (!isContaFixa(conta)) {
        updates.parcelado = {
            total: totalParcelas,
            pagas: Math.min(Math.max(Number(snapshot.posicao || 0), 0), totalParcelas),
            saldo: 0
        };
        updates[`historico_mensal/${monthKey}`] = {
            ...(conta.historico_mensal?.[monthKey] || {}),
            posicao: snapshot.posicao,
            saldo: 0
        };
        if (snapshot.posicao) {
            updates[`parcelas/${snapshot.posicao}/status`] = "paga";
            updates[`parcelas/${snapshot.posicao}/paga_data`] = pagoData;
            updates[`parcelas/${snapshot.posicao}/paga_mes`] = getMonthKeyFromDateInput(pagoData);
        }
    }

    await update(ref(database, `${conta.path}/${conta.id}`), updates);

    if (state.selectedId === conta.id) {
        clearForm();
    }
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

function buildCardMonthSummary(cartao, competencia, cache = new Map()) {
    const cacheKey = `${cartao.id}:${competencia}`;
    if (cache.has(cacheKey)) {
        return cache.get(cacheKey);
    }

    const previousKey = addMonthsToMonthKey(competencia, -1);
    const previousSummary = previousKey >= "2020-01"
        ? buildCardMonthSummary(cartao, previousKey, cache)
        : null;
    const lancamentos = collectLaunchesForCard(cartao, competencia);
    const savedInvoice = cartao.faturas?.[competencia] || {};
    const saldoAnteriorPendente = previousSummary ? previousSummary.saldoAtual : 0;
    const jurosAnterior = previousSummary && previousSummary.saldoAtual > 0 ? previousSummary.jurosValor : 0;
    const saldoAnterior = roundMoney(saldoAnteriorPendente + jurosAnterior);
    const totalLancamentos = lancamentos.reduce((total, item) => total + Number(item.valor || 0), 0);
    const savedJurosValor = Number(savedInvoice.juros_valor || 0);
    const jurosPerc = Number(savedInvoice.juros_perc || 0);
    const valorPago = Number(savedInvoice.valor_pago || 0);
    const totalFatura = roundMoney(totalLancamentos + saldoAnterior);
    const saldoAtual = roundMoney(Math.max(totalFatura - valorPago, 0));
    const jurosValor = savedJurosValor || (saldoAtual > 0 && jurosPerc > 0 ? roundMoney((saldoAtual * jurosPerc) / 100) : 0);
    const saldoParaProximo = roundMoney(saldoAtual + (saldoAtual > 0 ? jurosValor : 0));

    const summary = {
        cartao,
        competencia,
        lancamentos,
        totalLancamentos,
        saldoAnterior,
        saldoAnteriorPendente,
        jurosAnterior,
        jurosValor,
        jurosPerc,
        valorPago,
        totalAntesJuros: totalFatura,
        totalFatura,
        saldoAtual,
        saldoParaProximo
    };

    cache.set(cacheKey, summary);
    return summary;
}

function collectLaunchesForCard(cartao, competencia) {
    const launches = [];

    state.contas.forEach((conta) => {
        if (conta.pagamento?.metodo !== "cartao" || conta.pagamento?.cartao_id !== cartao.id) {
            return;
        }

        const isFixa = isContaFixa(conta);
        const totalParcelas = Number(conta.parcelado?.total || 0);

        if (!isFixa) {
            if (totalParcelas <= 0 || !(conta.data_primeira_parcela || conta.data_contrato)) {
                return;
            }

            const firstMonth = resolveInvoiceMonthKey(conta.data_primeira_parcela || conta.data_contrato, cartao);
            for (let index = 0; index < totalParcelas; index += 1) {
                const installmentNumber = index + 1;
                const savedInstallment = conta.parcelas?.[installmentNumber] || conta.parcelas?.[String(installmentNumber)] || {};
                const purchaseDate = savedInstallment.data || addMonthsToDateInput(conta.data_primeira_parcela || conta.data_contrato, index);
                const sourceMonthKey = getMonthKeyFromDateInput(purchaseDate);
                const installmentMonthKey = resolveInvoiceMonthKey(purchaseDate, cartao) || addMonthsToMonthKey(firstMonth, index);
                if (installmentMonthKey !== competencia || isContaDeletedInMonth(conta, installmentMonthKey)) {
                    continue;
                }

                launches.push({
                    id: `${conta.id}-${installmentNumber}`,
                    conta_id: conta.id,
                    conta_path: conta.path,
                    installment_number: installmentNumber,
                    source_month_key: sourceMonthKey,
                    data_compra: purchaseDate,
                    titulo: conta.titulo || "Conta",
                    descricao: `Parcela ${installmentNumber}/${totalParcelas}`,
                    vencimento: purchaseDate,
                    observacao: getMonthlyContaData(conta, sourceMonthKey).observacao,
                    valor: Number(getMonthlyContaData(conta, sourceMonthKey).valor_mensal || 0)
                });
            }

            return;
        }

        launches.push(...buildFixedCardLaunches(conta, cartao, competencia, false));
    });

    return launches.sort((a, b) => String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt-BR"));
}

function buildFixedCardLaunches(conta, cartao, competencia, forceInstallmentDescription = false) {
    const launches = [];
    const candidateMonths = [competencia, addMonthsToMonthKey(competencia, -1), addMonthsToMonthKey(competencia, -2)]
        .filter(Boolean);

    candidateMonths.forEach((candidateMonthKey) => {
        if (isContaDeletedInMonth(conta, candidateMonthKey) || isContaDeletedInMonth(conta, competencia) || isBeforeContaFixedStart(conta, candidateMonthKey) || isAfterContaFixedEnd(conta, candidateMonthKey)) {
            return;
        }

        const purchaseDate = conta.dados_mensais?.[candidateMonthKey]?.data_compra || buildRecurringPurchaseDate(conta, candidateMonthKey);
        if (!purchaseDate || resolveInvoiceMonthKey(purchaseDate, cartao) !== competencia) {
            return;
        }

        launches.push({
            id: `${conta.id}-${candidateMonthKey}`,
            conta_id: conta.id,
            conta_path: conta.path,
            source_month_key: candidateMonthKey,
            data_compra: purchaseDate,
            titulo: conta.titulo || "Conta fixa",
            descricao: forceInstallmentDescription
                ? `Lançamento mensal parcelado em ${formatMonthKeyLabel(competencia)}`
                : `Lançamento recorrente de ${formatMonthKeyLabel(candidateMonthKey)}`,
            vencimento: buildCurrentMonthDueDate(conta.prazo_dia, conta.data_primeira_parcela || conta.data_contrato, candidateMonthKey),
            observacao: getMonthlyContaData(conta, candidateMonthKey).observacao,
            valor: Number(getMonthlyContaData(conta, candidateMonthKey).valor_mensal || 0)
        });
    });

    return launches;
}

function buildRecurringPurchaseDate(conta, monthKey) {
    const baseDate = monthKeyToDate(monthKey);
    if (!baseDate) {
        return "";
    }

    const fallback = parseDateOnly(conta.data_primeira_parcela || conta.data_contrato);
    const purchaseDay = Number(conta.prazo_dia || fallback?.getDate() || 1);
    const maxDay = new Date(baseDate.getFullYear(), baseDate.getMonth() + 1, 0).getDate();
    const safeDay = Math.min(Math.max(purchaseDay, 1), maxDay);
    return toDateInputValue(new Date(baseDate.getFullYear(), baseDate.getMonth(), safeDay, 12, 0, 0));
}

function resolveInvoiceMonthKey(dateValue, cartao) {
    const date = parseDateOnly(dateValue);
    if (!date) {
        return "";
    }

    const bestDay = clampNumber(cartao?.melhor_dia_compra, 1, 31, 1);
    const dueDay = clampNumber(cartao?.vencimento_dia, 1, 31, bestDay);
    const invoiceDate = new Date(date.getFullYear(), date.getMonth(), 1, 12, 0, 0);
    if (date.getDate() >= bestDay) {
        invoiceDate.setMonth(invoiceDate.getMonth() + 1);
    }
    if (bestDay > dueDay) {
        invoiceDate.setMonth(invoiceDate.getMonth() + 1);
    }

    return toMonthKey(invoiceDate);
}

function getContaPagamentoText(item) {
    if (item.pagamento?.metodo !== "cartao") {
        return "Direto";
    }

    const card = state.cartoes.find((cartao) => cartao.id === item.pagamento?.cartao_id);
    const cardLabel = card ? buildCartaoLabel(card) : (item.pagamento?.cartao_titulo || "Cartão");
    const modeLabel = item.pagamento?.modo === "parcelado" ? "Parcelado" : "À vista";
    return `${cardLabel} - ${modeLabel}`;
}

function buildCartaoLabel(cartao) {
    return `${cartao.titulo || "Cartão"} ${formatLastFour(cartao.ultimos_digitos)}`.trim();
}

function formatLastFour(value) {
    if (!value) {
        return "";
    }

    return `final ${String(value).slice(-4)}`;
}

function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(Number(value || 0));
}

function formatPercent(value) {
    return `${Number(value || 0).toLocaleString("pt-BR", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 2
    })}%`;
}

function formatFileSize(bytes) {
    const size = Number(bytes || 0);
    if (!size) {
        return "";
    }

    if (size < 1024 * 1024) {
        return `${(size / 1024).toFixed(1)} KB`;
    }

    return `${(size / (1024 * 1024)).toFixed(1)} MB`;
}

function isValidContaAttachment(file) {
    const allowedTypes = ["image/jpeg", "image/png", "image/webp", "application/pdf"];
    return allowedTypes.includes(file.type);
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

function formatDate(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(`${value}T12:00:00`);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleDateString("pt-BR");
}

function formatDateTime(value) {
    if (!value) {
        return "-";
    }

    const date = new Date(value);
    if (Number.isNaN(date.getTime())) {
        return value;
    }

    return date.toLocaleString("pt-BR");
}

function formatDateShort(value) {
    const date = parseDateOnly(value);
    if (!date) {
        return value || "";
    }

    const day = String(date.getDate()).padStart(2, "0");
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const year = String(date.getFullYear()).slice(-2);
    return `${day}/${month}/${year}`;
}

function getMonthlyView(item, monthKey = getCurrentMonthKey()) {
    if (isCartaoResumoRow(item)) {
        const summary = item.fatura_summary || buildCardMonthSummary(item.cartao, monthKey);
        return {
            prazoText: "Fatura",
            parceladoTotalText: "-",
            parceladoPosicaoText: "-",
            parcelasPagasText: "-",
            parceladoSaldoText: "-",
            parcelasText: "Cartão",
            status: item.status_mensal?.[monthKey]?.status || "",
            totalLancamentos: Number(summary.totalLancamentos || 0)
        };
    }

    if (isContaDeletedInMonth(item, monthKey)) {
        return null;
    }

    if (isContaSettledInMonth(item, monthKey)) {
        return null;
    }

    const monthStatus = getContaMonthStatus(item, monthKey);

    if (isContaFixa(item)) {
        if (isBeforeContaFixedStart(item, monthKey) || isAfterContaFixedEnd(item, monthKey)) {
            return null;
        }

        return {
            prazoText: formatDateShort(buildCurrentMonthDueDate(item.prazo_dia, item.data_primeira_parcela || item.data_contrato, monthKey)),
            parceladoTotalText: "-",
            parceladoPosicaoText: "-",
            parcelasPagasText: "-",
            parceladoSaldoText: "-",
            parcelasText: "Fixa",
            status: monthStatus?.status || ""
        };
    }

    const totalParcelas = Number(item.parcelado?.total || 0);
    if (!(item.data_primeira_parcela || item.data_contrato) || totalParcelas <= 0) {
        return null;
    }

    const currentInstallment = getCurrentMonthInstallment(item.data_primeira_parcela || item.data_contrato, totalParcelas, monthKey);
    if (!currentInstallment) {
        return null;
    }

    const snapshot = getParceladoSnapshot(item, monthKey);
    const posicao = snapshot.posicao;
    return {
        prazoText: formatDateShort(currentInstallment.vencimento),
        parceladoTotalText: String(snapshot.total),
        parceladoPosicaoText: String(snapshot.posicao),
        parcelasPagasText: String(snapshot.pagas),
        parceladoSaldoText: String(snapshot.saldo),
        parcelasText: `${currentInstallment.numero}/${totalParcelas} (saldo ${Math.max(totalParcelas - posicao, 0)})`
    };
}

function isBeforeContaFixedStart(item, monthKey) {
    const startMonthKey = item.inicio_mes || getMonthKeyFromDateInput(item.data_primeira_parcela || item.data_contrato);
    return Boolean(startMonthKey && monthKey < startMonthKey);
}

function isAfterContaFixedEnd(item, monthKey) {
    const endMonthKey = item.fim_mes || "";
    return Boolean(endMonthKey && monthKey > endMonthKey);
}

function isContaExcludedInMonth(item, monthKey) {
    return Boolean(item.excluida_a_partir_mes && monthKey >= item.excluida_a_partir_mes);
}

function isContaDeletedInMonth(item, monthKey) {
    return isContaExcludedInMonth(item, monthKey) || getContaMonthStatus(item, monthKey)?.status === "excluida";
}

function isContaSettledInMonth(item, monthKey) {
    return Boolean(item.quitada_a_partir_mes && monthKey >= item.quitada_a_partir_mes);
}

function getCurrentMonthInstallment(dataContrato, totalParcelas, monthKey = getCurrentMonthKey()) {
    const contrato = parseDateOnly(dataContrato);
    const targetMonth = monthKeyToDate(monthKey);
    if (!contrato || !targetMonth) {
        return null;
    }

    const monthDiff = (targetMonth.getFullYear() - contrato.getFullYear()) * 12 + (targetMonth.getMonth() - contrato.getMonth());
    const installmentNumber = monthDiff + 1;

    if (installmentNumber < 1 || installmentNumber > totalParcelas) {
        return null;
    }

    const vencimento = new Date(contrato.getFullYear(), contrato.getMonth() + monthDiff, contrato.getDate(), 12, 0, 0);

    return {
        numero: installmentNumber,
        vencimento: toDateInputValue(vencimento)
    };
}

function buildCurrentMonthDueDate(prazoDia, dataContrato, monthKey = getCurrentMonthKey()) {
    const today = monthKeyToDate(monthKey) || new Date();
    const fallbackDate = parseDateOnly(dataContrato);
    const dueDay = Number(prazoDia || fallbackDate?.getDate() || 1);
    const maxDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const safeDay = Math.min(Math.max(dueDay, 1), maxDay);
    return toDateInputValue(new Date(today.getFullYear(), today.getMonth(), safeDay, 12, 0, 0));
}

function parseDateOnly(value) {
    if (!value) {
        return null;
    }

    const rawValue = String(value).trim();
    const brazilianDate = rawValue.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (brazilianDate) {
        const day = Number(brazilianDate[1]);
        const month = Number(brazilianDate[2]);
        const parsedYear = Number(brazilianDate[3]);
        const year = parsedYear < 100 ? 2000 + parsedYear : parsedYear;
        if (!year || !month || !day) {
            return null;
        }
        const date = new Date(year, month - 1, day, 12, 0, 0);
        return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
    }

    const [year, month, day] = rawValue.split("-").map(Number);
    if (!year || !month || !day) {
        return null;
    }

    const date = new Date(year, month - 1, day, 12, 0, 0);
    return date.getFullYear() === year && date.getMonth() === month - 1 && date.getDate() === day ? date : null;
}

function monthKeyToDate(monthKey) {
    if (!monthKey) {
        return null;
    }

    const [year, month] = String(monthKey).split("-").map(Number);
    if (!year || !month) {
        return null;
    }

    return new Date(year, month - 1, 1, 12, 0, 0);
}

function addMonthsToMonthKey(monthKey, increment) {
    const date = monthKeyToDate(monthKey);
    if (!date) {
        return "";
    }

    date.setMonth(date.getMonth() + increment);
    return toMonthKey(date);
}

function toMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
}

function getCurrentMonthKey() {
    return toMonthKey(new Date());
}

function formatMonthKeyLabel(monthKey) {
    const date = monthKeyToDate(monthKey);
    if (!date) {
        return monthKey;
    }

    return date.toLocaleDateString("pt-BR", {
        month: "long",
        year: "numeric"
    });
}

function formatShortMonthYear(dateInput) {
    const monthKey = getMonthKeyFromDateInput(dateInput);
    const date = monthKeyToDate(monthKey);
    if (!date) {
        return dateInput || "-";
    }

    const month = date.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
    return `${month}/${String(date.getFullYear()).slice(-2)}`;
}

function toDateInputValue(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
}
