import { database } from "./firebase-config.js";
import { ref, onValue, set } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

const SERVICOS_PATH = "servicos";
const RETIRADAS_PATH = "retiradas";
const ENTRADAS_PATH = "contas_casa/entrada";

const state = {
    initialized: false,
    services: [],
    retiradas: [],
    periodStart: "",
    periodEnd: "",
    stopListeners: []
};

const elements = {};

export async function initRetirada() {
    if (state.initialized && elements.tableBody?.isConnected) {
        return;
    }

    state.initialized = true;
    initializeElements();
    setupEventListeners();
    setRetiradaPeriodToCurrentMonth();
    startRealtimeListeners();
}

function initializeElements() {
    elements.openModalBtn = document.getElementById("openRetiradaModalBtn");
    elements.prevMonthBtn = document.getElementById("retiradaPrevMonthBtn");
    elements.nextMonthBtn = document.getElementById("retiradaNextMonthBtn");
    elements.periodoInicio = document.getElementById("retiradaPeriodoInicio");
    elements.periodoFim = document.getElementById("retiradaPeriodoFim");
    elements.periodoLabel = document.getElementById("retiradaPeriodoLabel");
    elements.lucroLiquido = document.getElementById("retiradaLucroLiquido");
    elements.lucroMesAtual = document.getElementById("retiradaLucroMesAtual");
    elements.lucroMesAnterior = document.getElementById("retiradaLucroMesAnterior");
    elements.totalSacado = document.getElementById("retiradaTotalSacado");
    elements.totalSacadoInfo = document.getElementById("retiradaTotalSacadoInfo");
    elements.saldoDisponivel = document.getElementById("retiradaSaldoDisponivel");
    elements.tableBody = document.getElementById("retiradasTableBody");
    elements.modal = document.getElementById("retiradaModal");
    elements.closeModalBtn = document.getElementById("closeRetiradaModalBtn");
    elements.cancelBtn = document.getElementById("cancelRetiradaBtn");
    elements.saveBtn = document.getElementById("saveRetiradaBtn");
    elements.valor = document.getElementById("retiradaValor");
    elements.data = document.getElementById("retiradaData");
    elements.observacao = document.getElementById("retiradaObservacao");
}

function setupEventListeners() {
    elements.openModalBtn?.addEventListener("click", openRetiradaModal);
    elements.prevMonthBtn?.addEventListener("click", () => changeRetiradaPeriodMonth(-1));
    elements.nextMonthBtn?.addEventListener("click", () => changeRetiradaPeriodMonth(1));
    elements.periodoInicio?.addEventListener("change", syncRetiradaPeriodFromInputs);
    elements.periodoFim?.addEventListener("change", syncRetiradaPeriodFromInputs);
    elements.closeModalBtn?.addEventListener("click", closeRetiradaModal);
    elements.cancelBtn?.addEventListener("click", closeRetiradaModal);
    elements.saveBtn?.addEventListener("click", saveRetirada);
    elements.modal?.addEventListener("click", (event) => {
        if (event.target === elements.modal) {
            closeRetiradaModal();
        }
    });
}

function startRealtimeListeners() {
    state.stopListeners.forEach((stop) => typeof stop === "function" && stop());
    state.stopListeners = [];

    const stopServices = onValue(ref(database, SERVICOS_PATH), (snapshot) => {
        const data = snapshot.val();
        state.services = data
            ? Object.entries(data).map(([id, value]) => ({ id, ...value }))
            : [];
        renderRetiradaPage();
    });

    const stopRetiradas = onValue(ref(database, RETIRADAS_PATH), (snapshot) => {
        const data = snapshot.val();
        state.retiradas = data
            ? Object.entries(data).map(([id, value]) => ({ id, ...value }))
            : [];
        renderRetiradaPage();
    });

    state.stopListeners.push(stopServices, stopRetiradas);
}

