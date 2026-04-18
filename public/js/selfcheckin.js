import { db } from "./firebase.js";
import { obterIdiomaDeNacionalidade } from "./language-map.js";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";

let reservasDisponiveis = []; // Armazenar todas as reservas encontradas

export function setupSelfCheckin() {
  const form = document.getElementById("checkinForm");

  if (!form) return;

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    const nome = form.nome.value.trim();
    const cc = form.cc.value.trim();
    const lang = localStorage.getItem("language") || "pt";

    if (!nome || !cc) {
      const msg = lang === "pt" ? "Preencha todos os campos!" : "Fill in all fields!";
      alert(msg);
      return;
    }

    try {
      // 🔍 Procurar TODAS as reservas com essas credenciais
      const q = query(
        collection(db, "reservas"),
        where("nome_hospede", "==", nome),
        where("cc", "==", cc),
        where("status", "==", "ativa")
      );

      const snapshot = await getDocs(q);

      if (snapshot.empty) {
        const msg = lang === "pt"
          ? "Credenciais erradas ou nenhuma reserva ativa encontrada!"
          : "Wrong credentials or no active booking found!";
        alert(msg);
        form.reset();
        document.getElementById("multiReservasContainer").style.display = "none";
        return;
      }

      // Armazenar todas as reservas
      reservasDisponiveis = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));

      // ======== SE HÁ APENAS 1 RESERVA ========
      if (reservasDisponiveis.length === 1) {
        document.getElementById("multiReservasContainer").style.display = "none";
        await processarCheckin(reservasDisponiveis[0], lang);
        form.reset();
        return;
      }

      // ======== SE HÁ MÚLTIPLAS RESERVAS ========
      mostrarMultiplosQuartos(reservasDisponiveis, lang);

    } catch (error) {
      console.error("Erro ao verificar credenciais:", error);
      const lang = localStorage.getItem("language") || "pt";
      const msg = lang === "pt"
        ? "❌ Erro ao verificar credenciais. Tente novamente mais tarde."
        : "❌ Error verifying credentials. Please try again later.";
      alert(msg);
    }
  });
}

/**
 * Mostrar checkboxes para múltiplos quartos
 */
function mostrarMultiplosQuartos(reservas, lang) {
  const container = document.getElementById("multiReservasContainer");
  const checkboxDiv = document.getElementById("quartosCheckbox");

  checkboxDiv.innerHTML = "";

  reservas.forEach((reserva, index) => {
    const checkbox = document.createElement("div");
    checkbox.style.marginBottom = "10px";

    const checkboxInput = document.createElement("input");
    checkboxInput.type = "checkbox";
    checkboxInput.id = `quarto_${index}`;
    checkboxInput.value = index;
    checkboxInput.checked = true;

    const label = document.createElement("label");
    label.htmlFor = `quarto_${index}`;
    label.style.marginLeft = "8px";
    label.style.cursor = "pointer";

    const entrada = new Date(reserva.data_entrada.toDate ? reserva.data_entrada.toDate() : reserva.data_entrada);
    const saida = new Date(reserva.data_saida.toDate ? reserva.data_saida.toDate() : reserva.data_saida);

    const dataStr = lang === "pt"
      ? `${entrada.toLocaleDateString("pt-PT")} - ${saida.toLocaleDateString("pt-PT")}`
      : `${entrada.toLocaleDateString("en-US")} - ${saida.toLocaleDateString("en-US")}`;

    label.innerHTML = `<strong>${lang === "pt" ? "Quarto" : "Room"}: ${reserva.quarto}</strong> (${dataStr})`;

    checkbox.appendChild(checkboxInput);
    checkbox.appendChild(label);
    checkboxDiv.appendChild(checkbox);
  });

  container.style.display = "block";

  // Modificar o botão submit para processar múltiplas reservas
  const form = document.getElementById("checkinForm");
  const submitBtn = form.querySelector("button[type='submit']");
  const originalText = submitBtn.textContent;

  submitBtn.textContent = lang === "pt" ? "Gerar Códigos" : "Generate Codes";

  const oldHandler = form.onsubmit;
  form.onsubmit = async (e) => {
    e.preventDefault();

    const selecionados = [];
    document.querySelectorAll("#quartosCheckbox input[type='checkbox']:checked").forEach(checkbox => {
      selecionados.push(parseInt(checkbox.value));
    });

    if (selecionados.length === 0) {
      const msg = lang === "pt" ? "Selecione pelo menos 1 quarto!" : "Select at least 1 room!";
      alert(msg);
      return;
    }

    // Processar cada quarto selecionado
    const codigos = [];
    for (const index of selecionados) {
      const reserva = reservasDisponiveis[index];
      const codigoGerado = await processarCheckin(reserva, lang);
      codigos.push({
        quarto: reserva.quarto,
        codigo: codigoGerado
      });
    }

    // Mostrar todos os códigos
    mostrarCodigos(codigos, lang);

    // Reset form e UI
    form.reset();
    document.getElementById("multiReservasContainer").style.display = "none";
    submitBtn.textContent = originalText;
    form.onsubmit = oldHandler;
  };
}

