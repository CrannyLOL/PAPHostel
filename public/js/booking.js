import { db } from "./firebase.js";
import { translatePage, setupLanguageToggle, t } from "./translations.js";
import {
  collection,
  getDocs,
  addDoc,
  query,
  where
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
  // Configurar traduções
  translatePage();
  setupLanguageToggle();

  /* ===============================
     🎥 VÍDEOS DE FUNDO (ROTATIVOS)
     =============================== */
  const videos = document.querySelectorAll(".bg-video");
  let videoAtual = 0;

  if (videos.length > 0) {
    videos[0].classList.add("active");
  }

  videos.forEach(video => {
    video.playbackRate = 0.5;
  });

  setInterval(() => {
    videos[videoAtual].classList.remove("active");
    videoAtual = (videoAtual + 1) % videos.length;
    videos[videoAtual].classList.add("active");
  }, 10000);

  /* ===============================
     🏨 FORMULÁRIO DE RESERVA
     =============================== */
  const form = document.getElementById("bookingForm");

  // � SUBMETER RESERVA - redirect to payment
  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const entrada = document.getElementById("entrada").value;
    const saida = document.getElementById("saida").value;
    const quarto = document.getElementById("quarto").value;
    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const password = document.getElementById("bookingPassword").value;
    const email = document.getElementById("email").value.trim();
    const cc = document.getElementById("cc").value.trim();
    const phone = document.getElementById("phone").value.trim();

    // Validações
    if (!entrada || !saida) {
      const lang = localStorage.getItem("language") || "pt";
      alert(lang === "pt"
        ? "Por favor selecione as datas de check-in e check-out no calendário!"
        : "Please select check-in and check-out dates on the calendar!");
      return;
    }

    if (!quarto) {
      const lang = localStorage.getItem("language") || "pt";
      alert(lang === "pt"
        ? "Por favor selecione um quarto!"
        : "Please select a room!");
      return;
    }

    const dataEntrada = new Date(entrada);
    const dataSaida = new Date(saida);

    if (dataSaida <= dataEntrada) {
      const lang = localStorage.getItem("language") || "pt";
      alert(lang === "pt"
        ? "A data de saída tem de ser posterior à data de entrada!"
        : "Check-out date must be after check-in date!");
      return;
    }

    if (!firstName || !lastName || !password || !email || !cc || !phone) {
      const lang = localStorage.getItem("language") || "pt";
      alert(lang === "pt"
        ? "Por favor preencha todos os campos obrigatórios!"
        : "Please fill in all required fields!");
      return;
    }

    // Validar credenciais contra a base de dados
    const lang = localStorage.getItem("language") || "pt";
    try {
      const guestQuery = query(
        collection(db, "guests"),
        where("firstName", "==", firstName),
        where("lastName", "==", lastName),
        where("cc", "==", cc),
        where("email", "==", email)
      );

      const guestSnapshot = await getDocs(guestQuery);

      if (guestSnapshot.empty) {
        alert(lang === "pt"
          ? "Credenciais erradas ou conta não encontrada! Verifique o Nome, Sobrenome, Email e Cartão de Cidadão."
          : "Wrong credentials or account not found! Please verify your First Name, Last Name, Email, and ID Card.");
        return;
      }

      // Verificar se a palavra-passe está correta
      const matchingGuest = guestSnapshot.docs.find(doc => doc.data().password === password);
      if (!matchingGuest) {
        alert(lang === "pt"
          ? "Palavra-passe incorreta!"
          : "Wrong password!");
        return;
      }

    } catch (error) {
      console.error("Erro ao validar credenciais:", error);
      alert(lang === "pt"
        ? "Erro ao validar credenciais. Tente novamente mais tarde."
        : "Error validating credentials. Please try again later.");
      return;
    }

    // Get room price
    const selectedCard = document.querySelector(`.room-card[data-room="${quarto}"]`);
    const roomPrice = selectedCard ? parseFloat(selectedCard.dataset.price) || 0 : 0;
    const nights = Math.ceil((dataSaida - dataEntrada) / (1000*60*60*24));

    let extrasTotal = 0;
    const extrasSelected = [];
    document.querySelectorAll('.extras-grid input[type="checkbox"]:checked').forEach(cb => {
      const val = parseFloat(cb.value);
      const name = cb.closest('.extra-item').querySelector('.extra-name').textContent;
      if (cb.name === 'extra-breakfast' || cb.name === 'extra-parking') {
        extrasTotal += val * nights;
      } else {
        extrasTotal += val;
      }
      extrasSelected.push(name);
    });

    const total = (roomPrice * nights) + extrasTotal;

    // Store booking data in sessionStorage for payment page
    const bookingData = {
      firstName: firstName,
      lastName: lastName,
      email: email,
      cc: cc,
      phone: phone,
      quarto: quarto,
      entrada: entrada,
      saida: saida,
      hora_checkin: document.getElementById("checkinTime").value,
      hora_checkout: document.getElementById("checkoutTime").value,
      nights: nights,
      roomPrice: roomPrice,
      extrasTotal: extrasTotal,
      extras: extrasSelected,
      total: total
    };

    sessionStorage.setItem("pendingBooking", JSON.stringify(bookingData));
    window.location.href = "payment.html";
  });
});
