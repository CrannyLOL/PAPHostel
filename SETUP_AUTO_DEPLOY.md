## 🚀 Setup Auto-Deploy com GitHub Actions + Vercel

Para configurar o auto-deploy automático, siga estes passos:

### 1. **Criar Secrets no GitHub**

Aceda a: `Settings > Secrets and variables > Actions`

Adicione os seguintes secrets:

- `VERCEL_TOKEN`: Token de autenticação do Vercel
  - Obtenha em: https://vercel.com/account/tokens
  
- `VERCEL_ORG_ID`: ID da organização/conta no Vercel
  - Encontre em: https://vercel.com/account/settings
  
- `VERCEL_PROJECT_ID`: ID do projeto no Vercel
  - Aceda ao seu projeto em Vercel e procure no settings

### 2. **Como Obter os Tokens**

#### VERCEL_TOKEN:
1. Aceda a https://vercel.com/account/tokens
2. Clique em "Create" para novo token
3. Copie o token gerado
4. Adicione como secret `VERCEL_TOKEN` no GitHub

#### VERCEL_ORG_ID e VERCEL_PROJECT_ID:
1. No projeto Vercel, aceda a "Settings"
2. Em "General", encontrará:
   - **Project ID**: valor após a igualdade em "Project ID"
   - **Team/Org ID**: ID da sua organização

### 3. **Fazer Push para GitHub**

Depois de fazer qualquer mudança no código:

```bash
git add .
git commit -m "Descrição da mudança"
git push origin main
```

O GitHub Actions irá:
1. ✅ Fazer checkout do código
2. ✅ Instalar dependências
3. ✅ Fazer build do projeto
4. ✅ Deploy automático no Vercel

### 4. **Verificar Status do Deploy**

1. Vá para a aba "Actions" no GitHub
2. Veja o workflow "Deploy to Vercel"
3. Clique para ver logs detalhados

### ✨ Benefícios

- 🎯 Deploy automático a cada push
- 🔄 Sincronização contínua com GitHub
- 📊 Histórico de deploys
- 🛑 Rollback automático em caso de erro

---

**Nota**: Os secrets são privados e seguros. Nunca compartilhe seus tokens!
