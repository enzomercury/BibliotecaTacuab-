/* =========================================================
   Biblioteca del Liceo – localStorage (v3 - Bordó)
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
  if (!dueDateStr) return false;
  const today = new Date();
  const due = new Date(dueDateStr + "T23:59:59");
  return today > due;
}

function formatDate(isoYMD) {
  if (!isoYMD || isoYMD.length !== 10) return isoYMD || "";
  const [y,m,d] = isoYMD.split("-");
  return `${d}/${m}/${y}`;
}

// Events
addBookForm.addEventListener("submit", e => {
  e.preventDefault();
  const title = document.getElementById("title").value.trim();
  const author = document.getElementById("author").value.trim();
  const category = document.getElementById("category").value.trim();

  if (!title || !author || !category) return;

  state.books.push({
    id: uid(),
    title, author, category,
    isLoaned: false,
    borrower: "",
    notes: "",
    dueDate: "",
    history: []
  });
  saveBooks();
  addBookForm.reset();
  document.getElementById("title").focus();
});

[q, statusFilter].forEach(el => el.addEventListener("input", render));

resetBtn.addEventListener("click", () => {
  if (confirm("¿Seguro que quieres borrar todos los datos locales?")) {
    localStorage.removeItem(LS_KEY);
    state.books = [];
    render();
  }
});

exportBtn.addEventListener("click", () => {
  const blob = new Blob([JSON.stringify(state.books, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "biblioteca.json";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

exportCsvBtn.addEventListener("click", () => {
  const headers = ["Titulo","Autor","Categoria","Estado","Prestatario","FechaDevolucion","Observaciones"];
  const lines = [headers.join(",")];
  state.books.forEach(b => {
    const estado = b.isLoaned ? (isOverdue(b.dueDate) ? "Vencido" : "Prestado") : "Disponible";
    const row = [
      escapeCsv(b.title),
      escapeCsv(b.author),
      escapeCsv(b.category),
      escapeCsv(estado),
      escapeCsv(b.borrower || ""),
      escapeCsv(b.dueDate || ""),
      escapeCsv(b.notes || "")
    ].join(",");
    lines.push(row);
  });
  const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = "biblioteca.csv";
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
});

function escapeCsv(v) {
  v = (v ?? "").toString();
  if (/[",\n]/.test(v)) return `"${v.replace(/"/g,'""')}"`;
  return v;
}

importInput.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const text = await file.text();
    const json = JSON.parse(text);
    if (!Array.isArray(json)) throw new Error("Formato no válido");
    state.books = json.map(sanitizeBook);
    saveBooks();
  } catch (err) {
    alert("No se pudo importar el JSON. Verifica el formato.");
  } finally {
    importInput.value = "";
  }
});

clearAllBtn.addEventListener("click", () => {
  q.value = "";
  statusFilter.value = "all";
  render();
});

printBtn.addEventListener("click", () => window.print());

// Préstamo/Devolución
function openLoanDialog(bookId) {
  state.loanTargetId = bookId;
  const b = state.books.find(x => x.id === bookId);
  loanBookTitle.textContent = `Libro: ${b?.title || ""} — Autor: ${b?.author || ""}`;
  borrowerInput.value = "";
  notesInput.value = "";
  dueInput.value = "";
  state.loanDialog.showModal();
}

confirmLoanBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const borrower = borrowerInput.value.trim();
  const notes = notesInput.value.trim();
  const due = (dueInput.value || "").trim();
  if (!borrower) return;

  const b = state.books.find(x => x.id === state.loanTargetId);
  if (!b) return;

  if (b.isLoaned) {
    alert("Este libro ya está prestado.");
    return;
  }

  b.isLoaned = true;
  b.borrower = borrower;
  b.notes = notes;
  b.dueDate = due;
  b.history.push({ type: "loan", at: new Date().toISOString(), by: borrower, dueDate: due, notes });
  saveBooks();
  state.loanDialog.close();
});

function returnBook(bookId) {
  const b = state.books.find(x => x.id === bookId);
  if (!b) return;
  if (!b.isLoaned) {
    alert("Este libro ya está disponible.");
    return;
  }
  b.isLoaned = false;
  b.history.push({ type: "return", at: new Date().toISOString(), by: b.borrower });
  b.borrower = "";
  b.notes = "";
  b.dueDate = "";
  saveBooks();
}

// Editar / Eliminar
function openEditDialog(book) {
  editId.value = book.id;
  editTitle.value = book.title;
  editAuthor.value = book.author;
  editCategory.value = book.category;
  state.editDialog.showModal();
}

confirmEditBtn.addEventListener("click", (e) => {
  e.preventDefault();
  const id = editId.value;
  const b = state.books.find(x => x.id === id);
  if (!b) return;

  const t = editTitle.value.trim();
  const a = editAuthor.value.trim();
  const c = editCategory.value.trim();
  if (!t || !a || !c) return;

  b.title = t;
  b.author = a;
  b.category = c;
  saveBooks();
  state.editDialog.close();
});

function deleteBook(bookId) {
  const b = state.books.find(x => x.id === bookId);
  const name = b ? `“${b.title}”` : "el libro";
  if (confirm(`¿Eliminar ${name}? Esta acción no se puede deshacer.`)) {
    state.books = state.books.filter(x => x.id !== bookId);
    saveBooks();
  }
}

// Inicial
render();
