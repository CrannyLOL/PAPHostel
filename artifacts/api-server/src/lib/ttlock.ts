import fetch from "node-fetch";
import crypto from "crypto";

const PIN_DIGITOS_PERMITIDOS = ["1", "2", "3", "4", "5", "6", "7"];
const PIN_REGEX = /^[1-7]{6}$/;

let tokenCache: { token: string | null; expiresAt: number } = {
  token: null,
  expiresAt: 0,
};

export function gerarPinTTLock(): string {
  const bytes = crypto.randomBytes(6);
  return Array.from(bytes, (byte) => PIN_DIGITOS_PERMITIDOS[byte % PIN_DIGITOS_PERMITIDOS.length]).join("");
}

export function validarPinTTLock(pin: unknown): boolean {
  return typeof pin === "string" && PIN_REGEX.test(pin);
}

export async function obterTokenTTLock(): Promise<string | null> {
  if (tokenCache.token && tokenCache.expiresAt > Date.now()) {
    return tokenCache.token;
  }

  const md5Password = crypto
    .createHash("md5")
    .update(process.env["TTLOCK_PASSWORD"] || "")
    .digest("hex");

  const params = new URLSearchParams({
    clientId: process.env["TTLOCK_CLIENT_ID"] || "",
    clientSecret: process.env["TTLOCK_CLIENT_SECRET"] || "",
    username: process.env["TTLOCK_USERNAME"] || "",
    password: md5Password,
    grant_type: "password",
  });

  try {
    const response = await fetch("https://euapi.ttlock.com/oauth2/token", {
      method: "POST",
      body: params,
    });
    const data = (await response.json()) as Record<string, unknown>;
    if (!data["access_token"]) return null;

    tokenCache = {
      token: data["access_token"] as string,
      expiresAt: Date.now() + 50 * 60 * 1000,
    };
    return tokenCache.token;
  } catch {
    return null;
  }
}

export async function criarCodigoTTLock(
  _token: string | null,
  _lockId: string,
  _inicio: string | Date,
  _fim: string | Date
): Promise<string> {
  return gerarPinTTLock();
}