function renderRetiradaPage() {
    const periodRange = getSelectedRetiradaRange();
    const retiradas = getRetiradasInPeriod(periodRange.startDate, periodRange.endDate);
    const overallTotals = calculateFinancialTotals();
    const allWithdrawals = getRetiradasInPeriod();
    const totalSacado = roundMoney(allWithdrawals.reduce((total, item) => total + Number(item.Amount || item.valor || 0), 0));
    const saldoDisponivel = roundMoney(overallTotals.netProfit - totalSacado);
    const selectedMonthReference = getSelectedMonthReference();
    const selectedMonthNetProfit = selectedMonthReference
        ? calculateNetProfitForMonthKey(selectedMonthReference.monthKey)
        : null;
    const previousMonthNetProfit = selectedMonthReference
        ? calculateNetProfitForMonthKey(addMonthsToMonthKey(selectedMonthReference.monthKey, -1))
        : null;

    if (elements.lucroLiquido) elements.lucroLiquido.textContent = formatCurrency(overallTotals.netProfit);
    if (elements.lucroMesAtual) elements.lucroMesAtual.textContent = selectedMonthNetProfit === null ? "" : formatCurrency(selectedMonthNetProfit);
    if (elements.lucroMesAnterior) elements.lucroMesAnterior.textContent = previousMonthNetProfit === null ? "" : formatCurrency(previousMonthNetProfit);
    if (elements.totalSacado) elements.totalSacado.textContent = formatCurrency(totalSacado);
    if (elements.totalSacadoInfo) {
        elements.totalSacadoInfo.textContent = `Toda a existência • ${allWithdrawals.length} saque${allWithdrawals.length === 1 ? "" : "s"}`;
    }
    if (elements.saldoDisponivel) elements.saldoDisponivel.textContent = formatCurrency(saldoDisponivel);
    if (elements.periodoLabel) {
        elements.periodoLabel.textContent = `${formatDate(state.periodStart)} até ${formatDate(state.periodEnd)}`;
    }

    renderRetiradasTable(retiradas);
}

function renderRetiradasTable(retiradas) {
    if (!elements.tableBody) {
        return;
    }

    elements.tableBody.innerHTML = "";
    if (!retiradas.length) {
        elements.tableBody.innerHTML = `
            <tr>
                <td colspan="5" class="empty-table-row">Nenhum saque lançado no período.</td>
            </tr>
        `;
        return;
    }

    [...retiradas]
        .sort((a, b) => String(b.WithdrawalDate || "").localeCompare(String(a.WithdrawalDate || "")))
        .forEach((retirada) => {
            const tr = document.createElement("tr");
            tr.innerHTML = `
                <td>${formatDate(retirada.WithdrawalDate)}</td>
                <td>${escapeHtmlText(retirada.Description || "Dream Rocket - Alexandre")}</td>
                <td>${formatCurrency(retirada.Amount || retirada.valor || 0)}</td>
                <td>${escapeHtmlText(retirada.Notes || retirada.observacao || "")}</td>
                <td>${retirada.entrada_id ? `<span class="conta-status-badge status-paid">Lançada</span>` : `<span class="conta-status-badge status-pending">Sem vínculo</span>`}</td>
            `;
            elements.tableBody.appendChild(tr);
        });
}

function getRetiradasInPeriod(startDate = null, endDate = null) {
    const hasRange = startDate && endDate;
    const rangeEnd = hasRange ? new Date(endDate.getTime()) : null;
    if (rangeEnd) {
        rangeEnd.setHours(23, 59, 59, 999);
    }

    return state.retiradas.filter((item) => {
        const date = parseDateOnly(item.WithdrawalDate || item.data);
        if (!date) {
            return false;
        }
        if (!hasRange) {
            return true;
        }
        return date >= startDate && date <= rangeEnd;
    });
}

function calculateFinancialTotals(startDate = null, endDate = null) {
    const totals = {
        deposit: 0,
        expenses: 0,
        profit: 0,
        discount: 0,
        netProfit: 0
    };

    const hasRange = startDate && endDate;
    const rangeEnd = hasRange ? new Date(endDate.getTime()) : null;
    if (rangeEnd) {
        rangeEnd.setHours(23, 59, 59, 999);
    }

    state.services.forEach((item) => {
        if (item.installmentData?.installmentCount > 1 && item.installmentData?.installments) {
            addInstallmentValuesToTotals(item, startDate, rangeEnd, totals);
            return;
        }

        const processedDate = parseDateOnly(item.ProcessedDate);
        if (!processedDate) {
            return;
        }
        if (hasRange && (processedDate < startDate || processedDate > rangeEnd)) {
            return;
        }

        addServiceValuesToTotals(item, totals, 1);
    });

    return roundTotals(totals);
}

