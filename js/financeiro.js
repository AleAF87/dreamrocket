import { db } from "./firebase-config.js";
import { ref, onValue } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Variáveis globais
let allLaunches = [];
let allWithdrawals = [];
let startDate = null;
let endDate = null;

// Elementos DOM
const elements = {
    currentMonthBtn: null,
    lastMonthBtn: null,
    customRangeBtn: null,
    customRangeContainer: null,
    startDate: null,
    endDate: null,
    applyFilterBtn: null,
    periodDisplay: null,
    
    // Cards Financeiros
    totalDeposit: null,
    totalExpenses: null,
    expensesPercentage: null,
    totalProfit: null,
    profitMargin: null,
    totalDiscount: null,
    discountPercentage: null,
    totalNetProfit: null,
    netProfitMargin: null,
    
    // Cards Retiradas
    totalWithdrawals: null,
    withdrawalsCount: null,
    categoryPersonal: null,
    categoryCompany: null,
    categoryInvestment: null,
    methodPix: null,
    methodTransfer: null,
    methodCash: null,
    finalBalance: null,
    balancePercentage: null,
    
    // Status breakdown
    status1Count: null,
    status2Count: null,
    status3Count: null,
    status4Count: null
};

// Inicializar quando o DOM carregar
document.addEventListener('DOMContentLoaded', initFinanceiro);

async function initFinanceiro() {
    try {
        // Carregar navbar
        await loadNavbar();
        
        // Inicializar elementos DOM
        initializeElements();
        
        // Configurar eventos
        setupEventListeners();
        
        // Carregar dados
        loadData();
        
        // Configurar período inicial (mês atual)
        setCurrentMonth();
        
        console.log('Financeiro inicializado com sucesso!');
    } catch (error) {
        console.error('Erro ao inicializar financeiro:', error);
    }
}

// Carregar navbar
async function loadNavbar() {
    try {
        const response = await fetch("components/navbar.html");
        if (!response.ok) throw new Error('Falha ao carregar navbar');
        
        const html = await response.text();
        document.getElementById("navbar").innerHTML = html;
        
        // Inicializar navbar.js
        const navbarModule = await import("./navbar.js");
        navbarModule.default();
    } catch (error) {
        console.error('Erro ao carregar navbar:', error);
    }
}

// Inicializar elementos DOM
function initializeElements() {
    // Botões de filtro
    elements.currentMonthBtn = document.getElementById("currentMonthBtn");
    elements.lastMonthBtn = document.getElementById("lastMonthBtn");
    elements.customRangeBtn = document.getElementById("customRangeBtn");
    elements.customRangeContainer = document.getElementById("customRangeContainer");
    elements.startDate = document.getElementById("startDate");
    elements.endDate = document.getElementById("endDate");
    elements.applyFilterBtn = document.getElementById("applyFilterBtn");
    elements.periodDisplay = document.getElementById("periodDisplay");
    
    // Cards de valores financeiros
    elements.totalDeposit = document.getElementById("totalDeposit");
    elements.totalExpenses = document.getElementById("totalExpenses");
    elements.expensesPercentage = document.getElementById("expensesPercentage");
    elements.totalProfit = document.getElementById("totalProfit");
    elements.profitMargin = document.getElementById("profitMargin");
    elements.totalDiscount = document.getElementById("totalDiscount");
    elements.discountPercentage = document.getElementById("discountPercentage");
    elements.totalNetProfit = document.getElementById("totalNetProfit");
    elements.netProfitMargin = document.getElementById("netProfitMargin");
    
    // Cards de retiradas
    elements.totalWithdrawals = document.getElementById("totalWithdrawals");
    elements.withdrawalsCount = document.getElementById("withdrawalsCount");
    elements.categoryPersonal = document.getElementById("categoryPersonal");
    elements.categoryCompany = document.getElementById("categoryCompany");
    elements.categoryInvestment = document.getElementById("categoryInvestment");
    elements.methodPix = document.getElementById("methodPix");
    elements.methodTransfer = document.getElementById("methodTransfer");
    elements.methodCash = document.getElementById("methodCash");
    elements.finalBalance = document.getElementById("finalBalance");
    elements.balancePercentage = document.getElementById("balancePercentage");
    
    // Status breakdown
    elements.status1Count = document.getElementById("status1Count");
    elements.status2Count = document.getElementById("status2Count");
    elements.status3Count = document.getElementById("status3Count");
    elements.status4Count = document.getElementById("status4Count");
}

