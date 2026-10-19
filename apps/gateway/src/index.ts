import http, { IncomingMessage, ServerResponse } from 'node:http';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { GameServer } from '@escape-system/server';
import { ScenarioCatalog, SessionStore, type ActiveGameSession } from '@escape-system/hub';
import type { ScenarioManifest } from '@escape-system/contracts';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || 'atlantis-admin';

export class PortalGateway {
  protected server: http.Server | null = null;
  readonly gameServer: GameServer;
  readonly catalog: ScenarioCatalog;
  readonly sessionStore: SessionStore;
  readonly clientDistDir: string;
  readonly studioDistDir: string;

  constructor(options?: {
    clientDistDir?: string;
    studioDistDir?: string;
    catalog?: ScenarioCatalog;
    sessionStore?: SessionStore;
  }) {
    this.gameServer = new GameServer();
    this.catalog = options?.catalog ?? new ScenarioCatalog();
    this.sessionStore = options?.sessionStore ?? new SessionStore();

    // Default paths resolve relative to monorepo root
    this.clientDistDir = options?.clientDistDir ?? path.resolve(__dirname, '../../client/dist/public');
    this.studioDistDir = options?.studioDistDir ?? path.resolve(__dirname, '../../studio/dist/public');
  }

  start(port = 3000): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
        this.handleHttpRequest(req, res);
      });

      this.server.on('error', reject);

      // Start HTTP server on all interfaces (0.0.0.0) for Docker/container support
      this.server.listen(port, '0.0.0.0', async () => {
        try {
          const addr = this.server?.address();
          const boundPort = addr && typeof addr === 'object' ? addr.port : port;

          // Attach GameServer WebSockets to the existing HTTP server instance
          await this.gameServer.start(boundPort, this.server!);
          resolve(boundPort);
        } catch (err) {
          reject(err);
        }
      });
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      this.gameServer.stop().then(() => {
        if (this.server) {
          this.server.close(() => {
            this.server = null;
            resolve();
          });
        } else {
          resolve();
        }
      });
    });
  }

  protected async handleHttpRequest(req: IncomingMessage, res: ServerResponse): Promise<void> {
    // Enable CORS
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

    if (req.method === 'OPTIONS') {
      res.writeHead(204);
      res.end();
      return;
    }

    const rawUrl = req.url ?? '/';
    const parsedPath = rawUrl.split('?')[0];

    // 1. Health check
    if (parsedPath === '/health') {
      this.sendJson(res, 200, {
        status: 'ok',
        services: {
          gateway: 'online',
          hub: 'online',
          websocket: 'online',
          sessions: 'online'
        },
        version: '0.1.0'
      });
      return;
    }

    // 2. Unified REST API Routes (/api/*)
    if (parsedPath.startsWith('/api/')) {
      await this.handleApi(req, res, parsedPath);
      return;
    }

    // 3. Studio SPA Static Files (/studio)
    if (parsedPath === '/studio') {
      res.writeHead(301, { Location: '/studio/' });
      res.end();
      return;
    }

    if (parsedPath.startsWith('/studio')) {
      const subPath = parsedPath.replace(/^\/studio\/?/, '');
      this.serveStatic(res, this.studioDistDir, subPath);
      return;
    }

    // 4. Client Player SPA Static Files (/*)
    const clientPath = parsedPath.replace(/^\//, '');
    this.serveStatic(res, this.clientDistDir, clientPath);
  }

  protected async handleApi(req: IncomingMessage, res: ServerResponse, parsedPath: string): Promise<void> {
    const rawUrl = req.url ?? '/';
    const parsedUrl = new URL(rawUrl, 'http://localhost');

    // === SCENARIOS API ===
    if (req.method === 'GET' && parsedPath === '/api/scenarios') {
      const list = this.catalog.list();
      this.sendJson(res, 200, { scenarios: list, count: list.length });
      return;
    }

    if (req.method === 'GET' && parsedPath.startsWith('/api/scenarios/')) {
      const id = parsedPath.slice('/api/scenarios/'.length);
      const pkg = this.catalog.get(id);
      if (!pkg) {
        this.sendJson(res, 404, { error: 'Scenario not found', id });
        return;
      }
      this.sendJson(res, 200, pkg);
      return;
    }

    if (req.method === 'POST' && parsedPath === '/api/scenarios/publish') {
      try {
        const bodyText = await this.readBody(req);
        const body = JSON.parse(bodyText) as { manifest: ScenarioManifest; metadata?: Record<string, unknown> };
        if (!body.manifest) {
          this.sendJson(res, 400, { error: 'Payload must include manifest property' });
          return;
        }
        const pkg = this.catalog.publish(body.manifest, body.metadata);
        this.sendJson(res, 201, { success: true, package: pkg });
      } catch (err) {
        this.sendJson(res, 400, { error: (err as Error).message });
      }
      return;
    }

    // === SESSIONS API ===
    if (req.method === 'GET' && parsedPath === '/api/sessions') {
      const list = this.sessionStore.listSessions();
      this.sendJson(res, 200, { sessions: list, count: list.length });
      return;
    }

    if (req.method === 'GET' && parsedPath.startsWith('/api/sessions/')) {
      const roomId = parsedPath.slice('/api/sessions/'.length);
      const session = this.sessionStore.getSession(roomId);
      if (!session) {
        this.sendJson(res, 404, { error: 'Session not found', roomId });
        return;
      }
      const secret = parsedUrl.searchParams.get('secret');
      const isAuthorized = secret && secret === session.hostSecret;
      this.sendJson(res, 200, {
        ...session,
        isHost: Boolean(isAuthorized)
      });
      return;
    }

    if (req.method === 'POST' && parsedPath === '/api/sessions') {
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

    // === SUPERADMIN API ===
    if (req.method === 'POST' && parsedPath === '/api/admin/login') {
      try {
        const bodyText = await this.readBody(req);
        const body = JSON.parse(bodyText) as { password?: string };
        if (body.password === ADMIN_PASSWORD) {
          this.sendJson(res, 200, { success: true, message: 'Superadmin authenticated' });
        } else {
          this.sendJson(res, 401, { error: 'Invalid superadmin password' });
        }
      } catch (err) {
        this.sendJson(res, 400, { error: (err as Error).message });
      }
      return;
    }

    if (req.method === 'GET' && parsedPath === '/api/admin/rooms') {
      const authHeader = req.headers.authorization;
      if (authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
        this.sendJson(res, 401, { error: 'Unauthorized: Admin password required' });
        return;
      }

      // Collect rooms from sessionStore and active WebSocket server
      const sessions = this.sessionStore.listSessions();
      const wsRooms = this.gameServer.getRooms();

      const rooms = sessions.map(s => {
        const wsRoom = wsRooms.get(s.roomId);
        const members = wsRoom ? wsRoom.getMembers() : [];
        return {
          roomId: s.roomId,
          scenarioId: s.scenarioId,
          scenarioTitle: s.scenarioTitle,
          seed: s.seed,
          playMode: s.playMode,
          playerCount: s.playerCount,
          createdAt: s.createdAt,
          hostSecret: s.hostSecret,
          activeSocketsCount: members.length,
          members: members.map(m => ({
            playerId: m.playerId,
            playerName: m.playerName,
            seatId: m.seatId,
            seatName: m.seatName,
            isHost: m.isHost,
            focusedElementId: m.focusedElementId
          }))
        };
      });

      this.sendJson(res, 200, { rooms, totalCount: rooms.length });
      return;
    }

    if (req.method === 'POST' && parsedPath.startsWith('/api/admin/rooms/') && parsedPath.endsWith('/terminate')) {
      const authHeader = req.headers.authorization;
      if (authHeader !== `Bearer ${ADMIN_PASSWORD}`) {
        this.sendJson(res, 401, { error: 'Unauthorized: Admin password required' });
        return;
      }

      const match = parsedPath.match(/\/api\/admin\/rooms\/([^/]+)\/terminate/);
      const roomId = match?.[1];
      if (!roomId) {
        this.sendJson(res, 400, { error: 'Missing roomId' });
        return;
      }

      this.gameServer.terminateRoom(roomId);
      this.sessionStore.deleteSession(roomId);
      this.sendJson(res, 200, { success: true, message: `Room ${roomId} terminated` });
      return;
    }

    this.sendJson(res, 404, { error: 'API route not found', path: parsedPath });
  }

  protected serveStatic(res: ServerResponse, baseDir: string, filePath: string): void {
    const targetFile = filePath ? path.join(baseDir, filePath) : path.join(baseDir, 'index.html');
    const safeFile = path.normalize(targetFile);

    if (fs.existsSync(safeFile) && fs.statSync(safeFile).isFile()) {
      const ext = path.extname(safeFile).toLowerCase();
      const mimeTypes: Record<string, string> = {
        '.html': 'text/html; charset=utf-8',
        '.js': 'application/javascript; charset=utf-8',
        '.css': 'text/css; charset=utf-8',
        '.json': 'application/json',
        '.svg': 'image/svg+xml',
        '.png': 'image/png'
      };
      res.writeHead(200, { 'Content-Type': mimeTypes[ext] ?? 'application/octet-stream' });
      fs.createReadStream(safeFile).pipe(res);
      return;
    }

    // HTML5 SPA Fallback: serve index.html if it exists
    const fallback = path.join(baseDir, 'index.html');
    if (fs.existsSync(fallback)) {
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      fs.createReadStream(fallback).pipe(res);
      return;
    }

    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('Static bundle not found. Run npm run build:web');
  }

  protected readBody(req: IncomingMessage): Promise<string> {
    return new Promise((resolve, reject) => {
      let body = '';
      req.on('data', (chunk: Buffer | string) => {
        body += chunk;
      });
      req.on('end', () => resolve(body));
      req.on('error', reject);
    });
  }

  protected sendJson(res: ServerResponse, status: number, data: unknown): void {
    res.writeHead(status, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(data));
  }
}

// Auto-run if executed directly as entrypoint
const isMain = process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1];
if (isMain) {
  const port = Number(process.env.PORT) || 3000;
  const gateway = new PortalGateway();
  gateway.start(port).then(boundPort => {
    console.log(`=================================================`);
    console.log(`🚀 Coop Game Portal running on http://0.0.0.0:${boundPort}`);
    console.log(`📱 Player Client:    http://localhost:${boundPort}/`);
    console.log(`🛠️  Escape Studio:    http://localhost:${boundPort}/studio`);
    console.log(`🏪 Scenario Hub API: http://localhost:${boundPort}/api/scenarios`);
    console.log(`⚡ WebSocket Server: ws://localhost:${boundPort}`);
    console.log(`=================================================`);
  }).catch(err => {
    console.error('Fatal gateway error:', err);
    process.exit(1);
  });
}
