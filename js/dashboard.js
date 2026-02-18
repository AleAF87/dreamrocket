import { db, auth } from "./firebase-config.js";
import { ref, onValue, set, update, remove } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Variáveis globais
let selectedId = null;
let formChanged = false;
let allLaunches = [];
let currentSort = 'default';
let currentStatusFilter = 'all';
let selectedWorkEntryIndex = null;
let workHistory = [];

// Elementos DOM
const elements = {
    list: null,
    fields: null,
    saveBtn: null,
    updateBtn: null,
    clearBtn: null,
    sortFilter: null,
    statusFilter: null
};

// Elementos de parcelamento
const installmentElements = {
    paymentMethod: null,
    installmentCount: null,
    installmentsTable: null,
    installmentsTableBody: null,
    installmentsTableFooter: null,
    showInstallmentsBtn: null,
    firstInstallmentContainer: null,
    firstInstallmentDate: null
};

// Inicializar quando o DOM carregar
document.addEventListener('DOMContentLoaded', initDashboard);

async function initDashboard() {
    try {
        // Carregar navbar
        await loadNavbar();
        
        // Inicializar elementos DOM
        initializeElements();
        
        // Inicializar elementos de parcelamento
        initializeInstallmentElements();
        
        // Configurar eventos
        setupEventListeners();
        
        // Configurar eventos de parcelamento
        setupInstallmentEventListeners();
        
        // Configurar eventos do histórico
        setupWorkHistoryEventListeners();
        
        // Carregar dados
        loadList();
        
        // Mostrar modo inicial
        showSaveMode();

        // Inicializa total de horas
        updateTotalHoursDisplay();
        
        console.log('Dashboard inicializado com sucesso!');
    } catch (error) {
        console.error('Erro ao inicializar dashboard:', error);
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
    elements.list = document.getElementById("launchList");
    elements.fields = document.querySelectorAll("[data-field]");
    elements.saveBtn = document.getElementById("saveBtn");
    elements.updateBtn = document.getElementById("updateBtn");
    elements.clearBtn = document.getElementById("clearBtn");
    elements.sortFilter = document.getElementById("sortFilter");
    elements.statusFilter = document.getElementById("statusFilter");
    elements.workDate = document.getElementById("workDate");
    elements.workHours = document.getElementById("workHours");
    elements.workDescription = document.getElementById("workDescription");
    elements.addWorkEntryBtn = document.getElementById("addWorkEntryBtn");
    elements.workHistoryList = document.getElementById("workHistoryList");
    elements.workHistoryModal = document.getElementById("workHistoryModal");
    elements.closeModal = document.querySelector(".close-modal");
    elements.modalWorkDate = document.getElementById("modalWorkDate");
    elements.modalWorkHours = document.getElementById("modalWorkHours");
    elements.modalWorkDescription = document.getElementById("modalWorkDescription");
    elements.updateWorkEntryBtn = document.getElementById("updateWorkEntryBtn");
    elements.deleteWorkEntryBtn = document.getElementById("deleteWorkEntryBtn");

}

// Inicializar elementos de parcelamento
function initializeInstallmentElements() {
    installmentElements.paymentMethod = document.getElementById("paymentMethod");
    installmentElements.installmentCount = document.getElementById("installmentCount");
    installmentElements.installmentsTable = document.getElementById("installmentsTable");
    installmentElements.installmentsTableBody = document.getElementById("installmentsTableBody");
    installmentElements.installmentsTableFooter = document.getElementById("installmentsTableFooter");
    installmentElements.showInstallmentsBtn = document.getElementById("showInstallmentsBtn");
    installmentElements.firstInstallmentContainer = document.getElementById("firstInstallmentContainer");
    installmentElements.firstInstallmentDate = document.getElementById("firstInstallmentDate");
}

// Configurar eventos
function setupEventListeners() {
    // Eventos dos filtros
    elements.sortFilter.addEventListener("change", () => {
        currentSort = elements.sortFilter.value;
        renderList();
    });

    elements.statusFilter.addEventListener("change", () => {
        currentStatusFilter = elements.statusFilter.value;
        renderList();
    });

    // Evento para campo Status (controle do campo Motivo)
    const statusField = document.getElementById("Status");
    if (statusField) {
        statusField.addEventListener("change", toggleReasonField);
    }

    // Eventos dos campos
    elements.fields.forEach(f => {
        f.addEventListener("input", () => {
            formChanged = true;
            
            // Verifica se é campo de cálculo
            if (f.id === "Deposit" || f.id === "Expenses" || f.id === "PercExpenses") {
                handleExpensesCalculation();
                updateProfit();
                
                // Se mudou o depósito, recalcula parcelas se houver
                if (f.id === "Deposit") {
                    updateInstallments();
                }
            }
            
            // Se é campo Discount, atualiza apenas o NetProfit
            if (f.id === "Discount") {
                updateNetProfit();
            }
        });
    });

    // Botão Limpar Campos
    elements.clearBtn.addEventListener("click", clearForm);

    // Botão Salvar Novo
    elements.saveBtn.addEventListener("click", saveNewLaunch);

    // Botão Alterar
    elements.updateBtn.addEventListener("click", updateLaunch);

    // Aviso ao sair sem salvar
    window.onbeforeunload = (e) => {
        if (formChanged) {
            e.preventDefault();
            e.returnValue = "Há alterações não salvas. Deseja realmente sair?";
            return "Há alterações não salvas. Deseja realmente sair?";
        }
    };
}

// Configurar eventos de parcelamento
function setupInstallmentEventListeners() {
    // Evento para mudança no método de pagamento
    installmentElements.paymentMethod.addEventListener("change", function() {
        updateInstallments();
    });

    // Evento para mudança no número de parcelas
    installmentElements.installmentCount.addEventListener("change", function() {
        const count = parseInt(this.value);
        
        // Mostra/oculta tabela de parcelas e data da primeira parcela
        if (count > 1) {
            installmentElements.showInstallmentsBtn.style.display = "inline-block";
            installmentElements.firstInstallmentContainer.style.display = "block";
        } else {
            installmentElements.showInstallmentsBtn.style.display = "none";
            installmentElements.installmentsTable.style.display = "none";
            installmentElements.firstInstallmentContainer.style.display = "none";
            installmentElements.installmentsTableFooter.style.display = "none";
        }
        
        // Gera parcelas
        generateInstallments();
    });

    // Evento para data da primeira parcela
    installmentElements.firstInstallmentDate.addEventListener("change", function() {
        generateInstallments();
    });

    // Botão para mostrar/ocultar tabela de parcelas
    installmentElements.showInstallmentsBtn.addEventListener("click", function() {
        const isVisible = installmentElements.installmentsTable.style.display === "table";
        installmentElements.installmentsTable.style.display = isVisible ? "none" : "table";
        installmentElements.installmentsTableFooter.style.display = isVisible ? "none" : "table";
        this.textContent = isVisible ? "Mostrar/Editar Parcelas" : "Ocultar Parcelas";
    });
    
    // Evento para alterações no campo Deposit
    document.getElementById("Deposit").addEventListener("input", function() {
        updateInstallments();
    });
}

// Configurar eventos do histórico de trabalho
function setupWorkHistoryEventListeners() {
    // Botão para adicionar novo lançamento
    elements.addWorkEntryBtn.addEventListener("click", addWorkEntry);
    
    // Fechar modal
    elements.closeModal.addEventListener("click", closeWorkHistoryModal);
    
    // Botões do modal
    elements.updateWorkEntryBtn.addEventListener("click", updateWorkEntry);
    elements.deleteWorkEntryBtn.addEventListener("click", deleteWorkEntry);
    
    // Fechar modal clicando fora
    window.addEventListener("click", function(event) {
        if (event.target === elements.workHistoryModal) {
            closeWorkHistoryModal();
        }
    });
    
    // Validar entrada ao pressionar Enter no campo de descrição
    elements.workDescription.addEventListener("keypress", function(e) {
        if (e.key === "Enter") {
            addWorkEntry();
        }
    });
}

// ============================================
// FUNÇÕES DE PARCELAMENTO
// ============================================

function generateInstallments() {
    const count = parseInt(installmentElements.installmentCount.value);
    const deposit = parseFloat(document.getElementById("Deposit").value) || 0;
    const paymentMethod = installmentElements.paymentMethod.value;
    const firstInstallmentDate = installmentElements.firstInstallmentDate.value;
    
    // Limpa a tabela
    installmentElements.installmentsTableBody.innerHTML = "";
    
    if (count <= 1) {
        installmentElements.installmentsTable.style.display = "none";
        installmentElements.installmentsTableFooter.style.display = "none";
        return;
    }
    
    // Calcula valor base por parcela
    const baseValue = deposit / count;
    let totalInstallment = 0;
    let totalInterest = 0;
    let totalFinal = 0;
    
    // Gera cada parcela
    for (let i = 1; i <= count; i++) {
        const row = document.createElement("tr");
        row.dataset.installmentNumber = i;
        
        // Calcula data da parcela
        let installmentDate = "";
        if (firstInstallmentDate) {
            const date = new Date(firstInstallmentDate);
            date.setMonth(date.getMonth() + (i - 1));
            
            // Formata data manualmente para evitar problema de fuso horário
            const year = date.getFullYear();
            const month = String(date.getMonth() + 1).padStart(2, '0');
            const day = String(date.getDate()).padStart(2, '0');
            installmentDate = `${year}-${month}-${day}`;
        }

        // Calcula juros apenas para cartão com juros
        let interest = 0;
        let finalValue = baseValue;
        
        if (paymentMethod === "cartao_com") {
            const monthlyRate = 0.02; // 2%
            finalValue = baseValue * Math.pow(1 + monthlyRate, i - 1);
            interest = finalValue - baseValue;
        }
        
        // Arredonda valores
        finalValue = Math.round(finalValue * 100) / 100;
        interest = Math.round(interest * 100) / 100;
        
        // Acumula totais
        totalInstallment += baseValue;
        totalInterest += interest;
        totalFinal += finalValue;
        
        row.innerHTML = `
            <td>${i}/${count}</td>
            <td>
                <input type="date" class="installment-date-input" 
                       value="${installmentDate}" 
                       data-installment="${i}">
            </td>
            <td>
                <input type="number" class="installment-value-input" 
                       value="${baseValue.toFixed(2)}" 
                       data-installment="${i}"
                       step="0.01" min="0">
            </td>
            <td>
                <span class="installment-interest-display">R$ ${interest.toFixed(2)}</span>
            </td>
            <td>
                <span class="installment-final-display">R$ ${finalValue.toFixed(2)}</span>
            </td>
            <td>
                <select class="installment-status" data-installment="${i}">
                    <option value="pending">Pendente</option>
                    <option value="paid">Pago</option>
                    <option value="overdue">Atrasado</option>
                    <option value="canceled">Cancelado</option>
                </select>
            </td>
        `;
        
        installmentElements.installmentsTableBody.appendChild(row);
    }
    
    // Atualiza totais
    updateInstallmentsTotal();
    
    // Mostra a tabela
    installmentElements.installmentsTable.style.display = "table";
    installmentElements.installmentsTableFooter.style.display = "table";
    
    // Adiciona eventos para edição manual
    setupInstallmentInputEvents();
}

function updateInstallmentsTotal() {
    const deposit = parseFloat(document.getElementById("Deposit").value) || 0;
    const paymentMethod = installmentElements.paymentMethod.value;
    
    let totalInstallment = 0;
    let totalInterest = 0;
    let totalFinal = 0;
    
    // Calcula totais a partir dos inputs
    document.querySelectorAll('.installment-value-input').forEach((input, index) => {
        const value = parseFloat(input.value) || 0;
        totalInstallment += value;
        
        // Calcula juros
        let interest = 0;
        let finalValue = value;
        
        if (paymentMethod === "cartao_com") {
            const monthlyRate = 0.02; // 2%
            finalValue = value * Math.pow(1 + monthlyRate, index);
            interest = finalValue - value;
        }
        
        totalInterest += interest;
        totalFinal += finalValue;
        
        // Atualiza exibição de juros e valor final
        const row = input.closest('tr');
        if (row) {
            const interestDisplay = row.querySelector('.installment-interest-display');
            const finalDisplay = row.querySelector('.installment-final-display');
            
            if (interestDisplay) interestDisplay.textContent = `R$ ${interest.toFixed(2)}`;
            if (finalDisplay) finalDisplay.textContent = `R$ ${finalValue.toFixed(2)}`;
        }
    });
    
    // Atualiza totais na tabela
    document.getElementById("totalInstallmentValue").textContent = `R$ ${totalInstallment.toFixed(2)}`;
    document.getElementById("totalInterestValue").textContent = `R$ ${totalInterest.toFixed(2)}`;
    document.getElementById("totalFinalValue").textContent = `R$ ${totalFinal.toFixed(2)}`;
    
    // Calcula diferença em relação ao depósito
    const totalInformed = totalInstallment;
    const difference = totalInformed - deposit;
    
    document.getElementById("totalInformedValue").textContent = `R$ ${totalInformed.toFixed(2)}`;
    
    const differenceElement = document.getElementById("totalDifference");
    if (Math.abs(difference) > 0.01) {
        if (difference > 0) {
            differenceElement.innerHTML = `↑ R$ ${Math.abs(difference).toFixed(2)} acima`;
            differenceElement.style.color = "#d32f2f";
        } else {
            differenceElement.innerHTML = `↓ R$ ${Math.abs(difference).toFixed(2)} abaixo`;
            differenceElement.style.color = "#388e3c";
        }
    } else {
        differenceElement.textContent = "✓ Valores conferem";
        differenceElement.style.color = "#388e3c";
    }
}

function setupInstallmentInputEvents() {
    // Eventos para edição de datas
    document.querySelectorAll('.installment-date-input').forEach(input => {
        input.addEventListener('change', function() {
            formChanged = true;
        });
    });
    
    // Eventos para edição de valores
    document.querySelectorAll('.installment-value-input').forEach(input => {
        input.addEventListener('input', function() {
            formChanged = true;
            updateInstallmentsTotal();
        });
    });
    
    // Eventos para status das parcelas
    document.querySelectorAll('.installment-status').forEach(select => {
        select.addEventListener('change', function() {
            formChanged = true;
        });
    });
}

function updateInstallments() {
    // Recalcula parcelas se já existirem
    if (parseInt(installmentElements.installmentCount.value) > 1) {
        generateInstallments();
    }
}

function getInstallmentsData() {
    const count = parseInt(installmentElements.installmentCount.value);
    
    if (count <= 1) {
        return null;
    }
    
    const installments = [];
    const rows = installmentElements.installmentsTableBody.querySelectorAll('tr');
    
    rows.forEach(row => {
        const installmentNumber = parseInt(row.dataset.installmentNumber);
        const dateInput = row.querySelector('.installment-date-input');
        const valueInput = row.querySelector('.installment-value-input');
        const statusSelect = row.querySelector('.installment-status');
        
        const interestText = row.querySelector('.installment-interest-display').textContent;
        const finalText = row.querySelector('.installment-final-display').textContent;
        
        const interestValue = parseFloat(interestText.replace('R$ ', '')) || 0;
        const finalValue = parseFloat(finalText.replace('R$ ', '')) || 0;
        
        installments.push({
            number: installmentNumber,
            dueDate: dateInput ? dateInput.value : '',
            value: valueInput ? parseFloat(valueInput.value) || 0 : 0,
            interest: interestValue,
            finalValue: finalValue,
            status: statusSelect ? statusSelect.value : 'pending'
        });
    });
    
    return {
        paymentMethod: installmentElements.paymentMethod.value,
        installmentCount: count,
        firstInstallmentDate: installmentElements.firstInstallmentDate.value,
        installments: installments,
        totalInstallmentValue: parseFloat(document.getElementById("totalInstallmentValue").textContent.replace('R$ ', '')) || 0,
        totalInterestValue: parseFloat(document.getElementById("totalInterestValue").textContent.replace('R$ ', '')) || 0,
        totalFinalValue: parseFloat(document.getElementById("totalFinalValue").textContent.replace('R$ ', '')) || 0
    };
}

function loadInstallmentsData(installmentData) {
    if (!installmentData) {
        // Configuração padrão
        installmentElements.paymentMethod.value = "pix";
        installmentElements.installmentCount.value = "1";
        installmentElements.showInstallmentsBtn.style.display = "none";
        installmentElements.installmentsTable.style.display = "none";
        installmentElements.firstInstallmentContainer.style.display = "none";
        installmentElements.installmentsTableFooter.style.display = "none";
        return;
    }
    
    // Carrega configuração
    installmentElements.paymentMethod.value = installmentData.paymentMethod || "pix";
    installmentElements.installmentCount.value = String(installmentData.installmentCount || 1);
    installmentElements.firstInstallmentDate.value = installmentData.firstInstallmentDate || "";
    
    // Configura visibilidade
    if (installmentData.installmentCount > 1) {
        installmentElements.showInstallmentsBtn.style.display = "inline-block";
        installmentElements.firstInstallmentContainer.style.display = "block";
        
        // Gera parcelas
        generateInstallments();
        
        // Preenche dados das parcelas
        if (installmentData.installments && installmentData.installments.length > 0) {
            setTimeout(() => {
                installmentData.installments.forEach(installment => {
                    const row = installmentElements.installmentsTableBody.querySelector(
                        `tr[data-installment-number="${installment.number}"]`
                    );
                    
                    if (row) {
                        const dateInput = row.querySelector('.installment-date-input');
                        const valueInput = row.querySelector('.installment-value-input');
                        const statusSelect = row.querySelector('.installment-status');
                        
                        if (dateInput) dateInput.value = installment.dueDate || "";
                        if (valueInput) valueInput.value = installment.value.toFixed(2);
                        if (statusSelect) statusSelect.value = installment.status || "pending";
                    }
                });
                
                // Atualiza totais após carregar valores
                updateInstallmentsTotal();
            }, 100);
        }
    }
}

// ============================================
// FUNÇÕES DE CÁLCULO
// ============================================

function handleExpensesCalculation() {
    const deposit = parseFloat(document.getElementById("Deposit").value) || 0;
    const expensesInput = document.getElementById("Expenses");
    const percExpensesInput = document.getElementById("PercExpenses");
    
    // Se preencher Despesas (R$), calcula %
    if (document.activeElement === expensesInput && expensesInput.value) {
        const expenses = parseFloat(expensesInput.value);
        const percentage = deposit > 0 ? (expenses / deposit * 100) : 0;
        percExpensesInput.value = percentage.toFixed(2);
    }
    
    // Se preencher Despesas (%), calcula R$
    if (document.activeElement === percExpensesInput && percExpensesInput.value) {
        const percentage = parseFloat(percExpensesInput.value);
        const expenses = deposit * (percentage / 100);
        expensesInput.value = Math.ceil(expenses * 100) / 100;
    }
}

function updateProfit() {
    const deposit = parseFloat(document.getElementById("Deposit").value) || 0;
    const expenses = parseFloat(document.getElementById("Expenses").value) || 0;
    const profit = deposit - expenses;
    
    document.getElementById("Profit").value = profit.toFixed(2);
    
    // Atualiza o lucro líquido
    updateNetProfit();
}

function updateNetProfit() {
    const profit = parseFloat(document.getElementById("Profit").value) || 0;
    const discount = parseFloat(document.getElementById("Discount").value) || 0;
    const netProfit = profit - discount;
    
    document.getElementById("NetProfit").value = netProfit.toFixed(2);
    
    // Destacar se o lucro líquido for negativo
    const netProfitField = document.getElementById("NetProfit");
    if (netProfit < 0) {
        netProfitField.style.color = "#e63946";
        netProfitField.style.fontWeight = "bold";
    } else {
        netProfitField.style.color = "";
        netProfitField.style.fontWeight = "";
    }
}

// ============================================
// FUNÇÕES DE FORMULÁRIO
// ============================================

function showSaveMode() {
    elements.saveBtn.style.display = "block";
    elements.updateBtn.style.display = "none";
    elements.clearBtn.style.display = "none";
    elements.saveBtn.textContent = "Salvar Novo";
}

function showUpdateMode() {
    elements.saveBtn.style.display = "none";
    elements.updateBtn.style.display = "block";
    elements.clearBtn.style.display = "block";
}

function clearForm() {
    selectedId = null;
    formChanged = false;
    
    // Limpa todos os campos
    elements.fields.forEach(f => f.value = "");
    document.getElementById("Profit").value = "";
    document.getElementById("NetProfit").value = "";
    
    // Limpa dados de parcelamento
    loadInstallmentsData(null);

    // Limpa histórico de trabalho
    loadWorkHistory([]);
    
    // Oculta campo Motivo
    const reasonContainer = document.getElementById("reasonContainer");
    if (reasonContainer) {
        reasonContainer.style.display = "none";
    }

    // Resetar estilos do NetProfit
    const netProfitField = document.getElementById("NetProfit");
    netProfitField.style.color = "";
    netProfitField.style.fontWeight = "";
    
    // Volta para modo "Salvar Novo"
    showSaveMode();
}

function loadForm(id, item) {
    selectedId = id;
    formChanged = false;

    // Preenche todos os campos
    for (const key in item) {
        const field = document.getElementById(key);
        if (field) {
            // CORREÇÃO: Para datas, mantém a string original sem converter
            if (key === "ProcessedDate" || key === "Request" || key === "Delivery" || key === "firstInstallmentDate") {
                if (item[key]) {
                    // Se já está no formato YYYY-MM-DD, usa diretamente
                    if (typeof item[key] === 'string' && item[key].match(/^\d{4}-\d{2}-\d{2}$/)) {
                        field.value = item[key];
                    } else {
                        // Se for outro formato, usa a string original
                        field.value = item[key];
                    }
                } else {
                    field.value = "";
                }
            } else {
                field.value = item[key] || "";
            }
        }
    }

    // Carrega dados de parcelamento
    if (item.installmentData) {
        loadInstallmentsData(item.installmentData);
    } else {
        loadInstallmentsData(null);
    }

    // Carrega histórico de trabalho
    if (item.workHistory && Array.isArray(item.workHistory)) {
        loadWorkHistory(item.workHistory);
    } else {
        loadWorkHistory([]);
    }

    // Atualiza visibilidade do campo Motivo baseado no status
    toggleReasonField();
    
    // Atualiza cálculos
    handleExpensesCalculation();
    updateProfit();
    
    // Muda para modo "Alterar"
    showUpdateMode();
}

// ============================================
// FUNÇÕES DE LISTA
// ============================================

function loadList() {
    const launchesRef = ref(db, "servicos/");
    onValue(launchesRef, snapshot => {
        allLaunches = [];
        const data = snapshot.val();
        
        if (data) {
            // Converter para array
            for (const [id, item] of Object.entries(data)) {
                allLaunches.push({ id, ...item });
            }
        }
        
        renderList();
    }, {
        onlyOnce: true // Carrega apenas uma vez para melhor performance
    });
}

function renderList() {
    elements.list.innerHTML = "";

    if (allLaunches.length === 0) {
        const emptyMsg = document.createElement("li");
        emptyMsg.className = "empty-message";
        emptyMsg.textContent = "Nenhum lançamento encontrado.";
        elements.list.appendChild(emptyMsg);
        return;
    }

    // Aplicar filtro de status
    let filteredLaunches = allLaunches;
    if (currentStatusFilter !== 'all') {
        filteredLaunches = allLaunches.filter(item => 
            String(item.Status) === currentStatusFilter
        );
    }

    // Ordenar lançamentos
    filteredLaunches.sort((a, b) => {
        switch (currentSort) {
            case 'default': // NOVA OPÇÃO - ORDEM PADRÃO
                // 1º: Status "2" (Em andamento)
                const aIsStatus2 = String(a.Status) === '2';
                const bIsStatus2 = String(b.Status) === '2';
                
                if (aIsStatus2 && !bIsStatus2) return -1; // a vem primeiro
                if (!aIsStatus2 && bIsStatus2) return 1;  // b vem primeiro
                
                // Ambos status 2? Ordena por Request crescente (mais antigo primeiro)
                if (aIsStatus2 && bIsStatus2) {
                    return new Date(a.Request || 0) - new Date(b.Request || 0);
                }
                
                // 2º: ProcessedDate vazio
                const aNoProcessedDate = !a.ProcessedDate || a.ProcessedDate.trim() === '';
                const bNoProcessedDate = !b.ProcessedDate || b.ProcessedDate.trim() === '';
                
                if (aNoProcessedDate && !bNoProcessedDate) return -1; // a vem primeiro
                if (!aNoProcessedDate && bNoProcessedDate) return 1;  // b vem primeiro
                
                // Ambos sem ProcessedDate? Ordena por Request crescente
                if (aNoProcessedDate && bNoProcessedDate) {
                    return new Date(a.Request || 0) - new Date(b.Request || 0);
                }
                
                // 3º: Demais lançamentos por ProcessedDate decrescente (mais recente primeiro)
                return new Date(b.ProcessedDate || 0) - new Date(a.ProcessedDate || 0);
                
            case 'processedDateDesc':
                return new Date(b.ProcessedDate || 0) - new Date(a.ProcessedDate || 0);
            case 'processedDateAsc':
                return new Date(a.ProcessedDate || 0) - new Date(b.ProcessedDate || 0);
            case 'requestDesc':
                return new Date(b.Request || 0) - new Date(a.Request || 0);
            case 'requestAsc':
                return new Date(a.Request || 0) - new Date(b.Request || 0);
            case 'deliveryDesc':
                return new Date(b.Delivery || 0) - new Date(a.Delivery || 0);
            case 'deliveryAsc':
                return new Date(a.Delivery || 0) - new Date(b.Delivery || 0);
            case 'customerAsc':
                return (a.Customer || '').localeCompare(b.Customer || '');
            case 'customerDesc':
                return (b.Customer || '').localeCompare(a.Customer || '');
            default:
                // Fallback para ordenação padrão
                return new Date(b.ProcessedDate || 0) - new Date(a.ProcessedDate || 0);
        }
    });

    // Limitar número de itens exibidos para melhor performance
    const MAX_ITEMS_TO_SHOW = 10;
    const itemsToShow = filteredLaunches.slice(0, MAX_ITEMS_TO_SHOW);
    
    // Contador total
    const totalCount = filteredLaunches.length;
    const showingCount = itemsToShow.length;

    // Renderizar cada item
    itemsToShow.forEach(item => {
        const li = createListItem(item);
        elements.list.appendChild(li);
    });
    
    // Adicionar mensagem se houver mais itens
    if (totalCount > showingCount) {
        const moreItemsMsg = document.createElement("li");
        moreItemsMsg.className = "more-items-message";
        moreItemsMsg.innerHTML = `
            <div>Mostrando ${showingCount} de ${totalCount} lançamentos<br>
            <small>Use os filtros para encontrar outros lançamentos</small></div>
        `;
        elements.list.appendChild(moreItemsMsg);
    }
}

function createListItem(item) {
    const li = document.createElement("li");
    li.className = "list-item";
    
    // Adicionar classe baseada no status
    const status = String(item.Status || '1');
    li.classList.add(`status-${status}`);
    
    // Verificar se está pendente de ProcessedDate
    if (!item.ProcessedDate || item.ProcessedDate.trim() === '') {
        li.classList.add('pending-processed');
    }
    
    // Formatar datas para exibição
    const formatDateForDisplay = (dateString) => {
        if (!dateString) return 'Não informada';
        
        try {
            // Divide a data string "YYYY-MM-DD"
            const [year, month, day] = dateString.split('-').map(Number);
            
            // Formata manualmente para DD/MM/YYYY
            const formattedDay = String(day).padStart(2, '0');
            const formattedMonth = String(month).padStart(2, '0');
            
            return `${formattedDay}/${formattedMonth}/${year}`;
        } catch (e) {
            return dateString;
        }
    };
    
    const processedDate = item.ProcessedDate ? 
        formatDateForDisplay(item.ProcessedDate) : 
        '<span class="pending-text">PENDENTE</span>';
    
    const requestDate = formatDateForDisplay(item.Request);
    const deliveryDate = formatDateForDisplay(item.Delivery);
    
    // Lucro Bruto
    const grossProfit = parseFloat(item.Deposit || 0);
    const netProfit = getNetProfit(item);
    
    // Informações de parcelamento
    let installmentInfo = "";
    if (item.installmentData && item.installmentData.installmentCount > 1) {
        const paidCount = item.installmentData.installments ? 
            item.installmentData.installments.filter(i => i.status === 'paid').length : 0;
        
        // Determina texto do método de pagamento
        let paymentMethodText = "PIX";
        if (item.installmentData.paymentMethod === "cartao_sem") {
            paymentMethodText = "Cartão (s/ juros)";
        } else if (item.installmentData.paymentMethod === "cartao_com") {
            paymentMethodText = "Cartão (c/ juros)";
        }
        
        installmentInfo = `<br><small>${item.installmentData.installmentCount}x ${paymentMethodText} - ${paidCount}/${item.installmentData.installmentCount} pagas</small>`;
    }

    // Criar conteúdo do item
    const itemContent = document.createElement("div");
    itemContent.className = "item-content";
    itemContent.innerHTML = `
        <div class="item-main">
            <strong>${item.Description}</strong>
        </div>
        <div class="item-details">
            <small>${item.Customer || 'Sem cliente'} - ${item.Business || 'Sem empresa'}</small>
            <br>
            <small>Solicitado: ${requestDate} | Entregue: ${deliveryDate} | Pago: ${processedDate}</small>
            ${item.Status === '3' && item.Reason ? `<br><small class="reason-text">Motivo: ${item.Reason}</small>` : ''}
            ${installmentInfo}
            <br>
            <small>Status: ${getStatusText(item.Status)}${item.workHistory && item.workHistory.length > 0 ? 
                `<span class="history-icon" title="Possui histórico de serviços">📋</span>` : 
                '<span class="separator">|</span>'} Bruto: R$ ${grossProfit.toFixed(2)} | Líquido: R$ ${netProfit.toFixed(2)} | 
                <span class="work-hours" style="color: #2196F3; font-weight: bold;">⏱️ ${calculateTotalHoursFromItem(item.workHistory)}</span>
            </small>
        </div>
    `;
    
    // Container para botões de ação
    const actionButtons = document.createElement("div");
    actionButtons.className = "action-buttons";
    
    // Botão para reutilizar dados
    const reuseBtn = document.createElement("button");
    reuseBtn.className = "action-btn reuse-btn";
    reuseBtn.innerHTML = "↻";
    reuseBtn.title = "Reutilizar dados para novo cadastro";
    reuseBtn.onclick = (e) => {
        e.stopPropagation();
        reuseDataForNew(item);
    };
    
    // Botão para excluir
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "action-btn delete-btn";
    deleteBtn.innerHTML = "🗑";
    deleteBtn.title = "Excluir este lançamento";
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteLaunch(item.id, item.Customer || 'este lançamento');
    };
    
    actionButtons.appendChild(reuseBtn);
    actionButtons.appendChild(deleteBtn);
    
    li.appendChild(itemContent);
    li.appendChild(actionButtons);
    
    // Clique para editar
    li.onclick = () => loadForm(item.id, item);
    
    return li;
}

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