function addInstallmentValuesToTotals(item, startDate, endDate, totals) {
    const totalFinalValue = Number(item.installmentData?.totalFinalValue || 0);
    if (!totalFinalValue) {
        return;
    }
    const hasRange = startDate && endDate;

    item.installmentData.installments.forEach((installment) => {
        if (installment.status !== "paid" || !installment.dueDate) {
            return;
        }

        const installmentDate = parseDateOnly(installment.dueDate);
        if (!installmentDate) {
            return;
        }
        if (hasRange && (installmentDate < startDate || installmentDate > endDate)) {
            return;
        }

        const proportion = Number(installment.finalValue || 0) / totalFinalValue;
        addServiceValuesToTotals(item, totals, proportion);
    });
}

function addServiceValuesToTotals(item, totals, proportion) {
    const deposit = Number(item.Deposit || 0);
    const expenses = Number(item.Expenses || 0);
    const discount = Number(item.Discount || 0);
    const profit = deposit - expenses;
    const netProfit = profit - discount;

    totals.deposit += deposit * proportion;
    totals.expenses += expenses * proportion;
    totals.profit += profit * proportion;
    totals.discount += discount * proportion;
    totals.netProfit += netProfit * proportion;
}

function roundTotals(totals) {
    return {
        deposit: roundMoney(totals.deposit),
        expenses: roundMoney(totals.expenses),
        profit: roundMoney(totals.profit),
        discount: roundMoney(totals.discount),
        netProfit: roundMoney(totals.netProfit)
    };
}

function openRetiradaModal() {
    if (elements.valor) elements.valor.value = "";
    if (elements.data) elements.data.value = toDateInputValue(new Date());
    if (elements.observacao) elements.observacao.value = "";
    if (elements.modal) elements.modal.style.display = "flex";
    setTimeout(() => elements.valor?.focus(), 0);
}

function closeRetiradaModal() {
    if (elements.modal) elements.modal.style.display = "none";
}

async function saveRetirada() {
    const amount = roundMoney(Number(elements.valor?.value || 0));
    const date = elements.data?.value || "";
    const observation = elements.observacao?.value.trim() || "";

    if (amount <= 0) {
        alert("Informe um valor válido para o saque.");
        elements.valor?.focus();
        return;
    }

    if (!date) {
        alert("Informe a data do saque.");
        elements.data?.focus();
        return;
    }

    const id = generateId();
    const now = new Date().toISOString();
    const entradaPayload = buildEntradaFromRetirada(id, amount, date, observation, now);
    const retiradaPayload = {
        WithdrawalDate: date,
        Description: "Dream Rocket - Alexandre",
        Amount: amount,
        Category: "pessoal",
        Method: "pix",
        Notes: observation,
        entrada_id: id,
        criado_em: now,
        atualizado_em: now
    };

    await set(ref(database, `${ENTRADAS_PATH}/${id}`), entradaPayload);
    await set(ref(database, `${RETIRADAS_PATH}/${id}`), retiradaPayload);
    closeRetiradaModal();
}

function buildEntradaFromRetirada(id, amount, date, observation, timestamp) {
    return {
        titulo: "Dream Rocket - Alexandre",
        data: date,
        status: "recebido",
        observacao: observation,
        origem: "retirada",
        retirada_id: id,
        itens_acrescimos: {
            "001": {
                titulo: "Recebimentos",
                qtde: 1,
                valor_unitario: amount,
                valor_total: amount,
                observacao: observation
            }
        },
        itens_descontos: {},
        valor_bruto: amount,
        valor_desconto: 0,
        valor_liquido: amount,
        criado_em: timestamp,
        atualizado_em: timestamp
    };
}

function setRetiradaPeriodToCurrentMonth() {
    const today = new Date();
    setRetiradaPeriodByMonth(today.getFullYear(), today.getMonth());
}

