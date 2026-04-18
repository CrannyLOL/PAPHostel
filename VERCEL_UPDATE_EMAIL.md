# 🔧 Atualizar Vercel com Email Pessoal

## ✅ Novo Email Configurado

Email pessoal: **tiagomiguelmachado11@gmail.com**

---

## 📋 Variáveis para Adicionar no Vercel

Vá a: **https://vercel.com/dashboard** → Seu Projeto → **Settings** → **Environment Variables**

Substitua as antigas com as novas:

| Nome | Valor Antigo | Valor Novo |
|------|-------|--------|
| EMAIL_MODE | real | real |
| SMTP_HOST | smtp.gmail.com | smtp.gmail.com |
| SMTP_PORT | 587 | 587 |
| SMTP_USER | ~~tiago.info2024@gmail.com~~ | **tiagomiguelmachado11@gmail.com** |
| SMTP_PASS | ~~wpep hxtw saok fusj~~ | **tiago.1711** |
| SMTP_FROM | ~~tiago.info2024@gmail.com~~ | **Golden Beach Guest House <tiagomiguelmachado11@gmail.com>** |
| NODE_ENV | production | production |

---

## 🔄 Passo-a-Passo

### 1. Remover as Antigas

Para cada variável antiga:
1. Vá a **Settings** → **Environment Variables**
2. Clique no **X** ao lado de cada variável antiga
3. Confirme a remoção

### 2. Adicionar as Novas

Copie EXATAMENTE (incluindo espaços):

**Variável 1:**
```
SMTP_USER = tiagomiguelmachado11@gmail.com
```

**Variável 2:**
```
SMTP_PASS = tiago.1711
```

**Variável 3:**
```
SMTP_FROM = Golden Beach Guest House <tiagomiguelmachado11@gmail.com>
```

### 3. Redeployar

1. Vá a **Deployments**
2. Clique nos **3 pontos** (...) do último deploy
3. **Redeploy**
4. Aguarde até ver ✅ **Ready**

---

## ✅ Teste

Após redeployar:

1. Vá a: https://pap-hostel-i9nt.vercel.app/booking.html
2. Faça uma reserva de teste
3. Verifique seu email: **tiagomiguelmachado11@gmail.com**
4. Deve receber a fatura com PDF

---

## 🎯 Checklist

- ✅ Antigas variáveis removidas
- ✅ Novas variáveis adicionadas com valores EXATOS
- ✅ Projeto redeployado
- ✅ Status: Ready (verde)

**Pronto!** Agora os emails virão do seu email pessoal! 🎉
