/**
 * Navbar Scroll Hide Effect
 * Esconde a navbar ao fazer scroll para baixo
 * Mostra a navbar ao fazer scroll para cima
 */

let lastScrollTop = 0;
let scrollTimeout;

window.addEventListener('scroll', function() {
  clearTimeout(scrollTimeout);
  
  const navbar = document.querySelector('.navbar');
  if (!navbar) return;
  
  let currentScroll = window.pageYOffset || document.documentElement.scrollTop;
  
  if (currentScroll > lastScrollTop && currentScroll > 100) {
    // Scrolling DOWN - Hide navbar
    navbar.classList.add('navbar-hidden');
  } else {
    // Scrolling UP - Show navbar
    navbar.classList.remove('navbar-hidden');
  }
  
  lastScrollTop = currentScroll <= 0 ? 0 : currentScroll;
}, false);
