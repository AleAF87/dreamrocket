import { database } from "./firebase-config.js";
import { ref, onValue, set, update, remove } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const PATHS = {
    abertasFixas: "contas_casa/saida/abertas/fixas",
    abertasParceladas: "contas_casa/saida/abertas/parceladas",
    quitadasFixas: "contas_casa/saida/quitadas/fixas",
    quitadasParceladas: "contas_casa/saida/quitadas/parceladas"
};

const state = {
    selectedId: null,
    selectedPath: null,
    contas: [],
    stopListeners: [],
    initialized: false
};

const elements = {};

export async function initContasCasaSaida() {
    if (state.initialized && elements.tableBody?.isConnected) {
        return;
    }

    state.initialized = true;

    initializeElements();
    setupEventListeners();
    startRealtimeListeners();
    updateParceladoVisibility();
}

function initializeElements() {
    elements.tableBody = document.getElementById("contasCasaTableBody");
    elements.filterAbertas = document.getElementById("filterAbertas");
    elements.filterQuitadas = document.getElementById("filterQuitadas");
    elements.filterFixas = document.getElementById("filterFixas");
    elements.searchContaInput = document.getElementById("searchContaInput");
    elements.tipoConta = document.getElementById("tipoConta");
    elements.titulo = document.getElementById("titulo");
    elements.dataContrato = document.getElementById("dataContrato");
    elements.parceladoTotal = document.getElementById("parceladoTotal");
    elements.parceladoPagas = document.getElementById("parceladoPagas");
    elements.parceladoSaldo = document.getElementById("parceladoSaldo");
    elements.jurosAtrasoValor = document.getElementById("jurosAtrasoValor");
    elements.jurosAtrasoPerc = document.getElementById("jurosAtrasoPerc");
    elements.valorMensal = document.getElementById("valorMensal");
    elements.valorComJuros = document.getElementById("valorComJuros");
    elements.prazoDia = document.getElementById("prazoDia");
    elements.pagoData = document.getElementById("pagoData");
    elements.pagoPor = document.getElementById("pagoPor");
    elements.linkConta = document.getElementById("linkConta");
    elements.quitarJuros = document.getElementById("quitarJuros");
    elements.quitarDesconto = document.getElementById("quitarDesconto");
    elements.observacao = document.getElementById("observacao");
    elements.saveBtn = document.getElementById("saveContaBtn");
    elements.updateBtn = document.getElementById("updateContaBtn");
    elements.clearBtn = document.getElementById("clearContaBtn");
}

function setupEventListeners() {
    [elements.filterAbertas, elements.filterQuitadas, elements.filterFixas].forEach((checkbox) => {
        checkbox?.addEventListener("change", renderTable);
    });

    elements.searchContaInput?.addEventListener("input", renderTable);
    elements.tipoConta?.addEventListener("change", updateParceladoVisibility);
    elements.valorMensal?.addEventListener("input", syncValorComJuros);
    elements.jurosAtrasoValor?.addEventListener("input", syncValorComJuros);
    elements.parceladoTotal?.addEventListener("input", syncParceladoSaldo);
    elements.parceladoPagas?.addEventListener("input", syncParceladoSaldo);
    elements.saveBtn?.addEventListener("click", saveConta);
    elements.updateBtn?.addEventListener("click", updateConta);
    elements.clearBtn?.addEventListener("click", clearForm);
}

function startRealtimeListeners() {
    state.stopListeners.forEach((stop) => typeof stop === "function" && stop());
    state.stopListeners = [];

    Object.entries(PATHS).forEach(([category, path]) => {
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

            renderTable();
        });

        state.stopListeners.push(stop);
    });
}

function getCategoryLabel(category) {
    const labels = {
        abertasFixas: "Fixa aberta",
        abertasParceladas: "Parcelada aberta",
        quitadasFixas: "Fixa quitada",
        quitadasParceladas: "Parcelada quitada"
    };

    return labels[category] || category;
}