// Configurar eventos
function setupEventListeners() {
    // Botões de filtro rápido
    elements.currentMonthBtn.addEventListener("click", () => {
        setActiveButton(elements.currentMonthBtn);
        setCurrentMonth();
        updateSummary();
    });
    
    elements.lastMonthBtn.addEventListener("click", () => {
        setActiveButton(elements.lastMonthBtn);
        setLastMonth();
        updateSummary();
    });
    
    elements.customRangeBtn.addEventListener("click", () => {
        setActiveButton(elements.customRangeBtn);
        elements.customRangeContainer.style.display = "block";
        
        // Preenche com o mês atual por padrão
        const today = new Date();
        const firstDay = new Date(today.getFullYear(), today.getMonth(), 1);
        const lastDay = new Date(today.getFullYear(), today.getMonth() + 1, 0);
        
        elements.startDate.value = formatDateForInput(firstDay);
        elements.endDate.value = formatDateForInput(lastDay);
    });
    
    // Botão aplicar filtro personalizado
    elements.applyFilterBtn.addEventListener("click", () => {
        if (elements.startDate.value && elements.endDate.value) {
            startDate = new Date(elements.startDate.value);
            endDate = new Date(elements.endDate.value);
            
            // Ajusta fim do dia para incluir todo o dia
            endDate.setHours(23, 59, 59, 999);
            
            updatePeriodDisplay();
            updateSummary();
        } else {
            alert("Por favor, selecione ambas as datas.");
        }
    });
}

// Funções de utilidade
function formatDateForInput(date) {
    return date.toISOString().split('T')[0];
}

function formatDateDisplay(date) {
    return date.toLocaleDateString('pt-BR', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric'
    });
}

function formatCurrency(value) {
    return new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(value);
}

function formatPercentage(value) {
    return `${value.toFixed(2)}%`;
}

// Configurar períodos
function setCurrentMonth() {
    const today = new Date();
    startDate = new Date(today.getFullYear(), today.getMonth(), 1);
    endDate = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endDate.setHours(23, 59, 59, 999);
    
    updatePeriodDisplay();
}

function setLastMonth() {
    const today = new Date();
    startDate = new Date(today.getFullYear(), today.getMonth() - 1, 1);
    endDate = new Date(today.getFullYear(), today.getMonth(), 0);
    endDate.setHours(23, 59, 59, 999);
    
    updatePeriodDisplay();
}

function updatePeriodDisplay() {
    const periodText = `${formatDateDisplay(startDate)} até ${formatDateDisplay(endDate)}`;
    elements.periodDisplay.textContent = periodText;
}

