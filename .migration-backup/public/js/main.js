import { db } from "./firebase.js";
import { translatePage, setupLanguageToggle } from "./translations.js";
import { obterIdiomaDeNacionalidade } from "./language-map.js";
import { setupSelfCheckin } from "./selfcheckin.js";
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

  // ========== SETUP SELF CHECK-IN ==========
  if (document.getElementById("checkinForm")) {
    setupSelfCheckin();
  }

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
});