// Função auxiliar para calcular horas do item
function calculateTotalHoursFromItem(workHistory) {
    if (!workHistory || workHistory.length === 0) return "0h";
    
    let total = 0;
    workHistory.forEach(entry => {
        total += parseFloat(entry.hours) || 0;
    });
    
    const hours = Math.floor(total);
    const minutes = Math.round((total - hours) * 60);
    
    if (minutes === 0) return `${hours}h`;
    return `${hours}h ${minutes}min`;
}

function generateId() {
    const now = new Date();
    const year = now.getFullYear();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    const hour = String(now.getHours()).padStart(2, "0");
    const minute = String(now.getMinutes()).padStart(2, "0");
    const second = String(now.getSeconds()).padStart(2, "0");
    return `${year}${month}${day}${hour}${minute}${second}`;
}

function getStatusText(statusCode) {
    const statusMap = {
        '1': 'Concluído',
        '2': 'Em andamento',
        '3': 'Aguardando',
        '4': 'Cancelado'
    };
    return statusMap[statusCode] || 'Desconhecido';
}

function reuseDataForNew(item) {
    // Limpa o ID selecionado para criar novo
    selectedId = null;
    
    // Preenche campos, mas limpa alguns
    for (const key in item) {
        if (document.getElementById(key)) {
            // Não copia ID, datas específicas e alguns campos
            if (!['ProcessedDate', 'Request', 'Delivery'].includes(key)) {
                document.getElementById(key).value = item[key] || "";
            }
        }
    }
    
    // Define data atual para ProcessedDate
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    document.getElementById("ProcessedDate").value = `${year}-${month}-${day}`;
    
    // Limpa dados de parcelamento para novo registro
    loadInstallmentsData(null);
    
    // Atualiza botões (modo "Salvar Novo")
    showSaveMode();
    
    // Atualiza cálculos
    handleExpensesCalculation();
    updateProfit();
    formChanged = true;
}

