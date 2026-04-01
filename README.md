# PAP Hostel App - Sistema de Auto Check-in Digital

## Visão Geral

PAP_Hostel-App é uma plataforma web completa de gerenciamento de hostel com **auto check-in digital** integrado. Permite que hóspedes façam reservas, pagamentos online e recebam códigos de acesso automáticos para fechaduras TTLock.

**Cliente**: Golden Beach Guest House, Faro, Portugal
**Status**: Production Ready

---

## Arquitetura Técnica

### Stack Principal
- **Frontend**: HTML5, CSS3, JavaScript vanilla (ES6+)
- **Backend**: Node.js + Express.js
- **Banco de Dados**: Google Firebase (Firestore)
- **Autenticação**: Firebase Authentication
- **Integrações**: TTLock API, Nodemailer (SMTP)

### Estrutura de Diretórios

```
PAP_Hostel-App/
├── public/                              # Aplicação Frontend
│   ├── index.html                       # Página home/self check-in
│   ├── home.html                        # Informações do hostel
│   ├── booking.html                     # Formulário de reserva
│   ├── payment.html                     # Página de pagamento
│   ├── register.html                    # Criação de conta hóspede
│   ├── admin.html                       # Painel administrativo
│   ├── staff.html                       # Painel de funcionários
│   ├── login-admin.html                 # Login para admin
│   ├── login-staff.html                 # Login para staff
│   ├── css/
│   │   └── style.css                    # Estilos globais
│   ├── js/
│   │   ├── firebase.js                  # Configuração Firebase
│   │   ├── main.js                      # Script principal (self check-in)
│   │   ├── home.js                      # Lógica página home
│   │   ├── booking.js                   # Validação e submissão de reservas
│   │   ├── payment.js                   # Processamento de pagamento
│   │   ├── register.js                  # Criação de contas
│   │   ├── admin.js                     # Lógica painel admin
│   │   ├── staff.js                     # Lógica painel staff
│   │   ├── translations.js              # Sistema multi-idioma (PT/EN)
│   │   └── utils.js                     # Funções utilitárias reutilizáveis
│   ├── img/                             # Imagens
│   └── video/                           # Vídeos de fundo
│
└── server/                              # Backend Node.js
    ├── index.js                         # App Express principal
    ├── firebase.js                      # Inicialização Firebase Admin
    ├── ttlock.js                        # Integração TTLock API
    ├── seedQuartos.js                   # Script para popular quartos
    ├── package.json                     # Dependências
    ├── .env                             # Variáveis de ambiente
    ├── .env.example                     # Template de configuração
    └── serviceAccountKey.json           # Credenciais Firebase Admin
```

---

## Instalação e Configuração

### 1. Pré-requisitos
- Node.js 18+
- npm ou yarn
- Conta Firebase
- (Opcional) Credenciais TTLock
- (Opcional) Configuração SMTP para emails

### 2. Clonar e Instalar

```bash
cd PAP_Hostel-App
cd server
npm install
```

### 3. Configuração de Ambiente

Copie e configure o arquivo `.env`:

```bash
cp .env.example .env
```

Preencha com seus dados:

```env
# Base
PORT=3000
NODE_ENV=development

# Firebase
FIREBASE_API_KEY=seu_api_key
FIREBASE_AUTH_DOMAIN=seu_project.firebaseapp.com
FIREBASE_PROJECT_ID=seu_project_id
(... outros dados Firebase)

# Email (Gmail requer app password)
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=seu_email@gmail.com
SMTP_PASS=sua_senha_app_especifica

# TTLock (opcional)
TTLOCK_MODE=simulado
TTLOCK_CLIENT_ID=seu_client_id
(... outros dados TTLock)
```

### 4. Configurar Firebase

