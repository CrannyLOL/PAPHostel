#!/usr/bin/env node

/**
 * TESTE RÁPIDO DE EMAIL
 * Testa se os emails REAIS estão a ser enviados via Gmail SMTP
 */

import fetch from 'node-fetch';

const API_BASE = 'http://localhost:3000';
const TEST_EMAIL = 'tiagomiguelmachado11@gmail.com'; // Enviar para o seu próprio email

async function testarEmails() {
  console.log('\n📧 TESTE DE EMAIL - Golden Beach\n');
  console.log('=' .repeat(50));

  // Teste 1: Verificar modo
  console.log('\n✓ Teste 1: Verificar modo de email...');
  try {
    const healthRes = await fetch(`${API_BASE}/api/health`);
    const health = await healthRes.json();
    console.log(`  Modo: ${health.email_mode?.toUpperCase() || 'DESCONHECIDO'}`);
    console.log(`  SMTP Configurado: ${health.email_configured ? 'SIM' : 'NÃO'}`);
  } catch (e) {
    console.log('  ❌ Erro:', e.message);
    return;
  }

  // Teste 2: Enviar email de fatura
  console.log('\n✓ Teste 2: Enviar email de FATURA...');
  try {
    const res = await fetch(`${API_BASE}/api/send-invoice`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        to: TEST_EMAIL,
        subject: 'Teste - Fatura Golden Beach',
        guestName: 'Utilizador Teste',
        pdfBase64: Buffer.from('<html><body>FATURA TESTE</body></html>').toString('base64'),
        language: 'pt'
      })
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`  ✅ Email de FATURA enviado para: ${data.para}`);
      console.log(`  Idioma: ${data.idioma}`);
    } else {
      console.log(`  ❌ Erro: ${data.mensagem}`);
    }
  } catch (e) {
    console.log('  ❌ Erro:', e.message);
  }

  // Teste 3: Enviar email com código
  console.log('\n✓ Teste 3: Enviar email com CÓDIGO TTLock...');
  try {
    const res = await fetch(`${API_BASE}/api/send-ttlock-code`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: TEST_EMAIL,
        guestName: 'Utilizador Teste',
        code: '123456',
        roomId: 'Quarto Duplo',
        checkInDate: new Date().toLocaleDateString('pt-PT'),
        checkOutDate: new Date(Date.now() + 86400000).toLocaleDateString('pt-PT'),
        language: 'pt'
      })
    });
    const data = await res.json();
    if (res.ok) {
      console.log(`  ✅ Email com CÓDIGO enviado para: ${data.para}`);
      console.log(`  Código: ${data.codigo}`);
      console.log(`  Idioma: ${data.idioma}`);
    } else {
      console.log(`  ❌ Erro: ${data.mensagem}`);
    }
  } catch (e) {
    console.log('  ❌ Erro:', e.message);
  }

  console.log('\n' + '='.repeat(50));
  console.log('\n✅ Teste concluído!\n');
  console.log('Verifique sua caixa de entrada em: ' + TEST_EMAIL);
  console.log('Podem levar 1-2 minutos para chegar.\n');
}

testarEmails().catch(err => {
  console.error('Erro:', err);
  process.exit(1);
});