async function deleteLaunch(id, itemName) {
    if (!confirm(`Tem certeza que deseja excluir "${itemName}"?\nEsta ação não pode ser desfeita.`)) {
        return;
    }
    
    try {
        await remove(ref(db, "servicos/" + id));
        alert("Lançamento excluído com sucesso!");
        loadList();
    } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro ao excluir lançamento!");
    }
}

function collectFormData() {
    const obj = {};
    const statusField = document.getElementById("Status");
    const reasonField = document.getElementById("Reason");
    
    // Coletar dados de todos os campos normais
    elements.fields.forEach(f => {
        // Pula o campo Reason - vamos tratá-lo separadamente
        if (f.id === "Reason") return;
        
        // Converte números
        if (f.type === 'number') {
            obj[f.id] = f.value ? parseFloat(f.value) : 0;
        } else {
            // Para datas, salva como string no formato correto
            if (f.type === 'date' && f.value) {
                obj[f.id] = f.value;
            } else {
                obj[f.id] = f.value || "";
            }
        }
    });
    
    // Tratamento ESPECIAL para o campo Reason
    if (statusField.value === "3") {
        // Status é "Aguardando" - inclui o campo Reason
        obj.Reason = reasonField.value || "";
    } else {
        // Status NÃO é "Aguardando" - define Reason como null para REMOVER do Firebase
        obj.Reason = null;
    }
    
    // Lucro Bruto é o Depósito
    const deposit = parseFloat(document.getElementById("Deposit").value) || 0;
    const expenses = parseFloat(document.getElementById("Expenses").value) || 0;
    const profit = deposit - expenses;
    const discount = parseFloat(document.getElementById("Discount").value) || 0;
    const netProfit = profit - discount;
    
    obj.Profit = profit;
    obj.NetProfit = netProfit;
    
    // Adiciona dados de parcelamento
    const installmentData = getInstallmentsData();
    if (installmentData) {
        obj.installmentData = installmentData;
    } else {
        // Remove installmentData se existir anteriormente
        obj.installmentData = null;
    }

    // Adiciona histórico de trabalho ao objeto
    if (workHistory.length > 0) {
        obj.workHistory = workHistory;
    } else {
        // Remove workHistory se existir anteriormente
        obj.workHistory = null;
    }
    
    return obj;
}

