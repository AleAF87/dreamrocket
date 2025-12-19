import { db } from "./firebase-config.js";
import { ref, onValue, set, update, remove } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-database.js";

// Variáveis globais
let selectedId = null;
let formChanged = false;
let allWithdrawals = [];

// Elementos DOM
const elements = {
    list: null,
    fields: null,
    saveBtn: null,
    updateBtn: null,
    clearBtn: null,
    monthTotal: null
};

// Inicializar quando o DOM carregar
document.addEventListener('DOMContentLoaded', initRetirada);

async function initRetirada() {
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
        
        // Configurar data atual como padrão
        setCurrentDate();
        
        console.log('Controle de saques inicializado com sucesso!');
    } catch (error) {
        console.error('Erro ao inicializar controle de saques:', error);
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
    elements.list = document.getElementById("withdrawalList");
    elements.fields = document.querySelectorAll("[data-field]");
    elements.saveBtn = document.getElementById("saveBtn");
    elements.updateBtn = document.getElementById("updateBtn");
    elements.clearBtn = document.getElementById("clearBtn");
    elements.monthTotal = document.getElementById("monthTotal");
}

// Configurar data atual
function setCurrentDate() {
    const today = new Date().toISOString().split('T')[0];
    const dateField = document.getElementById("WithdrawalDate");
    if (dateField) {
        dateField.value = today;
    }
}

// Configurar eventos
function setupEventListeners() {
    // Eventos dos campos
    elements.fields.forEach(f => {
        f.addEventListener("input", () => {
            formChanged = true;
        });
    });

    // Botão Limpar Campos
    elements.clearBtn.addEventListener("click", clearForm);

    // Botão Salvar Novo
    elements.saveBtn.addEventListener("click", saveNewWithdrawal);

    // Botão Alterar
    elements.updateBtn.addEventListener("click", updateWithdrawal);

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
    
    // Configura data atual
    setCurrentDate();
    
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
    
    // Muda para modo "Alterar"
    showUpdateMode();
}

// ============================================
// FUNÇÕES DE LISTA
// ============================================

function loadList() {
    const withdrawalsRef = ref(db, "retiradas/");
    onValue(withdrawalsRef, snapshot => {
        allWithdrawals = [];
        const data = snapshot.val();
        
        if (data) {
            // Converter para array
            for (const [id, item] of Object.entries(data)) {
                allWithdrawals.push({ id, ...item });
            }
        }
        
        renderList();
        updateMonthTotal();
    });
}

