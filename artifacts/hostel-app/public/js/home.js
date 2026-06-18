import { db } from "./firebase.js";
import { translatePage, setupLanguageToggle } from "./translations.js";

document.addEventListener("DOMContentLoaded", () => {
  // Configurar traduções
  translatePage();
  setupLanguageToggle();

  // Rotação de vídeos de fundo
  const videos = document.querySelectorAll(".bg-video");
  let videoAtual = 0;

  if (videos.length > 0) {
    // Garantir que o primeiro vídeo começa ativo
    videos[0].classList.add("active");

    // Tornar os vídeos mais lentos para efeito cinematográfico
    videos.forEach(video => {
      video.playbackRate = 0.7;
    });

    // Rotação automática dos vídeos
    setInterval(() => {
      videos[videoAtual].classList.remove("active");
      videoAtual = (videoAtual + 1) % videos.length;
      videos[videoAtual].classList.add("active");
    }, 8000); // Troca a cada 8 segundos
  }

  // Navbar scroll effect
  const navbar = document.querySelector('.navbar');
  window.addEventListener('scroll', () => {
    if (window.scrollY > 50) {
      navbar.classList.add('scrolled');
    } else {
      navbar.classList.remove('scrolled');
    }
  });

  // Smooth scroll para links âncora
  document.querySelectorAll('a[href^="#"]').forEach(anchor => {
    anchor.addEventListener('click', function (e) {
      e.preventDefault();
      const target = document.querySelector(this.getAttribute('href'));
      if (target) {
        target.scrollIntoView({
          behavior: 'smooth',
          block: 'start'
        });
      }
    });
  });

  // Animação de scroll - fade in dos elementos
  const observerOptions = {
    threshold: 0.1,
    rootMargin: '0px 0px -100px 0px'
  };

  const observer = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (entry.isIntersecting) {
        entry.target.style.opacity = '1';
        entry.target.style.transform = 'translateY(0)';
      }
    });
  }, observerOptions);

  // Observar cards e seções
  document.querySelectorAll('.info-card, .location-content, .social-content').forEach(el => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(30px)';
    el.style.transition = 'all 0.8s ease';
    observer.observe(el);
  });
});
