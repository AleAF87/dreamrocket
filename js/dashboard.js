import { db, auth } from "./firebase-config.js";
import { ref, onValue, set, update, remove } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Variáveis globais
let selectedId = null;
let formChanged = false;
let allLaunches = [];
let currentSort = 'default';
let currentStatusFilter = 'all';

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

// Inicializar quando o DOM carregar
document.addEventListener('DOMContentLoaded', initDashboard);

async function initDashboard() {
    try {
        // Carregar navbar
        await loadNavbar();
        
        // Inicializar elementos DOM
        initializeElements();
        
        // Configurar eventos
        setupEventListeners();
        
        // Carregar dados
        loadList();
        
        // Mostrar modo inicial
        showSaveMode();
        
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
        expensesInput.value = Math.ceil(expenses * 100) / 100; // Arredonda para cima com 2 decimais
    }
}

function updateProfit() {
    const deposit = parseFloat(document.getElementById("Deposit").value) || 0;
    const expenses = parseFloat(document.getElementById("Expenses").value) || 0;
    document.getElementById("Profit").value = (deposit - expenses).toFixed(2);
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
    
    // Oculta campo Motivo
    const reasonContainer = document.getElementById("reasonContainer");
    if (reasonContainer) {
        reasonContainer.style.display = "none";
    }
    
    // Volta para modo "Salvar Novo"
    showSaveMode();
}

function loadForm(id, item) {
    selectedId = id;
    formChanged = false;

    // Preenche todos os campos
    for (const key in item) {
        if (document.getElementById(key)) {
            document.getElementById(key).value = item[key] || "";
        }
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


    // Renderizar cada item
    filteredLaunches.forEach(item => {
        const li = createListItem(item);
        elements.list.appendChild(li);
    });
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
    const processedDate = item.ProcessedDate ? 
        new Date(item.ProcessedDate).toLocaleDateString('pt-BR') : 
        '<span class="pending-text">PENDENTE</span>';
    
    const requestDate = item.Request ? 
        new Date(item.Request).toLocaleDateString('pt-BR') : 
        'Não informada';
    
    const deliveryDate = item.Delivery ? 
        new Date(item.Delivery).toLocaleDateString('pt-BR') : 
        'Não informada';
    
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
            <br>
            <small>Status: ${getStatusText(item.Status)} | R$ ${parseFloat(item.Deposit || 0).toFixed(2)}</small>
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
    const today = new Date().toISOString().split('T')[0];
    document.getElementById("ProcessedDate").value = today;
    
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
            obj[f.id] = f.value || "";
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
    
    obj.Profit = parseFloat(document.getElementById("Profit").value) || 0;
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
        reasonField.required = true; // Torna obrigatório se quiser
    } else {
        reasonContainer.style.display = "none";
        reasonField.required = false;
        
        // Se não é status "Aguardando", limpa o campo Motivo
        // O campo será removido do Firebase quando salvar
        reasonField.value = "";
    }
}