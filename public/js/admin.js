import { db } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  orderBy,
  doc,
  updateDoc,
  addDoc,
  deleteDoc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

let allReservas = [];
let allBloqueiosAtivos = [];
let allHistoricoBloqueios = [];
let allHistoricoReservas = [];
let allHistoricoEstadias = [];
let allHistoricoContas = [];
let currentFilter = "todas";
let currentFilterHistoricoReservas = "todas";

document.addEventListener("DOMContentLoaded", async () => {

  // Verificar se está logado como admin
  const adminLoggedIn = localStorage.getItem("adminLoggedIn");
  if (!adminLoggedIn) {
    alert("Acesso negado. Por favor faça login como Admin.");
    window.location.href = "home.html";
    return;
  }

  // Adicionar botão de logout na navbar
  const logoutBtn = document.createElement("a");
  logoutBtn.href = "#";
  logoutBtn.innerHTML = '<i class="fas fa-sign-out-alt"></i> <span>Sair</span>';
  logoutBtn.style.cssText = "border-color: rgba(231,76,60,0.4) !important; color: #ff7675 !important;";
  logoutBtn.onmouseenter = () => { logoutBtn.style.background = "rgba(231,76,60,0.15)"; };
  logoutBtn.onmouseleave = () => { logoutBtn.style.background = "transparent"; };
  logoutBtn.onclick = (e) => {
    e.preventDefault();
    localStorage.removeItem("adminLoggedIn");
    localStorage.removeItem("userEmail");
    window.location.href = "home.html";
  };

  const navbarLinks = document.querySelector(".navbar-links");
  if (navbarLinks) navbarLinks.appendChild(logoutBtn);

  // Refresh button
  const refreshBtn = document.getElementById("refreshBtn");
  if (refreshBtn) {
    refreshBtn.addEventListener("click", () => {
      refreshBtn.querySelector("i").classList.add("fa-spin");
      carregarTudo().then(() => {
        setTimeout(() => refreshBtn.querySelector("i").classList.remove("fa-spin"), 400);
      });
    });
  }

  // Filter tabs
  document.querySelectorAll(".filter-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".filter-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentFilter = tab.dataset.filter;
      renderReservas();
    });
  });

  // Search
  const searchInput = document.getElementById("searchReservas");
  if (searchInput) {
    searchInput.addEventListener("input", () => renderReservas());
  }

  // === CARREGAR ESTATÍSTICAS ===
  async function carregarEstatisticas() {
    try {
      const quartosSnap = await getDocs(collection(db, "quartos"));
      animateNumber("totalQuartos", quartosSnap.size);

      const reservasSnap = await getDocs(collection(db, "reservas"));
      animateNumber("totalReservas", reservasSnap.size);

      const reservasAtivasQ = query(collection(db, "reservas"), where("status", "==", "ativa"));
      const reservasAtivasSnap = await getDocs(reservasAtivasQ);
      animateNumber("reservasAtivas", reservasAtivasSnap.size);

      const agora = new Date();
      let quartosOcupados = 0;
      reservasAtivasSnap.forEach(d => {
        const res = d.data();
        let dataEnt, dataSai;
        try {
          dataEnt = res.data_entrada && typeof res.data_entrada.toDate === 'function'
            ? res.data_entrada.toDate() : new Date(res.data_entrada);
          dataSai = res.data_saida && typeof res.data_saida.toDate === 'function'
            ? res.data_saida.toDate() : new Date(res.data_saida);
        } catch (e) { return; }
        if (dataEnt <= agora && dataSai >= agora) quartosOcupados++;
      });
      animateNumber("quartosOcupados", quartosOcupados);
    } catch (error) {
      console.error("Erro ao carregar estatísticas:", error);
    }
  }

  // Animated counter
  function animateNumber(id, target) {
    const el = document.getElementById(id);
    if (!el) return;
    const duration = 600;
    const start = performance.now();
    function step(now) {
      const progress = Math.min((now - start) / duration, 1);
      el.textContent = Math.round(progress * target);
      if (progress < 1) requestAnimationFrame(step);
    }
    requestAnimationFrame(step);
  }

  // === CARREGAR QUARTOS ===
  async function carregarQuartos() {
    try {
      const snapshot = await getDocs(collection(db, "quartos"));
      const badge = document.getElementById("quartosCount");
      if (badge) badge.textContent = `${snapshot.size} quarto${snapshot.size !== 1 ? 's' : ''}`;

      if (snapshot.empty) {
        document.getElementById("quartosContainer").innerHTML = `
          <div class="empty-state"><i class="fas fa-bed"></i><p>Nenhum quarto encontrado</p></div>`;
        return;
      }

      let html = '<table><thead><tr><th>Nome do Quarto</th><th>Tipo</th><th>Capacidade</th><th>Status</th></tr></thead><tbody>';
      snapshot.forEach(d => {
        const quarto = d.data();
        const tipo = quarto.tipo || '-';
        const tipoClass = tipo.toLowerCase() === 'twin' ? 'accent-blue' : 'accent-yellow';
        html += `<tr>
          <td><span class="cell-room"><i class="fas fa-door-open"></i> ${quarto.room_id || 'N/A'}</span></td>
          <td><span style="color:var(--${tipoClass});font-weight:600">${tipo}</span></td>
          <td style="text-align:center">${quarto.capacidade || '-'} <i class="fas fa-user" style="color:var(--text-light);font-size:0.7rem"></i></td>
          <td><span class="status ativa">Disponível</span></td>
        </tr>`;
      });
      html += '</tbody></table>';
      document.getElementById("quartosContainer").innerHTML = html;
    } catch (error) {
      console.error("Erro ao carregar quartos:", error);
      document.getElementById("quartosContainer").innerHTML = '<div class="error"><i class="fas fa-exclamation-triangle"></i> Erro ao carregar quartos</div>';
    }
  }

  // === CARREGAR RESERVAS ===
  async function carregarReservas() {
    try {
      const snapshot = await getDocs(
        query(collection(db, "reservas"), orderBy("data_entrada", "desc"))
      );

      allReservas = [];
      snapshot.forEach(d => {
        allReservas.push({ id: d.id, ...d.data() });
      });

      const badge = document.getElementById("reservasCount");
      if (badge) badge.textContent = `${allReservas.length} reserva${allReservas.length !== 1 ? 's' : ''}`;

      renderReservas();
    } catch (error) {
      console.error("Erro ao carregar reservas:", error);
      document.getElementById("reservasContainer").innerHTML = '<div class="error"><i class="fas fa-exclamation-triangle"></i> Erro ao carregar reservas</div>';
    }
  }

  // === RENDER RESERVAS (filtered + searched) ===
  function renderReservas() {
    const searchTerm = (document.getElementById("searchReservas")?.value || "").toLowerCase();

    let filtered = allReservas;
    if (currentFilter !== "todas") {
      filtered = filtered.filter(r => (r.status || "ativa") === currentFilter);
    }
    if (searchTerm) {
      filtered = filtered.filter(r =>
        (r.nome_hospede || "").toLowerCase().includes(searchTerm) ||
        (r.room_id || "").toLowerCase().includes(searchTerm) ||
        (r.cc || "").toLowerCase().includes(searchTerm)
      );
    }

    if (filtered.length === 0) {
      document.getElementById("reservasContainer").innerHTML = `
        <div class="empty-state"><i class="fas fa-calendar-times"></i><p>Nenhuma reserva encontrada</p></div>`;
      return;
    }

    let html = `<table><thead><tr>
      <th>Hóspede</th><th>CC</th><th>Quarto</th>
      <th>Check-in</th><th>Check-out</th>
      <th>Código TTLock</th><th>Status</th><th></th>
    </tr></thead><tbody>`;

    filtered.forEach(res => {
      let entrada = 'N/A', saida = 'N/A';
      try {
        if (res.data_entrada && typeof res.data_entrada.toDate === 'function')
          entrada = res.data_entrada.toDate().toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
        else if (res.data_entrada)
          entrada = new Date(res.data_entrada).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch (e) { entrada = String(res.data_entrada); }

      try {
        if (res.data_saida && typeof res.data_saida.toDate === 'function')
          saida = res.data_saida.toDate().toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
        else if (res.data_saida)
          saida = new Date(res.data_saida).toLocaleDateString('pt-PT', { day: '2-digit', month: 'short', year: 'numeric' });
      } catch (e) { saida = String(res.data_saida); }

      const status = res.status || 'ativa';

      html += `<tr>
        <td class="cell-name">${res.nome_hospede || '-'}</td>
        <td class="cell-cc">${res.cc || '-'}</td>
        <td><span class="cell-room"><i class="fas fa-door-open"></i> ${res.room_id || '-'}</span></td>
        <td class="cell-date">${entrada}</td>
        <td class="cell-date">${saida}</td>
        <td><span class="cell-code">${res.codigo_ttlk || '-'}</span></td>
        <td><span class="status ${status}">${status}</span></td>
        <td>
          <div class="row-actions">
            ${status === 'ativa' ? `<button class="row-action danger" title="Cancelar reserva" data-id="${res.id}" data-action="cancel"><i class="fas fa-times"></i></button>` : ''}
            ${status === 'ativa' ? `<button class="row-action" title="Finalizar reserva" data-id="${res.id}" data-action="finish"><i class="fas fa-check"></i></button>` : ''}
          </div>
        </td>
      </tr>`;
    });

    html += '</tbody></table>';
    document.getElementById("reservasContainer").innerHTML = html;

    // Bind action buttons
    document.querySelectorAll(".row-action[data-action]").forEach(btn => {
      btn.addEventListener("click", async () => {
        const id = btn.dataset.id;
        const action = btn.dataset.action;
        const newStatus = action === "cancel" ? "cancelada" : "finalizada";
        const confirmMsg = action === "cancel"
          ? "Tem a certeza que quer cancelar esta reserva?"
          : "Marcar reserva como finalizada?";

        if (!confirm(confirmMsg)) return;

        try {
          await updateDoc(doc(db, "reservas", id), { status: newStatus });
          await carregarTudo();
        } catch (err) {
          console.error("Erro ao atualizar reserva:", err);
          alert("Erro ao atualizar reserva");
        }
      });
    });
  }

  // === CARREGAR TUDO ===
  async function carregarTudo() {
    await carregarEstatisticas();
    await carregarQuartos();
    await carregarReservas();
    await processarBloqueiosExpirados();
    await carregarBloqueios();
    await carregarHistoricoBloqueios();
    await carregarHistoricoReservas();
    await carregarHistoricoEstadias();
    await carregarHistoricoContas();
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

  function toDateStr(field) {
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

  // Export reservations
  function getReservasExportData() {
    const headers = ["Hóspede", "CC", "Email", "Telefone", "Quarto", "Check-in", "Check-out", "Código TTLock", "Status", "Preço/noite", "Total", "Extras", "Pagamento"];
    const rows = allReservas.map(r => [
      r.nome_hospede || "-",
      r.cc || "-",
      r.email || "-",
      r.telefone || "-",
      r.room_id || "-",
      toDateStr(r.data_entrada),
      toDateStr(r.data_saida),
      r.codigo_ttlk || "-",
      r.status || "ativa",
      r.preco_noite != null ? r.preco_noite + "€" : "-",
      r.total_pago != null ? r.total_pago + "€" : "-",
      (r.extras && r.extras.length) ? r.extras.join(", ") : "-",
      r.pagamento || "-"
    ]);
    return { headers, rows };
  }

  document.getElementById("exportReservasCSV")?.addEventListener("click", () => {
    const { headers, rows } = getReservasExportData();
    exportDataCSV(rows, headers, "reservas_goldenbeach.csv");
  });
  document.getElementById("exportReservasTXT")?.addEventListener("click", () => {
    const { headers, rows } = getReservasExportData();
    exportDataTXT(rows, headers, "reservas_goldenbeach.txt");
  });

  // Export active blocks
  function getBloqueiosExportData() {
    const headers = ["Data Início", "Data Fim", "Quartos", "Motivo", "Criado em"];
    const rows = allBloqueiosAtivos.map(b => [
      b.data_inicio || "-",
      b.data_fim || "-",
      (b.quartos || []).join(", "),
      b.motivo || "-",
      toDateStr(b.criado_em)
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
      toDateStr(b.criado_em),
      toDateStr(b.expirado_em)
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

  // Export reservation history
  function getHistoricoReservasExportData() {
    const headers = ["Hóspede", "CC", "Email", "Telefone", "Quarto", "Check-in", "Check-out", "Noites", "Total", "Status"];
    const rows = allHistoricoReservas.map(r => [
      r.nome_hospede || "-",
      r.cc || "-",
      r.email || "-",
      r.telefone || "-",
      r.room_id || "-",
      toDateStr(r.data_entrada),
      toDateStr(r.data_saida),
      Math.ceil((new Date(r.data_saida) - new Date(r.data_entrada)) / (1000*60*60*24)) || "-",
      r.total_pago ? r.total_pago + "€" : "-",
      r.status || "-"
    ]);
    return { headers, rows };
  }

  document.getElementById("exportHistoricoReservasCSV")?.addEventListener("click", () => {
    const { headers, rows } = getHistoricoReservasExportData();
    exportDataCSV(rows, headers, "historico_reservas_goldenbeach.csv");
  });
  document.getElementById("exportHistoricoReservasTXT")?.addEventListener("click", () => {
    const { headers, rows } = getHistoricoReservasExportData();
    exportDataTXT(rows, headers, "historico_reservas_goldenbeach.txt");
  });

  // Export stays history
  function getHistoricoEstadiasExportData() {
    const headers = ["Hóspede", "Email", "Quarto", "Check-in", "Check-out", "Noites", "Tarifa/noite", "Total"];
    const rows = allHistoricoEstadias.map(r => {
      const noites = Math.ceil((new Date(r.data_saida) - new Date(r.data_entrada)) / (1000*60*60*24));
      return [
        r.nome_hospede || "-",
        r.email || "-",
        r.room_id || "-",
        toDateStr(r.data_entrada),
        toDateStr(r.data_saida),
        noites || "-",
        r.preco_noite ? r.preco_noite + "€" : "-",
        r.total_pago ? r.total_pago + "€" : "-"
      ];
    });
    return { headers, rows };
  }

  document.getElementById("exportHistoricoEstadiasCSV")?.addEventListener("click", () => {
    const { headers, rows } = getHistoricoEstadiasExportData();
    exportDataCSV(rows, headers, "historico_estadias_goldenbeach.csv");
  });
  document.getElementById("exportHistoricoEstadiasTXT")?.addEventListener("click", () => {
    const { headers, rows } = getHistoricoEstadiasExportData();
    exportDataTXT(rows, headers, "historico_estadias_goldenbeach.txt");
  });

  // Export guest accounts
  function getHistoricoContasExportData() {
    const headers = ["Nome", "Email", "Telefone", "CC", "Nacionalidade", "Data Criação", "Status"];
    const rows = allHistoricoContas.map(c => [
      (c.firstName || "") + " " + (c.lastName || ""),
      c.email || "-",
      c.phone || "-",
      c.cc || "-",
      c.nationality || "-",
      c.createdAt ? toDateStr(c.createdAt) : "-",
      c.status || "ativa"
    ]);
    return { headers, rows };
  }

  document.getElementById("exportHistoricoContasCSV")?.addEventListener("click", () => {
    const { headers, rows } = getHistoricoContasExportData();
    exportDataCSV(rows, headers, "contas_criadas_goldenbeach.csv");
  });
  document.getElementById("exportHistoricoContasTXT")?.addEventListener("click", () => {
    const { headers, rows } = getHistoricoContasExportData();
    exportDataTXT(rows, headers, "contas_criadas_goldenbeach.txt");
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
    // Toggle room checkboxes based on full day checkbox
    const fullDayCheckbox = document.getElementById("blockFullDay");
    const blockRoomsSection = document.getElementById("blockRoomsSection");
    
    if (fullDayCheckbox) {
      fullDayCheckbox.addEventListener("change", () => {
        if (fullDayCheckbox.checked) {
          blockRoomsSection.style.opacity = "0.6";
          blockRoomsSection.style.pointerEvents = "none";
          document.querySelectorAll("#blockRoomCheckboxes input").forEach(cb => cb.checked = false);
        } else {
          blockRoomsSection.style.opacity = "1";
          blockRoomsSection.style.pointerEvents = "auto";
        }
      });
    }

    blockBtn.addEventListener("click", async () => {
      const startDate = document.getElementById("blockDateStart").value;
      const endDate = document.getElementById("blockDateEnd").value;
      const reason = document.getElementById("blockReason").value;
      const isFullDay = fullDayCheckbox && fullDayCheckbox.checked;
      const checkedRooms = Array.from(document.querySelectorAll("#blockRoomCheckboxes input:checked")).map(cb => cb.value);

      if (!startDate || !endDate) { alert("Selecione as datas de início e fim."); return; }
      if (!isFullDay && checkedRooms.length === 0) { alert("Selecione pelo menos um quarto ou ative 'Bloquear dia completo'."); return; }
      if (new Date(endDate) < new Date(startDate)) { alert("A data fim deve ser posterior à data início."); return; }

      try {
        // Get all rooms if full day
        let roomsToBlock = checkedRooms;
        if (isFullDay) {
          // Fetch all rooms from database
          const roomsSnap = await getDocs(collection(db, "quartos"));
          roomsToBlock = roomsSnap.docs.map(doc => doc.data().nome || doc.id);
        }

        await addDoc(collection(db, "bloqueios"), {
          data_inicio: startDate,
          data_fim: endDate,
          quartos: roomsToBlock,
          motivo: reason || "",
          tipo_bloqueio: isFullDay ? "completo" : "quartos",
          criado_por: "admin",
          criado_em: new Date()
        });
        alert(isFullDay ? "Dias bloqueados completamente com sucesso!" : "Quartos bloqueados com sucesso!");
        document.getElementById("blockDateStart").value = "";
        document.getElementById("blockDateEnd").value = "";
        document.getElementById("blockReason").value = "";
        if (fullDayCheckbox) fullDayCheckbox.checked = false;
        document.querySelectorAll("#blockRoomCheckboxes input:checked").forEach(cb => cb.checked = false);
        blockRoomsSection.style.opacity = "1";
        blockRoomsSection.style.pointerEvents = "auto";
        await processarBloqueiosExpirados();
        await carregarBloqueios();
        await carregarHistoricoBloqueios();
      } catch (err) {
        console.error("Erro ao bloquear datas:", err);
        alert("Erro ao bloquear datas.");
      }
    });
  }

  // === PROCESS EXPIRED BLOCKS ===
  async function processarBloqueiosExpirados() {
    try {
      const snapshot = await getDocs(collection(db, "bloqueios"));
      const hoje = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      for (const d of snapshot.docs) {
        const b = d.data();
        if (b.data_fim < hoje) {
          // Move to history collection
          await addDoc(collection(db, "historico_bloqueios"), {
            data_inicio: b.data_inicio,
            data_fim: b.data_fim,
            quartos: b.quartos,
            motivo: b.motivo || "",
            criado_em: b.criado_em,
            expirado_em: new Date()
          });
          // Delete from active blocks
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
            ${b.motivo ? `<div style="font-size:0.75rem;color:var(--warning);margin-top:2px;">Motivo: ${b.motivo}</div>` : ''}
            <div style="font-size:0.72rem;color:var(--text-light);margin-top:2px;">Expirado em: ${toDateStr(b.expirado_em)}</div>
          </div>
        </div>`;
      });
      html += '</div>';
      container.innerHTML = html;
    } catch (err) {
      console.error("Erro ao carregar histórico de bloqueios:", err);
    }
  }

  // === LOAD RESERVATION HISTORY ===
  async function carregarHistoricoReservas() {
    const container = document.getElementById("historicoReservasContainer");
    const badge = document.getElementById("historicoReservasCount");
    if (!container) return;

    try {
      const q = query(collection(db, "reservas"), where("status", "in", ["finalizada", "cancelada"]));
      const snapshot = await getDocs(q);
      allHistoricoReservas = [];
      snapshot.forEach(d => { allHistoricoReservas.push({ id: d.id, ...d.data() }); });

      if (badge) badge.textContent = `${allHistoricoReservas.length} registo${allHistoricoReservas.length !== 1 ? 's' : ''}`;

      if (allHistoricoReservas.length === 0) {
        container.innerHTML = '<p style="color:var(--text-light);font-size:0.85rem;">Nenhum registo no histórico.</p>';
        return;
      }

      renderHistoricoReservas();
    } catch (err) {
      console.error("Erro ao carregar histórico de reservas:", err);
    }
  }

  function renderHistoricoReservas() {
    const container = document.getElementById("historicoReservasContainer");
    const searchTerm = document.getElementById("searchHistoricoReservas")?.value?.toLowerCase() || "";

    let filtered = allHistoricoReservas.filter(r => {
      const matchesSearch = (r.nome_hospede || "").toLowerCase().includes(searchTerm) ||
                            (r.email || "").toLowerCase().includes(searchTerm) ||
                            (r.cc || "").toLowerCase().includes(searchTerm);
      const matchesFilter = currentFilterHistoricoReservas === "todas" || (r.status && r.status.toLowerCase() === currentFilterHistoricoReservas);
      return matchesSearch && matchesFilter;
    });

    if (filtered.length === 0) {
      container.innerHTML = '<p style="color:var(--text-light);font-size:0.85rem;">Nenhum registo encontrado.</p>';
      return;
    }

    let html = '<div style="display:flex;flex-direction:column;gap:10px;">';
    filtered.forEach(r => {
      const statusBadge = r.status === "finalizada" 
        ? '<span style="font-size:0.7rem;background:#27AE60;color:white;padding:2px 8px;border-radius:4px;">Finalizada</span>'
        : '<span style="font-size:0.7rem;background:#E74C3C;color:white;padding:2px 8px;border-radius:4px;">Cancelada</span>';
      
      html += `<div style="display:flex;justify-content:space-between;align-items:center;padding:12px 16px;background:rgba(39,174,96,0.06);border:1px solid rgba(39,174,96,0.15);border-radius:10px;">
        <div style="flex:1;">
          <div style="font-weight:700;font-size:0.88rem;color:var(--primary-dark);">${r.nome_hospede || "N/A"} ${statusBadge}</div>
          <div style="font-size:0.78rem;color:var(--text-light);margin-top:4px;">
            <strong>Check-in:</strong> ${toDateStr(r.data_entrada)} | <strong>Check-out:</strong> ${toDateStr(r.data_saida)} | <strong>Quarto:</strong> ${r.room_id || "-"}
          </div>
          <div style="font-size:0.78rem;color:var(--text-light);margin-top:2px;">
            <strong>Email:</strong> ${r.email || "-"} | <strong>Telefone:</strong> ${r.telefone || "-"}
          </div>
          <div style="font-size:0.78rem;color:var(--text-light);margin-top:2px;">
            <strong>Total:</strong> ${r.total_pago ? r.total_pago + "€" : "-"} | <strong>Pagamento:</strong> ${r.pagamento || "-"}
          </div>
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  // === LOAD STAYS HISTORY ===
  async function carregarHistoricoEstadias() {
    const container = document.getElementById("historicoEstadiasContainer");
    const badge = document.getElementById("historicoEstadiasCount");
    if (!container) return;

    try {
      const q = query(collection(db, "reservas"), where("status", "==", "finalizada"));
      const snapshot = await getDocs(q);
      allHistoricoEstadias = [];
      snapshot.forEach(d => { allHistoricoEstadias.push({ id: d.id, ...d.data() }); });

      if (badge) badge.textContent = `${allHistoricoEstadias.length} estadia${allHistoricoEstadias.length !== 1 ? 's' : ''}`;

      if (allHistoricoEstadias.length === 0) {
        container.innerHTML = '<p style="color:var(--text-light);font-size:0.85rem;">Nenhuma estadia registada.</p>';
        return;
      }

      renderHistoricoEstadias();
    } catch (err) {
      console.error("Erro ao carregar histórico de estadias:", err);
    }
  }

  function renderHistoricoEstadias() {
    const container = document.getElementById("historicoEstadiasContainer");
    const searchTerm = document.getElementById("searchHistoricoEstadias")?.value?.toLowerCase() || "";

    let filtered = allHistoricoEstadias.filter(r => {
      return (r.nome_hospede || "").toLowerCase().includes(searchTerm) ||
             (r.email || "").toLowerCase().includes(searchTerm) ||
             (r.room_id || "").toLowerCase().includes(searchTerm);
    });

    if (filtered.length === 0) {
      container.innerHTML = '<p style="color:var(--text-light);font-size:0.85rem;">Nenhuma estadia encontrada.</p>';
      return;
    }

    let html = '<div style="display:flex;flex-direction:column;gap:10px;">';
    filtered.forEach(r => {
      const dataEntrada = r.data_entrada && typeof r.data_entrada.toDate === 'function'
        ? r.data_entrada.toDate() : new Date(r.data_entrada);
      const dataSaida = r.data_saida && typeof r.data_saida.toDate === 'function'
        ? r.data_saida.toDate() : new Date(r.data_saida);
      const noites = Math.ceil((dataSaida - dataEntrada) / (1000*60*60*24));
      
      html += `<div style="padding:12px 16px;background:rgba(41,128,185,0.06);border:1px solid rgba(41,128,185,0.15);border-radius:10px;">
        <div style="font-weight:700;font-size:0.88rem;color:var(--primary-dark);">${r.nome_hospede || "N/A"} • Quarto: ${r.room_id || "-"}</div>
        <div style="font-size:0.78rem;color:var(--text-light);margin-top:4px;">
          <strong>Período:</strong> ${toDateStr(r.data_entrada)} a ${toDateStr(r.data_saida)} (${noites} noite${noites !== 1 ? 's' : ''})
        </div>
        <div style="font-size:0.78rem;color:var(--text-light);margin-top:2px;">
          <strong>Hóspede:</strong> ${r.email || "-"} | <strong>Telefone:</strong> ${r.telefone || "-"}
        </div>
        <div style="font-size:0.78rem;color:var(--text-light);margin-top:2px;">
          <strong>Tarifa:</strong> ${r.preco_noite ? r.preco_noite + "€/noite" : "-"} | <strong>Total:</strong> ${r.total_pago ? r.total_pago + "€" : "-"}
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  // === LOAD GUEST ACCOUNTS HISTORY ===
  async function carregarHistoricoContas() {
    const container = document.getElementById("historicoContasContainer");
    const badge = document.getElementById("historicoContasCount");
    if (!container) return;

    try {
      const snapshot = await getDocs(collection(db, "guests"));
      allHistoricoContas = [];
      snapshot.forEach(d => { allHistoricoContas.push({ id: d.id, ...d.data() }); });

      if (badge) badge.textContent = `${allHistoricoContas.length} conta${allHistoricoContas.length !== 1 ? 's' : ''}`;

      if (allHistoricoContas.length === 0) {
        container.innerHTML = '<p style="color:var(--text-light);font-size:0.85rem;">Nenhuma conta criada.</p>';
        return;
      }

      renderHistoricoContas();
    } catch (err) {
      console.error("Erro ao carregar histórico de contas:", err);
    }
  }

  function renderHistoricoContas() {
    const container = document.getElementById("historicoContasContainer");
    const searchTerm = document.getElementById("searchHistoricoContas")?.value?.toLowerCase() || "";

    let filtered = allHistoricoContas.filter(c => {
      const fullName = (c.firstName || "") + " " + (c.lastName || "");
      return fullName.toLowerCase().includes(searchTerm) ||
             (c.email || "").toLowerCase().includes(searchTerm) ||
             (c.phone || "").toLowerCase().includes(searchTerm);
    });

    if (filtered.length === 0) {
      container.innerHTML = '<p style="color:var(--text-light);font-size:0.85rem;">Nenhuma conta encontrada.</p>';
      return;
    }

    let html = '<div style="display:flex;flex-direction:column;gap:10px;">';
    filtered.forEach(c => {
      const statusBadge = c.status === "ativa" 
        ? '<span style="font-size:0.7rem;background:#27AE60;color:white;padding:2px 8px;border-radius:4px;">Ativa</span>'
        : '<span style="font-size:0.7rem;background:#95A5A6;color:white;padding:2px 8px;border-radius:4px;">Inativa</span>';
      
      html += `<div style="padding:12px 16px;background:rgba(155,89,182,0.06);border:1px solid rgba(155,89,182,0.15);border-radius:10px;">
        <div style="font-weight:700;font-size:0.88rem;color:var(--primary-dark);">${c.firstName || ""} ${c.lastName || ""} ${statusBadge}</div>
        <div style="font-size:0.78rem;color:var(--text-light);margin-top:4px;">
          <strong>Email:</strong> ${c.email || "-"} | <strong>Telefone:</strong> ${c.phone || "-"}
        </div>
        <div style="font-size:0.78rem;color:var(--text-light);margin-top:2px;">
          <strong>CC:</strong> ${c.cc || "-"} | <strong>Nacionalidade:</strong> ${c.nationality || "-"}
        </div>
        <div style="font-size:0.75rem;color:var(--text-light);margin-top:2px;">
          Criada em: ${c.createdAt ? toDateStr(c.createdAt) : "-"}
        </div>
      </div>`;
    });
    html += '</div>';
    container.innerHTML = html;
  }

  // Setup event listeners for history filters
  document.querySelectorAll("[data-filter-historico-reservas]").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll("[data-filter-historico-reservas]").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      currentFilterHistoricoReservas = tab.dataset.filterHistoricoReservas;
      renderHistoricoReservas();
    });
  });

  document.getElementById("searchHistoricoReservas")?.addEventListener("input", () => renderHistoricoReservas());
  document.getElementById("searchHistoricoEstadias")?.addEventListener("input", () => renderHistoricoEstadias());
  document.getElementById("searchHistoricoContas")?.addEventListener("input", () => renderHistoricoContas());

  await carregarTudo();
});
