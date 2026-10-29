const state = {
  token: localStorage.getItem("protex_token"),
  user: readUser(),
  reports: [],
  categories: [],
  category: "all",
  type: "all",
  search: "",
  authMode: "login",
};

const $ = (selector) => document.querySelector(selector);
const grid = $("#reports-grid");
const authForm = $("#auth-form");
const reportForm = $("#report-form");

function readUser() {
  try {
    return JSON.parse(localStorage.getItem("protex_user") || "null");
  } catch {
    localStorage.removeItem("protex_user");
    return null;
  }
}

async function api(path, options = {}) {
  const headers = new Headers(options.headers || {});
  const request = { ...options, headers };
  if (state.token) headers.set("Authorization", `Bearer ${state.token}`);
  if (options.body instanceof FormData) request.body = options.body;
  else if (options.body !== undefined) {
    headers.set("Content-Type", "application/json");
    request.body = JSON.stringify(options.body);
  }
  const response = await fetch(path, request);
  const body = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(body.message || `Permintaan gagal (${response.status}).`);
  return body;
}

function toast(message, error = false) {
  const item = $("#toast");
  item.textContent = message;
  item.classList.toggle("is-error", error);
  item.classList.add("is-visible");
  clearTimeout(toast.timer);
  toast.timer = setTimeout(() => item.classList.remove("is-visible"), 3500);
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, (char) => ({
    "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;",
  })[char]);
}

function dateLabel(value) {
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("id-ID", {
    day: "numeric", month: "short", year: "numeric",
  }).format(date);
}

function updateAccount() {
  const loggedIn = Boolean(state.token && state.user);
  $("#login-open").hidden = loggedIn;
  $("#register-open").hidden = loggedIn;
  $("#logout").hidden = !loggedIn;
  $("#role-badge").hidden = !loggedIn;
  $("#admin-notice").hidden = state.user?.role !== "admin";
  if (loggedIn) $("#role-badge").textContent = state.user.role === "admin" ? "Admin" : `Hai, ${state.user.nama}`;
}

function illustrationName(report, index) {
  const text = `${report.judul || ""} ${report.deskripsi || ""} ${report.nama_category || ""}`.toLocaleLowerCase("id");
  if (/kunci|motor|mobil/.test(text)) return "keys";
  if (/dompet|wallet/.test(text)) return "wallet";
  if (/ponsel|handphone|smartphone|\bhp\b|iphone|android|telepon/.test(text)) return "phone";
  if (/tas|ransel|backpack/.test(text)) return "backpack";
  if (/kartu|ktp|\bsim\b|atm|identitas/.test(text)) return "card";
  if (/kacamata|glasses/.test(text)) return "glasses";
  if (/payung|umbrella/.test(text)) return "umbrella";
  if (/earphone|earbud|headset|airpods|headphone/.test(text)) return "earbuds";
  return ["keys", "wallet", "phone", "backpack", "card", "glasses", "umbrella", "earbuds"][(Number(report.id_report) || index) % 8];
}

function renderCategories() {
  $("#category-filters").innerHTML = `<button class="filter-chip ${state.category === "all" ? "is-selected" : ""}" data-category="all" type="button">Semua</button>${
    state.categories.map((category) => `<button class="filter-chip ${String(category.id_category) === state.category ? "is-selected" : ""}" data-category="${escapeHtml(category.id_category)}" type="button">${escapeHtml(category.nama_category)}</button>`).join("")
  }`;
  $("#report-form").elements.id_category.innerHTML = `<option value="">Pilih kategori</option>${
    state.categories.map((category) => `<option value="${escapeHtml(category.id_category)}">${escapeHtml(category.nama_category)}</option>`).join("")
  }`;
}

