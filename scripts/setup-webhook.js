#!/usr/bin/env node

import https from 'https';
import dotenv from 'dotenv';

dotenv.config();

const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const SERVER_URL = process.env.SERVER_URL || 'https://addi-bot.onrender.com';

if (!TELEGRAM_BOT_TOKEN) {
  console.error('❌ Error: TELEGRAM_BOT_TOKEN no está configurado');
  process.exit(1);
}

const WEBHOOK_URL = `${SERVER_URL}/telegram-webhook`;

console.log('🔧 Configurando webhook de Telegram...');
console.log(`📍 URL del webhook: ${WEBHOOK_URL}`);

const options = {
  hostname: 'api.telegram.org',
  path: `/bot${TELEGRAM_BOT_TOKEN}/setWebhook`,
  method: 'POST',
  headers: {
    'Content-Type': 'application/json'
  }
};

const data = JSON.stringify({
  url: WEBHOOK_URL,
  allowed_updates: ['message', 'callback_query'],
  drop_pending_updates: false
});

const req = https.request(options, (res) => {
  let body = '';

  res.on('data', (chunk) => {
    body += chunk;
  });

  res.on('end', () => {
    try {
      const response = JSON.parse(body);
      if (response.ok) {
        console.log('✅ Webhook configurado correctamente');
        console.log(`✓ URL: ${WEBHOOK_URL}`);
        process.exit(0);
      } else {
        console.error('❌ Error configurando webhook:');
        console.error(response);
        process.exit(1);
      }
    } catch (e) {
      console.error('❌ Error parseando respuesta:', e);
      process.exit(1);
    }
  });
});

req.on('error', (e) => {
  console.error('❌ Error en la solicitud:', e);
  process.exit(1);
});

req.write(data);
req.end();