function validateForm() {
    const customer = document.getElementById("Customer").value;
    const deposit = document.getElementById("Deposit").value;
    
    if (!customer || customer.trim() === "") {
        alert("Por favor, preencha o campo Cliente!");
        document.getElementById("Customer").focus();
        return false;
    }
    
    if (!deposit || parseFloat(deposit) <= 0) {
        alert("Por favor, preencha um valor de Depósito válido!");
        document.getElementById("Deposit").focus();
        return false;
    }
    
    // Validação para múltiplas parcelas
    if (parseInt(installmentElements.installmentCount.value) > 1) {
        const firstInstallmentDate = installmentElements.firstInstallmentDate.value;
        if (!firstInstallmentDate) {
            alert("Para parcelamento, informe a data da primeira parcela!");
            installmentElements.firstInstallmentDate.focus();
            return false;
        }
    }
    
    return true;
}

// ============================================
// FUNÇÕES DE CRUD
// ============================================

async function saveNewLaunch() {
    if (!validateForm()) return;
    
    const obj = collectFormData();
    
    try {
        const id = generateId();
        await set(ref(db, "servicos/" + id), obj);
        alert("Lançamento salvo com sucesso!");
        clearForm();
        loadList();
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao salvar lançamento!");
    }
}

async function updateLaunch() {
    if (!validateForm()) return;
    if (!selectedId) {
        alert("Nenhum item selecionado para alterar!");
        return;
    }
    
    const obj = collectFormData();
    
    try {
        await update(ref(db, "servicos/" + selectedId), obj);
        alert("Lançamento alterado com sucesso!");
        clearForm();
        loadList();
    } catch (error) {
        console.error("Erro ao alterar:", error);
        alert("Erro ao alterar lançamento!");
    }
}