function renderList() {
    elements.list.innerHTML = "";

    if (allWithdrawals.length === 0) {
        const emptyMsg = document.createElement("li");
        emptyMsg.className = "empty-message";
        emptyMsg.textContent = "Nenhum saque registrado.";
        elements.list.appendChild(emptyMsg);
        return;
    }

    // Ordenar por data mais recente primeiro
    const sortedWithdrawals = [...allWithdrawals].sort((a, b) => {
        const dateA = new Date(a.WithdrawalDate || 0);
        const dateB = new Date(b.WithdrawalDate || 0);
        return dateB - dateA; // Mais recente primeiro
    });

    // ============================================
    // LIMITADOR DE ITENS - AJUSTE AQUI O NÚMERO
    // ============================================
    // Para aumentar o número de itens exibidos, mude o valor abaixo:
    const MAX_ITEMS_TO_SHOW = 10; // ← ALTERE ESTE NÚMERO
    
    // Limitar número de itens exibidos
    const itemsToShow = sortedWithdrawals.slice(0, MAX_ITEMS_TO_SHOW);
    
    // Contador total
    const totalCount = sortedWithdrawals.length;
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
            <div style="text-align: center; padding: 15px; color: #666; font-style: italic;">
                Mostrando ${showingCount} de ${totalCount} saques
            </div>
        `;
        elements.list.appendChild(moreItemsMsg);
    }
}

function createListItem(item) {
    const li = document.createElement("li");
    li.className = "list-item withdrawal-item";
    
    // Formatar data
    const withdrawalDate = item.WithdrawalDate ? 
        new Date(item.WithdrawalDate).toLocaleDateString('pt-BR') : 
        'Sem data';
    
    // Formatar categoria
    const categoryText = getCategoryText(item.Category);
    
    // Formatar método
    const methodText = getMethodText(item.Method);
    
    // Criar conteúdo do item
    const itemContent = document.createElement("div");
    itemContent.className = "item-content";
    const formattedAmount = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(parseFloat(item.Amount || 0));

    itemContent.innerHTML = `
        <div class="item-main">
            <strong>${item.Description || 'Sem descrição'}</strong>
            <span class="withdrawal-amount">${formattedAmount}</span>
        </div>
        <div class="item-details">
            <small>Data: ${withdrawalDate} | Categoria: ${categoryText} | Método: ${methodText}</small>
            ${item.Notes ? `<br><small class="notes-text">Obs: ${item.Notes}</small>` : ''}
        </div>
    `;

    
    // Container para botões de ação
    const actionButtons = document.createElement("div");
    actionButtons.className = "action-buttons";
    
    // Botão para reutilizar dados
    const reuseBtn = document.createElement("button");
    reuseBtn.className = "action-btn reuse-btn";
    reuseBtn.innerHTML = "↻";
    reuseBtn.title = "Reutilizar dados para novo saque";
    reuseBtn.onclick = (e) => {
        e.stopPropagation();
        reuseDataForNew(item);
    };
    
    // Botão para excluir
    const deleteBtn = document.createElement("button");
    deleteBtn.className = "action-btn delete-btn";
    deleteBtn.innerHTML = "🗑";
    deleteBtn.title = "Excluir este saque";
    deleteBtn.onclick = (e) => {
        e.stopPropagation();
        deleteWithdrawal(item.id, item.Description || 'este saque');
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

function getCategoryText(category) {
    const categories = {
        'pessoal': 'Pessoal',
        'empresa': 'Empresa',
        'investimento': 'Investimento',
        'outros': 'Outros'
    };
    return categories[category] || category || 'Não informado';
}

function getMethodText(method) {
    const methods = {
        'pix': 'PIX',
        'ted': 'TED/DOC',
        'dinheiro': 'Dinheiro',
        'cartao': 'Cartão',
        'outro': 'Outro'
    };
    return methods[method] || method || 'Não informado';
}

function reuseDataForNew(item) {
    // Limpa o ID selecionado para criar novo
    selectedId = null;
    
    // Preenche campos, mas limpa alguns
    for (const key in item) {
        if (document.getElementById(key)) {
            // Não copia ID e data (usa data atual)
            if (key !== 'WithdrawalDate') {
                document.getElementById(key).value = item[key] || "";
            }
        }
    }
    
    // Define data atual
    setCurrentDate();
    
    // Atualiza botões (modo "Salvar Novo")
    showSaveMode();
    
    formChanged = true;
}

async function deleteWithdrawal(id, itemName) {
    if (!confirm(`Tem certeza que deseja excluir "${itemName}"?\nEsta ação não pode ser desfeita.`)) {
        return;
    }
    
    try {
        await remove(ref(db, "retiradas/" + id));
        alert("Saque excluído com sucesso!");
        loadList();
    } catch (error) {
        console.error("Erro ao excluir:", error);
        alert("Erro ao excluir saque!");
    }
}

function collectFormData() {
    const obj = {};
    
    elements.fields.forEach(f => {
        // Converte números
        if (f.type === 'number') {
            obj[f.id] = f.value ? parseFloat(f.value) : 0;
        } else {
            obj[f.id] = f.value || "";
        }
    });
    
    return obj;
}

function validateForm() {
    const description = document.getElementById("Description").value;
    const amount = document.getElementById("Amount").value;
    const date = document.getElementById("WithdrawalDate").value;
    
    if (!description || description.trim() === "") {
        alert("Por favor, preencha a descrição do saque!");
        document.getElementById("Description").focus();
        return false;
    }
    
    if (!amount || parseFloat(amount) <= 0) {
        alert("Por favor, preencha um valor válido para o saque!");
        document.getElementById("Amount").focus();
        return false;
    }
    
    if (!date) {
        alert("Por favor, selecione a data do saque!");
        document.getElementById("WithdrawalDate").focus();
        return false;
    }
    
    // Validação: máximo 2 casas decimais
    const amountValue = parseFloat(amount);
    const decimalPart = (amountValue.toString().split('.')[1] || '').length;
    if (decimalPart > 2) {
        alert("O valor deve ter no máximo 2 casas decimais!");
        document.getElementById("Amount").focus();
        return false;
    }
    
    return true;
}

// ============================================
// CÁLCULO DO TOTAL DO MÊS
// ============================================

function updateMonthTotal() {
    if (allWithdrawals.length === 0) {
        elements.monthTotal.textContent = "R$ 0,00";
        return;
    }
    
    const now = new Date();
    const currentMonth = now.getMonth();
    const currentYear = now.getFullYear();
    
    let monthTotal = 0;
    
    allWithdrawals.forEach(item => {
        if (item.WithdrawalDate) {
            const itemDate = new Date(item.WithdrawalDate);
            if (itemDate.getMonth() === currentMonth && itemDate.getFullYear() === currentYear) {
                monthTotal += parseFloat(item.Amount || 0);
            }
        }
    });
    
    // Formatar valor
    elements.monthTotal.textContent = new Intl.NumberFormat('pt-BR', {
        style: 'currency',
        currency: 'BRL'
    }).format(monthTotal);
}

// ============================================
// FUNÇÕES DE CRUD
// ============================================

async function saveNewWithdrawal() {
    if (!validateForm()) return;
    
    const obj = collectFormData();
    
    try {
        const id = generateId();
        await set(ref(db, "retiradas/" + id), obj);
        alert("Saque registrado com sucesso!");
        clearForm();
        loadList();
    } catch (error) {
        console.error("Erro ao salvar:", error);
        alert("Erro ao registrar saque!");
    }
}

async function updateWithdrawal() {
    if (!validateForm()) return;
    if (!selectedId) {
        alert("Nenhum saque selecionado para alterar!");
        return;
    }
    
    const obj = collectFormData();
    
    try {
        await update(ref(db, "retiradas/" + selectedId), obj);
        alert("Saque alterado com sucesso!");
        clearForm();
        loadList();
    } catch (error) {
        console.error("Erro ao alterar:", error);
        alert("Erro ao alterar saque!");
    }
}