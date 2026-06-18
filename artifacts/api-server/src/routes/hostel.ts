import { Router } from "express";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import { criarCodigoTTLock, obterTokenTTLock, validarPinTTLock } from "../lib/ttlock";

const router = Router();

const SMTP_CONFIGURED = !!(process.env["SMTP_USER"] && process.env["SMTP_PASS"]);
const SMTP_PORT = parseInt(process.env["SMTP_PORT"] || "587", 10);
const SMTP_SECURE = process.env["SMTP_SECURE"] === "true" || SMTP_PORT === 465;
const EMAIL_MODE = process.env["EMAIL_MODE"] || (SMTP_CONFIGURED ? "real" : "log");

// @ts-ignore
let transporter: nodemailer.Transporter | null = null;

if (EMAIL_MODE === "real" && SMTP_CONFIGURED) {
  transporter = nodemailer.createTransport({
    host: process.env["SMTP_HOST"] || "smtp.gmail.com",
    port: SMTP_PORT,
    secure: SMTP_SECURE,
    requireTLS: !SMTP_SECURE,
    connectionTimeout: 15000,
    greetingTimeout: 10000,
    socketTimeout: 20000,
    auth: {
      user: process.env["SMTP_USER"],
      pass: process.env["SMTP_PASS"],
    },
    tls: { rejectUnauthorized: false },
  });
} else {
  // @ts-ignore
  transporter = {
    async sendMail(opts: { to: string }) {
      console.log(`[EMAIL LOG] Simulando envio para: ${opts.to}`);
      return { messageId: `mock-${Date.now()}`, response: "mock" };
    },
  };
}

function ensureTransporter() {
  if (!transporter) throw new Error("Email não configurado.");
  return transporter;
}

function gerarTemplateEmail(opts: {
  title: string;
  subtitle: string;
  guestName: string;
  mensagem: string;
  language?: string;
}) {
  const { title, subtitle, guestName, mensagem, language = "pt" } = opts;
  const msgs = {
    pt: { saudacao: "Caro(a)", estadia: "Desejamos-lhe uma estadia agradável!" },
    en: { saudacao: "Dear", estadia: "We hope you have a pleasant stay!" },
  }[language] || { saudacao: "Caro(a)", estadia: "Desejamos-lhe uma estadia agradável!" };

  return `
    <div style="font-family:'Montserrat',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:20px;background:#2C3E50;border-radius:12px 12px 0 0;">
        <h1 style="color:#D4A843;margin:0;font-size:1.5rem;">Golden Beach Guest House</h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:0.9rem;">${subtitle}</p>
      </div>
      <div style="padding:30px;background:#fff;border:1px solid #e0e0e0;">
        <p style="color:#2C3E50;">${msgs.saudacao} <strong>${guestName}</strong>,</p>
        <p style="color:#7F8C8D;line-height:1.8;">${mensagem}</p>
        <p style="color:#7F8C8D;line-height:1.8;">${msgs.estadia}</p>
      </div>
      <div style="text-align:center;padding:15px;background:#f8f9fa;border-radius:0 0 12px 12px;">
        <p style="color:#7F8C8D;font-size:0.75rem;margin:0;">Golden Beach Guest House &copy; ${new Date().getFullYear()}</p>
      </div>
    </div>`;
}

