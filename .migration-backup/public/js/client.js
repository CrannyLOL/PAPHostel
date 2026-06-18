import { db, auth } from "./firebase.js";
import {
  collection,
  getDocs,
  query,
  where,
  onAuthStateChanged,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { signOut as authSignOut } from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";

let currentUser = null;
let userReservas = [];
let userHistoricoEstadias = [];

document.addEventListener("DOMContentLoaded", async () => {
  // Logout button
  const logoutBtn = document.getElementById("logoutBtn");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
      await authSignOut(auth);
      localStorage.removeItem("userEmail");
      window.location.href = "index.html";
    });
  }

  // Check authentication
  onAuthStateChanged(auth, async (user) => {
    if (!user) {
      alert("Por favor faça login primeiro");
      window.location.href = "login.html";
      return;
    }

    currentUser = user;
    
    // Load user data
    try {
      await carregarDadosUtilizador();
      await carregarReservas();
      await carregarHistoricoEstadias();
    } catch (err) {
      console.error("Erro ao carregar dados:", err);
      alert("Erro ao carregar dados do perfil");
    }
  });
});

async function carregarDadosUtilizador() {
  try {
    const guestsRef = collection(db, "guests");
    const q = query(guestsRef, where("email", "==", currentUser.email));
    const snapshot = await getDocs(q);

    if (snapshot.empty) {
      console.error("Utilizador não encontrado na base de dados");
      return;
    }

    const userData = snapshot.docs[0].data();
    
    // Update welcome message
    const welcomeMsg = document.getElementById("welcomeMsg");
    if (welcomeMsg) {
      welcomeMsg.textContent = `Bem-vindo, ${userData.firstName || "Utilizador"}!`;
    }

    // Populate personal info
    const fullName = `${userData.firstName || ""} ${userData.lastName || ""}`.trim();
    document.getElementById("fullName").textContent = fullName || "-";
    document.getElementById("emailDisplay").textContent = userData.email || "-";
    document.getElementById("phone").textContent = userData.phone || "-";
    document.getElementById("nationality").textContent = userData.nationality || "-";
    
    // Mask CC number
    if (userData.cc) {
      const ccMasked = userData.cc.substring(0, 2) + " **** **** " + userData.cc.substring(userData.cc.length - 2);
      document.getElementById("ccDisplay").textContent = ccMasked;
    }
    
    // Format creation date
    if (userData.createdAt) {
      let createdDate;
      if (typeof userData.createdAt.toDate === 'function') {
        createdDate = userData.createdAt.toDate();
      } else if (userData.createdAt instanceof Date) {
        createdDate = userData.createdAt;
      } else {
        createdDate = new Date(userData.createdAt);
      }
      document.getElementById("createdAtDisplay").textContent = createdDate.toLocaleDateString('pt-PT', {
        day: '2-digit',
        month: 'long',
        year: 'numeric'
      });
    }

  } catch (err) {
    console.error("Erro ao carregar dados do utilizador:", err);
  }
}

