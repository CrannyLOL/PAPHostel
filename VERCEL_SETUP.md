# 🚀 Configurar PAP Hostel App no Vercel

## ⚠️ Por que os builds estão falhando?

O Vercel precisa das variáveis de ambiente SMTP para funcionar corretamente. Sem elas, os emails não funcionarão e pode haver erros no build.

---

## 📋 Passo-a-Passo (5 minutos)

### 1️⃣ Ir para o Painel do Vercel

```
https://vercel.com/dashboard
```

### 2️⃣ Selecionar o Projeto

- Clique em: **PAPHostel** (ou seu nome do projeto)
- Vá para: **Settings** (engrenagem no topo)

### 3️⃣ Adicionar Variáveis de Ambiente

Na esquerda, clique em: **Environment Variables**

### 4️⃣ Adicionar Cada Variável

Adicione as seguintes variáveis (uma por uma):

**Variável 1:**
```
Name: EMAIL_MODE
Value: real
Environments: Production, Preview, Development
```

**Variável 2:**
```
Name: SMTP_HOST
Value: smtp.gmail.com
Environments: Production, Preview, Development
```

**Variável 3:**
```
Name: SMTP_PORT
Value: 587
Environments: Production, Preview, Development
```

**Variável 4:**
```
Name: SMTP_USER
Value: tiago.info2024@gmail.com
Environments: Production, Preview, Development
```

**Variável 5 (IMPORTANTE - copie exatamente):**
```
Name: SMTP_PASS
Value: wpep hxtw saok fusj
Environments: Production, Preview, Development
```

**Variável 6:**
```
Name: SMTP_FROM
Value: tiago.info2024@gmail.com
Environments: Production, Preview, Development
```

**Variável 7:**
```
Name: NODE_ENV
Value: production
Environments: Production, Preview, Development
```

### 5️⃣ Redeployar o Projeto

1. Na página do projeto, vá a **Deployments**
2. Clique nos **3 pontinhos** (...) do último deploy
3. Selecione: **Redeploy**
4. Aguarde (cerca de 2-3 minutos)
5. Verifique o status - deve estar ✅ **Ready**

---

## ✅ Verificar se Funcionou

1. Vá para: https://pap-hostel-i9nt.vercel.app/
2. Faça uma reserva de teste
3. Verifique:
   - ✅ PDF é gerado (sem sobreposição de texto)
   - ✅ Email recebido com fatura
   - ✅ Nenhum erro nos logs

---

## 🔍 Ver Logs no Vercel

Se tiver problemas:

1. Vá para **Deployments**
2. Clique no deploy mais recente
3. Vá para **Logs**
4. Procure por:
   - `Email: Modo REAL` → OK
   - `[EMAIL FATURA] Enviado para:` → Email foi enviado
   - `ERRO` → Algo deu errado

---

## ❓ Problemas Comuns

### ❌ "SMTP Configurado: NAO"
**Solução:** Uma ou mais variáveis SMTP não foram adicionadas
- Verifique se todas as 6 variáveis SMTP estão presentes
- Verifique os nomes exatos (maiúsculas/minúsculas)

### ❌ "Deployment failed"
**Solução:** 
1. Vá a **Deployments** > logs
2. Procure por erros específicos
3. Se for erro de Node.js: verifique `npm run build` localmente

### ❌ "Email não recebido"
**Solução:**
1. Verifique se `EMAIL_MODE=real` está no Vercel
2. Verifique se `SMTP_PASS` tem EXATAMENTE: `wpep hxtw saok fusj`
3. Verifique pasta SPAM do email

### ❌ "Erro 500 no /api/..."
**Solução:** Variáveis de ambiente em falta
- Certifique-se de ter adicionado todas as 7 variáveis

---

## 🎯 Checklist Final

- ✅ 7 variáveis de ambiente adicionadas ao Vercel
- ✅ Deployment refeito (Redeploy)
- ✅ Status: Ready (verde)
- ✅ PDF sem sobreposição de texto
- ✅ Email recebido com fatura

---

**Dúvidas?** Verifique os logs: `https://vercel.com/paphostel/deployments`