function gerarTemplateTTLock(dados: {
  guestName: string;
  code: string;
  roomId: string;
  checkInDate: string;
  checkOutDate: string;
  language?: string;
}) {
  const { guestName, code, roomId, checkInDate, checkOutDate, language = "pt" } = dados;
  const trans = {
    pt: {
      titulo: "Código de Acesso TTLock",
      saudacao: "Caro(a)",
      mensagem: "O seu Self Check-in foi realizado com sucesso! Aqui está o seu código de acesso:",
      codigoLabel: "Código de Acesso:",
      quarto: "Quarto:",
      checkin: "Check-in:",
      checkout: "Check-out:",
      aviso: "Guarde este código — será necessário para abrir a porta do seu quarto.",
      duvidas: "Se tiver alguma questão, contacte-nos.",
    },
    en: {
      titulo: "TTLock Access Code",
      saudacao: "Dear",
      mensagem: "Your Self Check-in has been completed! Here is your access code:",
      codigoLabel: "Access Code:",
      quarto: "Room:",
      checkin: "Check-in:",
      checkout: "Check-out:",
      aviso: "Keep this code safe — it will be needed to open your room door.",
      duvidas: "If you have any questions, please contact us.",
    },
  }[language] || {
    titulo: "Código de Acesso",
    saudacao: "Caro(a)",
    mensagem: "Código gerado.",
    codigoLabel: "Código:",
    quarto: "Quarto:",
    checkin: "Check-in:",
    checkout: "Check-out:",
    aviso: "",
    duvidas: "",
  };

  return `
    <div style="font-family:'Montserrat',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:20px;background:#2C3E50;border-radius:12px 12px 0 0;">
        <h1 style="color:#D4A843;margin:0;font-size:1.5rem;">Golden Beach Guest House</h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;">${trans.titulo}</p>
      </div>
      <div style="padding:30px;background:#fff;border:1px solid #e0e0e0;">
        <p style="color:#2C3E50;">${trans.saudacao} <strong>${guestName}</strong>,</p>
        <p style="color:#7F8C8D;">${trans.mensagem}</p>
        <div style="text-align:center;padding:25px;background:rgba(41,128,185,0.08);border-radius:12px;margin:20px 0;border:2px solid #2980B9;">
          <p style="color:#7F8C8D;font-size:0.9rem;margin:0;text-transform:uppercase;letter-spacing:2px;">${trans.codigoLabel}</p>
          <p style="color:#2980B9;font-size:3rem;font-weight:800;margin:10px 0;letter-spacing:12px;font-family:'Courier New',monospace;">${code}</p>
        </div>
        <ul style="color:#7F8C8D;list-style:none;padding:0;">
          <li><strong>${trans.quarto}</strong> ${roomId}</li>
          <li><strong>${trans.checkin}</strong> ${checkInDate}</li>
          <li><strong>${trans.checkout}</strong> ${checkOutDate}</li>
        </ul>
        <p style="color:#7F8C8D;padding:10px;background:#fff3cd;border-left:4px solid #ffc107;border-radius:4px;">${trans.aviso}</p>
        <p style="color:#7F8C8D;font-size:0.85rem;">${trans.duvidas}</p>
      </div>
      <div style="text-align:center;padding:15px;background:#f8f9fa;border-radius:0 0 12px 12px;">
        <p style="color:#7F8C8D;font-size:0.75rem;margin:0;">Golden Beach Guest House &copy; ${new Date().getFullYear()}</p>
      </div>
    </div>`;
}

router.post("/test-email", async (req, res) => {
  try {
    const { email } = req.body as { email: string };
    if (!email) return void res.status(400).json({ erro: true, mensagem: "Email é obrigatório" });

    await ensureTransporter().sendMail({
      from: process.env["SMTP_FROM"] || process.env["SMTP_USER"] || "goldenbeach@hotel.com",
      to: email,
      subject: "🧪 Teste de Email - Golden Beach Guest House",
      html: `<div style="font-family:Arial;padding:20px;"><h2>✅ Teste de Email Bem-sucedido</h2><p>Data: ${new Date().toLocaleString("pt-PT")}</p></div>`,
    });

    res.json({ sucesso: true, mensagem: "Email de teste enviado!", para: email, modo: EMAIL_MODE });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ erro: true, mensagem: "Erro ao enviar email de teste", detalhes: err.message });
  }
});

