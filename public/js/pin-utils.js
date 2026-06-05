const PIN_DIGITOS_PERMITIDOS = ["1", "2", "3", "4", "5", "6", "7"];
const PIN_REGEX = /^[1-7]{6}$/;

export function gerarPinTTLock(tamanho = 6) {
  if (tamanho !== 6) {
    throw new Error("O PIN TTLock deve ter exatamente 6 dígitos");
  }

  const bytes = new Uint8Array(tamanho);
  crypto.getRandomValues(bytes);

  return Array.from(bytes, byte => PIN_DIGITOS_PERMITIDOS[byte % PIN_DIGITOS_PERMITIDOS.length]).join("");
}

export function validarPinTTLock(pin) {
  return typeof pin === "string" && PIN_REGEX.test(pin);
}

export function normalizarDataReserva(valorData) {
  if (valorData && typeof valorData.toDate === "function") {
    const dataTimestamp = valorData.toDate();
    return dataTimestamp instanceof Date ? new Date(dataTimestamp.getTime()) : new Date(dataTimestamp);
  }

  const data = valorData instanceof Date ? new Date(valorData.getTime()) : new Date(valorData);

  if (Number.isNaN(data.getTime())) {
    throw new Error("Data inválida");
  }

  return data;
}

export function validarIntervaloReserva(dataEntrada, dataSaida) {
  const entrada = normalizarDataReserva(dataEntrada);
  const saida = normalizarDataReserva(dataSaida);

  const hoje = new Date();
  hoje.setHours(0, 0, 0, 0);

  const entradaNormalizada = new Date(entrada);
  entradaNormalizada.setHours(0, 0, 0, 0);

  const saidaNormalizada = new Date(saida);
  saidaNormalizada.setHours(0, 0, 0, 0);

  if (entradaNormalizada < hoje) {
    return { ok: false, mensagem: "A data de entrada não pode ser anterior à data atual." };
  }

  if (saidaNormalizada <= entradaNormalizada) {
    return { ok: false, mensagem: "A data de saída tem de ser posterior à data de entrada." };
  }

  return { ok: true, entrada, saida };
}

export function calcularEstadoPin(dataEntrada, dataSaida, referencia = new Date()) {
  const entrada = normalizarDataReserva(dataEntrada);
  const saida = normalizarDataReserva(dataSaida);
  const momento = referencia instanceof Date ? referencia : new Date(referencia);

  if (momento < entrada) {
    return "pendente";
  }

  if (momento > saida) {
    return "expirado";
  }

  return "ativo";
}