function renderReports() {
  const term = state.search.toLocaleLowerCase("id");
  const reports = state.reports.filter((report) => {
    const text = `${report.judul || ""} ${report.deskripsi || ""} ${report.lokasi || ""} ${report.nama_category || ""}`.toLocaleLowerCase("id");
    return (state.category === "all" || String(report.id_category) === state.category) &&
      (state.type === "all" || report.jenis_laporan === state.type) && text.includes(term);
  });
  $("#report-count").textContent = String(state.reports.length);
  if (!reports.length) {
    grid.innerHTML = `<div class="empty-state"><strong>${state.reports.length ? "Belum ada yang cocok." : "Belum ada laporan."}</strong><span>Bagikan laporan atau coba ubah filter.</span></div>`;
    return;
  }
  grid.innerHTML = reports.map((report, index) => {
    const isAdmin = state.user?.role === "admin";
    const isOwner = Number(state.user?.id_user) === Number(report.id_user);
    const title = escapeHtml(report.judul || "Laporan barang");
    const typeLabel = report.jenis_laporan === "hilang" ? "Barang hilang" : "Barang ditemukan";
    let action = `<span class="status-label status-${escapeHtml(report.status || "aktif")}">${escapeHtml(report.status || "aktif")}</span>`;
    if (isAdmin) action = `<button class="card-action danger" data-delete="${escapeHtml(report.id_report)}" type="button">Hapus laporan</button>`;
    else if (isOwner) action = '<span class="owner-label">Laporan kamu</span>';
    else if (state.user && report.jenis_laporan === "ditemukan" && report.status === "aktif" && report.id_pengklaim == null) {
      action = `<button class="card-action" data-claim="${escapeHtml(report.id_report)}" type="button">Ajukan klaim</button>`;
    }
    const visual = report.image_url
      ? `<img src="${escapeHtml(report.image_url)}" alt="${title}" loading="lazy" />`
      : `<img class="item-illustration" src="/images/${illustrationName(report, index)}.svg" alt="Ilustrasi ${escapeHtml(report.nama_category || "barang")}" loading="lazy" />`;
    return `<article class="report-card"><div class="report-visual tone-${index % 5}">${visual}<span class="report-type">${typeLabel}</span></div>
      <div class="report-card-body"><div class="report-meta"><span class="category-label">${escapeHtml(report.nama_category || "Lainnya")}</span><span>${dateLabel(report.tanggal_kejadian)}</span></div>
      <h3 title="${title}">${title}</h3><p class="report-description">${escapeHtml(report.deskripsi || "Tidak ada deskripsi.")}</p>
      <div class="report-location">⌖ &nbsp;${escapeHtml(report.lokasi || "Lokasi tidak tersedia")}</div>
      <div class="report-footer"><span class="report-author">oleh ${escapeHtml(report.nama_pelapor || "Anggota Protex")}</span>${action}</div></div></article>`;
  }).join("");
}

async function loadReports() {
  grid.innerHTML = '<div class="loading">Memuat laporan...</div>';
  try {
    const result = await api("/api/reports");
    state.reports = Array.isArray(result.data) ? result.data : [];
    renderReports();
  } catch (error) {
    grid.innerHTML = `<div class="error-state"><strong>Laporan belum bisa dimuat.</strong><span>${escapeHtml(error.message)}</span><button data-retry type="button">Coba lagi</button></div>`;
  }
}

async function loadCategories() {
  try {
    const result = await api("/api/categories");
    state.categories = Array.isArray(result.data) ? result.data : [];
    renderCategories();
  } catch (error) {
    toast(`Kategori gagal dimuat: ${error.message}`, true);
  }
}

function setAuthMode(mode) {
  state.authMode = mode;
  document.querySelectorAll("[data-auth-mode]").forEach((button) => button.classList.toggle("is-active", button.dataset.authMode === mode));
  $("#name-field").hidden = mode !== "register";
  authForm.elements.nama.required = mode === "register";
  authForm.elements.password.autocomplete = mode === "register" ? "new-password" : "current-password";
  $("#auth-title").textContent = mode === "register" ? "Buat akun Protex" : "Masuk ke Protex";
  authForm.querySelector('[type="submit"]').textContent = mode === "register" ? "Buat akun" : "Masuk";
  $("#auth-message").textContent = "";
}