router.post("/gerar-codigo", async (req, res) => {
  try {
    const { room_id, data_entrada, data_saida, nome, cc } = req.body as {
      room_id: string;
      data_entrada: string;
      data_saida: string;
      nome: string;
      cc: string;
    };

    if (!room_id || !data_entrada || !data_saida || !nome || !cc) {
      return void res.status(400).json({ erro: true, mensagem: "Dados em falta" });
    }

    let token = null;
    if (process.env["TTLOCK_MODE"] !== "simulado") {
      token = await obterTokenTTLock();
    }

    const codigo = await criarCodigoTTLock(token, room_id, data_entrada, data_saida);

    res.json({
      sucesso: true,
      codigo,
      room_id,
      valido_de: data_entrada,
      valido_ate: data_saida,
      modo: process.env["TTLOCK_MODE"] || "simulado",
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ erro: true, mensagem: "Erro ao gerar código", detalhes: err.message });
  }
});

router.post("/generate-invoice-pdf", async (req, res) => {
  try {
    const { bookingData, language = "pt" } = req.body as {
      bookingData: {
        firstName: string;
        lastName?: string;
        apelido?: string;
        cc?: string;
        email: string;
        phone?: string;
        quarto: string;
        entrada: string;
        saida: string;
        nights: number;
        roomPrice: number;
        extras?: string[];
        extrasTotal?: number;
        total: number;
      };
      language?: string;
    };

    if (!bookingData) {
      return void res.status(400).json({ erro: true, mensagem: "Dados de reserva obrigatórios" });
    }

    const apelido = bookingData.apelido || bookingData.lastName || "";
    const nomeCompleto = `${bookingData.firstName} ${apelido}`.trim();
    const ccPassaporte = bookingData.cc || "—";
    const telefone = bookingData.phone || "—";
    const extrasLista = (bookingData.extras || []).join(", ") || "—";
    const subtotalAloj = (bookingData.roomPrice * bookingData.nights).toFixed(2);
    const subtotalExtras = (bookingData.extrasTotal || 0).toFixed(2);
    const refNum = Math.floor(10000000 + Math.random() * 89999999).toString();
    const dataAtual = new Date().toLocaleDateString("pt-PT");
    const dataEntrada = new Date(bookingData.entrada).toLocaleDateString("pt-PT");
    const dataSaida = new Date(bookingData.saida).toLocaleDateString("pt-PT");

    // @ts-ignore
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const buffers: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => buffers.push(chunk));

    const W = 595;
    const MARGIN = 50;
    const COL_LABEL = MARGIN + 10;
    const COL_VALUE = 370;

    // ─── HEADER ─────────────────────────────────────────────────────────
    let y = 50;
    doc.font("Helvetica-Bold").fontSize(17).fillColor("#2C3E50");
    doc.text("Golden Beach Guest House", MARGIN, y);
    y += 23;
    doc.font("Helvetica").fontSize(11).fillColor("#555");
    doc.text("Algarve, Portugal", MARGIN, y);

    doc.font("Helvetica-Bold").fontSize(16).fillColor("#2C3E50");
    doc.text("FATURA / RECIBO", MARGIN, 50, { width: W - 2 * MARGIN, align: "right" });
    doc.font("Helvetica").fontSize(10).fillColor("#555");
    doc.text(`Data: ${dataAtual}`, MARGIN, 71, { width: W - 2 * MARGIN, align: "right" });
    doc.text(`Ref: ${refNum}`, MARGIN, 85, { width: W - 2 * MARGIN, align: "right" });

    y = 115;
    doc.strokeColor("#D4A843").lineWidth(1.5).moveTo(MARGIN, y).lineTo(W - MARGIN, y).stroke();
    y += 22;

    // ─── DADOS DO HÓSPEDE ────────────────────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#2C3E50");
    doc.text("Dados do Hóspede", MARGIN, y);
    y += 20;

    doc.font("Helvetica").fontSize(10).fillColor("#333");
    doc.text(`Nome: ${nomeCompleto}`, MARGIN, y); y += 16;
    doc.text(`CC/Passaporte: ${ccPassaporte}`, MARGIN, y); y += 16;
    doc.text(`Email: ${bookingData.email}`, MARGIN, y); y += 16;
    doc.text(`Telefone: ${telefone}`, MARGIN, y); y += 28;

    // ─── DETALHES DA RESERVA ─────────────────────────────────────────────
    doc.font("Helvetica-Bold").fontSize(13).fillColor("#2C3E50");
    doc.text("Detalhes da Reserva", MARGIN, y);
    y += 20;

    doc.font("Helvetica-Bold").fontSize(10).fillColor("#2C3E50");
    doc.text("Descrição", COL_LABEL, y);
    doc.text("Detalhes", COL_VALUE, y);
    y += 14;
    doc.strokeColor("#999").lineWidth(0.5).moveTo(MARGIN, y).lineTo(W - MARGIN, y).stroke();
    y += 10;

    const tableRow = (label: string, value: string) => {
      doc.font("Helvetica").fontSize(10).fillColor("#333");
      doc.text(label, COL_LABEL, y);
      doc.text(value, COL_VALUE, y, { width: W - MARGIN - COL_VALUE });
      y += 18;
    };

    tableRow("Quarto", bookingData.quarto);
    tableRow("Check-in", dataEntrada);
    tableRow("Check-out", dataSaida);
    tableRow("Noites", String(bookingData.nights));
    tableRow("Preço por noite", `${bookingData.roomPrice.toFixed(2)}€`);

    if (extrasLista !== "—") {
      doc.font("Helvetica").fontSize(10).fillColor("#333");
      doc.text("Extras", COL_LABEL, y);
      const extrasH = doc.heightOfString(extrasLista, { width: W - MARGIN - COL_VALUE });
      doc.text(extrasLista, COL_VALUE, y, { width: W - MARGIN - COL_VALUE });
      y += Math.max(18, extrasH + 6);
    }

    y += 10;
    doc.strokeColor("#DDD").lineWidth(0.5).moveTo(MARGIN, y).lineTo(W - MARGIN, y).stroke();
    y += 14;

    doc.font("Helvetica").fontSize(10).fillColor("#333");
    doc.text("Subtotal Alojamento:", COL_LABEL, y);
    doc.text(`${subtotalAloj}€`, MARGIN, y, { width: W - 2 * MARGIN, align: "right" });
    y += 16;

    if (parseFloat(subtotalExtras) > 0) {
      doc.font("Helvetica").fontSize(10).fillColor("#333");
      doc.text("Subtotal Extras:", COL_LABEL, y);
      doc.text(`${subtotalExtras}€`, MARGIN, y, { width: W - 2 * MARGIN, align: "right" });
      y += 16;
    }

    y += 8;
    doc.strokeColor("#999").lineWidth(0.8).moveTo(MARGIN, y).lineTo(W - MARGIN, y).stroke();
    y += 12;

    doc.font("Helvetica-Bold").fontSize(13).fillColor("#2C3E50");
    doc.text("TOTAL PAGO", COL_LABEL, y);
    doc.text(`${bookingData.total.toFixed(2)}€`, MARGIN, y, { width: W - 2 * MARGIN, align: "right" });

    // ─── FOOTER ──────────────────────────────────────────────────────────
    const footerY = 715;
    doc.strokeColor("#D4A843").lineWidth(1).moveTo(MARGIN, footerY).lineTo(W - MARGIN, footerY).stroke();

    doc.font("Helvetica-Bold").fontSize(11).fillColor("#2C3E50");
    doc.text("Obrigado por escolher a Golden Beach Guest House!", 0, footerY + 15, { width: W, align: "center" });
    doc.font("Helvetica").fontSize(10).fillColor("#555");
    doc.text("Desejamos-lhe uma estadia agradável no Algarve.", 0, footerY + 32, { width: W, align: "center" });
    doc.text("Utilize o Self Check-in para obter o seu código de acesso TTLock.", 0, footerY + 48, { width: W, align: "center" });

    doc.rect(0, 800, W, 42).fill("#2C3E50");
    doc.font("Helvetica").fontSize(9).fillColor("#D4A843");
    doc.text("Golden Beach Guest House  |  Algarve, Portugal  |  goldenbeach@hotel.com", 0, 814, { width: W, align: "center" });

    doc.end();

    await new Promise<void>((resolve) => doc.on("end", resolve));
    const pdfBase64 = Buffer.concat(buffers).toString("base64");

    res.json({
      sucesso: true,
      pdfBase64,
      fileName: "Fatura_GoldenBeach.pdf",
    });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ erro: true, mensagem: "Erro ao gerar PDF", detalhes: err.message });
  }
});

