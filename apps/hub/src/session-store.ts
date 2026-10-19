export interface ActiveGameSession {
  roomId: string;
  hostSecret: string;
  scenarioId: string;
  scenarioTitle: string;
  seed: string;
  playerCount: number;
  playMode: 'online' | 'pnp';
  pnpSubMode?: 'hybrid' | 'paper';
  createdAt: string;
  manifest?: unknown;
}

export class SessionStore {
  protected readonly sessions = new Map<string, ActiveGameSession>();

  createSession(data: Omit<ActiveGameSession, 'createdAt'>): ActiveGameSession {
    const session: ActiveGameSession = {
      ...data,
      roomId: data.roomId.trim().toUpperCase(),
      createdAt: new Date().toISOString()
    };
    this.sessions.set(session.roomId, session);
    return session;
  }

  getSession(roomId: string): ActiveGameSession | undefined {
    return this.sessions.get(roomId.trim().toUpperCase());
  }

  listSessions(): ActiveGameSession[] {
    return Array.from(this.sessions.values());
  }

  deleteSession(roomId: string): boolean {
    return this.sessions.delete(roomId.trim().toUpperCase());
  }
}
