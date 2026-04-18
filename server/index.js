import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import nodemailer from "nodemailer";
import PDFDocument from "pdfkit";
import { Readable } from "stream";
import { criarCodigoTTLock, obterTokenTTLock } from "./ttlock.js";

// Configurações base
dotenv.config();

const app = express();
app.use(cors());
app.use(express.json({ limit: "10mb" }));

// Necessário para ES Modules (import)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Servir a pasta public (HTML, CSS, JS)
app.use(express.static(path.join(__dirname, "../public")));

// Email Mode (real ou log)
const EMAIL_MODE = process.env.EMAIL_MODE || "log";
const SMTP_CONFIGURED = !!(process.env.SMTP_USER && process.env.SMTP_PASS);

// Configurar transportador de email
let transporter = null;

if (EMAIL_MODE === "real" && SMTP_CONFIGURED) {
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || "smtp.gmail.com",
    port: parseInt(process.env.SMTP_PORT || "587"),
    secure: false,
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS
    }
  });
  console.log("Email: Modo REAL - Emails serão enviados");
} else {
  // Modo simulado com Nodemailer (não envia realmente, apenas escreve logs)
  transporter = nodemailer.createTransport({
    host: "localhost",
    port: 1025,
    secure: false,
    auth: false
  });
  console.log(`Email: Modo ${EMAIL_MODE} - Emails serão apenas registados em logs`);
}

// ============================================
// ROTAS API
// ============================================

/**
 * POST /api/gerar-codigo
 * Gera um código de acesso para a reserva
 */
app.post("/api/gerar-codigo", async (req, res) => {
  try {
    const { room_id, data_entrada, data_saida, nome, cc } = req.body;

    // Validação de campos obrigatórios
    if (!room_id || !data_entrada || !data_saida || !nome || !cc) {
      return res.status(400).json({
        erro: true,
        mensagem: "Dados em falta"
      });
    }

    // Obter token TTLock
    let token = null;
    if (process.env.TTLOCK_MODE !== "simulado") {
      token = await obterTokenTTLock();
    }

    // Gerar código (real ou simulado)
    const codigo = await criarCodigoTTLock(token, room_id, data_entrada, data_saida);

    console.log("[CODIGO GERADO] Reserva:", {
      room_id,
      nome,
      cc,
      codigo,
      data_entrada,
      data_saida
    });

    res.json({
      sucesso: true,
      codigo,
      room_id,
      valido_de: data_entrada,
      valido_ate: data_saida,
      modo: process.env.TTLOCK_MODE || "simulado"
    });

  } catch (error) {
    console.error("[ERRO] Gerar código:", error.message);
    res.status(500).json({
      erro: true,
      mensagem: "Erro ao gerar código",
      detalhes: error.message
    });
  }
});

/**
 * POST /api/generate-invoice-pdf
 * Gera um PDF de fatura e retorna em base64
 */