1. Aceda a [console.firebase.google.com](https://console.firebase.google.com)
2. Crie um novo projeto
3. Descarregue o ficheiro `serviceAccountKey.json`
4. Coloque em `server/serviceAccountKey.json`
5. Configure as collections no Firestore:
   - `guests` (hóspedes)
   - `reservas` (reservas)
   - `quartos` (quartos disponíveis)

### 5. Iniciar Servidor

```bash
cd server
npm start
```

O servidor iniciará em `http://localhost:3000`

---

## Fluxo de Funcionamento - TTLock Code Generation

### Passo 1: Registo do Hóspede
```
Frontend: register.html
├─ Hóspede preenche dados pessoais
├─ Validação de email e CC
└─ Criação de conta + Firebase Auth
```

### Passo 2: Fazer Reserva
```
Frontend: booking.html
├─ Selecionar datas (calendário)
├─ Selecionar quarto
├─ Selecionar extras (parking, breakfast, etc.)
├─ Inserir credenciais (nome, CC, senha)
├─ Validação contra base de dados
└─ Redirect para pagamento
```

### Passo 3: Pagamento
```
Frontend: payment.js
├─ Carregar dados da sessionStorage
├─ Exibir resumo da reserva
├─ (Opcional) Integrar gateway de pagamento real
├─ Gerar código TTLock exclusivo
├─ Criar documento de reserva em Firebase
├─ Enviar email com fatura (PDF)
└─ Enviar email com código de acesso

Backend: index.js (/api/send-invoice, /api/send-ttlock-code)
└─ Nodemailer envia emails via SMTP
```

### Passo 4: Geração do Código

O código TTLock é gerado em `payment.js`:

```javascript
function gerarCodigoTTLock() {
  // Gera número aleatório entre 100000-999999 (6 dígitos)
  return Math.floor(100000 + Math.random() * 900000).toString();
}
```

Dados armazenados em Firebase (collection: reservas):
```json
{
  "nome_hospede": "João Silva",
  "email": "joao@email.com",
  "cc": "12345678",
  "quarto": "Quarto Alvor Duplo",
  "data_entrada": Timestamp(2026-04-01),
  "data_saida": Timestamp(2026-04-05),
  "codigo_ttlk": "537291",
  "status": "ativa",
  "data_criacao": Timestamp(2026-03-23),
  "total_reserva": 450.00
}
```

### Passo 5: Self Check-in

```
Frontend: index.html (main.js)
├─ Hóspede insere Nome + CC
├─ Validação contra coleção "reservas"
├─ Se credenciais corretas, carrega código armazenado
├─ Exibe código + detalhes
└─ Hóspede usa código na fechadura TTLock
```

---

## Integração TTLock API

### Modo Simulado (Desenvolvimento)

```javascript
// server/ttlock.js
export async function criarCodigoTTLock(token, lockId, inicio, fim) {
  // Modo simulado - gera código fake
  return gerarCodigoSimulado(); // Retorna "537291"
}
```

### Modo Real (Produção)

Para ativar modo real na API TTLock:

1. Registar em [ttlock.com/developer](https://www.ttlock.com/developer)
2. Obter credenciais de API
3. No `.env`, definir: `TTLOCK_MODE=real`
4. Atualizar credenciais no `.env`
5. Ter fechaduras TTLock instaladas

```javascript
// O código real seria assim:
async function criarCodigoTTLockReal(token, lockId, inicio, fim) {
  const response = await fetch("https://api.ttlock.com/v3/keyboardPwd/add", {
    method: "POST",
    body: new URLSearchParams({
      accessToken: token,
      lockId: lockId,
      keyboardPwdType: 2,
      startDate: new Date(inicio).getTime(),
      endDate: new Date(fim).getTime()
    })
  });
  
  const data = await response.json();
  return data.keyboardPwd; // Código gerado pela API
}
```

---

## Rotas API

### GET /api/health
Verifica se servidor está funcionando
```json
{ "status": "ok", "timestamp": "..." }
```

### GET /api/config
Retorna configuração pública
```json
{
  "app_name": "PAP Hostel App",
  "ttlock_mode": "simulado",
  "email_enabled": true
}
```

### POST /api/gerar-codigo
Gera código de acesso
```json
Request: { "room_id": "Q1", "data_entrada": "2026-04-01", "data_saida": "2026-04-05", "nome": "João", "cc": "12345678" }
Response: { "sucesso": true, "codigo": "537291", "valido_de": "2026-04-01", "valido_ate": "2026-04-05" }
```

### POST /api/send-invoice
Envia fatura por email
```json
Request: { "to": "email@example.com", "guestName": "João", "pdfBase64": "..." }
Response: { "sucesso": true, "mensagem": "Email enviado com sucesso" }
```

### POST /api/send-ttlock-code
Envia código TTLock por email
```json
Request: { "email": "email@example.com", "code": "537291", "roomId": "Q1", "checkInDate": "01/04/2026", "checkOutDate": "05/04/2026" }
Response: { "sucesso": true, "mensagem": "Código TTLock enviado com sucesso" }
```

---

## Funcionalidades Principais

### Hóspede
- Registo/criação de conta
- Fazer reservas (datas, quarto, extras)
- Pagamento online
- Self check-in (inserir nome + CC)
- Receber fatura por email
- Receber código de acesso por email

### Staff
- Dashboard de operações
- Visualizar reservas ativas
- Histórico de estadias
- Gestão de bloqueios
- Verificar ocupação de quartos

### Admin
- Dashboard executivo com estatísticas
- Gestão completa de quartos
- Histórico de reservas
- Relatórios de ocupação e receita
- Gestão de bloqueios
- Controle de pagamentos

---

## Utilitários Disponíveis (utils.js)

```javascript
// Validações
validarEmail(email)
validarCC(cc)
validarTelemovel(phone)

// Formatação
formatarMoeda(valor, moeda)
formatarData(data, locale)

// Datas
calcularNoites(entrada, saida)
dataEntreIntervalo(data, inicio, fim)

// TTLock
gerarCodigoTTLock() // Gera 6 dígitos

// Storage
armazenarComExpiracao(chave, valor, minutos)
recuperarComExpiracao(chave)

// Outros
gerarUUID()
fazrLogout(tipo)
capitalizarPrimeiraLetra(str)
```

---

## Integração de Pagamento (Opcional)

Atualmente os pagamentos são simulados. Para integrar pagamentos reais:

### Stripe
```bash
npm install stripe
```

```javascript
import Stripe from 'stripe';
const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

app.post("/api/create-payment-intent", async (req, res) => {
  const { amount } = req.body;
  const intent = await stripe.paymentIntents.create({ amount });
  res.json({ clientSecret: intent.client_secret });
});
```

### PayPal
```bash
npm install @paypal/checkout-server-sdk
```

---

## Segurança

1. **Firebase Security Rules**
   - Apenas usuários autenticados podem ler/escrever
   - Admin pode ler todas coleções

2. **Variáveis de Ambiente**
   - Credenciais nunca são commitadas
   - Usar `.env` para dados sensíveis

3. **Validação**
   - Validação no frontend e backend
   - Sanitização de inputs

4. **Emails**
   - Credenciais SMTP em variáveis de ambiente
   - Gmail requer App Password (não senha regular)

---

## Troubleshooting

### Email não envia
1. Verificar credenciais SMTP em `.env`
2. Se Gmail, usar App Password (não senha regular)
3. Permitir "menos aplicações seguras" se necessário
4. Verificar logs do servidor

### Código TTLock não gerado
1. Verificar se Firebase está configurado
2. Verificar conexão com internet
3. Se real, verificar credenciais TTLock
4. Ver modo em `.env` (deve ser "simulado" para testes)

### Firebase erro de conexão
1. Verificar `serviceAccountKey.json` está no local correto
2. Verificar `firebaseAdmin.js` tem caminho correto
3. Verificar permissões de segurança no Firestore

---

## Deploy em Produção

### Heroku
```bash
cat > Procfile << EOF
web: cd server && node index.js
EOF

heroku login
heroku create seu-app-name
heroku config:set NODE_ENV=production
heroku config:set TTLOCK_MODE=real
git push heroku main
```

### Docker
```dockerfile
FROM node:18
WORKDIR /app
COPY server/ /app/server/
COPY public/ /app/public/
WORKDIR /app/server
RUN npm install
CMD ["node", "index.js"]
```

### Variáveis de Produção
```env
NODE_ENV=production
TTLOCK_MODE=real
FEATURE_REAL_PAYMENTS=true
```

---

## Linguagens Suportadas

- Português (default)
- Inglês

Gerencie em: `public/js/translations.js`

---

## Contacto e Suporte

**Golden Beach Guest House**
- Email: info@goldenbeachfaro.com
- Telefone: +351 289 001 234
- Morada: Av. Nascente Nº2, 8005-520 Faro, Portugal

---

## Licença

Propriedade de Golden Beach Guest House. Todos os direitos reservados.

---

## Versão
1.0.0 - Março 2026
