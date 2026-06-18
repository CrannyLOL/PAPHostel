#!/usr/bin/env node

/**
 * VERIFICAÇÃO RÁPIDA - PAP HOSTEL APP
 * Valida que o sistema está pronto para apresentação
 * Uso: node verify-ready.js
 */

import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

console.log("\n========================================");
console.log("VERIFICAÇÃO PRÉ-APRESENTAÇÃO - 24/03/2026");
console.log("========================================\n");

let passouTodos = true;

// 1. Verificar ficheiros essenciais
console.log("📁 VERIFICANDO FICHEIROS...\n");

const ficheirosEssenciais = [
  { path: "package.json", descricao: "Dependências Node.js" },
  { path: ".env", descricao: "Configuracao (Firebase, Email)" },
  { path: "index.js", descricao: "Servidor principal" },
  { path: "ttlock.js", descricao: "Integracao TTLock" },
  { path: "serviceAccountKey.json", descricao: "Credenciais Firebase" },
];

ficheirosEssenciais.forEach((f) => {
  const existe = fs.existsSync(path.join(__dirname, f.path));
  const status = existe ? "✓" : "✗";
  const cor = existe ? "\x1b[32m" : "\x1b[31m";
  const reset = "\x1b[0m";
  console.log(`${cor}${status}${reset} ${f.descricao} (${f.path})`);
  if (!existe) passouTodos = false;
});

// 2. Verificar .env configuração
console.log("\n🔧 VERIFICANDO CONFIGURAÇÃO .env...\n");

const envPath = path.join(__dirname, ".env");
if (fs.existsSync(envPath)) {
  const envContent = fs.readFileSync(envPath, "utf-8");

  const verificacoes = [
    {
      chave: "PORT",
      descricao: "Porta do servidor",
      regex: /PORT=\d+/,
    },
    {
      chave: "EMAIL_MODE",
      descricao: "Modo email (log/real)",
      regex: /EMAIL_MODE=(log|real)/,
    },
    {
      chave: "FIREBASE_PROJECT_ID",
      descricao: "Projeto Firebase criado",
      regex: /FIREBASE_PROJECT_ID=.+/,
    },
    {
      chave: "TTLOCK_CLIENT_ID",
      descricao: "TTLock cliente configurado",
      regex: /TTLOCK_CLIENT_ID=.+/,
    },
  ];

  verificacoes.forEach((v) => {
    const encontrado = v.regex.test(envContent);
    const status = encontrado ? "✓" : "✗";
    const cor = encontrado ? "\x1b[32m" : "\x1b[33m";
    const reset = "\x1b[0m";
    console.log(`${cor}${status}${reset} ${v.descricao} (${v.chave})`);
    if (!encontrado && v.chave !== "TTLOCK_CLIENT_ID")
      passouTodos = false;
  });
} else {
  console.log("\x1b[31m✗\x1b[0m .env não encontrado!");
  passouTodos = false;
}

// 3. Verificar pacotes instalados
console.log("\n📦 VERIFICANDO DEPENDÊNCIAS npm...\n");

const packageJsonPath = path.join(__dirname, "package.json");
if (fs.existsSync(packageJsonPath)) {
  const pkg = JSON.parse(fs.readFileSync(packageJsonPath, "utf-8"));
  const dependenciasEssenciais = [
    "express",
    "cors",
    "dotenv",
    "nodemailer",
    "firebase-admin",
  ];

  const temDependencias = fs.existsSync(path.join(__dirname, "node_modules"));
  const status = temDependencias ? "✓" : "✗";
  const cor = temDependencias ? "\x1b[32m" : "\x1b[31m";
  const reset = "\x1b[0m";
  console.log(`${cor}${status}${reset} node_modules instalados`);

  if (!temDependencias) {
    console.log(
      "\n\x1b[33m⚠️ AVISO: Executa primeiro:\x1b[0m npm install\n"
    );
    passouTodos = false;
  } else {
    dependenciasEssenciais.forEach((dep) => {
      const existe = dep in pkg.dependencies;
      const status = existe ? "✓" : "✗";
      const cor = existe ? "\x1b[32m" : "\x1b[31m";
      const reset = "\x1b[0m";
      console.log(`${cor}${status}${reset} ${dep}`);
      if (!existe) passouTodos = false;
    });
  }
}

// 4. Verificar frontend
console.log("\n🌐 VERIFICANDO FICHEIROS FRONTEND...\n");

const publicPath = path.join(__dirname, "..", "public");
const ficheirosPublic = [
  "index.html",
  "booking.html",
  "payment.html",
  "cs/style.css",
  "js/main.js",
  "js/payment.js",
];

ficheirosPublic.forEach((f) => {
  const existe = fs.existsSync(path.join(publicPath, f));
  const status = existe ? "✓" : "✗";
  const cor = existe ? "\x1b[32m" : "\x1b[33m";
  const reset = "\x1b[0m";
  console.log(`${cor}${status}${reset} ${f}`);
});

// 5. Resultado final
console.log("\n========================================");

if (passouTodos) {
  console.log("\x1b[32m✓ SISTEMA PRONTO PARA APRESENTAÇÃO\x1b[0m");
  console.log("\nPróximos passos:");
  console.log("1. npm start (para iniciar servidor)");
  console.log("2. Aceder a http://localhost:3000");
  console.log("3. Seguir fluxo de demonstração no SETUP_APRESENTACAO.md");
} else {
  console.log("\x1b[33m⚠️  ALGUNS PROBLEMAS DETECTADOS\x1b[0m");
  console.log("\nAções recomendadas:");
  console.log("1. Verifique ficheiros em falta");
  console.log("2. Verifique configuração .env");
  console.log("3. Execute: npm install");
  console.log("4. Consulte: README.md ou SETUP_APRESENTACAO.md");
}

console.log("========================================\n");

process.exit(passouTodos ? 0 : 1);
