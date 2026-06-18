
// Funções utilitárias reutilizáveis para o PAP Hostel App

// Validação de Email
export function validarEmail(email) {
  const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return regex.test(email);
}

// Validação de Cartão de Cidadão (formato PT)
export function validarCC(cc) {
  // Formato simples: números e letras, 5-12 caracteres
  const regex = /^[0-9A-Za-z]{5,12}$/;
  return regex.test(cc);
}

// Validação de Telemóvel (formato PT)
export function validarTelemovel(phone) {
  const regex = /^(?:\+351|00351|9)?[1-9]\d{8}$/;
  return regex.test(phone.replace(/\s/g, ""));
}

// Formatar valor monetário
export function formatarMoeda(valor, moeda = "EUR") {
  return new Intl.NumberFormat("pt-PT", {
    style: "currency",
    currency: moeda
  }).format(valor);
}

// Formatar data
export function formatarData(data, locale = "pt-PT") {
  const d = data instanceof Date ? data : new Date(data);
  return d.toLocaleDateString(locale);
}

// Calcular noites entre duas datas
export function calcularNoites(entrada, saida) {
  const dataEnt = new Date(entrada);
  const dataSai = new Date(saida);
  const diferenca = dataSai - dataEnt;
  return Math.ceil(diferenca / (1000 * 60 * 60 * 24));
}

// Gerar código TTLOCK (6 dígitos)
export function gerarCodigoTTLock() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

// Gerar UUID v4
export function gerarUUID() {
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, function(c) {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

// Obter parâmetro da URL
export function obterParametroURL(nome) {
  const params = new URLSearchParams(window.location.search);
  return params.get(nome);
}

// Armazenar dados no localStorage com expiração
export function armazenarComExpiracao(chave, valor, minutos) {
  const agora = new Date();
  const expiracao = new Date(agora.getTime() + minutos * 60000);
  
  localStorage.setItem(chave, JSON.stringify({
    valor: valor,
    expiracao: expiracao.getTime()
  }));
}

// Recuperar dados do localStorage com verificação de expiração
export function recuperarComExpiracao(chave) {
  const item = localStorage.getItem(chave);
  
  if (!item) return null;
  
  const dados = JSON.parse(item);
  const agora = new Date().getTime();
  
  if (agora > dados.expiracao) {
    localStorage.removeItem(chave);
    return null;
  }
  
  return dados.valor;
}

// Validar força da palavra-passe
export function validarForcaSenha(senha) {
  let forca = 0;
  
  if (senha.length >= 8) forca++;
  if (/[a-z]/.test(senha)) forca++;
  if (/[A-Z]/.test(senha)) forca++;
  if (/[0-9]/.test(senha)) forca++;
  if (/[^a-zA-Z0-9]/.test(senha)) forca++;
  
  return forca;
}

// Obter classificação da força da senha
export function classificacaoForcaSenha(forca, lang = "pt") {
  const classificacoes = {
    pt: ["Muito Fraca", "Fraca", "Média", "Forte", "Muito Forte"],
    en: ["Very Weak", "Weak", "Medium", "Strong", "Very Strong"]
  };
  
  return classificacoes[lang][forca] || "Desconhecida";
}

// Comparar datas (retorna -1, 0 ou 1)
export function compararDatas(data1, data2) {
  const d1 = new Date(data1);
  const d2 = new Date(data2);
  
  if (d1 < d2) return -1;
  if (d1 > d2) return 1;
  return 0;
}

// Verificar se data está entre intervalo
export function dataEntreIntervalo(data, inicio, fim) {
  const d = new Date(data);
  const i = new Date(inicio);
  const f = new Date(fim);
  
  return d >= i && d <= f;
}

// Fazer logout
export function fazrLogout(tipo = "guest") {
  localStorage.removeItem(`${tipo}LoggedIn`);
  localStorage.removeItem(`${tipo}Email`);
  localStorage.removeItem(`${tipo}Data`);
  sessionStorage.clear();
  window.location.href = "home.html";
}

// Capitalizar primeira letra
export function capitalizarPrimeiraLetra(str) {
  return str.charAt(0).toUpperCase() + str.slice(1).toLowerCase();
}

// Remover espaços extra
export function limparEspacos(str) {
  return str.trim().replace(/\s+/g, " ");
}

// Adicionar máscara a número de telemóvel
export function mascaraTelemovel(telefone) {
  const numeros = telefone.replace(/\D/g, "");
  return numeros.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3");
}

// Adicionar máscara a número de CC
export function mascaraCC(cc) {
  const limpo = cc.replace(/\D/g, "");
  return limpo.replace(/(\d{1})(\d{8})(\d{2})/, "$1$2$3");
}

// Obter status da reserva em português/inglês
export function obterStatusReserva(status, lang = "pt") {
  const statusMap = {
    pt: {
      ativa: "Ativa",
      concluida: "Concluída",
      cancelada: "Cancelada",
      pendente: "Pendente"
    },
    en: {
      ativa: "Active",
      concluida: "Completed",
      cancelada: "Cancelled",
      pendente: "Pending"
    }
  };
  
  return statusMap[lang][status] || status;
}

// Calcular ocupação de um quarto
export function calcularOcupacaoQuarto(dataEntrada, dataSaida, hoje = new Date()) {
  const entrada = new Date(dataEntrada);
  const saida = new Date(dataSaida);
  
  if (hoje < entrada) return "disponivel";
  if (hoje > saida) return "livre";
  return "ocupado";
}

// Notificação toast
export function exibirNotificacao(mensagem, tipo = "info", duracao = 3000) {
  const toast = document.createElement("div");
  toast.className = `toast toast-${tipo}`;
  toast.textContent = mensagem;
  toast.style.cssText = `
    position: fixed;
    bottom: 20px;
    right: 20px;
    background: ${tipo === "sucesso" ? "#27AE60" : tipo === "erro" ? "#E74C3C" : "#2980B9"};
    color: white;
    padding: 15px 20px;
    border-radius: 8px;
    z-index: 10000;
    animation: slideIn 0.3s ease;
  `;
  
  document.body.appendChild(toast);
  
  setTimeout(() => {
    toast.style.animation = "slideOut 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, duracao);
}

// Converter timestamp Firebase para data legível
export function converterFirebaseTimestamp(timestamp) {
  if (!timestamp) return null;
  
  const data = timestamp.toDate ? timestamp.toDate() : new Date(timestamp.seconds * 1000);
  return data;
}