app.post("/api/generate-invoice-pdf", async (req, res) => {
  try {
    const { bookingData, language = "pt" } = req.body;

    if (!bookingData) {
      return res.status(400).json({
        erro: true,
        mensagem: "Dados de reserva obrigatórios"
      });
    }

    // Criar documento PDF
    const doc = new PDFDocument({
      size: "A4",
      margin: 50
    });

    // Coletar dados do PDF em buffer
    const buffers = [];
    doc.on("data", buffers.push.bind(buffers));

    // Header com logo e título
    doc.rect(0, 0, 595, 100).fill("#2C3E50");
    doc.fillColor("#D4A843").fontSize(28).font("Helvetica-Bold").text("Golden Beach", 40, 25, { width: 400 });
    doc.fillColor("rgba(255,255,255,0.8)").fontSize(12).font("Helvetica").text("GUEST HOUSE", 40, 55, { width: 400 });
    doc.moveDown(1);

    // Título do recibo
    doc.fillColor("#2C3E50").fontSize(14).font("Helvetica-Bold");
    doc.text(language === "pt" ? "RECIBO DE RESERVA" : "BOOKING RECEIPT", { align: "center" });
    doc.moveDown(0.8);

    // Seção de hóspede
    doc.fontSize(11).font("Helvetica-Bold").text(language === "pt" ? "HÓSPEDE / GUEST" : "GUEST");
    doc.fontSize(10).font("Helvetica");
    doc.text(`${bookingData.firstName} ${bookingData.lastName}`);
    doc.text(`Email: ${bookingData.email}`);
    doc.text(`Telefone / Phone: ${bookingData.phone || "N/A"}`);
    doc.moveDown(0.6);

    // Seção de reserva
    doc.fontSize(11).font("Helvetica-Bold").text(language === "pt" ? "DETALHES DA RESERVA" : "BOOKING DETAILS");
    doc.fontSize(10).font("Helvetica");
    doc.text(`${language === "pt" ? "Quarto / Room" : "Room"}: ${bookingData.quarto}`);
    doc.text(`${language === "pt" ? "Check-in" : "Check-in"}: ${new Date(bookingData.entrada).toLocaleDateString(language === "pt" ? "pt-PT" : "en-US")}`);
    doc.text(`${language === "pt" ? "Check-out" : "Check-out"}: ${new Date(bookingData.saida).toLocaleDateString(language === "pt" ? "pt-PT" : "en-US")}`);
    doc.text(`${language === "pt" ? "Noites / Nights" : "Nights"}: ${bookingData.nights}`);
    doc.moveDown(0.6);

    // Separador
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.4);
    
    // Headers da tabela
    doc.fontSize(10).font("Helvetica-Bold").fillColor("#2C3E50");
    const descWidth = 320;
    const valueWidth = 140;
    doc.text(language === "pt" ? "DESCRIÇÃO" : "DESCRIPTION", 40, doc.y, { width: descWidth });
    doc.text(language === "pt" ? "VALOR" : "VALUE", 370, doc.y - 10, { align: "right", width: valueWidth });
    
    doc.moveDown(0.3);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.3);

    // Valores
    doc.font("Helvetica").fontSize(10).fillColor("#2C3E50");
    const roomLineY = doc.y;
    doc.text(`${language === "pt" ? "Alojamento" : "Accommodation"} (${bookingData.nights}x ${bookingData.roomPrice.toFixed(2)} EUR)`, 40, roomLineY, { width: descWidth });
    const roomTotal = (bookingData.roomPrice * bookingData.nights).toFixed(2);
    doc.text(roomTotal + " EUR", 370, roomLineY, { align: "right", width: valueWidth });
    doc.moveDown(0.3);
    
    if (bookingData.extrasTotal && bookingData.extrasTotal > 0) {
      const extrasLineY = doc.y;
      doc.text(`${language === "pt" ? "Extras" : "Extras"}`, 40, extrasLineY, { width: descWidth });
      doc.text(bookingData.extrasTotal.toFixed(2) + " EUR", 370, extrasLineY, { align: "right", width: valueWidth });
      doc.moveDown(0.3);
    }

    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(0.3);

    // Total
    doc.fontSize(12).font("Helvetica-Bold").fillColor("#2980B9");
    const totalLineY = doc.y;
    doc.text(language === "pt" ? "TOTAL A PAGAR" : "TOTAL TO PAY", 40, totalLineY, { width: descWidth });
    doc.text(bookingData.total.toFixed(2) + " EUR", 370, totalLineY, { align: "right", width: valueWidth });
    
    doc.moveDown(1);
    doc.moveTo(40, doc.y).lineTo(555, doc.y).stroke();
    doc.moveDown(1);

    // Rodapé
    doc.fontSize(8).font("Helvetica").fillColor("#7F8C8D");
    doc.text(language === "pt" 
      ? "Recibo gerado em: " + new Date().toLocaleString("pt-PT")
      : "Receipt generated on: " + new Date().toLocaleString("en-US"), 
      { align: "center" });
    doc.text("Golden Beach Guest House © 2026", { align: "center" });
    doc.text(language === "pt" 
      ? "Hostel com Self Check-in Digital" 
      : "Hostel with Digital Self Check-in", 
      { align: "center" });

    // Finalizar documento
    doc.end();

    // Aguardar conclusão do PDF
    doc.on("end", () => {
      const pdfBuffer = Buffer.concat(buffers);
      const pdfBase64 = pdfBuffer.toString("base64");

      res.json({
        sucesso: true,
        pdfBase64: pdfBase64,
        fileName: language === "pt" ? "Fatura_GoldenBeach.pdf" : "Invoice_GoldenBeach.pdf"
      });
    });

  } catch (error) {
    console.error("[ERRO] Gerar PDF:", error.message);
    res.status(500).json({
      erro: true,
      mensagem: "Erro ao gerar PDF",
      detalhes: error.message
    });
  }
});

