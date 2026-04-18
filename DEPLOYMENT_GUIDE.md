# 📋 Guia de Publicação no Vercel

## Pré-requisitos
- [Git](https://git-scm.com/) instalado
- Conta no [GitHub](https://github.com)
- Conta no [Vercel](https://vercel.com)
- Chaves Firebase (serviceAccountKey.json)

---

## Passo 1: Preparar o Repositório Git

### 1.1 Inicializar Git (se não estiver inicializado)
```bash
git init
git add .
git commit -m "Initial commit: PAP Hostel App"
```

### 1.2 Verificar se está pronto
```bash
git status
```
Certifique-se de que `server/.env` e `server/serviceAccountKey.json` não aparecem (devem estar no .gitignore)

---

## Passo 2: Criar Repositório no GitHub

### 2.1 Criar Nova Repository
1. Acesse [github.com/new](https://github.com/new)
2. Nome: `PAP-Hostel-App` (ou outro nome de sua escolha)
3. Descrição: `PAP Hostel App - Sistema de Auto Check-in Digital`
4. Selecione **Public** ou **Private**
5. Clique em **Create repository**

### 2.2 Conectar Repositório Local ao GitHub
```bash
git remote add origin https://github.com/seu-usuario/PAP-Hostel-App.git
git branch -M main
git push -u origin main
```

---

## Passo 3: Configurar Vercel

### 3.1 Conectar GitHub ao Vercel
1. Acesse [vercel.com/dashboard](https://vercel.com/dashboard)
2. Clique em **Add New** → **Project**
3. Selecione **Import Git Repository**
4. Busque `PAP-Hostel-App`
5. Clique em **Import**

### 3.2 Configurar Variáveis de Ambiente
Na tela de configuração do projeto:

1. **Environment Variables** → Adicionar todas as variáveis:

```
FIREBASE_API_KEY=seu_valor
FIREBASE_AUTH_DOMAIN=seu_valor
FIREBASE_PROJECT_ID=seu_valor
FIREBASE_STORAGE_BUCKET=seu_valor
FIREBASE_MESSAGING_SENDER_ID=seu_valor
FIREBASE_APP_ID=seu_valor
FIREBASE_ADMIN_SDK_KEY=seu_valor
EMAIL_MODE=real
SMTP_HOST=seu_smtp_host
SMTP_PORT=587
SMTP_USER=seu_email
SMTP_PASS=sua_senha
SMTP_FROM=noreply@hostel.com
TTLOCK_CLIENT_ID=seu_valor
TTLOCK_CLIENT_SECRET=seu_valor
NODE_ENV=production
```

**Dica**: Copie os valores do seu arquivo `.env` local

### 3.3 Root Directory
Deixe vazio (Vercel detectará automaticamente)

### 3.4 Deploy
Clique em **Deploy**

---

## Passo 4: Configuração Pós-Deploy

### 4.1 Acessar Aplicação
Após o deploy bem-sucedido, você receberá uma URL como:
```
https://pap-hostel-app.vercel.app
```

### 4.2 Verificar Logs
Se houver erro, verifique os logs em:
1. **Vercel Dashboard** → **Deployments** → Clique no deployment
2. → **View Build Logs** para erros de build
3. → **Runtime Logs** para erros em tempo de execução

---

## Passo 5: Atualizações Futuras

Sempre que fazer mudanças no código:

```bash
git add .
git commit -m "Descrição das mudanças"
git push origin main
```

Vercel fará deploy automaticamente após fazer push para `main`

---

## Troubleshooting

### ❌ Erro: "serviceAccountKey.json not found"
- Verifique se a variável `FIREBASE_ADMIN_SDK_KEY` está configurada
- Copie o conteúdo do seu `serviceAccountKey.json` para essa variável

### ❌ Erro: "SMTP credentials invalid"
- Verifique `SMTP_USER`, `SMTP_PASS` e `SMTP_HOST`
- Se usar Gmail, gere uma [App Password](https://myaccount.google.com/apppasswords)

### ❌ Erro: "PORT already in use"
- Vercel define a porta automaticamente, remova `PORT=3000` das variáveis

### ❌ Blank Page / 404
- Verifique se `public/index.html` existe
- Confirme que `vercel.json` está configurado corretamente

---

## Domínio Personalizado (Opcional)

1. **Vercel Dashboard** → Seu Projeto
2. **Settings** → **Domains**
3. **Add Domain**
4. Digite seu domínio (ex: `hostel.com`)
5. Siga as instruções de DNS

---

## Variáveis Sensíveis - Checklist de Segurança

✅ `.env` está no `.gitignore` (não fará commit)
✅ `serviceAccountKey.json` está no `.gitignore`
✅ Variáveis sensíveis configuradas no Vercel (não no repositório)
✅ Não compartilhe `FIREBASE_ADMIN_SDK_KEY` publicamente

---

## 🤖 Auto-Deploy com GitHub Actions

Para configurar o auto-deploy **automático** sempre que faz push no GitHub:

### 5.1 Gerar Tokens Vercel

1. Aceda a https://vercel.com/account/tokens
2. Clique em **Create** para novo token
3. Copie o token gerado

### 5.2 Configurar Secrets no GitHub

1. No seu repositório GitHub: **Settings** → **Secrets and variables** → **Actions**
2. Clique em **New repository secret**
3. Adicione os seguintes secrets:

| Secret | Valor |
|--------|-------|
| `VERCEL_TOKEN` | Token do Vercel (gerado acima) |
| `VERCEL_ORG_ID` | ID da conta/organização Vercel |
| `VERCEL_PROJECT_ID` | ID do projeto Vercel |

**Como encontrar os IDs:**
- Aceda ao seu projeto em Vercel
- **Settings** → **General**
- Procure "Project ID" e "Team/Org ID"

### 5.3 Workflow Automático

O workflow já está configurado em `.github/workflows/deploy.yml`

Sempre que faz push para `main` ou `master`:
```bash
git push origin main
```

O GitHub Actions irá:
1. ✅ Instalar dependências
2. ✅ Fazer build
3. ✅ Deploy automático no Vercel

**Verifique o status em: GitHub → Actions**

---

**Perguntas?** Consulte [SETUP_AUTO_DEPLOY.md](./SETUP_AUTO_DEPLOY.md) para mais detalhes.