router.post("/send-invoice", async (req, res) => {
  try {
    const { to, subject, guestName, pdfBase64, language = "pt", bookingData: _bookingData } = req.body as {
      to: string;
      subject?: string;
      guestName?: string;
      pdfBase64: string;
      language?: string;
      bookingData?: unknown;
    };

    if (!to || !pdfBase64) {
      return void res.status(400).json({ erro: true, mensagem: "Email e PDF são obrigatórios" });
    }

    const trans = {
      pt: { title: "Confirmação de Reserva", subtitle: "Fatura Anexada", mensagem: "O seu pagamento foi processado com sucesso. Em anexo encontra a fatura da sua reserva." },
      en: { title: "Booking Confirmation", subtitle: "Invoice Attached", mensagem: "Your payment has been processed successfully. Find the booking invoice attached." },
    }[language] || { title: "Confirmação de Reserva", subtitle: "Fatura Anexada", mensagem: "Pagamento processado." };

    const info = await ensureTransporter().sendMail({
      from: process.env["SMTP_FROM"] || process.env["SMTP_USER"] || "goldenbeach@hotel.com",
      to,
      subject: subject || (language === "pt" ? "Golden Beach - Confirmação de Reserva" : "Golden Beach - Booking Confirmation"),
      html: gerarTemplateEmail({ title: trans.title, subtitle: trans.subtitle, guestName: guestName || "Hóspede", mensagem: trans.mensagem, language }),
      attachments: [{ filename: language === "pt" ? "Fatura_GoldenBeach.pdf" : "Invoice_GoldenBeach.pdf", content: pdfBase64, encoding: "base64" }],
    });

    res.json({ sucesso: true, mensagem: "Email de fatura processado", modo: EMAIL_MODE, para: to, emailId: info.messageId || "N/A" });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ erro: true, mensagem: "Erro ao enviar email de fatura", detalhes: err.message });
  }
});