function renderTable() {
    if (!elements.tableBody) {
        return;
    }

    const search = (elements.searchContaInput?.value || "").trim().toLowerCase();
    const filtered = state.contas
        .filter((item) => {
            const abertaEnabled = elements.filterAbertas?.checked;
            const quitadaEnabled = elements.filterQuitadas?.checked;
            const fixaEnabled = elements.filterFixas?.checked;

            if ((item.category === "abertasFixas" || item.category === "abertasParceladas") && !abertaEnabled) {
                return false;
            }

            if ((item.category === "quitadasFixas" || item.category === "quitadasParceladas") && !quitadaEnabled) {
                return false;
            }

            if ((item.category === "abertasFixas" || item.category === "quitadasFixas") && !fixaEnabled) {
                return false;
            }

            if (!search) {
                return true;
            }

            return String(item.titulo || "").toLowerCase().includes(search);
        })
        .sort((a, b) => String(a.titulo || "").localeCompare(String(b.titulo || ""), "pt-BR"));

    elements.tableBody.innerHTML = "";

    if (!filtered.length) {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-table-row">Nenhuma conta encontrada.</td>
            </tr>
        `;
        return;
    }

    filtered.forEach((item) => {
        const monthlyView = getMonthlyView(item);
        if (!monthlyView) {
            return;
        }

        const tr = document.createElement("tr");
        const parcelasText = monthlyView.parcelasText;

        const contaLink = item.link_conta
            ? `<a href="${item.link_conta}" target="_blank" rel="noreferrer">Abrir</a>`
            : "-";

        tr.innerHTML = `
            <td>${item.titulo || "-"}</td>
            <td>${getCategoryLabel(item.category)}</td>
            <td>${formatCurrency(item.valor_mensal)}</td>
            <td>${monthlyView.prazoText}</td>
            <td>${parcelasText}</td>
            <td>${formatDate(item.pago_data)}</td>
            <td>${item.pago_por || "-"}</td>
            <td>
                <div class="table-actions">
                    <button class="table-action-btn" data-action="edit" data-id="${item.id}" data-path="${item.path}">Editar</button>
                    ${(item.category === "abertasFixas" || item.category === "abertasParceladas") ? `<button class="table-action-btn success" data-action="quitar" data-id="${item.id}" data-path="${item.path}">Quitar</button>` : ""}
                    <button class="table-action-btn danger" data-action="delete" data-id="${item.id}" data-path="${item.path}">Excluir</button>
                    ${contaLink !== "-" ? contaLink : ""}
                </div>
            </td>
        `;

        tr.querySelectorAll("button[data-action]").forEach((button) => {
            button.addEventListener("click", () => handleTableAction(button.dataset.action, item.id, item.path));
        });

        elements.tableBody.appendChild(tr);
    });

    if (!elements.tableBody.children.length) {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="8" class="empty-table-row">Nenhuma conta encontrada para o mes atual.</td>
            </tr>
        `;
    }
}

function handleTableAction(action, id, path) {
    const conta = state.contas.find((item) => item.id === id && item.path === path);
    if (!conta) {
        return;
    }

    if (action === "edit") {
        fillForm(conta);
        return;
    }

    if (action === "delete") {
        deleteConta(id, path, conta.titulo);
        return;
    }

    if (action === "quitar") {
        quitarContaParcelada(conta);
    }
}