/**
 * POST /api/send-invoice
 * Envia fatura por email ao hóspede (traduzida conforme o idioma do utilizador)
 */
app.post("/api/send-invoice", async (req, res) => {
  try {
    const { to, subject, guestName, pdfBase64, language = "pt", bookingData } = req.body;

    // Validação
    if (!to || !pdfBase64) {
      return res.status(400).json({
        erro: true,
        mensagem: "Email e PDF são obrigatórios"
      });
    }

    // Configurar mensagens baseado na língua
    const translations = {
      pt: {
        title: "Confirmação de Reserva",
        subtitle: "Fatura Anexada",
        mensagem: "O seu pagamento foi processado com sucesso. Em anexo encontra a fatura da sua reserva."
      },
      en: {
        title: "Booking Confirmation",
        subtitle: "Invoice Attached",
        mensagem: "Your payment has been processed successfully. Find the booking invoice attached."
      }
    };

    const trans = translations[language] || translations.pt;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "goldenbeach@hotel.com",
      to: to,
      subject: subject || (language === "pt" 
        ? "Golden Beach - Confirmação de Reserva" 
        : "Golden Beach - Booking Confirmation"),
      html: gerarTemplateEmail({
        title: trans.title,
        subtitle: trans.subtitle,
        guestName: guestName || "Hóspede",
        mensagem: trans.mensagem,
        language: language
      }),
      attachments: [{
        filename: language === "pt" 
          ? "Fatura_GoldenBeach.pdf" 
          : "Invoice_GoldenBeach.pdf",
        content: pdfBase64,
        encoding: "base64"
      }]
    };

    // Enviar email
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[EMAIL FATURA] Enviado para: ${to} (Idioma: ${language})`);
      console.log(`  Response ID: ${info.response || "Demo Mode"}`);
    } catch (emailError) {
      console.warn(`[EMAIL FATURA] Simulado (Modo ${EMAIL_MODE}):`, {
        para: to,
        assunto: mailOptions.subject,
        idioma: language
      });
    }

    res.json({
      sucesso: true,
      mensagem: language === "pt" ? "Email de fatura processado" : "Invoice email processed",
      modo: EMAIL_MODE,
      para: to,
      idioma: language
    });

  } catch (error) {
    console.error("[ERRO] Enviar fatura:", error.message);
    res.status(500).json({
      erro: true,
      mensagem: "Erro ao enviar email de fatura",
      detalhes: error.message
    });
  }
});

/**
 * POST /api/send-ttlock-code
 * Envia código de acesso TTLock por email (traduzido conforme idioma)
 */
app.post("/api/send-ttlock-code", async (req, res) => {
  try {
    const { email, guestName, code, roomId, checkInDate, checkOutDate, language = "pt" } = req.body;

    // Validação
    if (!email || !code) {
      return res.status(400).json({
        erro: true,
        mensagem: "Email e código são obrigatórios"
      });
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "goldenbeach@hotel.com",
      to: email,
      subject: language === "pt" 
        ? "Golden Beach Guest House - Código de Acesso TTLock"
        : "Golden Beach Guest House - TTLock Access Code",
      html: gerarTemplateTTLock({
        guestName: guestName || "Hóspede",
        code: code,
        roomId: roomId || "N/A",
        checkInDate: checkInDate || "N/A",
        checkOutDate: checkOutDate || "N/A",
        language: language
      })
    };

    // Enviar email
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[EMAIL CODIGO] Enviado para: ${email} (Idioma: ${language})`);
      console.log(`  Código: ${code}`);
      console.log(`  Response ID: ${info.response || "Demo Mode"}`);
    } catch (emailError) {
      console.warn(`[EMAIL CODIGO] Simulado (Modo ${EMAIL_MODE}):`, {
        para: email,
        codigo: code,
        quarto: roomId,
        idioma: language
      });
    }

    res.json({
      sucesso: true,
      mensagem: language === "pt" ? "Código TTLock enviado" : "TTLock code sent",
      modo: EMAIL_MODE,
      para: email,
      codigo: code,
      idioma: language
    });

  } catch (error) {
    console.error("[ERRO] Enviar código TTLock:", error.message);
    res.status(500).json({
      erro: true,
      mensagem: "Erro ao enviar código",
      detalhes: error.message
    });
  }
});