function toggleReasonField() {
    const statusField = document.getElementById("Status");
    const reasonContainer = document.getElementById("reasonContainer");
    const reasonField = document.getElementById("Reason");
    
    if (statusField.value === "3") { // Status "Aguardando"
        reasonContainer.style.display = "block";
        reasonField.required = true;
    } else {
        reasonContainer.style.display = "none";
        reasonField.required = false;
        
        // Se não é status "Aguardando", limpa o campo Motivo
        reasonField.value = "";
    }
}

function getNetProfit(item) {
    // Se já existe NetProfit no item, usa ele
    if (item.NetProfit !== undefined && item.NetProfit !== null) {
        return parseFloat(item.NetProfit) || 0;
    }
    
    // Se não existe, calcula: Profit - Discount
    const profit = parseFloat(item.Profit || 0);
    const discount = parseFloat(item.Discount || 0);
    return profit - discount;
}

// ============================================
// FUNÇÕES DE HISTÓRICO DE TRABALHO
// ============================================

function addWorkEntry() {
    const date = elements.workDate.value;
    const hours = parseFloat(elements.workHours.value);
    const description = elements.workDescription.value.trim();
    
    // Validação
    if (!date) {
        alert("Informe a data do serviço!");
        elements.workDate.focus();
        return;
    }
    
    if (!hours || hours <= 0) {
        alert("Informe um tempo válido em horas!");
        elements.workHours.focus();
        return;
    }
    
    if (!description) {
        alert("Descreva o serviço realizado!");
        elements.workDescription.focus();
        return;
    }
    
    // CORREÇÃO: Mantém a data exatamente como veio do input (YYYY-MM-DD)
    // Sem criar objeto Date para evitar problemas de fuso
    const formattedDate = date; // Já está no formato YYYY-MM-DD
    
    // Adiciona ao histórico
    workHistory.push({
        date: formattedDate,
        hours: hours,
        description: description
    });
    
    // Atualiza a interface
    renderWorkHistory();
    
    // Limpa os campos
    elements.workDate.value = "";
    elements.workHours.value = "";
    elements.workDescription.value = "";
    
    // Marca o formulário como alterado
    formChanged = true;
    
    // Foca no próximo campo
    elements.workDate.focus();
}

