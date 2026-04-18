# 📧 Configuração de Envio de Emails

## Problema Identificado
Os PDFs **não estão sendo enviados por email** porque o arquivo `.env` estava faltando e as credenciais SMTP não estavam configuradas.

## Solução

### 1. Criar/Atualizar o arquivo `.env`

Um arquivo `.env` foi criado em `PAP_Hostel-App/.env` com as configurações necessárias.

### 2. Configurar Credenciais SMTP (Gmail)

**Para usar Gmail:**

1. Habilite a Autenticação em Duas Etapas em sua conta Google
2. Acesse: https://myaccount.google.com/apppasswords
3. Selecione "Mail" e "Windows Computer"
4. Google gerará uma senha de 16 caracteres
5. Copie essa senha

**No arquivo `.env`, adicione:**
```
EMAIL_MODE=real
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu-email@gmail.com
SMTP_PASS=sua-senha-app-password-16-caracteres
SMTP_FROM=seu-email@gmail.com
```

**Exemplo prático:**
```
EMAIL_MODE=real
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=tiago@gmail.com
SMTP_PASS=abcd efgh ijkl mnop
SMTP_FROM=tiago@gmail.com
```

### 3. Outras Opções de SMTP

**Outlook/Hotmail:**
```
SMTP_HOST=smtp-mail.outlook.com
SMTP_PORT=587
SMTP_USER=seu-email@outlook.com
SMTP_PASS=sua-senha
```

**SendGrid:**
```
SMTP_HOST=smtp.sendgrid.net
SMTP_PORT=587
SMTP_USER=apikey
SMTP_PASS=SG.sua-api-key-aqui
```

**Mailgun:**
```
SMTP_HOST=smtp.mailgun.org
SMTP_PORT=587
SMTP_USER=postmaster@seu-dominio.com
SMTP_PASS=sua-api-key
```

## Verificar se está funcionando

1. Aceda ao servidor (inicie com `npm run dev`)
2. Faça uma reserva de teste
3. Verifique:
   - **Console do servidor**: Deve aparecer `[EMAIL FATURA] Enviado para: email@example.com`
   - **Seu email**: Deve receber o PDF com a fatura em anexo
   - **Modo simulado**: Se não conseguir receber, o console mostrará `[EMAIL FATURA] Simulado`

## ⚠️ IMPORTANTE

- Nunca publique o arquivo `.env` no GitHub (já está em `.gitignore`)
- Mude `EMAIL_MODE=real` apenas quando as credenciais estiverem corretas
- Se tiver dúvidas, deixe em modo `EMAIL_MODE=log` para debug

## Fluxo de Email (Após Pagamento)

```
1. Cliente preenche reserva → Paga
2. Servidor gera PDF (server/index.js)
3. Servidor envia Email #1: Fatura com PDF anexado
4. Servidor envia Email #2: Código de acesso TTLock
5. Cliente recebe ambos os emails
```

---

**Dúvidas?** Verifique os logs do servidor com `npm run dev`
