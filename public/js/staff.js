import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  doc,
  addDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

let currentDate = new Date();
let cachedReservas = null;
let allBloqueiosAtivos = [];
let allHistoricoBloqueios = [];

document.addEventListener("DOMContentLoaded", async () => {

  // Auth check
  const staffLoggedIn = localStorage.getItem("staffLoggedIn");
  const adminLoggedIn = localStorage.getItem("adminLoggedIn");
  
  // Se admin está logado, pode aceder à página de staff
  // Caso contrário, verifica se staff está logado
  if (!adminLoggedIn && !staffLoggedIn) {
    alert("Acesso negado. Por favor faça login como Staff ou Admin.");
    window.location.href = "home.html";
    return;
  }

  // Add admin link if user is logged in as admin
  const navbarLinks = document.querySelector(".navbar-links");
  
  if (adminLoggedIn && navbarLinks) {
    const adminLink = document.createElement("a");
    adminLink.href = "admin.html";
    adminLink.innerHTML = '<i class="fas fa-shield-alt"></i> <span>Admin</span>';
    adminLink.style.cssText = "border-color: rgba(41,128,185,0.4) !important; color: #2980B9 !important;";
    adminLink.onmouseenter = () => { adminLink.style.background = "rgba(41,128,185,0.15)"; };
    adminLink.onmouseleave = () => { adminLink.style.background = "transparent"; };
    navbarLinks.appendChild(adminLink);
  }

  // Logout button (styled)
  const logoutBtn = document.createElement("a");
  logoutBtn.href = "#";
  logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> <span>Sair</span>';
  logoutBtn.style.cssText = "border: 1px solid rgba(231,76,60,0.5) !important; color: #E74C3C !important;";
  logoutBtn.onmouseenter = () => { logoutBtn.style.background = "rgba(231,76,60,0.12)"; };
  logoutBtn.onmouseleave = () => { logoutBtn.style.background = "transparent"; };
  logoutBtn.onclick = (e) => {
    e.preventDefault();
    localStorage.removeItem("staffLoggedIn");
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("userEmail");
    window.location.href = "home.html";
  };
  if (navbarLinks) navbarLinks.appendChild(logoutBtn);

  // Refresh button
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", async () => {
      const icon = refreshBtn.querySelector("i");
      if (icon) icon.style.animation = "spin 0.8s linear infinite";
      cachedReservas = null;
      await carregarTudo();
      if (icon) icon.style.animation = "";
    });
  }

  // Animated number
  function animateNumber(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const start = 0;
    const duration = 500;
    const startTime = performance.now();
    function tick(now) {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / duration, 1);
      el.textContent = Math.round(start + (target - start) * progress);
      if (progress < 1) requestAnimationFrame(tick);
    }
    requestAnimationFrame(tick);
  }

  // Room type helper
  function getRoomType(roomId) {
    if (!roomId) return "other";
    const name = roomId.toLowerCase();
    if (name.includes("twin")) return "twin";
    if (name.includes("duplo")) return "duplo";
    return "other";
  }

  // Safe date conversion
  function toDate(field) {
    if (!field) return null;
    if (typeof field.toDate === "function") return field.toDate();
    if (field instanceof Date) return field;
    const parsed = new Date(field);
    return isNaN(parsed) ? null : parsed;
  }

  // Format date nicely
  function formatDate(d) {
    if (!d) return "-";
    return d.toLocaleDateString("pt-PT", { day: "2-digit", month: "short", year: "numeric" });
  }

  // Load active reservations (cached per refresh cycle)
  async function carregarReservasAtivas() {
    if (cachedReservas !== null) return cachedReservas;
    try {
      const q = query(collection(db, "reservas"), where("status", "==", "ativa"));
      const snapshot = await getDocs(q);
      cachedReservas = [];
      snapshot.forEach(doc => {
        cachedReservas.push({ id: doc.id, ...doc.data() });
      });
      return cachedReservas;
    } catch (error) {
      console.error("Erro ao carregar reservas:", error);
      return [];
    }
  }

  // CALENDAR
  async function gerarCalendario() {
    const container = document.getElementById("calendarContainer");
    container.innerHTML = '<div class="loading"><i class="fas fa-circle-notch" style="animation:spin 1s linear infinite"></i> Carregando...</div>';

    const reservas = await carregarReservasAtivas();
    const mes = currentDate.getMonth();
    const ano = currentDate.getFullYear();

    const meses = ["Janeiro","Fevereiro","Março","Abril","Maio","Junho",
                   "Julho","Agosto","Setembro","Outubro","Novembro","Dezembro"];
    document.getElementById("monthYear").textContent = `${meses[mes]} ${ano}`;

    const firstDay = new Date(ano, mes, 1).getDay();
    const lastDay = new Date(ano, mes + 1, 0).getDate();
    const prevLastDay = new Date(ano, mes, 0).getDate();

    let html = '<div class="calendar">';

    const diasSemana = ["Dom","Seg","Ter","Qua","Qui","Sex","Sab"];
    diasSemana.forEach(d => { html += `<div class="calendar-header">${d}</div>`; });

    // Previous month
    for (let i = firstDay - 1; i >= 0; i--) {
      html += `<div class="calendar-day other-month"><div class="day-number">${prevLastDay - i}</div></div>`;
    }

    // Current month
    const hoje = new Date();
    for (let dia = 1; dia <= lastDay; dia++) {
      const data = new Date(ano, mes, dia);
      const isToday = data.toDateString() === hoje.toDateString();

      html += `<div class="calendar-day ${isToday ? 'today' : ''}">`;
      html += `<div class="day-number">${dia}</div>`;

      reservas.forEach(res => {
        const entrada = toDate(res.data_entrada);
        const saida = toDate(res.data_saida);
        if (!entrada || !saida) return;
        if (entrada <= data && saida >= data) {
          const type = getRoomType(res.room_id);
          html += `<div class="room-block ${type}" title="${res.nome_hospede || ''}">${res.room_id}</div>`;
        }
      });

      html += '</div>';
    }

    // Next month fill
    const totalCells = firstDay + lastDay;
    const rows = Math.ceil(totalCells / 7);
    const diasRestantes = (rows * 7) - totalCells;
    for (let dia = 1; dia <= diasRestantes; dia++) {
      html += `<div class="calendar-day other-month"><div class="day-number">${dia}</div></div>`;
    }

    html += '</div>';
    container.innerHTML = html;
  }

  // OCCUPIED TODAY
  async function carregarQuartosOcupadosHoje() {
    const container = document.getElementById("quartosOcupadosContainer");
    container.innerHTML = '<div class="loading"><i class="fas fa-circle-notch" style="animation:spin 1s linear infinite"></i> Carregando...</div>';

    const reservas = await carregarReservasAtivas();
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const quartosOcupados = reservas.filter(res => {
      const entrada = toDate(res.data_entrada);
      const saida = toDate(res.data_saida);
      if (!entrada || !saida) return false;
      const e = new Date(entrada); e.setHours(0,0,0,0);
      const s = new Date(saida); s.setHours(0,0,0,0);
      return e <= hoje && s >= hoje;
    });

    animateNumber("statOcupados", quartosOcupados.length);

    // Count today's check-ins
    const entradasHoje = reservas.filter(res => {
      const entrada = toDate(res.data_entrada);
      if (!entrada) return false;
      const e = new Date(entrada); e.setHours(0,0,0,0);
      return e.getTime() === hoje.getTime();
    });
    animateNumber("statEntradas", entradasHoje.length);

    if (quartosOcupados.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-couch"></i>
          <p>Nenhum quarto ocupado hoje</p>
        </div>`;
      return;
    }

    let html = '<div class="room-grid">';
    quartosOcupados.forEach(res => {
      const saida = toDate(res.data_saida);
      html += `
        <div class="room-card">
          <div class="room-card-icon checkout"><i class="fas fa-door-open"></i></div>
          <div class="room-card-body">
            <div class="room-card-title">${res.room_id || '-'}</div>
            <div class="room-card-detail">
              <span class="label">Hóspede</span>
              <span>${res.nome_hospede || '-'}</span>
              <span class="label">CC</span>
              <span>${res.cc || '-'}</span>
              <span class="label">Código TTLock</span>
              <span class="code">${res.codigo_ttlk || '-'}</span>
              <span class="label">Saída</span>
              <span>${formatDate(saida)}</span>
            </div>
          </div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  // NEXT 7 DAYS
  async function carregarProximos7Dias() {
    const container = document.getElementById("proximosDiasContainer");
    container.innerHTML = '<div class="loading"><i class="fas fa-circle-notch" style="animation:spin 1s linear infinite"></i> Carregando...</div>';

    const reservas = await carregarReservasAtivas();
    const hoje = new Date();
    hoje.setHours(0,0,0,0);
    const em7Dias = new Date(hoje.getTime() + 7 * 24 * 60 * 60 * 1000);

    const proximasReservas = reservas.filter(res => {
      const entrada = toDate(res.data_entrada);
      if (!entrada) return false;
      const e = new Date(entrada); e.setHours(0,0,0,0);
      return e > hoje && e <= em7Dias;
    }).sort((a, b) => toDate(a.data_entrada) - toDate(b.data_entrada));

    animateNumber("statProximos", proximasReservas.length);

    if (proximasReservas.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-calendar-check"></i>
          <p>Nenhuma entrada nos próximos 7 dias</p>
        </div>`;
      return;
    }

    let html = '<div class="room-grid">';
    proximasReservas.forEach(res => {
      const entrada = toDate(res.data_entrada);
      html += `
        <div class="room-card">
          <div class="room-card-icon checkin"><i class="fas fa-plane-arrival"></i></div>
          <div class="room-card-body">
            <div class="room-card-title">${res.room_id || '-'}</div>
            <div class="room-card-detail">
              <span class="label">Hóspede</span>
              <span>${res.nome_hospede || '-'}</span>
              <span class="label">CC</span>
              <span>${res.cc || '-'}</span>
              <span class="label">Entrada</span>
              <span>${formatDate(entrada)}</span>
              <span class="label">Código TTLock</span>
              <span class="code">${res.codigo_ttlk || '-'}</span>
            </div>
          </div>
        </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  // Nav buttons
  document.getElementById("prevBtn").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() - 1);
    gerarCalendario();
  });
  document.getElementById("nextBtn").addEventListener("click", () => {
    currentDate.setMonth(currentDate.getMonth() + 1);
    gerarCalendario();
  });

  // Load all
  async function carregarTudo() {
    cachedReservas = null;
    await gerarCalendario();
    await carregarQuartosOcupadosHoje();
    await carregarProximos7Dias();
    await processarBloqueiosExpirados();
    await carregarBloqueios();
    await carregarHistoricoBloqueios();
  }

  // === EXPORT UTILITY ===
  function downloadFile(filename, content, mimeType) {
    const blob = new Blob(["\uFEFF" + content], { type: mimeType + ";charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }

  function toDateStrExport(field) {
    if (!field) return "-";
    if (typeof field.toDate === "function") return field.toDate().toLocaleDateString("pt-PT");
    if (field instanceof Date) return field.toLocaleDateString("pt-PT");
    const d = new Date(field);
    return isNaN(d) ? String(field) : d.toLocaleDateString("pt-PT");
  }

  function exportDataCSV(data, headers, filename) {
    const sep = ";";
    let csv = headers.join(sep) + "\n";
    data.forEach(row => {
      csv += row.map(cell => `"${String(cell).replace(/"/g, '""')}"`).join(sep) + "\n";
    });
    downloadFile(filename, csv, "text/csv");
  }

  function exportDataTXT(data, headers, filename) {
    let txt = headers.join(" | ") + "\n";
    txt += headers.map(h => "-".repeat(h.length)).join("-+-") + "\n";
    data.forEach(row => {
      txt += row.join(" | ") + "\n";
    });
    downloadFile(filename, txt, "text/plain");
  }

  // Export active blocks
  function getBloqueiosExportData() {
    const headers = ["Data Início", "Data Fim", "Quartos", "Motivo", "Criado em"];
    const rows = allBloqueiosAtivos.map(b => [
      b.data_inicio || "-",
      b.data_fim || "-",
      (b.quartos || []).join(", "),
      b.motivo || "-",
      toDateStrExport(b.criado_em)
    ]);
    return { headers, rows };
  }

  document.getElementById("exportBloqueiosCSV")?.addEventListener("click", () => {
    const { headers, rows } = getBloqueiosExportData();
    exportDataCSV(rows, headers, "bloqueios_ativos_goldenbeach.csv");
  });
  document.getElementById("exportBloqueiosTXT")?.addEventListener("click", () => {
    const { headers, rows } = getBloqueiosExportData();
    exportDataTXT(rows, headers, "bloqueios_ativos_goldenbeach.txt");
  });

  // Export block history
  function getHistoricoExportData() {
    const headers = ["Data Início", "Data Fim", "Quartos", "Motivo", "Criado em", "Expirado em"];
    const rows = allHistoricoBloqueios.map(b => [
      b.data_inicio || "-",
      b.data_fim || "-",
      (b.quartos || []).join(", "),
      b.motivo || "-",
      toDateStrExport(b.criado_em),
      toDateStrExport(b.expirado_em)
    ]);
    return { headers, rows };
  }

  document.getElementById("exportHistoricoCSV")?.addEventListener("click", () => {
    const { headers, rows } = getHistoricoExportData();
    exportDataCSV(rows, headers, "historico_bloqueios_goldenbeach.csv");
  });
  document.getElementById("exportHistoricoTXT")?.addEventListener("click", () => {
    const { headers, rows } = getHistoricoExportData();
    exportDataTXT(rows, headers, "historico_bloqueios_goldenbeach.txt");
  });

  // === ROOM LIST FOR BLOCKING ===
  const allRoomNames = [
    "Quarto Castelo Twin", "Quarto Cavacos Twin", "Quarto Manta Rota Twin", "Quarto Marinha Twin",
    "Quarto Alvor Duplo", "Quarto Benagil Duplo", "Quarto Ilha da Fuseta Duplo", "Quarto Trafal Duplo", "Quarto Três Irmãos Duplo"
  ];

  const checkboxContainer = document.getElementById("blockRoomCheckboxes");
  if (checkboxContainer) {
    allRoomNames.forEach(room => {
      const label = document.createElement("label");
      label.style.cssText = "display:flex;align-items:center;gap:6px;padding:8px 14px;background:var(--ultra-light);border-radius:8px;border:1px solid var(--border-color);cursor:pointer;font-size:0.82rem;font-weight:600;";
      label.innerHTML = `<input type="checkbox" value="${room}" style="accent-color:var(--danger);width:16px;height:16px;"> ${room}`;
      checkboxContainer.appendChild(label);
    });
  }

  // === BLOCK DATES ===
  const blockBtn = document.getElementById("blockDatesBtn");
  if (blockBtn) {
    blockBtn.addEventListener("click", async () => {
      const startDate = document.getElementById("blockDateStart").value;
      const endDate = document.getElementById("blockDateEnd").value;
      const reason = document.getElementById("blockReason").value;
      const checkedRooms = Array.from(document.querySelectorAll("#blockRoomCheckboxes input:checked")).map(cb => cb.value);

      if (!startDate || !endDate) { alert("Selecione as datas de início e fim."); return; }
      if (checkedRooms.length === 0) { alert("Selecione pelo menos um quarto."); return; }
      if (new Date(endDate) < new Date(startDate)) { alert("A data fim deve ser posterior à data início."); return; }

      try {
        await addDoc(collection(db, "bloqueios"), {
          data_inicio: startDate,
          data_fim: endDate,
          quartos: checkedRooms,
          motivo: reason || "",
          tipo_bloqueio: "quartos",
          criado_por: "staff",
          criado_em: new Date()
        });
        alert("Quartos bloqueados com sucesso!");
        document.getElementById("blockDateStart").value = "";
        document.getElementById("blockDateEnd").value = "";
        document.getElementById("blockReason").value = "";
        document.querySelectorAll("#blockRoomCheckboxes input:checked").forEach(cb => cb.checked = false);
        await processarBloqueiosExpirados();
        await carregarBloqueios();
        await carregarHistoricoBloqueios();
      } catch (err) {
        console.error("Erro ao bloquear quartos:", err);
        alert("Erro ao bloquear quartos.");
      }
    });
  }

  // === PROCESS EXPIRED BLOCKS ===
  async function processarBloqueiosExpirados() {
    try {
      const snapshot = await getDocs(collection(db, "bloqueios"));
      const hoje = new Date().toISOString().split("T")[0];

      for (const d of snapshot.docs) {
        const b = d.data();
        if (b.data_fim < hoje) {
          await addDoc(collection(db, "historico_bloqueios"), {
            data_inicio: b.data_inicio,
            data_fim: b.data_fim,
            quartos: b.quartos,
            motivo: b.motivo || "",
            criado_em: b.criado_em,
            expirado_em: new Date()
          });
          await deleteDoc(doc(db, "bloqueios", d.id));
        }
      }
    } catch (err) {
      console.error("Erro ao processar bloqueios expirados:", err);
    }
  }

  // === LOAD ACTIVE BLOCKS ===
  async function carregarBloqueios() {
    const container = document.getElementById("activeBlocksList");
    if (!container) return;

    try {
      const snapshot = await getDocs(collection(db, "bloqueios"));
      allBloqueiosAtivos = [];
      snapshot.forEach(d => { allBloqueiosAtivos.push({ id: d.id, ...d.data() }); });

      if (allBloqueiosAtivos.length === 0) {
        container.innerHTML = '<p style="color:var(--text-light);font-size:0.85rem;">Nenhum bloqueio ativo.</p>';
        return;
      }

      let html = '<h3 style="font-size:0.95rem;font-weight:700;color:var(--primary-dark);margin-bottom:12px;"><i class="fas fa-lock" style="color:var(--danger);margin-right:6px;"></i>Bloqueios Ativos</h3>';
      html += '<div style="display:flex;flex-direction:column;gap:10px;">';

      allBloqueiosAtivos.forEach(b => {
        const isBloqueioCompleto = b.tipo_bloqueio === "completo";
        const badgeColor = isBloqueioCompleto ? "var(--danger)" : "var(--primary-dark)";
        const badgeText = isBloqueioCompleto ? "🔒 Bloqueio Completo" : `📍 ${(b.quartos || []).length} quarto(s)`;
        
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:rgba(231,76,60,0.06);border:1px solid rgba(231,76,60,0.15);border-radius:10px;">
          <div style="flex:1;">
            <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px;">
              <div style="font-weight:700;font-size:0.88rem;color:var(--primary-dark);">${b.data_inicio} → ${b.data_fim}</div>
              <span style="font-size:0.7rem;background:${badgeColor};color:white;padding:2px 8px;border-radius:4px;">${badgeText}</span>
            </div>
            ${!isBloqueioCompleto ? `<div style="font-size:0.78rem;color:var(--text-light);margin-top:4px;"><strong>Quartos:</strong> ${(b.quartos || []).join(", ")}</div>` : '<div style="font-size:0.78rem;color:var(--danger);margin-top:4px;"><strong>Todos os quartos bloqueados</strong></div>'}
            ${b.motivo ? `<div style="font-size:0.75rem;color:var(--danger);margin-top:2px;">Motivo: ${b.motivo}</div>` : ''}
            ${b.criado_por ? `<div style="font-size:0.75rem;color:var(--text-light);margin-top:2px;">Por: ${b.criado_por === 'admin' ? '👨‍💼 Admin' : '👥 Staff'}</div>` : ''}
          </div>
          <button class="row-action danger" title="Remover bloqueio" data-block-id="${b.id}" style="border:1px solid var(--danger);color:var(--danger);background:white;cursor:pointer;width:32px;height:32px;border-radius:8px;display:flex;align-items:center;justify-content:center;margin-left:12px;flex-shrink:0;"><i class="fas fa-trash"></i></button>
        </div>`;
      });

      html += '</div>';
      container.innerHTML = html;

      container.querySelectorAll("[data-block-id]").forEach(btn => {
        btn.addEventListener("click", async () => {
          if (!confirm("Remover este bloqueio?")) return;
          try {
            await deleteDoc(doc(db, "bloqueios", btn.dataset.blockId));
            await carregarBloqueios();
          } catch (err) {
            console.error("Erro ao remover bloqueio:", err);
            alert("Erro ao remover bloqueio.");
          }
        });
      });
    } catch (err) {
      console.error("Erro ao carregar bloqueios:", err);
    }
  }

  // === LOAD BLOCK HISTORY ===
  async function carregarHistoricoBloqueios() {
    const container = document.getElementById("blockHistoryContainer");
    const badge = document.getElementById("historicoCount");
    if (!container) return;

    try {
      const snapshot = await getDocs(collection(db, "historico_bloqueios"));
      allHistoricoBloqueios = [];
      snapshot.forEach(d => { allHistoricoBloqueios.push({ id: d.id, ...d.data() }); });

      if (badge) badge.textContent = `${allHistoricoBloqueios.length} registo${allHistoricoBloqueios.length !== 1 ? 's' : ''}`;

      if (allHistoricoBloqueios.length === 0) {
        container.innerHTML = '<p style="color:var(--text-light);font-size:0.85rem;">Nenhum registo no histórico.</p>';
        return;
      }

      let html = '<div style="display:flex;flex-direction:column;gap:10px;">';
      allHistoricoBloqueios.forEach(b => {
        html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:rgba(127,140,141,0.06);border:1px solid rgba(127,140,141,0.15);border-radius:10px;">
          <div>
            <div style="font-weight:700;font-size:0.88rem;color:var(--primary-dark);">${b.data_inicio} → ${b.data_fim} <span style="font-size:0.72rem;color:var(--text-light);font-weight:500;margin-left:8px;">(expirado)</span></div>
            <div style="font-size:0.78rem;color:var(--text-light);margin-top:4px;">${(b.quartos || []).join(", ")}</div>
            ${b.motivo ? `<div style="font-size:0.75rem;color:#F39C12;margin-top:2px;">Motivo: ${b.motivo}</div>` : ''}
            <div style="font-size:0.72rem;color:var(--text-light);margin-top:2px;">Expirado em: ${toDateStrExport(b.expirado_em)}</div>
          </div>
        </div>`;
      });
      html += '</div>';
      container.innerHTML = html;
    } catch (err) {
      console.error("Erro ao carregar histórico de bloqueios:", err);
    }
  }

  await carregarTudo();
});
