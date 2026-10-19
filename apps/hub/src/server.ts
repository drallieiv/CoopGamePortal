import http, { type IncomingMessage, type ServerResponse } from 'node:http';
import { ScenarioCatalog } from './catalog.js';
import { SessionStore, type ActiveGameSession } from './session-store.js';
import type { ScenarioManifest } from '@escape-system/contracts';

export class HubServer {
  protected server: http.Server | null = null;
  readonly catalog = new ScenarioCatalog();
  readonly sessionStore = new SessionStore();

  start(port = 3001): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req, res) => {
        this.handleRequest(req, res).catch((err) => {
          this.sendJson(res, 500, { error: 'Internal server error', details: (err as Error).message });
        });
      });

      this.server.on('error', reject);
      this.server.listen(port, '0.0.0.0', () => {
        const addr = this.server?.address();
        if (addr && typeof addr === 'object') {
          resolve(addr.port);
        } else {
          resolve(port);
        }
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.server) {
        this.server.close(() => {
          this.server = null;
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  protected async handleRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // CORS headers for Studio & WebApp access
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const host = req.headers.host ?? 'localhost';
    const parsedUrl = new URL(req.url ?? '/', `http://${host}`);
    const pathname = parsedUrl.pathname;

    // Route: Health check
    if (req.method === 'GET' && pathname === '/health') {
      this.sendJson(res, 200, { status: 'ok', service: 'escape-hub-api', version: '0.1.0' });
      return;
    }

    // Route: List active game sessions in memory
    if (req.method === 'GET' && pathname === '/api/sessions') {
      const list = this.sessionStore.listSessions().map((s) => ({
        roomId: s.roomId,
        scenarioId: s.scenarioId,
        scenarioTitle: s.scenarioTitle,
        playerCount: s.playerCount,
        playMode: s.playMode,
        createdAt: s.createdAt
      }));
      this.sendJson(res, 200, { sessions: list, count: list.length });
      return;
    }

    // Route: Get active session by Room ID
    if (req.method === 'GET' && pathname.startsWith('/api/sessions/')) {
      const roomId = pathname.slice('/api/sessions/'.length);
      const session = this.sessionStore.getSession(roomId);
      if (!session) {
        this.sendJson(res, 404, { error: 'Session not found', roomId });
        return;
      }
      const secret = parsedUrl.searchParams.get('secret');
      const isAuthorized = secret && secret === session.hostSecret;
      this.sendJson(res, 200, {
        roomId: session.roomId,
        scenarioId: session.scenarioId,
        scenarioTitle: session.scenarioTitle,
        seed: session.seed,
        playerCount: session.playerCount,
        playMode: session.playMode,
        pnpSubMode: session.pnpSubMode,
        createdAt: session.createdAt,
        isHost: Boolean(isAuthorized)
      });
      return;
    }

    // Route: Create / Register active game session in memory
    if (req.method === 'POST' && pathname === '/api/sessions') {
      try {
        const bodyText = await this.readBody(req);
        const body = JSON.parse(bodyText) as ActiveGameSession;
        if (!body.roomId || !body.scenarioId) {
          this.sendJson(res, 400, { error: 'roomId and scenarioId required' });
          return;
        }
        const created = this.sessionStore.createSession(body);
        this.sendJson(res, 201, { success: true, session: created });
      } catch (err) {
        this.sendJson(res, 400, { error: (err as Error).message });
      }
      return;
    }

    // Route: List scenarios
    if (req.method === 'GET' && pathname === '/api/scenarios') {
      const tag = parsedUrl.searchParams.get('tag') ?? undefined;
      const isFreeParam = parsedUrl.searchParams.get('isFree');
      const isFree = isFreeParam !== null ? isFreeParam === 'true' : undefined;

      const list = this.catalog.list({ tag, isFree });
      this.sendJson(res, 200, { scenarios: list, count: list.length });
      return;
    }

    // Route: Get scenario by ID
    if (req.method === 'GET' && pathname.startsWith('/api/scenarios/')) {
      const id = pathname.slice('/api/scenarios/'.length);
      const pkg = this.catalog.get(id);
      if (!pkg) {
        this.sendJson(res, 404, { error: 'Scenario not found', id });
        return;
      }
      this.sendJson(res, 200, pkg);
      return;
    }

    // Route: Publish scenario
    if (req.method === 'POST' && pathname === '/api/scenarios/publish') {
      try {
        const bodyText = await this.readBody(req);
        const body = JSON.parse(bodyText) as { manifest: ScenarioManifest; metadata?: Record<string, unknown> };

        if (!body.manifest) {
          this.sendJson(res, 400, { error: 'Payload must include manifest property' });
          return;
        }

        const published = this.catalog.publish(body.manifest, body.metadata);
        this.sendJson(res, 201, { success: true, package: published });
      } catch (err) {
        this.sendJson(res, 400, { error: (err as Error).message });
      }
      return;
    }

    this.sendJson(res, 404, { error: 'Not found', path: pathname });
  }

  protected sendJson(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }

  protected readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk) => {
        body += chunk;
      });
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }
}
