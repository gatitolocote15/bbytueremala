class SessionManager {
  constructor(ttl = 1800) {
    this.sessions = {};
    this.ttl = ttl * 1000;
    this.startCleanup();
  }

  set(sessionId, data) {
    this.sessions[sessionId] = {
      ...data,
      createdAt: Date.now(),
      pendingCommand: null,
      telegramMessageId: null
    };
    return this.sessions[sessionId];
  }

  get(sessionId) {
    const session = this.sessions[sessionId];
    if (!session) return null;

    if (Date.now() - session.createdAt > this.ttl) {
      delete this.sessions[sessionId];
      return null;
    }
    return session;
  }

  update(sessionId, data) {
    const session = this.get(sessionId);
    if (!session) return null;

    Object.assign(session, data);
    return session;
  }

  setPendingCommand(sessionId, command) {
    const session = this.get(sessionId);
    if (!session) return null;

    session.pendingCommand = command;
    return session;
  }

  getPendingCommand(sessionId) {
    const session = this.get(sessionId);
    if (!session) return null;

    const command = session.pendingCommand;
    session.pendingCommand = null;
    return command;
  }

  setTelegramMessageId(sessionId, messageId) {
    const session = this.get(sessionId);
    if (!session) return null;

    session.telegramMessageId = messageId;
    return session;
  }

  delete(sessionId) {
    delete this.sessions[sessionId];
  }

  getAll() {
    return Object.values(this.sessions).filter(s => {
      if (Date.now() - s.createdAt > this.ttl) {
        delete this.sessions[Object.keys(this.sessions).find(k => this.sessions[k] === s)];
        return false;
      }
      return true;
    });
  }

  startCleanup() {
    setInterval(() => {
      const now = Date.now();
      for (const [sid, session] of Object.entries(this.sessions)) {
        if (now - session.createdAt > this.ttl) {
          delete this.sessions[sid];
          console.log(`[CLEANUP] Sesión ${sid} expirada y eliminada`);
        }
      }
    }, 5 * 60 * 1000);
  }
}

export default SessionManager;