/**
 * GET /api/health
 * Verifica se o servidor está funcionando
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    email_mode: EMAIL_MODE,
    email_configured: SMTP_CONFIGURED,
    emailMode: EMAIL_MODE
  });
});

/**
 * GET /api/config
 * Retorna informações de configuração públicas
 */
app.get("/api/config", (req, res) => {
  res.json({
    app_name: "PAP Hostel App",
    version: "1.0.0",
    ttlock_mode: process.env.TTLOCK_MODE || "simulado",
    email_mode: EMAIL_MODE,
    email_enabled: SMTP_CONFIGURED,
    environment: process.env.NODE_ENV || "development"
  });
});

/**
 * POST /api/test-email
 * Endpoint de teste para validar envio de emails
 */
app.post("/api/test-email", async (req, res) => {
  try {
    const { to, subject, guestName, pdfBase64, language = "pt", bookingData } = req.body;

    // Validação
    if (!to || !pdfBase64) {
      return res.status(400).json({
        erro: true,
        mensagem: "Email e PDF são obrigatórios"
      });
    }

    // Configurar mensagens baseado na língua
    const translations = {
      pt: {
        title: "Confirmação de Reserva",
        subtitle: "Fatura Anexada",
        mensagem: "O seu pagamento foi processado com sucesso. Em anexo encontra a fatura da sua reserva."
      },
      en: {
        title: "Booking Confirmation",
        subtitle: "Invoice Attached",
        mensagem: "Your payment has been processed successfully. Find the booking invoice attached."
      }
    };

    const trans = translations[language] || translations.pt;

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "goldenbeach@hotel.com",
      to: to,
      subject: subject || (language === "pt" 
        ? "Golden Beach - Confirmação de Reserva" 
        : "Golden Beach - Booking Confirmation"),
      html: gerarTemplateEmail({
        title: trans.title,
        subtitle: trans.subtitle,
        guestName: guestName || "Hóspede",
        mensagem: trans.mensagem,
        language: language
      }),
      attachments: [{
        filename: language === "pt" 
          ? "Fatura_GoldenBeach.pdf" 
          : "Invoice_GoldenBeach.pdf",
        content: pdfBase64,
        encoding: "base64"
      }]
    };

    // Enviar email
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[EMAIL FATURA] Enviado para: ${to} (Idioma: ${language})`);
      console.log(`  Response ID: ${info.response || "Demo Mode"}`);
    } catch (emailError) {
      console.warn(`[EMAIL FATURA] Simulado (Modo ${EMAIL_MODE}):`, {
        para: to,
        assunto: mailOptions.subject,
        idioma: language
      });
    }

    res.json({
      sucesso: true,
      mensagem: language === "pt" ? "Email de fatura processado" : "Invoice email processed",
      modo: EMAIL_MODE,
      para: to,
      idioma: language
    });

  } catch (error) {
    console.error("[ERRO] Enviar fatura:", error.message);
    res.status(500).json({
      erro: true,
      mensagem: "Erro ao enviar email de fatura",
      detalhes: error.message
    });
  }
});

/**
 * POST /api/send-ttlock-code
 * Envia código de acesso TTLock por email (traduzido conforme idioma)
 */
app.post("/api/send-ttlock-code", async (req, res) => {
  try {
    const { email, guestName, code, roomId, checkInDate, checkOutDate, language = "pt" } = req.body;

    // Validação
    if (!email || !code) {
      return res.status(400).json({
        erro: true,
        mensagem: "Email e código são obrigatórios"
      });
    }

    const mailOptions = {
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "goldenbeach@hotel.com",
      to: email,
      subject: language === "pt" 
        ? "Golden Beach Guest House - Código de Acesso TTLock"
        : "Golden Beach Guest House - TTLock Access Code",
      html: gerarTemplateTTLock({
        guestName: guestName || "Hóspede",
        code: code,
        roomId: roomId || "N/A",
        checkInDate: checkInDate || "N/A",
        checkOutDate: checkOutDate || "N/A",
        language: language
      })
    };

    // Enviar email
    try {
      const info = await transporter.sendMail(mailOptions);
      console.log(`[EMAIL CODIGO] Enviado para: ${email} (Idioma: ${language})`);
      console.log(`  Código: ${code}`);
      console.log(`  Response ID: ${info.response || "Demo Mode"}`);
    } catch (emailError) {
      console.warn(`[EMAIL CODIGO] Simulado (Modo ${EMAIL_MODE}):`, {
        para: email,
        codigo: code,
        quarto: roomId,
        idioma: language
      });
    }

    res.json({
      sucesso: true,
      mensagem: language === "pt" ? "Código TTLock enviado" : "TTLock code sent",
      modo: EMAIL_MODE,
      para: email,
      codigo: code,
      idioma: language
    });

  } catch (error) {
    console.error("[ERRO] Enviar código TTLock:", error.message);
    res.status(500).json({
      erro: true,
      mensagem: "Erro ao enviar código",
      detalhes: error.message
    });
  }
});

/**
 * GET /api/health
 * Verifica se o servidor está funcionando
 */
app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || "development",
    email_mode: EMAIL_MODE,
    email_configured: SMTP_CONFIGURED,
    emailMode: EMAIL_MODE
  });
});

/**
 * GET /api/config
 * Retorna informações de configuração públicas
 */
app.get("/api/config", (req, res) => {
  res.json({
    app_name: "PAP Hostel App",
    version: "1.0.0",
    ttlock_mode: process.env.TTLOCK_MODE || "simulado",
    email_mode: EMAIL_MODE,
    email_enabled: SMTP_CONFIGURED,
    environment: process.env.NODE_ENV || "development"
  });
});

/**
 * POST /api/test-email
 * Endpoint de teste para validar envio de emails
 */
app.post("/api/test-email", async (req, res) => {
  try {
    const testEmail = req.body.email || process.env.SMTP_USER || "test@example.com";

    console.log(`[TEST EMAIL] Iniciando teste para: ${testEmail}`);

    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || process.env.SMTP_USER || "test@goldenbeach.com",
      to: testEmail,
      subject: "Teste de Email - PAP Hostel App",
      html: `
        <div style="font-family:Arial;padding:20px;background:#f5f5f5;">
          <h2 style="color:#2C3E50;">Teste de Email Bem-sucedido</h2>
          <p>Este é um email de teste do sistema PAP Hostel App.</p>
          <p style="color:#27AE60;font-weight:bold;">Data: ${new Date().toLocaleString("pt-PT")}</p>
          <p style="color:#7F8C8D;">Se recebeu este email, o sistema está funcionando corretamente.</p>
        </div>
      `
    });

    console.log(`[TEST EMAIL] Sucesso:`, info.response || "Demo Mode");

    res.json({
      sucesso: true,
      mensagem: "Email de teste enviado",
      para: testEmail,
      modo: EMAIL_MODE,
      timestamp: new Date().toISOString()
    });

  } catch (error) {
    console.error("[ERRO] Teste de email:", error.message);
    res.status(500).json({
      erro: true,
      mensagem: "Erro ao enviar email de teste",
      detalhes: error.message
    });
  }
});

// Fallback para SPA (Single Page Application)
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "../public/index.html"));
});

// ============================================
// FUNÇÕES AUXILIARES
// ============================================

/**
 * Gera template HTML para email de confirmação
 */
function gerarTemplateEmail(opcoes) {
  const { title, subtitle, guestName, mensagem, language = "pt" } = opcoes;

  // Mensagens padrão em ambas as línguas
  const mensagensDefault = {
    pt: {
      saudacao: "Caro(a)",
      obrigado: "Obrigado por escolher a",
      estadia: "Desejamos-lhe uma estadia agradável!",
      duvidas: "Se tiver alguma questão, não hesite em contactar-nos."
    },
    en: {
      saudacao: "Dear",
      obrigado: "Thank you for choosing",
      estadia: "We hope you have a pleasant stay!",
      duvidas: "If you have any questions, please don't hesitate to contact us."
    }
  };

  const msgs = mensagensDefault[language] || mensagensDefault.pt;

  return `
    <div style="font-family:'Montserrat',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:20px;background:#2C3E50;border-radius:12px 12px 0 0;">
        <h1 style="color:#D4A843;margin:0;font-size:1.5rem;">Golden Beach Guest House</h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:0.9rem;">${subtitle || (language === "pt" ? "Confirmação" : "Confirmation")}</p>
      </div>
      <div style="padding:30px;background:#fff;border:1px solid #e0e0e0;">
        <p style="color:#2C3E50;font-size:1rem;">${msgs.saudacao} <strong>${guestName}</strong>,</p>
        <p style="color:#7F8C8D;line-height:1.8;">${mensagem}</p>
        <p style="color:#7F8C8D;line-height:1.8;">${msgs.obrigado} <strong>Golden Beach Guest House</strong>. ${msgs.estadia}</p>
        <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;">
        <p style="color:#7F8C8D;font-size:0.85rem;">${msgs.duvidas}</p>
      </div>
      <div style="text-align:center;padding:15px;background:#f8f9fa;border-radius:0 0 12px 12px;border:1px solid #e0e0e0;border-top:none;">
        <p style="color:#7F8C8D;font-size:0.75rem;margin:0;">Golden Beach Guest House &copy; ${new Date().getFullYear()}</p>
      </div>
    </div>
  `;
}

/**
 * Gera template HTML para email de código TTLock (traduzido)
 */
function gerarTemplateTTLock(dados) {
  const { guestName, code, roomId, checkInDate, checkOutDate, language = "pt" } = dados;

  // Mensagens traduzidas
  const trans = {
    pt: {
      titulo: "Código de Acesso TTLock",
      saudacao: "Caro(a)",
      mensagem: "O seu Self Check-in foi realizado com sucesso! Aqui está o seu código de acesso para a fechadura TTLock:",
      codigoLabel: "Código de Acesso:",
      detalhes: "Detalhes da sua reserva:",
      quarto: "Quarto:",
      checkin: "Check-in:",
      checkout: "Check-out:",
      aviso: "Guarde este código — será necessário para abrir a porta do seu quarto. Tem validade apenas durante o período da sua estadia.",
      duvidas: "Se tiver alguma questão, não hesite em contactar-nos."
    },
    en: {
      titulo: "TTLock Access Code",
      saudacao: "Dear",
      mensagem: "Your Self Check-in has been successfully completed! Here is your access code for the TTLock:",
      codigoLabel: "Access Code:",
      detalhes: "Your booking details:",
      quarto: "Room:",
      checkin: "Check-in:",
      checkout: "Check-out:",
      aviso: "Keep this code safe — it will be needed to open your room door. It is valid only during your stay period.",
      duvidas: "If you have any questions, please don't hesitate to contact us."
    }
  };

  const msg = trans[language] || trans.pt;

  return `
    <div style="font-family:'Montserrat',Arial,sans-serif;max-width:600px;margin:0 auto;padding:20px;">
      <div style="text-align:center;padding:20px;background:#2C3E50;border-radius:12px 12px 0 0;">
        <h1 style="color:#D4A843;margin:0;font-size:1.5rem;">Golden Beach Guest House</h1>
        <p style="color:rgba(255,255,255,0.8);margin:8px 0 0;font-size:0.9rem;">${msg.titulo}</p>
      </div>
      <div style="padding:30px;background:#fff;border:1px solid #e0e0e0;">
        <p style="color:#2C3E50;font-size:1rem;">${msg.saudacao} <strong>${guestName}</strong>,</p>
        <p style="color:#7F8C8D;line-height:1.8;">${msg.mensagem}</p>
        
        <div style="text-align:center;padding:25px;background:rgba(41,128,185,0.08);border-radius:12px;margin:20px 0;border:2px solid #2980B9;">
          <p style="color:#7F8C8D;font-size:0.9rem;margin:0;text-transform:uppercase;letter-spacing:2px;">${msg.codigoLabel}</p>
          <p style="color:#2980B9;font-size:3rem;font-weight:800;margin:10px 0;letter-spacing:12px;font-family:'Courier New',monospace;">${code}</p>
        </div>

        <p style="color:#7F8C8D;line-height:1.8;"><strong>${msg.detalhes}</strong></p>
        <ul style="color:#7F8C8D;line-height:1.8;list-style:none;padding:0;">
          <li style="padding:5px 0;"><strong>${msg.quarto}</strong> ${roomId}</li>
          <li style="padding:5px 0;"><strong>${msg.checkin}</strong> ${checkInDate}</li>
          <li style="padding:5px 0;"><strong>${msg.checkout}</strong> ${checkOutDate}</li>
        </ul>

        <p style="color:#7F8C8D;line-height:1.8;margin-top:15px;padding:10px;background:#fff3cd;border-left:4px solid #ffc107;border-radius:4px;">${msg.aviso}</p>
        
        <hr style="border:none;border-top:1px solid #e0e0e0;margin:20px 0;">
        <p style="color:#7F8C8D;font-size:0.85rem;">${msg.duvidas}</p>
      </div>
      <div style="text-align:center;padding:15px;background:#f8f9fa;border-radius:0 0 12px 12px;border:1px solid #e0e0e0;border-top:none;">
        <p style="color:#7F8C8D;font-size:0.75rem;margin:0;">Golden Beach Guest House &copy; ${new Date().getFullYear()}</p>
      </div>
    </div>
  `;
}

// ============================================
// INICIALIZAÇÃO DO SERVIDOR
// ============================================

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`
    ========================================
    PAP Hostel App - Servidor Iniciado
    ========================================
    Porta: ${PORT}
    Ambiente: ${process.env.NODE_ENV || "development"}
    Email Mode: ${EMAIL_MODE}
    SMTP Configurado: ${SMTP_CONFIGURED ? "SIM" : "NAO"}
    TTLock: ${process.env.TTLOCK_MODE || "simulado"}
    URL: http://localhost:${PORT}
    ========================================
  `);
});
