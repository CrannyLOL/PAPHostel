import fetch from "node-fetch";
import dotenv from "dotenv";

dotenv.config();

/**
 * TTLock Integration Module
 * 
 * Este módulo gerencia a integração com a API TTLock para gerar códigos de acesso
 * temporários para as fechaduras inteligentes das portas dos quartos.
 * 
 * Funciona em dois modos:
 * 1. SIMULADO: Quando não há fechaduras e gera códigos fake (desenvolvimento)
 * 2. REAL: Integração real com API TTLock (produção)
 */

// Cache para token de acesso (válido por 1 hora)
let tokenCache = {
  token: null,
  expiresAt: null
};

/**
 * Obter token de autenticação TTLock com cache
 * @returns {Promise<string>} Access token válido
 */
export async function obterTokenTTLock() {
  // Verificar se token em cache ainda é válido
  if (tokenCache.token && tokenCache.expiresAt > Date.now()) {
    console.log("Usando token TTLock do cache");
    return tokenCache.token;
  }

  const url = "https://api.ttlock.com/oauth2/token";

  const params = new URLSearchParams({
    clientId: process.env.TTLOCK_CLIENT_ID || "",
    clientSecret: process.env.TTLOCK_CLIENT_SECRET || "",
    username: process.env.TTLOCK_USERNAME || "",
    password: process.env.TTLOCK_PASSWORD || "",
    grant_type: "password"
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      body: params
    });

    const data = await response.json();

    if (!data.access_token) {
      console.warn("TTLock: Credenciais inválidas, usando modo simulado");
      return null;
    }

    // Armazenar em cache por 50 minutos (token válido por 1 hora)
    tokenCache = {
      token: data.access_token,
      expiresAt: Date.now() + 50 * 60 * 1000
    };

    console.log("Token TTLock obtido com sucesso");
    return tokenCache.token;
  } catch (error) {
    console.error("Erro ao autenticar na TTLock:", error.message);
    return null;
  }
}

/**
 * Criar código temporário TTLock para acesso à porta
 * 
 * FLUXO DO CÓDIGO TTLOCK:
 * 1. Hóspede faz reserva e paga
 * 2. Sistema gera código único de 6 dígitos
 * 3. Código é armazenado na BD com data/hora de validade
 * 4. Código é enviado por email ao hóspede
 * 5. Na chegada, hóspede usa o código na fechadura
 * 6. Fechadura abre e registra acesso no histórico
 * 7. Código expira automaticamente no check-out
 * 
 * @param {string} token Token de acesso TTLock (opcional)
 * @param {string} lockId ID da fechadura (opcional, se vazio usa simulado)
 * @param {string|Date} inicio Data/hora de validade inicial
 * @param {string|Date} fim Data/hora de validade final
 * @returns {Promise<string>} Código de acesso gerado
 */
export async function criarCodigoTTLock(token, lockId, inicio, fim) {
  // MODO SIMULADO - Utilizado durante desenvolvimento
  if (!token || !lockId || process.env.TTLOCK_MODE === "simulado") {
    const codigoSimulado = gerarCodigoSimulado();
    console.log(`TTLock: Código SIMULADO gerado - ${codigoSimulado} (Válido de ${inicio} até ${fim})`);
    return codigoSimulado;
  }

  // MODO REAL - Integração real com fechadura TTLock
  return await criarCodigoTTLockReal(token, lockId, inicio, fim);
}

/**
 * Gerar código simulado para testes/desenvolvimento
 * @returns {string} Código de 6 dígitos
 */
export function gerarCodigoSimulado() {
  // Gera número aleatório entre 100000 e 999999
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Criar código real na API TTLock
 * @private
 * @param {string} token Access token
 * @param {string} lockId ID da fechadura
 * @param {string|Date} inicio Data/hora início
 * @param {string|Date} fim Data/hora fim
 * @returns {Promise<string>} Código gerado
 */
async function criarCodigoTTLockReal(token, lockId, inicio, fim) {
  const url = "https://api.ttlock.com/v3/keyboardPwd/add";

  // Converter datas para timestamp (milisegundos desde 1970)
  const startTime = new Date(inicio).getTime();
  const endTime = new Date(fim).getTime();

  // Validar intervalo de datas
  if (startTime >= endTime) {
    throw new Error("Data inicial deve ser anterior à data final");
  }

  const params = new URLSearchParams({
    accessToken: token,
    lockId: lockId,
    keyboardPwdType: 2, // Tipo 2 = código numérico temporário
    startDate: startTime,
    endDate: endTime,
    keyboardPwdName: `Reserva PAP Hostel - ${new Date().toISOString()}`
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      body: params
    });

    const data = await response.json();

    // TTLock retorna errcode 0 para sucesso
    if (data.errcode !== 0) {
      throw new Error(`Erro TTLock: ${data.errmsg || "Código desconhecido"}`);
    }

    console.log(`TTLock: Código REAL gerado - ${data.keyboardPwd} (ID Fechadura: ${lockId})`);
    return data.keyboardPwd;

  } catch (error) {
    console.error("Erro ao criar código real TTLock:", error.message);
    throw error;
  }
}

/**
 * Deletar código de acesso TTLock (para cancelamento de reserva)
 * @param {string} token Access token
 * @param {string} lockId ID da fechadura
 * @param {string} passwordId ID da senha para deletar
 * @returns {Promise<boolean>} Verdadeiro se deletado com sucesso
 */
export async function deletarCodigoTTLock(token, lockId, passwordId) {
  if (!token || !lockId) {
    console.log("TTLock: Deletar código (modo simulado)");
    return true;
  }

  const url = "https://api.ttlock.com/v3/keyboardPwd/delete";

  const params = new URLSearchParams({
    accessToken: token,
    lockId: lockId,
    keyboardPwdId: passwordId
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      body: params
    });

    const data = await response.json();

    if (data.errcode !== 0) {
      throw new Error(`Erro ao deletar: ${data.errmsg}`);
    }

    console.log("Código TTLock deletado com sucesso");
    return true;

  } catch (error) {
    console.error("Erro ao deletar código TTLock:", error.message);
    return false;
  }
}

/**
 * Obter histórico de acessos registados pela fechadura
 * @param {string} token Access token
 * @param {string} lockId ID da fechadura
 * @param {Date} startDate Data inicial do intervalo
 * @param {Date} endDate Data final do intervalo
 * @returns {Promise<Array>} Lista de acessos
 */
export async function obterHistoricoAcessos(token, lockId, startDate, endDate) {
  if (!token || !lockId) {
    console.log("TTLock: Histórico de acessos (modo simulado)");
    return [];
  }

  const url = "https://api.ttlock.com/v3/lock/queryAccessRecords";

  const params = new URLSearchParams({
    accessToken: token,
    lockId: lockId,
    startDate: new Date(startDate).getTime(),
    endDate: new Date(endDate).getTime()
  });

  try {
    const response = await fetch(url, {
      method: "POST",
      body: params
    });

    const data = await response.json();

    if (data.errcode !== 0) {
      throw new Error(`Erro ao obter histórico: ${data.errmsg}`);
    }

    return data.records || [];

  } catch (error) {
    console.error("Erro ao obter histórico TTLock:", error.message);
    return [];
  }
}