function renderWorkHistory() {
    elements.workHistoryList.innerHTML = "";
    
    if (workHistory.length === 0) {
        const emptyMsg = document.createElement("div");
        emptyMsg.className = "history-item empty";
        emptyMsg.textContent = "Nenhum registro de serviço adicionado.";
        elements.workHistoryList.appendChild(emptyMsg);
    } else {
        // CORREÇÃO: Ordena por data (mais recente primeiro) de forma segura
        workHistory.sort((a, b) => {
            // Compara strings YYYY-MM-DD diretamente
            if (a.date > b.date) return -1;
            if (a.date < b.date) return 1;
            return 0;
        });
        
        // Renderiza cada item
        workHistory.forEach((entry, index) => {
            const itemDiv = document.createElement("div");
            itemDiv.className = "history-item";
            
            // CORREÇÃO: Formata a data CORRETAMENTE sem usar new Date()
            const formattedDate = formatDateForDisplay(entry.date);
            
            // Calcula horas e minutos
            const hours = Math.floor(entry.hours);
            const minutes = Math.round((entry.hours - hours) * 60);
            
            itemDiv.innerHTML = `
                <div class="history-item-info">
                    <span class="history-item-date">${formattedDate}</span>
                    <span class="history-item-hours">${hours}h ${minutes}min</span>
                    <span class="history-item-desc">${entry.description}</span>
                </div>
                <button class="view-history-btn" data-index="${index}" title="Ver detalhes">
                    👁
                </button>
            `;
            
            elements.workHistoryList.appendChild(itemDiv);
        });
    }
    
    // Atualiza o total de horas no cabeçalho
    updateTotalHoursDisplay();
    
    // Adiciona eventos aos botões de visualização
    document.querySelectorAll('.view-history-btn').forEach(btn => {
        btn.addEventListener('click', function(e) {
            e.stopPropagation();
            const index = parseInt(this.dataset.index);
            openWorkHistoryModal(index);
        });
    });
}

