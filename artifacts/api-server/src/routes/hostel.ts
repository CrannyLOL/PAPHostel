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
        lastName: string;
        email: string;
        phone?: string;
        quarto: string;
        entrada: string;
        saida: string;
        nights: number;
        roomPrice: number;
        extrasTotal?: number;
        total: number;
      };
      language?: string;
    };

    if (!bookingData) {
      return void res.status(400).json({ erro: true, mensagem: "Dados de reserva obrigatórios" });
    }

    // @ts-ignore
    const doc = new PDFDocument({ size: "A4", margin: 0 });
    const buffers: Buffer[] = [];
    doc.on("data", (chunk: Buffer) => buffers.push(chunk));

    doc.rect(0, 0, 612, 120).fill("#2C3E50");
    doc.fillColor("rgba(255,255,255,0.8)").fontSize(11).font("Helvetica");
    doc.text("Guest House", 50, 48, { width: 250, align: "left" });
    doc.text("Algarve, Portugal", 50, 65, { width: 250, align: "left" });
    doc.fillColor("rgba(255,255,255,0.95)").fontSize(16).font("Helvetica-Bold");
    doc.text(language === "pt" ? "FATURA" : "INVOICE", 400, 25, { width: 160, align: "right" });
    doc.fillColor("rgba(255,255,255,0.75)").fontSize(10).font("Helvetica");
    doc.text(`Data: ${new Date().toLocaleDateString(language === "pt" ? "pt-PT" : "en-US")}`, 400, 55, { width: 160, align: "right" });
    doc.text(`Ref: ${Math.random().toString().substring(2, 10)}`, 400, 72, { width: 160, align: "right" });

    let y = 145;
    doc.fillColor("#2C3E50").fontSize(12).font("Helvetica-Bold");
    doc.text(language === "pt" ? "HÓSPEDE / GUEST" : "GUEST", 50, y);
    y += 25;
    doc.fillColor("#333").fontSize(10).font("Helvetica");
    doc.text(`${bookingData.firstName} ${bookingData.lastName}`, 50, y); y += 15;
    doc.text(`Email: ${bookingData.email}`, 50, y); y += 15;
    doc.text(`Telefone: ${bookingData.phone || "N/A"}`, 50, y); y += 25;

    doc.fillColor("#2C3E50").fontSize(12).font("Helvetica-Bold");
    doc.text(language === "pt" ? "DETALHES DA RESERVA" : "BOOKING DETAILS", 50, y); y += 25;
    doc.fillColor("#333").fontSize(10).font("Helvetica");
    doc.text(`${language === "pt" ? "Quarto" : "Room"}: ${bookingData.quarto}`, 50, y); y += 15;
    doc.text(`Check-in: ${new Date(bookingData.entrada).toLocaleDateString(language === "pt" ? "pt-PT" : "en-US")}`, 50, y); y += 15;
    doc.text(`Check-out: ${new Date(bookingData.saida).toLocaleDateString(language === "pt" ? "pt-PT" : "en-US")}`, 50, y); y += 15;
    doc.text(`${language === "pt" ? "Noites" : "Nights"}: ${bookingData.nights}`, 50, y); y += 35;

    doc.strokeColor("#D4A843").lineWidth(2).moveTo(50, y).lineTo(562, y).stroke(); y += 20;
    doc.fillColor("#2C3E50").fontSize(11).font("Helvetica-Bold");
    doc.text(language === "pt" ? "DESCRIÇÃO" : "DESCRIPTION", 50, y);
    doc.text(language === "pt" ? "VALOR" : "VALUE", 480, y, { width: 80, align: "right" }); y += 20;
    doc.strokeColor("#DDD").lineWidth(1).moveTo(50, y).lineTo(562, y).stroke(); y += 15;

    doc.fillColor("#333").fontSize(10).font("Helvetica");
    const roomTotal = (bookingData.roomPrice * bookingData.nights).toFixed(2);
    doc.text(`${language === "pt" ? "Alojamento" : "Accommodation"} (${bookingData.nights}x €${bookingData.roomPrice.toFixed(2)})`, 50, y);
    doc.text(`€${roomTotal}`, 480, y, { width: 80, align: "right" }); y += 20;

    if (bookingData.extrasTotal && bookingData.extrasTotal > 0) {
      doc.text("Extras", 50, y);
      doc.text(`€${bookingData.extrasTotal.toFixed(2)}`, 480, y, { width: 80, align: "right" }); y += 20;
    }

    doc.strokeColor("#999").lineWidth(1).moveTo(50, y).lineTo(562, y).stroke(); y += 20;
    doc.fillColor("#2980B9").fontSize(13).font("Helvetica-Bold");
    doc.text(language === "pt" ? "TOTAL A PAGAR" : "TOTAL TO PAY", 50, y);
    doc.text(`€${bookingData.total.toFixed(2)}`, 480, y, { width: 80, align: "right" }); y += 35;

    doc.strokeColor("#DDD").lineWidth(1).moveTo(50, y).lineTo(562, y).stroke(); y += 15;
    doc.fillColor("#777").fontSize(8).font("Helvetica");
    doc.text(`Gerado em: ${new Date().toLocaleString("pt-PT")}`, 50, y, { width: 512, align: "center" }); y += 12;
    doc.text("Golden Beach Guest House © 2026", 50, y, { width: 512, align: "center" });
    doc.end();

    await new Promise<void>((resolve) => doc.on("end", resolve));
    const pdfBase64 = Buffer.concat(buffers).toString("base64");

    res.json({
      sucesso: true,
      pdfBase64,
      fileName: language === "pt" ? "Fatura_GoldenBeach.pdf" : "Invoice_GoldenBeach.pdf",
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
