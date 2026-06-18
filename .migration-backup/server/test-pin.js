import dotenv from "dotenv";
import fetch from "node-fetch";
import { obterTokenTTLock } from "./ttlock.js";
import { gerarPinTTLock, validarPinTTLock } from "./pin-utils.js";

dotenv.config();

async function criarPin() {

  const pinLocal = gerarPinTTLock();
  console.log("PIN local compatível:", pinLocal, validarPinTTLock(pinLocal) ? "OK" : "INVÁLIDO");

  if (process.env.TTLOCK_HAS_GATEWAY !== "1") {
    console.log("Modo híbrido ativo: sem gateway, o PIN deve ser criado manualmente na app TTLock.");
    return;
  }

  const token = await obterTokenTTLock();

  const agora = Date.now();
  const amanha = agora + (24 * 60 * 60 * 1000);

  const params = new URLSearchParams({
    clientId: process.env.TTLOCK_CLIENT_ID,
    accessToken: token,
    lockId: process.env.TTLOCK_LOCK_ID,

    keyboardPwdName: "Teste PAP",

    keyboardPwdType: 2,

    startDate: agora.toString(),
    endDate: amanha.toString(),

    addType: 2,

    date: Date.now().toString()
  });

  const response = await fetch(
    "https://euapi.ttlock.com/v3/keyboardPwd/add",
    {
      method: "POST",
      body: params
    }
  );

  console.log("STATUS:", response.status);

  const texto = await response.text();

  console.log(texto);
}

criarPin();