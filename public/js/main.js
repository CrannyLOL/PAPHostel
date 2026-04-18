import { db } from "./firebase.js";
import { translatePage, setupLanguageToggle } from "./translations.js";
import { obterIdiomaDeNacionalidade } from "./language-map.js";
import {
  collection,
  getDocs,
  query,
  where,
  updateDoc,
  doc
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

  // Garantir que o primeiro vídeo começa ativo
  if (videos.length > 0) {
    videos[0].classList.add("active");
  }

  // Tornar os vídeos ligeiramente mais lentos
  videos.forEach(video => {
    video.playbackRate = 0.5;
  });

  // Rotação automática
  setInterval(() => {
    videos[videoAtual].classList.remove("active");
    videoAtual = (videoAtual + 1) % videos.length;
    videos[videoAtual].classList.add("active");
  }, 10000); // troca a cada 10 segundos


  /* ===============================
     🏨 SELF CHECK-IN / FIREBASE
     =============================== */
  const form = document.getElementById("checkinForm");

  // 📝 VERIFICAR CREDENCIAIS E FAZER SELF CHECK-IN
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
      // Procurar reserva com essas credenciais
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
        return;
      }

      // Credenciais corretas
      const reservaDoc = snapshot.docs[0];
      const reserva = reservaDoc.data();

      // ✓ VERIFICAR SE JÁ FOI REALIZADO SELF CHECK-IN
      if (reserva.status_checkin === "realizado") {
        const msgJaRealizado = lang === "pt"
          ? "❌ Self Check-in já foi realizado para esta reserva!\n\nNão é possível fazer múltiplos check-ins."
          : "❌ Self Check-in has already been completed for this booking!\n\nMultiple check-ins are not allowed.";
        alert(msgJaRealizado);
        form.reset();
        return;
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

      // Gerar código TTLock (apenas agora, no self check-in)
      let codigoTTLock = reserva.codigo_ttlk; // Se já foi gerado
      let emailNaoEnviado = false; // Flag para controlar se email foi enviado
      
      if (!codigoTTLock) {
        codigoTTLock = Math.floor(100000 + Math.random() * 900000).toString();
        
        // Atualizar a reserva com o código TTLock E marcar check-in como realizado
        try {
          await updateDoc(doc(db, "reservas", reservaDoc.id), {
            codigo_ttlk: codigoTTLock,
            status_checkin: "realizado",
            data_checkin: new Date()
          });
          console.log("Código TTLock gerado e salvo na reserva");
        } catch (err) {
          console.error("Erro ao atualizar código TTLock:", err);
        }

        // Enviar código por email com idioma baseado na nacionalidade
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
            console.warn("Aviso: Email pode não ter sido enviado corretamente");
          } else {
            console.log("✓ Código TTLock enviado por email com idioma:", idiomaCliente);
          }
        } catch (err) {
          emailNaoEnviado = true;
          console.warn("Erro ao enviar código TTLock por email:", err.message);
        }
      } else {
        // Código já foi gerado antes, enviar novamente por email
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
            console.warn("Aviso: Email pode não ter sido enviado corretamente");
          } else {
            console.log("✓ Código TTLock reenviado por email com idioma:", idiomaCliente);
          }
        } catch (err) {
          emailNaoEnviado = true;
          console.warn("Erro ao reenviar código TTLock por email:", err.message);
        }
      }

      // Marcar check-in como realizado (se ainda não foi)
      if (reserva.status_checkin !== "realizado") {
        try {
          await updateDoc(doc(db, "reservas", reservaDoc.id), {
            status_checkin: "realizado",
            data_checkin: new Date()
          });
        } catch (err) {
          console.error("Erro ao marcar check-in como realizado:", err);
        }
      }

      const locale = lang === "pt" ? "pt-PT" : "en-GB";
      const emailWarning = emailNaoEnviado 
        ? (lang === "pt" 
          ? "\n⚠️ AVISO: O código pode não ter sido enviado por email. Verifique a caixa de spam." 
          : "\n⚠️ WARNING: The code may not have been sent by email. Check your spam folder.")
        : (lang === "pt"
          ? "\n📧 O código foi enviado por email."
          : "\n📧 The code has been sent by email.");
      
      const mensagem = lang === "pt"
        ? `✓ CHECK-IN REALIZADO COM SUCESSO!\n\n🏠 Quarto: ${reserva.quarto || reserva.room_id}\n🔑 Código TTLock: ${codigoTTLock}\n📅 Entrada: ${dataEnt.toLocaleString(locale)}\n📅 Saída: ${dataSai.toLocaleString(locale)}\n\nBem-vindo ao Golden Beach Guest House!${emailWarning}`
        : `✓ CHECK-IN SUCCESSFUL!\n\n🏠 Room: ${reserva.quarto || reserva.room_id}\n🔑 TTLock Code: ${codigoTTLock}\n📅 Check-in: ${dataEnt.toLocaleString(locale)}\n📅 Check-out: ${dataSai.toLocaleString(locale)}\n\nWelcome to Golden Beach Guest House!${emailWarning}`;

      alert(mensagem);
      form.reset();

    } catch (error) {
      console.error("Erro ao verificar credenciais:", error);
      const lang = localStorage.getItem("language") || "pt";
      const msg = lang === "pt"
        ? "❌ Erro ao verificar credenciais. Tente novamente mais tarde."
        : "❌ Error verifying credentials. Please try again later.";
      alert(msg);
    }
  });
});
