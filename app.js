/* =========================================================
   Biblioteca del Liceo – localStorage (v3 - Bordó + Logo)
   - Búsqueda prioritaria (título/autor/categoría) + filtros
   - Alta de libros
   - Prestar (prestatario, fecha pactada, notas) / Devolver
   - Editar / Eliminar
   - Exportar JSON y CSV, Importar JSON
   - Imprimir inventario
   ========================================================= */

const LS_KEY = "biblioteca_liceo_libros_v3";

const state = {
  books: loadBooks(),
  loanDialog: null,
  editDialog: null,
  loanTargetId: null,
};

function uid() {
  return crypto.randomUUID ? crypto.randomUUID() : String(Date.now() + Math.random());
}

function loadBooks() {
  try {
    const raw = localStorage.getItem(LS_KEY);
    if (!raw) return [];
    const data = JSON.parse(raw);
    return Array.isArray(data) ? data.map(sanitizeBook) : [];
  } catch {
    return [];
  }
}

function saveBooks() {
  localStorage.setItem(LS_KEY, JSON.stringify(state.books));
  render();
}

function sanitizeBook(b) {
  return {
    id: b.id || uid(),
    title: String(b.title || "").trim(),
    author: String(b.author || "").trim(),
    category: String(b.category || "").trim(),
    isLoaned: !!b.isLoaned,
    borrower: String(b.borrower || ""),
    dueDate: b.dueDate ? String(b.dueDate) : "",
    notes: String(b.notes || ""),
    history: Array.isArray(b.history) ? b.history : []
  };
}

// DOM refs
const tbody = document.getElementById("booksTbody");
const emptyState = document.getElementById("emptyState");
const q = document.getElementById("q");
const statusFilter = document.getElementById("statusFilter");
const addBookForm = document.getElementById("addBookForm");
const resetBtn = document.getElementById("resetData");
const exportBtn = document.getElementById("exportJson");
const exportCsvBtn = document.getElementById("exportCsv");
const importInput = document.getElementById("importJson");
const clearAllBtn = document.getElementById("clearAll");
const printBtn = document.getElementById("printBtn");

// Loan dialog
state.loanDialog = document.getElementById("loanDialog");
const loanBookTitle = document.getElementById("loanBookTitle");
const borrowerInput = document.getElementById("borrower");
const notesInput = document.getElementById("notes");
const dueInput = document.getElementById("dueDate");
const confirmLoanBtn = document.getElementById("confirmLoan");

// Edit dialog
state.editDialog = document.getElementById("editDialog");
const editId = document.getElementById("editId");
const editTitle = document.getElementById("editTitle");
const editAuthor = document.getElementById("editAuthor");
const editCategory = document.getElementById("editCategory");
const confirmEditBtn = document.getElementById("confirmEdit");

// Render
function render() {
  const rows = filteredBooks();
  tbody.innerHTML = "";
  if (rows.length === 0) {
    emptyState.hidden = false;
    return;
  }
  emptyState.hidden = true;

  rows.forEach(b => {
    const tr = document.createElement("tr");

    const tdTitle = document.createElement("td");
    tdTitle.textContent = b.title;

    const tdAuthor = document.createElement("td");
    tdAuthor.textContent = b.author;

    const tdCategory = document.createElement("td");
    tdCategory.textContent = b.category;

    const tdStatus = document.createElement("td");
    const statusFrag = document.createDocumentFragment();

    let badge = document.createElement("span");
    if (b.isLoaned) {
      const isOver = isOverdue(b.dueDate);
      badge.className = isOver ? "badge overdue" : "badge out";
      badge.textContent = isOver ? "Vencido" : "Prestado";
      statusFrag.appendChild(badge);

      const sm = document.createElement("div");
      sm.className = "small";
      const who = b.borrower ? ` a ${b.borrower}` : "";
      const due = b.dueDate ? ` • Dev.: ${formatDate(b.dueDate)}` : "";
      sm.textContent = `Prestado${who}${due}`;
      statusFrag.appendChild(sm);
    } else {
      badge.className = "badge ok";
      badge.textContent = "Disponible";
      statusFrag.appendChild(badge);
    }
    tdStatus.appendChild(statusFrag);

    const tdActions = document.createElement("td");
    const loanBtn = document.createElement("button");
    const retBtn = document.createElement("button");
    const editBtn = document.createElement("button");
    const delBtn = document.createElement("button");

    loanBtn.textContent = "📤 Prestar";
    retBtn.textContent = "📥 Devolver";
    editBtn.textContent = "✏️ Editar";
    delBtn.textContent = "🗑️ Eliminar";

    if (b.isLoaned) {
      loanBtn.disabled = true;
      retBtn.disabled = false;
    } else {
      loanBtn.disabled = false;
      retBtn.disabled = true;
    }

    loanBtn.addEventListener("click", () => openLoanDialog(b.id));
    retBtn.addEventListener("click", () => returnBook(b.id));
    editBtn.addEventListener("click", () => openEditDialog(b));
    delBtn.addEventListener("click", () => deleteBook(b.id));

    [loanBtn, retBtn, editBtn, delBtn].forEach(btn => tdActions.appendChild(btn));

    tr.appendChild(tdTitle);
    tr.appendChild(tdAuthor);
    tr.appendChild(tdCategory);
    tr.appendChild(tdStatus);
    tr.appendChild(tdActions);

    tbody.appendChild(tr);
  });
}

function filteredBooks() {
  const term = (q.value || "").trim().toLowerCase();
  const status = statusFilter.value;

  return state.books.filter(b => {
    const matchesText =
      [b.title, b.author, b.category].some(v => (v || "").toLowerCase().includes(term));

    let matchesStatus = true;
    if (status === "available") matchesStatus = !b.isLoaned;
    else if (status === "loaned") matchesStatus = !!b.isLoaned;
    else if (status === "overdue") matchesStatus = !!b.isLoaned && isOverdue(b.dueDate);

    return matchesText && matchesStatus;
  });
}

function isOverdue(dueDateStr) {