/**
 * Processar check-in de uma única reserva
 */
async function processarCheckin(reserva, lang) {
  const lang_site = lang || localStorage.getItem("language") || "pt";

  // ✓ Verificar se já foi realizado self check-in
  if (reserva.status_checkin === "realizado") {
    const msgJaRealizado = lang_site === "pt"
      ? `Quarto ${reserva.quarto}: Check-in já realizado!`
      : `Room ${reserva.quarto}: Check-in already completed!`;
    console.log(msgJaRealizado);
    return null;
  }

  let dataEnt, dataSai;
  try {
    dataEnt = reserva.data_entrada && typeof reserva.data_entrada.toDate === 'function'
      ? reserva.data_entrada.toDate()
      : new Date(reserva.data_entrada);
    dataSai = reserva.data_saida && typeof reserva.data_saida.toDate === 'function'
      ? reserva.data_saida.toDate()
      : new Date(reserva.data_saida);
  } catch (e) {
    dataEnt = new Date();
    dataSai = new Date();
  }

  // Gerar código TTLock ÚNICO para este quarto
  let codigoTTLock = reserva.codigo_ttlk;
  let emailNaoEnviado = false;

  if (!codigoTTLock) {
    codigoTTLock = Math.floor(100000 + Math.random() * 900000).toString();

    try {
      await updateDoc(doc(db, "reservas", reserva.id), {
        codigo_ttlk: codigoTTLock,
        status_checkin: "realizado",
        data_checkin: new Date()
      });
      console.log(`[QUARTO ${reserva.quarto}] Código gerado: ${codigoTTLock}`);
    } catch (err) {
      console.error(`[QUARTO ${reserva.quarto}] Erro ao atualizar código:`, err);
    }

    // Enviar código por email
    try {
      const idiomaCliente = obterIdiomaDeNacionalidade(reserva.nationality || "português");

      const emailResponse = await fetch("/api/send-ttlock-code", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: reserva.email,
          guestName: reserva.nome_hospede,
          code: codigoTTLock,
          roomId: reserva.quarto || reserva.room_id,
          checkInDate: dataEnt.toLocaleDateString(idiomaCliente === "pt" ? "pt-PT" : "en-US"),
          checkOutDate: dataSai.toLocaleDateString(idiomaCliente === "pt" ? "pt-PT" : "en-US"),
          language: idiomaCliente
        })
      });

      if (!emailResponse.ok) {
        emailNaoEnviado = true;
        console.warn(`[QUARTO ${reserva.quarto}] Email pode não ter sido enviado`);
      } else {
        console.log(`[QUARTO ${reserva.quarto}] Email enviado com sucesso`);
      }
    } catch (err) {
      emailNaoEnviado = true;
      console.warn(`[QUARTO ${reserva.quarto}] Erro ao enviar email:`, err.message);
    }
  }

  return codigoTTLock;
}

/**
 * Mostrar todos os códigos gerados
 */
function mostrarCodigos(codigos, lang) {
  let mensagem = lang === "pt"
    ? "✓ CHECK-IN REALIZADO COM SUCESSO!\n\n"
    : "✓ CHECK-IN SUCCESSFUL!\n\n";

  codigos.forEach(item => {
    if (item.codigo) {
      mensagem += lang === "pt"
        ? `🏠 Quarto ${item.quarto}: 🔑 ${item.codigo}\n`
        : `🏠 Room ${item.quarto}: 🔑 ${item.codigo}\n`;
    }
  });

  mensagem += lang === "pt"
    ? "\n📧 Códigos foram enviados por email.\n\nBem-vindo ao Golden Beach Guest House!"
    : "\n📧 Codes have been sent by email.\n\nWelcome to Golden Beach Guest House!";

  alert(mensagem);
}
