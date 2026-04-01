import { db, auth } from "./firebase.js";
import { translatePage, setupLanguageToggle, t } from "./translations.js";
import { obterIdiomaDeNacionalidade } from "./language-map.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", async () => {
  // Configurar traduções
  translatePage();
  setupLanguageToggle();

  // Carrega dados da sessão
  const bookingData = JSON.parse(sessionStorage.getItem("pendingBooking"));

  if (!bookingData) {
    const lang = localStorage.getItem("language") || "pt";
    alert(lang === "pt"
      ? "Nenhuma reserva configurada. Redirecionando..."
      : "No booking data. Redirecting...");
    window.location.href = "booking.html";
    return;
  }

  // Preencher resumo da reserva
  const summaryDiv = document.getElementById("paymentSummary");
  if (summaryDiv) {
    const lang = localStorage.getItem("language") || "pt";
    summaryDiv.innerHTML = `
      <div class="payment-summary">
        <h3>${lang === "pt" ? "Resumo da Reserva" : "Booking Summary"}</h3>
        <div class="summary-item">
          <span>${lang === "pt" ? "Quarto:" : "Room:"}</span>
          <strong>${bookingData.quarto}</strong>
        </div>
        <div class="summary-item">
          <span>${lang === "pt" ? "Hóspede:" : "Guest:"}</span>
          <strong>${bookingData.firstName} ${bookingData.lastName}</strong>
        </div>
        <div class="summary-item">
          <span>${lang === "pt" ? "Data de Entrada:" : "Check-in:"}</span>
          <strong>${new Date(bookingData.entrada).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-US")}</strong>
        </div>
        <div class="summary-item">
          <span>${lang === "pt" ? "Data de Saída:" : "Check-out:"}</span>
          <strong>${new Date(bookingData.saida).toLocaleDateString(lang === "pt" ? "pt-PT" : "en-US")}</strong>
        </div>
        <div class="summary-item">
          <span>${lang === "pt" ? "Noites:" : "Nights:"}</span>
          <strong>${bookingData.nights}</strong>
        </div>
        ${bookingData.extras.length > 0 ? `
        <div class="summary-item">
          <span>${lang === "pt" ? "Extras:" : "Extras:"}</span>
          <strong>${bookingData.extras.join(", ")}</strong>
        </div>
        ` : ""}
        <div class="summary-item total">
          <span>${lang === "pt" ? "Total:" : "Total:"}</span>
          <strong>${bookingData.total.toFixed(2)} EUR</strong>
        </div>
      </div>
    `;
  }

  // Processar pagamento
  const paymentForm = document.getElementById("paymentForm");
  if (paymentForm) {
    paymentForm.addEventListener("submit", async (e) => {
      e.preventDefault();

      const lang = localStorage.getItem("language") || "pt";
      const submitBtn = paymentForm.querySelector("button[type='submit']");
      const originalText = submitBtn.textContent;
      submitBtn.disabled = true;

      // Criar elemento de status
      const statusDiv = document.createElement("div");
      statusDiv.style.cssText = `
        position: fixed;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        background: white;
        padding: 30px;
        border-radius: 12px;
        box-shadow: 0 10px 40px rgba(0,0,0,0.3);
        z-index: 10000;
        min-width: 300px;
        text-align: center;
      `;
      statusDiv.id = "paymentStatus";
      document.body.appendChild(statusDiv);

      const updateStatus = (message, type = "info") => {
        const colors = {
          info: "#2980B9",
          loading: "#F39C12",
          success: "#27AE60",
          error: "#E74C3C"
        };
        
        statusDiv.innerHTML = `
          <div style="color: ${colors[type]}; font-weight: bold; margin-bottom: 10px;">
            ${type === "loading" ? `
              <div style="display: inline-block; width: 30px; height: 30px; border: 3px solid ${colors[type]}; border-top: 3px solid transparent; border-radius: 50%; animation: spin 1s linear infinite;"></div>
            ` : type === "success" ? "<i class='fas fa-check-circle' style='font-size: 2rem;'></i>" : ""}
          </div>
          <p>${message}</p>
        `;
      };

      try {
        updateStatus(
          lang === "pt" ? "Processando pagamento..." : "Processing payment...",
          "loading"
        );

        // Gerar código TTLOCK único
        const codigoTTLock = gerarCodigoTTLock();
        console.log("Código TTLock gerado:", codigoTTLock);

        updateStatus(
          lang === "pt" ? "Criando reserva..." : "Creating booking...",
          "loading"
        );

        // Criar documento de reserva no Firebase
        const reservaDoc = await addDoc(collection(db, "reservas"), {
          nome_hospede: bookingData.firstName + " " + bookingData.lastName,
          email: bookingData.email,
          cc: bookingData.cc,
          phone: bookingData.phone,
          quarto: bookingData.quarto,
          data_entrada: new Date(bookingData.entrada),
          data_saida: new Date(bookingData.saida),
          hora_checkin: bookingData.hora_checkin,
          hora_checkout: bookingData.hora_checkout,
          noites: bookingData.nights,
          preco_quarto: bookingData.roomPrice,
          extras: bookingData.extras,
          extras_total: bookingData.extrasTotal,
          total_reserva: bookingData.total,
          codigo_ttlk: codigoTTLock,
          status: "ativa",
          data_criacao: serverTimestamp(),
          data_pagamento: new Date(),
          metodo_pagamento: document.getElementById("paymentMethod")?.value || "card"
        });

        console.log("Reserva criada:", reservaDoc.id);

        updateStatus(
          lang === "pt" ? "Gerando recibo..." : "Generating receipt...",
          "loading"
        );

        // Gerar PDF no servidor (em vez de no cliente)
        const pdfResponse = await fetch("/api/generate-invoice-pdf", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            bookingData: bookingData,
            language: idiomaCliente
          })
        });

        if (!pdfResponse.ok) {
          const errorData = await pdfResponse.json();
          throw new Error(`Erro ao gerar PDF: ${errorData.mensagem}`);
        }

        const pdfData = await pdfResponse.json();
        const pdfBase64 = pdfData.pdfBase64;

        // Determinar idioma baseado na nacionalidade do cliente
        const idiomaCliente = obterIdiomaDeNacionalidade(bookingData.nationality || "português");

        updateStatus(
          lang === "pt" ? "Enviando fatura para email..." : "Sending invoice to email...",
          "loading"
        );

        // Enviar email com fatura (no idioma do cliente baseado na nacionalidade)
        const emailInvoice = await fetch("/api/send-invoice", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            to: bookingData.email,
            subject: idiomaCliente === "pt" ? "Golden Beach - Confirmação de Reserva" : "Golden Beach - Booking Confirmation",
            guestName: bookingData.firstName,
            pdfBase64: pdfBase64,
            language: idiomaCliente,
            bookingData: bookingData
          })
        });

        if (!emailInvoice.ok) {
          const errorData = await emailInvoice.json();
          throw new Error(`Email fatura: ${errorData.mensagem}`);
        }

        const invoiceResponse = await emailInvoice.json();
        console.log("Email fatura:", invoiceResponse);

        updateStatus(
          lang === "pt" ? "Enviando código de acesso..." : "Sending access code...",
          "loading"
        );

        // Enviar email com código TTLOCK (no idioma do cliente)
        const emailTTLock = await fetch("/api/send-ttlock-code", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: bookingData.email,
            guestName: bookingData.firstName,
            code: codigoTTLock,
            roomId: bookingData.quarto,
            checkInDate: new Date(bookingData.entrada).toLocaleDateString(idiomaCliente === "pt" ? "pt-PT" : "en-US"),
            checkOutDate: new Date(bookingData.saida).toLocaleDateString(idiomaCliente === "pt" ? "pt-PT" : "en-US"),
            language: idiomaCliente
          })
        });

        if (!emailTTLock.ok) {
          const errorData = await emailTTLock.json();
          throw new Error(`Email código: ${errorData.mensagem}`);
        }

        const ttlockResponse = await emailTTLock.json();
        console.log("Email código TTLock:", ttlockResponse);

        // Limpar sessionStorage
        sessionStorage.removeItem("pendingBooking");

        // Sucesso
        updateStatus(
          lang === "pt" 
            ? `Sucesso! Código de acesso: ${codigoTTLock}\n\nVerifique seu email para detalhes completos.` 
            : `Success! Access code: ${codigoTTLock}\n\nCheck your email for complete details.`,
          "success"
        );

        // Aguardar 3 segundos e redirecionar
        setTimeout(() => {
          window.location.href = "index.html";
        }, 3000);

      } catch (error) {
        console.error("Erro no pagamento:", error);
        
        let errorMessage = "";
        if (lang === "pt") {
          errorMessage = `Erro: ${error.message || "Erro ao processar pagamento. Tente novamente."}`;
        } else {
          errorMessage = `Error: ${error.message || "Error processing payment. Please try again."}`;
        }

        updateStatus(errorMessage, "error");

        // Remover status após 4 segundos
        setTimeout(() => {
          statusDiv.remove();
          submitBtn.disabled = false;
          submitBtn.textContent = originalText;
        }, 4000);
      }
    });
  }
});

// Função para gerar código TTLOCK
function gerarCodigoTTLock() {
  // Formato: XXXXXX (6 dígitos numéricos)
  return Math.floor(100000 + Math.random() * 900000).toString();
}
