import dotenv from "dotenv";
import fetch from "node-fetch";
import { obterTokenTTLock } from "./ttlock.js";

dotenv.config();

async function listarFechaduras() {

  const token = await obterTokenTTLock();

  const params = new URLSearchParams({
    clientId: process.env.TTLOCK_CLIENT_ID,
    accessToken: token,
    pageNo: 1,
    pageSize: 20,
    date: Date.now()
  });

  const response = await fetch(
    "https://euapi.ttlock.com/v3/lock/list",
    {
      method: "POST",
      body: params
    }
  );

  const texto = await response.text();

  console.log(texto);
}

listarFechaduras();