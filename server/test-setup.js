#!/usr/bin/env node

/**
 * Script de Teste - PAP Hostel App
 * Valida se o sistema está pronto para apresentação
 * 
 * Uso: node test-setup.js
 */

import fetch from "node-fetch";

const BASE_URL = "http://localhost:3000";

console.log(`
╔═══════════════════════════════════════════════════════════╗
║     PAP HOSTEL APP - TESTE DE FUNCIONAMENTO             ║
║     Validando configuração para apresentação             ║
╚═══════════════════════════════════════════════════════════╝
`);

async function runTests() {
  let testsPass = 0;
  let testsFail = 0;

  // Teste 1: Health Check
  console.log("\n1. Verificando servidor...");
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    const data = await response.json();
    
    console.log("✓ Servidor: OK");
    console.log(`  Status: ${data.status}`);
    console.log(`  Ambiente: ${data.environment}`);
    console.log(`  Mode Email: ${data.email_mode}`);
    console.log(`  SMTP Configurado: ${data.email_configured ? "SIM" : "NAO"}`);
    testsPass++;
  } catch (error) {
    console.error("✗ Servidor: FALHA");
    console.error(`  Erro: ${error.message}`);
    console.error(`  Verifique se o servidor está a correr em ${BASE_URL}`);
    testsFail++;
    return;
  }

  // Teste 2: Config Endpoint
  console.log("\n2. Obtendo configuração...");
  try {
    const response = await fetch(`${BASE_URL}/api/config`);
    const data = await response.json();
    
    console.log("✓ Configuração: OK");
    console.log(`  App: ${data.app_name} v${data.version}`);
    console.log(`  TTLock: ${data.ttlock_mode}`);
    testsPass++;
  } catch (error) {
    console.error("✗ Configuração: FALHA");
    testsFail++;
  }

  // Teste 3: Gerar Código
  console.log("\n3. Testando geração de código...");
  try {
    const today = new Date();
    const tomorrow = new Date(today.getTime() + 24 * 60 * 60 * 1000);

    const response = await fetch(`${BASE_URL}/api/gerar-codigo`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        room_id: "Quarto Teste",
        data_entrada: today.toISOString().split("T")[0],
        data_saida: tomorrow.toISOString().split("T")[0],
        nome: "Teste User",
        cc: "12345678"
      })
    });

    const data = await response.json();
    
    if (data.sucesso) {
      console.log("✓ Geração de código: OK");
      console.log(`  Código gerado: ${data.codigo}`);
      console.log(`  Modo: ${data.modo}`);
      testsPass++;
    } else {
      throw new Error(data.mensagem);
    }
  } catch (error) {
    console.error("✗ Geração de código: FALHA");
    console.error(`  Erro: ${error.message}`);
    testsFail++;
  }

  // Teste 4: Enviar Email de Teste
  console.log("\n4. Testando envio de email...");
  try {
    const response = await fetch(`${BASE_URL}/api/test-email`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email: "test@example.com"
      })
    });

    const data = await response.json();
    
    if (data.sucesso) {
      console.log("✓ Email de teste: OK");
      console.log(`  Para: ${data.para}`);
      console.log(`  Modo: ${data.modo}`);
      testsPass++;
    } else {
      throw new Error(data.mensagem);
    }
  } catch (error) {
    console.error("✗ Email de teste: FALHA");
    console.error(`  Erro: ${error.message}`);
    console.error(`  (Isto é normal se não houver SMTP configurado)`);
    testsFail++;
  }

  // Resumo
  console.log(`
╔═══════════════════════════════════════════════════════════╗
║                    RESUMO DOS TESTES                      ║
╚═══════════════════════════════════════════════════════════╝

Testes Bem-sucedidos: ${testsPass}/4 ✓
Testes Falhados: ${testsFail}/4 ✗

${testsPass === 4 
  ? `
SISTEMA PRONTO PARA APRESENTACAO!
- Servidor funcionando
- API respondendo
- Geração de código operacional
- Sistema de email testado
`
  : `
ALERTAS:
${testsFail > 0 ? "- Existem falhas ao executar testes" : ""}
${testsFail >= 2 ? "- Verifique se o servidor está a correr" : ""}
`}

PRÓXIMOS PASSOS:
1. Certifique-se que o servidor está a correr: npm start
2. Para usar emails reais, configure SMTP_PASS em .env
3. Atualmente em modo LOG - apenas escreve logs
4. Para emails reais, altere EMAIL_MODE=real em .env

DEMO ATUAL:
- Modo: LOG (mostra logs em console)
- Códigos: Gerados automaticamente
- Emails: Simulados (verifique console do servidor)

═══════════════════════════════════════════════════════════
`);
}

runTests().catch(console.error);