function changeRetiradaPeriodMonth(increment) {
    const base = parseDateOnly(state.periodStart) || new Date();
    const target = new Date(base.getFullYear(), base.getMonth() + increment, 1, 12, 0, 0);
    setRetiradaPeriodByMonth(target.getFullYear(), target.getMonth());
}

function setRetiradaPeriodByMonth(year, monthIndex) {
    const start = new Date(year, monthIndex, 1, 12, 0, 0);
    const end = new Date(year, monthIndex + 1, 0, 12, 0, 0);
    state.periodStart = toDateInputValue(start);
    state.periodEnd = toDateInputValue(end);
    syncRetiradaPeriodInputs();
    renderRetiradaPage();
}

function getSelectedRetiradaRange() {
    return {
        startDate: parseDateOnly(state.periodStart),
        endDate: parseDateOnly(state.periodEnd)
    };
}

function getSelectedMonthReference() {
    const startDate = parseDateOnly(state.periodStart);
    const endDate = parseDateOnly(state.periodEnd);
    if (!startDate || !endDate) {
        return null;
    }

    const expectedStart = new Date(startDate.getFullYear(), startDate.getMonth(), 1, 12, 0, 0);
    const expectedEnd = new Date(startDate.getFullYear(), startDate.getMonth() + 1, 0, 12, 0, 0);
    const isSameMonth = startDate.getFullYear() === endDate.getFullYear() && startDate.getMonth() === endDate.getMonth();
    const matchesFullMonth = isSameMonth
        && startDate.getDate() === expectedStart.getDate()
        && endDate.getDate() === expectedEnd.getDate();

    if (!matchesFullMonth) {
        return null;
    }

    return {
        monthKey: toMonthKey(startDate),
        startDate,
        endDate
    };
}

function calculateNetProfitForMonthKey(monthKey) {
    if (!monthKey) {
        return 0;
    }

    const [year, month] = String(monthKey).split("-").map(Number);
    if (!year || !month) {
        return 0;
    }

    const startDate = new Date(year, month - 1, 1, 12, 0, 0);
    const endDate = new Date(year, month, 0, 12, 0, 0);
    const totals = calculateFinancialTotals(startDate, endDate);
    return roundMoney(totals.netProfit);
}

function addMonthsToMonthKey(monthKey, increment) {
    const [year, month] = String(monthKey || "").split("-").map(Number);
    if (!year || !month) {
        return "";
    }

    const date = new Date(year, month - 1, 1, 12, 0, 0);
    date.setMonth(date.getMonth() + increment);
    return toMonthKey(date);
}

function syncRetiradaPeriodFromInputs() {
    state.periodStart = elements.periodoInicio?.value || "";
    state.periodEnd = elements.periodoFim?.value || "";
    renderRetiradaPage();
}

function syncRetiradaPeriodInputs() {
    if (elements.periodoInicio) elements.periodoInicio.value = state.periodStart;
    if (elements.periodoFim) elements.periodoFim.value = state.periodEnd;
}

function parseDateOnly(value) {
    if (!value) {
        return null;
    }

    const match = String(value).match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (match) {
        const [, year, month, day] = match;
        return new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0);
    }

    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
}

function toDateInputValue(date) {
    return [
        date.getFullYear(),
        String(date.getMonth() + 1).padStart(2, "0"),
        String(date.getDate()).padStart(2, "0")
    ].join("-");
}

function toMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}`;
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
    return Number(Number(value || 0).toFixed(2));
}

function formatCurrency(value) {
    return Number(value || 0).toLocaleString("pt-BR", {
        style: "currency",
        currency: "BRL"
    });
}

function formatDate(value) {
    const date = parseDateOnly(value);
    if (!date) {
        return "-";
    }

    return date.toLocaleDateString("pt-BR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric"
    });
}

function escapeHtmlText(value) {
    return String(value ?? "")
        .replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;")
        .replace(/"/g, "&quot;")
        .replace(/'/g, "&#039;");
}

if (!window.location.pathname.includes("app.html")) {
    document.addEventListener("DOMContentLoaded", () => {
        initRetirada();
    });
}