async function carregarReservas() {
  try {
    const container = document.getElementById("reservasContainer");
    const countBadge = document.getElementById("reservasCount");

    const reservasRef = collection(db, "reservas");
    const q = query(
      reservasRef,
      where("email", "==", currentUser.email)
    );
    
    const snapshot = await getDocs(q);
    userReservas = [];
    snapshot.forEach(doc => {
      userReservas.push({ id: doc.id, ...doc.data() });
    });

    // Sort by check-in date (most recent first)
    userReservas.sort((a, b) => {
      const dateA = a.data_entrada && typeof a.data_entrada.toDate === 'function' 
        ? a.data_entrada.toDate() 
        : new Date(a.data_entrada);
      const dateB = b.data_entrada && typeof b.data_entrada.toDate === 'function' 
        ? b.data_entrada.toDate() 
        : new Date(b.data_entrada);
      return dateB - dateA;
    });

    if (countBadge) countBadge.textContent = `${userReservas.length} reservas`;

    if (userReservas.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-calendar-times"></i>
          <p>Não tem nenhuma reserva ainda</p>
        </div>
      `;
      return;
    }

    renderReservas();
  } catch (err) {
    console.error("Erro ao carregar reservas:", err);
    document.getElementById("reservasContainer").innerHTML = 
      '<p style="color: red; text-align: center;">Erro ao carregar reservas</p>';
  }
}

function renderReservas() {
  const container = document.getElementById("reservasContainer");
  let html = '';

  userReservas.forEach(reserva => {
    let checkIn = 'N/A', checkOut = 'N/A';
    
    try {
      if (reserva.data_entrada && typeof reserva.data_entrada.toDate === 'function') {
        checkIn = reserva.data_entrada.toDate().toLocaleDateString('pt-PT', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        });
      } else if (reserva.data_entrada) {
        checkIn = new Date(reserva.data_entrada).toLocaleDateString('pt-PT', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        });
      }
    } catch (e) {
      checkIn = String(reserva.data_entrada);
    }

    try {
      if (reserva.data_saida && typeof reserva.data_saida.toDate === 'function') {
        checkOut = reserva.data_saida.toDate().toLocaleDateString('pt-PT', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        });
      } else if (reserva.data_saida) {
        checkOut = new Date(reserva.data_saida).toLocaleDateString('pt-PT', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        });
      }
    } catch (e) {
      checkOut = String(reserva.data_saida);
    }

    const status = reserva.status || 'ativa';
    const totalPrice = reserva.total_pago ? `${reserva.total_pago}€` : '-';
    const pricePerNight = reserva.preco_noite ? `${reserva.preco_noite}€` : '-';

    html += `
      <div class="reservation-card ${status}">
        <div class="reservation-header">
          <div class="room-name">
            <i class="fas fa-door-open"></i>
            ${reserva.room_id || 'Quarto'}
          </div>
          <span class="status-badge ${status}">${status}</span>
        </div>
        <div class="reservation-details">
          <div>
            <strong>Check-in:</strong>
            <span>${checkIn}</span>
          </div>
          <div>
            <strong>Check-out:</strong>
            <span>${checkOut}</span>
          </div>
          <div>
            <strong>Preço/Noite:</strong>
            <span>${pricePerNight}</span>
          </div>
          <div>
            <strong>Total:</strong>
            <span>${totalPrice}</span>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}

async function carregarHistoricoEstadias() {
  try {
    const container = document.getElementById("stadiasContainer");
    const countBadge = document.getElementById("stadiastCount");

    // Load completed reservations as "estadias"
    const completedReservas = userReservas.filter(r => r.status === 'finalizada');

    if (countBadge) countBadge.textContent = `${completedReservas.length} estadias`;

    if (completedReservas.length === 0) {
      container.innerHTML = `
        <div class="empty-state">
          <i class="fas fa-archive"></i>
          <p>Não tem nenhuma estadia completada</p>
        </div>
      `;
      return;
    }

    renderHistoricoEstadias(completedReservas);
  } catch (err) {
    console.error("Erro ao carregar histórico de estadias:", err);
    document.getElementById("stadiasContainer").innerHTML = 
      '<p style="color: red; text-align: center;">Erro ao carregar histórico</p>';
  }
}

function renderHistoricoEstadias(estadias) {
  const container = document.getElementById("stadiasContainer");
  let html = '';

  estadias.forEach(estadia => {
    let checkIn = 'N/A', checkOut = 'N/A';
    
    try {
      if (estadia.data_entrada && typeof estadia.data_entrada.toDate === 'function') {
        checkIn = estadia.data_entrada.toDate().toLocaleDateString('pt-PT', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        });
      } else if (estadia.data_entrada) {
        checkIn = new Date(estadia.data_entrada).toLocaleDateString('pt-PT', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        });
      }
    } catch (e) {
      checkIn = String(estadia.data_entrada);
    }

    try {
      if (estadia.data_saida && typeof estadia.data_saida.toDate === 'function') {
        checkOut = estadia.data_saida.toDate().toLocaleDateString('pt-PT', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        });
      } else if (estadia.data_saida) {
        checkOut = new Date(estadia.data_saida).toLocaleDateString('pt-PT', { 
          day: '2-digit', 
          month: 'short', 
          year: 'numeric' 
        });
      }
    } catch (e) {
      checkOut = String(estadia.data_saida);
    }

    const totalPrice = estadia.total_pago ? `${estadia.total_pago}€` : '-';

    html += `
      <div class="reservation-card completed">
        <div class="reservation-header">
          <div class="room-name">
            <i class="fas fa-door-open"></i>
            ${estadia.room_id || 'Quarto'}
          </div>
          <span class="status-badge finalizada">Completada</span>
        </div>
        <div class="reservation-details">
          <div>
            <strong>Check-in:</strong>
            <span>${checkIn}</span>
          </div>
          <div>
            <strong>Check-out:</strong>
            <span>${checkOut}</span>
          </div>
          <div>
            <strong>Total Pago:</strong>
            <span>${totalPrice}</span>
          </div>
          <div>
            <strong>Observações:</strong>
            <span>${estadia.observacoes || '-'}</span>
          </div>
        </div>
      </div>
    `;
  });

  container.innerHTML = html;
}