router.post("/send-ttlock-code", async (req, res) => {
  try {
    const { email, guestName, code, roomId, checkInDate, checkOutDate, language = "pt" } = req.body as {
      email: string;
      guestName?: string;
      code: string;
      roomId?: string;
      checkInDate?: string;
      checkOutDate?: string;
      language?: string;
    };

    if (!email || !code) {
      return void res.status(400).json({ erro: true, mensagem: "Email e código são obrigatórios" });
    }

    if (!validarPinTTLock(code)) {
      return void res.status(400).json({ erro: true, mensagem: "O PIN TTLock tem de ter exatamente 6 dígitos entre 1 e 7" });
    }

    await ensureTransporter().sendMail({
      from: process.env["SMTP_FROM"] || process.env["SMTP_USER"] || "goldenbeach@hotel.com",
      to: email,
      subject: language === "pt" ? "Golden Beach Guest House - Código de Acesso TTLock" : "Golden Beach Guest House - TTLock Access Code",
      html: gerarTemplateTTLock({ guestName: guestName || "Hóspede", code, roomId: roomId || "", checkInDate: checkInDate || "", checkOutDate: checkOutDate || "", language }),
    });

    res.json({ sucesso: true, mensagem: language === "pt" ? "Email com código TTLock enviado!" : "TTLock code email sent!", para: email, modo: EMAIL_MODE });
  } catch (error) {
    const err = error as Error;
    res.status(500).json({ erro: true, mensagem: "Erro ao enviar código TTLock", detalhes: err.message });
  }
});

router.get("/config", (_req, res) => {
  res.json({
    app_name: "PAP Hostel App",
    version: "1.0.0",
    ttlock_mode: process.env["TTLOCK_MODE"] || "simulado",
    email_mode: EMAIL_MODE,
    email_enabled: SMTP_CONFIGURED,
    environment: process.env["NODE_ENV"] || "development",
  });
});

export default router;