function setActiveButton(activeBtn) {
    // Remove classe active de todos os botões
    document.querySelectorAll('.quick-filter-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    
    // Adiciona classe active ao botão clicado
    activeBtn.classList.add('active');
    
    // Oculta filtro personalizado se não for o botão correto
    if (activeBtn !== elements.customRangeBtn) {
        elements.customRangeContainer.style.display = "none";
    }
}

// Carregar dados do Firebase
function loadData() {
    // Carregar lançamentos
    const launchesRef = ref(db, "servicos/");
    onValue(launchesRef, snapshot => {
        allLaunches = [];
        const data = snapshot.val();
        
        if (data) {
            for (const [id, item] of Object.entries(data)) {
                allLaunches.push({ id, ...item });
            }
        }
        
        updateSummary();
    });
    
    // Carregar retiradas
    const withdrawalsRef = ref(db, "retiradas/");
    onValue(withdrawalsRef, snapshot => {
        allWithdrawals = [];
        const data = snapshot.val();
        
        if (data) {
            for (const [id, item] of Object.entries(data)) {
                allWithdrawals.push({ id, ...item });
            }
        }
        
        updateSummary();
    });
}

// ============================================
// CÁLCULO DE RETIRADAS
// ============================================

function calculateWithdrawals() {
    const withdrawalsData = {
        total: 0,
        count: 0,
        categories: {
            pessoal: 0,
            empresa: 0,
            investimento: 0,
            outros: 0
        },
        methods: {
            pix: 0,
            ted: 0,
            dinheiro: 0,
            cartao: 0,
            outro: 0
        }
    };
    
    if (!startDate || !endDate || allWithdrawals.length === 0) {
        return withdrawalsData;
    }
    
    // Filtrar retiradas pelo período (WithdrawalDate)
    const filteredWithdrawals = allWithdrawals.filter(item => {
        if (!item.WithdrawalDate) return false;
        
        const itemDate = new Date(item.WithdrawalDate);
        return itemDate >= startDate && itemDate <= endDate;
    });
    
    // Calcular totais
    filteredWithdrawals.forEach(item => {
        const amount = parseFloat(item.Amount || 0);
        
        withdrawalsData.total += amount;
        withdrawalsData.count++;
        
        // Por categoria
        const category = item.Category || 'outros';
        if (withdrawalsData.categories[category] !== undefined) {
            withdrawalsData.categories[category] += amount;
        } else {
            withdrawalsData.categories.outros += amount;
        }
        
        // Por método
        const method = item.Method || 'outro';
        if (withdrawalsData.methods[method] !== undefined) {
            withdrawalsData.methods[method] += amount;
        } else {
            withdrawalsData.methods.outro += amount;
        }
    });
    
    return withdrawalsData;
}

// Atualizar resumo
function updateSummary() {
    if (!startDate || !endDate) {
        resetSummary();
        return;
    }
    
    let totals = {
        deposit: 0,
        expenses: 0,
        profit: 0,
        discount: 0,
        netProfit: 0,
        validItems: 0,
        statusCounts: { '1': 0, '2': 0, '3': 0, '4': 0 }
    };
    
    // ============================================
    // 1. CÁLCULOS FINANCEIROS (ProcessedDate)
    // ============================================
    
    // Filtrar lançamentos pelo ProcessedDate (pagamentos efetivos)
    const financialLaunches = allLaunches.filter(item => {
        if (!item.ProcessedDate) return false;
        
        const itemDate = new Date(item.ProcessedDate);
        return itemDate >= startDate && itemDate <= endDate;
    });
    
    // Calcular totais financeiros
    financialLaunches.forEach(item => {
        const deposit = parseFloat(item.Deposit || 0);
        const expenses = parseFloat(item.Expenses || 0);
        const discount = parseFloat(item.Discount || 0);
        
        // Calcular valores corretos
        const calculatedProfit = deposit - expenses;
        const calculatedNetProfit = calculatedProfit - discount;
        
        totals.deposit += deposit;
        totals.expenses += expenses;
        totals.profit += calculatedProfit;
        totals.discount += discount;
        totals.netProfit += calculatedNetProfit;
        
        totals.validItems++;
    });
    
    // ============================================
    // 2. CONTAGEM DE STATUS (critérios diferentes)
    // ============================================
    
    // Resetar contadores
    totals.statusCounts = { '1': 0, '2': 0, '3': 0, '4': 0 };
    
    allLaunches.forEach(item => {
        const status = String(item.Status || '1');
        const requestDate = item.Request ? new Date(item.Request) : null;
        
        switch (status) {
            case '2': // EM ANDAMENTO
                // TODOS os status 2 (independente de data)
                totals.statusCounts['2']++;
                break;
                
            case '3': // AGUARDANDO
                // TODOS os status 3 (independente de data)
                totals.statusCounts['3']++;
                break;
                
            case '1': // CONCLUÍDO
                // Apenas se Request estiver no período
                if (requestDate && requestDate >= startDate && requestDate <= endDate) {
                    totals.statusCounts['1']++;
                }
                break;
                
            case '4': // CANCELADO
                // Apenas se Request estiver no período
                if (requestDate && requestDate >= startDate && requestDate <= endDate) {
                    totals.statusCounts['4']++;
                }
                break;
        }
    });
    
    // ============================================
    // 3. CÁLCULO DE RETIRADAS
    // ============================================
    
    const withdrawalsData = calculateWithdrawals();
    
    // Calcular saldo final
    const finalBalance = totals.netProfit - withdrawalsData.total;
    const balancePercentage = totals.netProfit > 0 ? 
        (withdrawalsData.total / totals.netProfit * 100) : 0;
    
    // Log para debug
    console.log('Resumo financeiro (ProcessedDate):', {
        periodo: `${formatDateDisplay(startDate)} - ${formatDateDisplay(endDate)}`,
        itensComPagamento: financialLaunches.length,
        deposit: totals.deposit,
        expenses: totals.expenses,
        profit: totals.profit,
        netProfit: totals.netProfit,
        retiradas: withdrawalsData.total,
        saldoFinal: finalBalance
    });
    
    console.log('Contagem de status:', {
        emAndamento: totals.statusCounts['2'],
        aguardando: totals.statusCounts['3'],
        concluido: totals.statusCounts['1'],
        cancelado: totals.statusCounts['4']
    });
    
    // Calcular percentuais
    const expensesPercentage = totals.deposit > 0 ? 
        (totals.expenses / totals.deposit * 100) : 0;
    
    const profitMargin = totals.deposit > 0 ? 
        (totals.profit / totals.deposit * 100) : 0;
    
    const discountPercentage = totals.profit > 0 ? 
        (totals.discount / totals.profit * 100) : 0;
    
    const netProfitMargin = totals.deposit > 0 ? 
        (totals.netProfit / totals.deposit * 100) : 0;
    
    // Atualizar UI
    updateUI(totals, expensesPercentage, profitMargin, discountPercentage, 
             netProfitMargin, withdrawalsData, finalBalance, balancePercentage);
}

// Atualizar interface
function updateUI(totals, expensesPerc, profitMargin, discountPerc, 
                  netProfitMargin, withdrawalsData, finalBalance, balancePercentage) {
    
    // Valores financeiros
    elements.totalDeposit.textContent = formatCurrency(totals.deposit);
    elements.totalExpenses.textContent = formatCurrency(totals.expenses);
    elements.totalProfit.textContent = formatCurrency(totals.profit);
    elements.totalDiscount.textContent = formatCurrency(totals.discount);
    elements.totalNetProfit.textContent = formatCurrency(totals.netProfit);
    
    // Percentuais financeiros
    elements.expensesPercentage.textContent = `${formatPercentage(expensesPerc)} do total`;
    elements.profitMargin.textContent = `Margem: ${formatPercentage(profitMargin)}`;
    elements.discountPercentage.textContent = `${formatPercentage(discountPerc)} do lucro`;
    elements.netProfitMargin.textContent = `Margem: ${formatPercentage(netProfitMargin)}`;
    
    // Retiradas
    elements.totalWithdrawals.textContent = formatCurrency(withdrawalsData.total);
    elements.withdrawalsCount.textContent = `${withdrawalsData.count} saque${withdrawalsData.count !== 1 ? 's' : ''}`;
    
    // Por categoria
    elements.categoryPersonal.textContent = `Pessoal: ${formatCurrency(withdrawalsData.categories.pessoal)}`;
    elements.categoryCompany.textContent = `Empresa: ${formatCurrency(withdrawalsData.categories.empresa)}`;
    elements.categoryInvestment.textContent = `Investimento: ${formatCurrency(withdrawalsData.categories.investimento)}`;
    
    // Por método
    elements.methodPix.textContent = `PIX: ${formatCurrency(withdrawalsData.methods.pix)}`;
    elements.methodTransfer.textContent = `Transferência: ${formatCurrency(withdrawalsData.methods.ted)}`;
    elements.methodCash.textContent = `Dinheiro: ${formatCurrency(withdrawalsData.methods.dinheiro)}`;
    
    // Saldo final
    elements.finalBalance.textContent = formatCurrency(finalBalance);
    elements.balancePercentage.textContent = `${formatPercentage(balancePercentage)} do lucro`;
    
    // Contagem por status
    elements.status1Count.textContent = totals.statusCounts['1'];
    elements.status2Count.textContent = totals.statusCounts['2'];
    elements.status3Count.textContent = totals.statusCounts['3'];
    elements.status4Count.textContent = totals.statusCounts['4'];
    
    // Aplicar cores baseadas em valores
    applyValueStyles(totals, withdrawalsData, finalBalance);
}

// Aplicar estilos baseados em valores
function applyValueStyles(totals, withdrawalsData, finalBalance) {
    // Lucro líquido negativo fica vermelho
    if (totals.netProfit < 0) {
        elements.totalNetProfit.style.color = "#e63946";
        elements.totalNetProfit.style.fontWeight = "bold";
    } else {
        elements.totalNetProfit.style.color = "";
        elements.totalNetProfit.style.fontWeight = "";
    }
    
    // Saldo final negativo fica vermelho
    if (finalBalance < 0) {
        elements.finalBalance.style.color = "#e63946";
        elements.finalBalance.style.fontWeight = "bold";
    } else {
        elements.finalBalance.style.color = "";
        elements.finalBalance.style.fontWeight = "";
    }
    
    // Despesas altas (>50%) fica em alerta
    const expensesPerc = totals.deposit > 0 ? (totals.expenses / totals.deposit * 100) : 0;
    if (expensesPerc > 50) {
        elements.totalExpenses.style.color = "#e63946";
        elements.expensesPercentage.style.color = "#e63946";
    } else {
        elements.totalExpenses.style.color = "";
        elements.expensesPercentage.style.color = "";
    }
    
    // Retiradas altas (>50% do lucro) alerta
    const withdrawalPercentage = totals.netProfit > 0 ? 
        (withdrawalsData.total / totals.netProfit * 100) : 0;
    
    if (withdrawalPercentage > 50) {
        elements.totalWithdrawals.style.color = "#e63946";
    } else {
        elements.totalWithdrawals.style.color = "";
    }
}

// Resetar resumo
function resetSummary() {
    // Valores financeiros
    elements.totalDeposit.textContent = "R$ 0,00";
    elements.totalExpenses.textContent = "R$ 0,00";
    elements.expensesPercentage.textContent = "0% do total";
    elements.totalProfit.textContent = "R$ 0,00";
    elements.profitMargin.textContent = "Margem: 0%";
    elements.totalDiscount.textContent = "R$ 0,00";
    elements.discountPercentage.textContent = "0% do lucro";
    elements.totalNetProfit.textContent = "R$ 0,00";
    elements.netProfitMargin.textContent = "Margem: 0%";
    
    // Retiradas
    elements.totalWithdrawals.textContent = "R$ 0,00";
    elements.withdrawalsCount.textContent = "0 saques";
    elements.categoryPersonal.textContent = "Pessoal: R$ 0,00";
    elements.categoryCompany.textContent = "Empresa: R$ 0,00";
    elements.categoryInvestment.textContent = "Investimento: R$ 0,00";
    elements.methodPix.textContent = "PIX: R$ 0,00";
    elements.methodTransfer.textContent = "Transferência: R$ 0,00";
    elements.methodCash.textContent = "Dinheiro: R$ 0,00";
    elements.finalBalance.textContent = "R$ 0,00";
    elements.balancePercentage.textContent = "0% do lucro";
    
    // Resetar contagem de status
    elements.status1Count.textContent = "0";
    elements.status2Count.textContent = "0";
    elements.status3Count.textContent = "0";
    elements.status4Count.textContent = "0";
    
    // Resetar estilos
    document.querySelectorAll('.card-value').forEach(el => {
        el.style.color = "";
        el.style.fontWeight = "";
    });
}