function fillForm(conta) {
    state.selectedId = conta.id;
    state.selectedPath = conta.path;

    elements.tipoConta.value = (conta.category === "abertasFixas" || conta.category === "quitadasFixas")
        ? "fixa"
        : "parcelada";
    elements.titulo.value = conta.titulo || "";
    elements.dataContrato.value = conta.data_contrato || "";
    elements.parceladoTotal.value = conta.parcelado?.total ?? "";
    elements.parceladoPagas.value = conta.parcelado?.pagas ?? "";
    elements.parceladoSaldo.value = conta.parcelado?.saldo ?? "";
    elements.jurosAtrasoValor.value = conta.juros_atraso_valor ?? "";
    elements.jurosAtrasoPerc.value = conta.juros_atraso_perc ?? "";
    elements.valorMensal.value = conta.valor_mensal ?? "";
    elements.valorComJuros.value = conta.valor_c_juros ?? "";
    elements.prazoDia.value = conta.prazo_dia ?? "";
    elements.pagoData.value = conta.pago_data || "";
    elements.pagoPor.value = conta.pago_por || "";
    elements.linkConta.value = conta.link_conta || "";
    elements.quitarJuros.value = conta.quitar_juros ?? "";
    elements.quitarDesconto.value = conta.quitar_desconto ?? "";
    elements.observacao.value = conta.observacao || "";

    elements.saveBtn.style.display = "none";
    elements.updateBtn.style.display = "block";
    updateParceladoVisibility();
}

function clearForm() {
    state.selectedId = null;
    state.selectedPath = null;

    elements.tipoConta.value = "parcelada";
    elements.titulo.value = "";
    elements.dataContrato.value = "";
    elements.parceladoTotal.value = "";
    elements.parceladoPagas.value = "";
    elements.parceladoSaldo.value = "";
    elements.jurosAtrasoValor.value = "";
    elements.jurosAtrasoPerc.value = "";
    elements.valorMensal.value = "";
    elements.valorComJuros.value = "";
    elements.prazoDia.value = "";
    elements.pagoData.value = "";
    elements.pagoPor.value = "";
    elements.linkConta.value = "";
    elements.quitarJuros.value = "";
    elements.quitarDesconto.value = "";
    elements.observacao.value = "";

    elements.saveBtn.style.display = "block";
    elements.updateBtn.style.display = "none";
    updateParceladoVisibility();
}

function updateParceladoVisibility() {
    const isParcelada = elements.tipoConta?.value === "parcelada";
    ["parceladoTotal", "parceladoPagas", "parceladoSaldo", "quitarJuros", "quitarDesconto"].forEach((id) => {
        const field = document.getElementById(id);
        const wrapper = field?.closest("div");
        if (wrapper) {
            wrapper.style.display = isParcelada ? "flex" : "none";
        }
    });
}

function syncParceladoSaldo() {
    const total = Number(elements.parceladoTotal?.value || 0);
    const pagas = Number(elements.parceladoPagas?.value || 0);
    const saldo = Math.max(total - pagas, 0);
    if (elements.parceladoSaldo) {
        elements.parceladoSaldo.value = saldo || "";
    }
}

function syncValorComJuros() {
    const valorMensal = Number(elements.valorMensal?.value || 0);
    const jurosValor = Number(elements.jurosAtrasoValor?.value || 0);
    if (elements.valorComJuros) {
        elements.valorComJuros.value = (valorMensal + jurosValor).toFixed(2);
    }
}