function calculateTotalHours(history) {
    if (!history || history.length === 0) return 0;
    
    let total = 0;
    history.forEach(entry => {
        total += parseFloat(entry.hours) || 0;
    });
    return total;
}

function updateTotalHoursDisplay() {
    const total = calculateTotalHours(workHistory);
    
    // Verifica se já existe o elemento de total, se não, cria
    let totalElement = document.getElementById('totalWorkHours');
    if (!totalElement) {
        const historySection = document.querySelector('.work-history-section h4');
        if (historySection) {
            totalElement = document.createElement('span');
            totalElement.id = 'totalWorkHours';
            totalElement.style.cssText = 'margin-left: 15px; color: #2196F3; padding: 3px 10px; border-radius: 20px; font-size: 0.9rem;';
            historySection.appendChild(totalElement);
        }
    }
    
    if (totalElement) {
        const hours = Math.floor(total);
        const minutes = Math.round((total - hours) * 60);
        totalElement.textContent = `Total: ${hours}h ${minutes}min`;
    }
}

function formatDateForDisplay(dateString) {
    if (!dateString) return 'Data não informada';
    
    try {
        // CORREÇÃO: Não usa new Date(), manipula a string diretamente
        // A data está no formato "YYYY-MM-DD"
        const parts = dateString.split('-');
        if (parts.length !== 3) return dateString;
        
        const year = parts[0];
        const month = parts[1];
        const day = parts[2];
        
        // Verifica se os valores são válidos
        if (!year || !month || !day) return dateString;
        
        // Formata manualmente para DD/MM/YYYY
        return `${day}/${month}/${year}`;
    } catch (error) {
        console.error('Erro ao formatar data do histórico:', dateString, error);
        return dateString;
    }
}

