# 🧪 Teste de Emails

## ✅ Tudo Configurado!

Suas credenciais foram adicionadas ao arquivo `.env`:
- **Email:** tiago.info2024@gmail.com
- **SMTP:** Gmail (smtp.gmail.com:587)
- **Modo:** real (emails reais serão enviados)

## 🚀 Como Testar

### Opção 1: Teste Rápido via cURL

Abra o PowerShell e execute:

```bash
$body = @{ email = "seu-email@example.com" } | ConvertTo-Json
Invoke-WebRequest -Uri "http://localhost:3001/api/test-email" -Method POST -ContentType "application/json" -Body $body
```

### Opção 2: Teste via Browser

1. Inicie o servidor: `npm run dev`
2. Aceda a este link (substitua seu email):
   ```
   http://localhost:3001/api/test-email?email=seu-email@example.com
   ```

### Opção 3: Teste Direto (Recomendado)

1. **Inicie o servidor:**
   ```bash
   cd server
   npm run dev
   ```

2. **Vá para a página de reserva:**
   - http://localhost:3001/booking.html
   - Preencha o formulário
   - Complete o pagamento
   - Verifique seu email

## 📧 O que Você Deve Receber

Após fazer uma reserva, receberá **2 emails**:

### Email 1: Fatura
- Título: "Golden Beach - Confirmação de Reserva"
- Contém: PDF com detalhes da reserva
- Anexo: `Fatura_GoldenBeach.pdf`

### Email 2: Código de Acesso
- Título: "Golden Beach - Código de Acesso TTLock"
- Contém: Código para fazer check-in

## ⚠️ Possíveis Problemas

### ❌ "Erro ao enviar email"
- Verifique se a senha foi copiada corretamente (sem espaços extras)
- Confirme que a App Password tem 16 caracteres
- Verifique se a Autenticação em Duas Etapas está ativada no Gmail

### ❌ "Email não recebido"
- Espere 1-2 minutos
- Verifique a pasta SPAM
- Verifique nos logs do servidor: `npm run dev` mostrará status

### ✅ "Sucesso! Emails serão enviados"
- Ótimo! Tudo está funcionando

## 🔍 Ver Logs do Servidor

Quando executar `npm run dev`, procure por:

```
✅ Email: Modo REAL - Emails serão enviados
SMTP Configurado: SIM

[EMAIL FATURA] Enviado para: cliente@example.com
[EMAIL TTLOCK] Enviado para: cliente@example.com
```

## 📚 Mais Informações

Veja `EMAIL_CONFIG.md` para:
- Configurações avançadas
- Outras opções de SMTP (Outlook, SendGrid, etc.)
- Troubleshooting completo

---

**Pronto!** Seus emails devem estar funcionando agora! 🎉