function validateForm() {
    if (!elements.titulo.value.trim()) {
        alert("Informe o titulo da conta.");
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

    if (elements.tipoConta.value === "parcelada" && !elements.dataContrato.value) {
        alert("Informe a data do contrato para gerar as parcelas mensais.");
        elements.dataContrato.focus();
        return false;
    }

    return true;
}

function buildContaPayload() {
    const payload = {
        titulo: elements.titulo.value.trim(),
        data_contrato: elements.dataContrato.value || "",
        parcelado: {
            total: Number(elements.parceladoTotal.value || 0),
            pagas: Number(elements.parceladoPagas.value || 0),
            saldo: Number(elements.parceladoSaldo.value || 0)
        },
        juros_atraso_valor: Number(elements.jurosAtrasoValor.value || 0),
        juros_atraso_perc: Number(elements.jurosAtrasoPerc.value || 0),
        valor_mensal: Number(elements.valorMensal.value || 0),
        valor_c_juros: Number(elements.valorComJuros.value || 0),
        prazo_dia: Number(elements.prazoDia.value || 0),
        pago_data: elements.pagoData.value || "",
        pago_por: elements.pagoPor.value || "",
        link_conta: elements.linkConta.value.trim(),
        quitar_juros: Number(elements.quitarJuros.value || 0),
        quitar_desconto: Number(elements.quitarDesconto.value || 0),
        observacao: elements.observacao.value.trim(),
        atualizado_em: new Date().toISOString()
    };

    if (elements.tipoConta.value !== "parcelada") {
        payload.parcelado = { total: 0, pagas: 0, saldo: 0 };
        payload.quitar_juros = 0;
        payload.quitar_desconto = 0;
    }

    return payload;
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
    const id = generateId();

    await set(ref(database, `${path}/${id}`), payload);
    clearForm();
}

async function updateConta() {
    if (!state.selectedId || !state.selectedPath) {
        return;
    }

    if (!validateForm()) {
        return;
    }

    const payload = buildContaPayload();
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
    if (!confirm(`Excluir a conta "${titulo}"?`)) {
        return;
    }

    await remove(ref(database, `${path}/${id}`));

    if (state.selectedId === id) {
        clearForm();
    }
}

async function quitarContaParcelada(conta) {
    if (!confirm(`Mover "${conta.titulo}" para quitadas?`)) {
        return;
    }

    const contaQuitada = {
        ...conta
    };
    delete contaQuitada.id;
    delete contaQuitada.path;
    delete contaQuitada.category;

    contaQuitada.parcelado = {
        total: Number(conta.parcelado?.total || 0),
        pagas: Number(conta.parcelado?.total || conta.parcelado?.pagas || 0),
        saldo: 0
    };
    contaQuitada.quitada_em = new Date().toISOString();

    const tipoConta = conta.category === "abertasFixas" ? "fixa" : "parcelada";
    const destinationPath = getDestinationPathByTypeAndStatus(tipoConta, "quitadas");

    await set(ref(database, `${destinationPath}/${conta.id}`), contaQuitada);
    await remove(ref(database, `${conta.path}/${conta.id}`));

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

function formatCurrency(value) {
    return new Intl.NumberFormat("pt-BR", {
        style: "currency",
        currency: "BRL"
    }).format(Number(value || 0));
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

function getMonthlyView(item) {
    if (item.category === "abertasFixas" || item.category === "quitadasFixas") {
        return {
            prazoText: buildCurrentMonthDueDate(item.prazo_dia, item.data_contrato),
            parcelasText: "Fixa"
        };
    }

    const totalParcelas = Number(item.parcelado?.total || 0);
    if (!item.data_contrato || totalParcelas <= 0) {
        return null;
    }

    const currentInstallment = getCurrentMonthInstallment(item.data_contrato, totalParcelas);
    if (!currentInstallment) {
        return null;
    }

    const pagas = Number(item.parcelado?.pagas || 0);
    const isOpenCategory = item.category === "abertasParceladas";
    const isQuitadaCategory = item.category === "quitadasParceladas";

    if (isOpenCategory && currentInstallment.numero <= pagas) {
        return null;
    }

    if (isQuitadaCategory && currentInstallment.numero > pagas) {
        return null;
    }

    return {
        prazoText: formatDate(currentInstallment.vencimento),
        parcelasText: `${currentInstallment.numero}/${totalParcelas} (saldo ${Math.max(totalParcelas - pagas, 0)})`
    };
}

function getCurrentMonthInstallment(dataContrato, totalParcelas) {
    const contrato = parseDateOnly(dataContrato);
    if (!contrato) {
        return null;
    }

    const today = new Date();
    const monthDiff = (today.getFullYear() - contrato.getFullYear()) * 12 + (today.getMonth() - contrato.getMonth());
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

function buildCurrentMonthDueDate(prazoDia, dataContrato) {
    const today = new Date();
    const fallbackDate = parseDateOnly(dataContrato);
    const dueDay = Number(prazoDia || fallbackDate?.getDate() || 1);
    const maxDay = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const safeDay = Math.min(Math.max(dueDay, 1), maxDay);
    const dueDate = new Date(today.getFullYear(), today.getMonth(), safeDay, 12, 0, 0);
    return toDateInputValue(dueDate);
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