function formatDateForStorage(dateString) {
    // CORREÇÃO: Mantém a data exatamente como veio do input (YYYY-MM-DD)
    // Sem criar objeto Date para evitar problemas de fuso
    return dateString; // Já está no formato YYYY-MM-DD
}

function openWorkHistoryModal(index) {
    const entry = workHistory[index];
    
    if (!entry) return;
    
    // CORREÇÃO: Usa a data diretamente, sem conversão
    // A data já está no formato YYYY-MM-DD
    const formattedDate = entry.date;
    
    // Preenche o modal com os dados
    elements.modalWorkDate.value = formattedDate;
    elements.modalWorkHours.value = entry.hours;
    elements.modalWorkDescription.value = entry.description;
    
    // Salva o índice do item sendo editado
    selectedWorkEntryIndex = index;
    
    // Mostra o modal
    elements.workHistoryModal.style.display = "block";
}

function closeWorkHistoryModal() {
    elements.workHistoryModal.style.display = "none";
    selectedWorkEntryIndex = null;
}

function updateWorkEntry() {
    if (selectedWorkEntryIndex === null) return;
    
    const date = elements.modalWorkDate.value;
    const hours = parseFloat(elements.modalWorkHours.value);
    const description = elements.modalWorkDescription.value.trim();
    
    // Validação
    if (!date || !hours || hours <= 0 || !description) {
        alert("Preencha todos os campos corretamente!");
        return;
    }
    
    // CORREÇÃO: Mantém a data exatamente como veio do input
    const formattedDate = date; // Já está no formato YYYY-MM-DD
    
    // Atualiza o histórico
    workHistory[selectedWorkEntryIndex] = {
        date: formattedDate,
        hours: hours,
        description: description
    };
    
    // Atualiza a interface
    renderWorkHistory();
    
    // Marca como alterado
    formChanged = true;
    
    // Fecha o modal
    closeWorkHistoryModal();
}

function deleteWorkEntry() {
    if (selectedWorkEntryIndex === null) return;
    
    if (!confirm("Tem certeza que deseja excluir este registro de serviço?")) {
        return;
    }
    
    // Remove do histórico
    workHistory.splice(selectedWorkEntryIndex, 1);
    
    // Atualiza a interface
    renderWorkHistory();
    
    // Marca como alterado
    formChanged = true;
    
    // Fecha o modal
    closeWorkHistoryModal();
}

// Função para carregar histórico existente
function loadWorkHistory(historyData) {
    workHistory = historyData || [];
    renderWorkHistory();
}