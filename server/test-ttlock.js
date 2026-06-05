import dotenv from "dotenv";
import { obterTokenTTLock } from "./ttlock.js";

dotenv.config();

async function testar() {
  const token = await obterTokenTTLock();

  console.log("TOKEN:");
  console.log(token);
}

testar();