function openReport() {
  if (!state.token) {
    setAuthMode("login");
    $("#auth-dialog").showModal();
    toast("Masuk dulu untuk membuat laporan.", true);
    return;
  }
  $("#report-message").textContent = "";
  $("#report-dialog").showModal();
}

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = authForm.querySelector('[type="submit"]');
  const original = button.textContent;
  button.disabled = true;
  button.textContent = "Memproses...";
  try {
    const path = state.authMode === "register" ? "/api/users/register" : "/api/users/login";
    const result = await api(path, { method: "POST", body: Object.fromEntries(new FormData(authForm)) });
    if (state.authMode === "register") {
      setAuthMode("login");
      authForm.elements.email.value = result.data.email;
      toast("Akun berhasil dibuat. Silakan masuk.");
      return;
    }
    state.token = result.token;
    state.user = result.data;
    localStorage.setItem("protex_token", state.token);
    localStorage.setItem("protex_user", JSON.stringify(state.user));
    $("#auth-dialog").close();
    authForm.reset();
    updateAccount();
    renderReports();
    toast(`Berhasil masuk. Halo, ${state.user.nama}!`);
  } catch (error) {
    $("#auth-message").textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = state.authMode === "register" ? "Buat akun" : original;
  }
});

reportForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const button = reportForm.querySelector('[type="submit"]');
  const original = button.textContent;
  const data = new FormData(reportForm);
  const image = data.get("image");
  if (image instanceof File && image.size > 5 * 1024 * 1024) {
    $("#report-message").textContent = "Ukuran foto maksimal 5 MB.";
    return;
  }
  if (image instanceof File && !image.size) data.delete("image");
  button.disabled = true;
  button.textContent = "Mengirim...";
  try {
    const result = await api("/api/reports", { method: "POST", body: data });
    $("#report-dialog").close();
    reportForm.reset();
    toast(result.message || "Laporan berhasil dikirim.");
    await loadReports();
  } catch (error) {
    $("#report-message").textContent = error.message;
  } finally {
    button.disabled = false;
    button.textContent = original;
  }
});

$("#login-open").addEventListener("click", () => { setAuthMode("login"); $("#auth-dialog").showModal(); });
$("#register-open").addEventListener("click", () => { setAuthMode("register"); $("#auth-dialog").showModal(); });
$("#logout").addEventListener("click", () => {
  localStorage.removeItem("protex_token");
  localStorage.removeItem("protex_user");
  state.token = null;
  state.user = null;
  updateAccount();
  renderReports();
  toast("Kamu sudah keluar dari akun.");
});
$("#hero-report").addEventListener("click", openReport);
$("#section-report").addEventListener("click", openReport);
document.querySelectorAll("[data-close]").forEach((button) => button.addEventListener("click", () => $(`#${button.dataset.close}`).close()));
document.querySelectorAll("[data-auth-mode]").forEach((button) => button.addEventListener("click", () => setAuthMode(button.dataset.authMode)));
$("#search-input").addEventListener("input", (event) => { state.search = event.target.value; renderReports(); });
document.querySelectorAll(".type-filter").forEach((button) => button.addEventListener("click", () => {
  state.type = button.dataset.type;
  document.querySelectorAll(".type-filter").forEach((filter) => filter.classList.toggle("is-selected", filter === button));
  renderReports();
}));
$("#category-filters").addEventListener("click", (event) => {
  const button = event.target.closest("[data-category]");
  if (!button) return;
  state.category = button.dataset.category;
  renderCategories();
  renderReports();
});
grid.addEventListener("click", async (event) => {
  const retry = event.target.closest("[data-retry]");
  if (retry) return loadReports();
  const deleteButton = event.target.closest("[data-delete]");
  if (deleteButton) {
    if (state.user?.role !== "admin") return toast("Hanya admin yang dapat menghapus laporan.", true);
    if (!confirm("Hapus laporan ini? Tindakan ini tidak dapat dibatalkan.")) return;
    deleteButton.disabled = true;
    try {
      const result = await api(`/api/reports/${encodeURIComponent(deleteButton.dataset.delete)}`, { method: "DELETE" });
      toast(result.message || "Laporan berhasil dihapus.");
      await loadReports();
    } catch (error) {
      toast(error.message, true);
      deleteButton.disabled = false;
    }
  }
  const claimButton = event.target.closest("[data-claim]");
  if (claimButton) {
    claimButton.disabled = true;
    try {
      const result = await api(`/api/reports/${encodeURIComponent(claimButton.dataset.claim)}/claim`, { method: "POST" });
      toast(result.message || "Klaim berhasil diajukan.");
      await loadReports();
    } catch (error) {
      toast(error.message, true);
      claimButton.disabled = false;
    }
  }
});

updateAccount();
loadCategories();
loadReports();
