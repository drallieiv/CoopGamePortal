import http, { IncomingMessage, ServerResponse } from 'node:http';
import { URL } from 'node:url';
import { ScenarioCatalog } from './catalog.js';
import type { ScenarioManifest } from '@escape-system/contracts';

export class HubServer {
  readonly catalog: ScenarioCatalog;
  protected server: http.Server | null = null;

  constructor(catalog?: ScenarioCatalog) {
    this.catalog = catalog ?? new ScenarioCatalog();
  }

  start(port = 0): Promise<number> {
    return new Promise((resolve, reject) => {
      this.server = http.createServer((req: IncomingMessage, res: ServerResponse) => {
        this.handleRequest(req, res);
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
