import { db } from "./firebase.js";
import { translatePage, setupLanguageToggle } from "./translations.js";
import {
  createUserWithEmailAndPassword,
  signOut
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-auth.js";
import {
  collection,
  addDoc,
  query,
  where,
  getDocs
} from "https://www.gstatic.com/firebasejs/11.0.1/firebase-firestore.js";
import { auth } from "./firebase.js";

// Função para alternar visibilidade da palavra-passe
window.togglePasswordVisibility = function(fieldId, event) {
  event.preventDefault();
  const field = document.getElementById(fieldId);
  const button = event.target.closest('.password-toggle');
  
  if (field.type === 'password') {
    field.type = 'text';
    button.innerHTML = '<i class="fas fa-eye-slash"></i>';
  } else {
    field.type = 'password';
    button.innerHTML = '<i class="fas fa-eye"></i>';
  }
};

document.addEventListener("DOMContentLoaded", () => {
  // Configurar traduções
  translatePage();
  setupLanguageToggle();

  const form = document.getElementById("registerForm");
  const messageDiv = document.getElementById("message");

  form.addEventListener("submit", async (e) => {
    e.preventDefault();

    // Limpar mensagem anterior
    messageDiv.classList.remove("show", "success", "error");
    messageDiv.textContent = "";

    const firstName = document.getElementById("firstName").value.trim();
    const lastName = document.getElementById("lastName").value.trim();
    const email = document.getElementById("email").value.trim();
    const phone = document.getElementById("phone").value.trim();
    const cc = document.getElementById("cc").value.trim();
    const nationality = document.getElementById("nationality").value;
    const password = document.getElementById("password").value;
    const confirmPassword = document.getElementById("confirmPassword").value;

    // Validações básicas
    const lang = localStorage.getItem("language") || "pt";
    if (!firstName || !lastName || !email || !cc || !password || !confirmPassword) {
      showMessage(lang === "pt" ? "Por favor, preencha todos os campos obrigatórios." : "Please fill in all required fields.", "error");
      return;
    }

    if (password.length < 8) {
      showMessage(lang === "pt" ? "A palavra-passe deve ter no mínimo 8 caracteres." : "Password must be at least 8 characters long.", "error");
      return;
    }

    if (password !== confirmPassword) {
      showMessage(lang === "pt" ? "As palavras-passe não correspondem." : "Passwords do not match.", "error");
      return;
    }

    // Validar formato de email
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showMessage(lang === "pt" ? "Por favor, insira um email válido." : "Please enter a valid email address.", "error");
      return;
    }

    // Verificar se o CC já existe
    try {
      const ccQuery = query(
        collection(db, "guests"),
        where("cc", "==", cc)
      );
      const ccSnapshot = await getDocs(ccQuery);

      if (!ccSnapshot.empty) {
        showMessage(lang === "pt" ? "Este Cartão de Cidadão já está registado." : "This ID Card is already registered.", "error");
        return;
      }

      // Criar conta de autenticação
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Adicionar dados do utilizador à coleção de guests
      await addDoc(collection(db, "guests"), {
        firstName: firstName,
        lastName: lastName,
        email: email,
        phone: phone,
        cc: cc,
        nationality: nationality || "Não especificada",
        password: password,
        uid: user.uid,
        createdAt: new Date(),
        status: "active"
      });

      showMessage(lang === "pt" ? "Conta criada com sucesso! Redirecionando..." : "Account created successfully! Redirecting...", "success");
      
      // Fazer logout automático e redirecionar
      setTimeout(() => {
        signOut(auth).then(() => {
          window.location.href = "index.html";
        });
      }, 2000);

    } catch (error) {
      console.error("Erro no registro:", error);
      
      let errorMessage = lang === "pt" ? "Erro ao criar conta. Tente novamente." : "Error creating account. Please try again.";
      
      if (error.code === "auth/email-already-in-use") {
        errorMessage = lang === "pt" ? "Este email já está registado." : "This email is already registered.";
      } else if (error.code === "auth/weak-password") {
        errorMessage = lang === "pt" ? "A palavra-passe é muito fraca." : "The password is too weak.";
      } else if (error.code === "auth/invalid-email") {
        errorMessage = lang === "pt" ? "Email inválido." : "Invalid email.";
      }
      
      showMessage(errorMessage, "error");
    }
  });

  function showMessage(message, type) {
    messageDiv.textContent = message;
    messageDiv.className = `message ${type} show`;
    messageDiv.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
  }
});
