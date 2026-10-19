import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { PortalGateway } from '../src/index.js';
import { createMessage, parseMessage } from '@escape-system/contracts';

describe('PortalGateway Unified HTTP & WebSocket Router', () => {
  let gateway: PortalGateway;
  let port: number;
  let baseUrl: string;

  before(async () => {
    gateway = new PortalGateway();
    port = await gateway.start(0);
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await gateway.stop();
  });

  it('GET /health should return 200 with online statuses', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const json = await res.json() as { status: string; services: Record<string, string> };
    assert.equal(json.status, 'ok');
    assert.equal(json.services.hub, 'online');
    assert.equal(json.services.websocket, 'online');
  });

  it('GET /api/scenarios should route to Hub catalog', async () => {
    const res = await fetch(`${baseUrl}/api/scenarios`);
    assert.equal(res.status, 200);
    const json = await res.json() as { count: number };
    assert.ok(json.count >= 1);
  });

  it('GET / should serve client index.html', async () => {
    const res = await fetch(`${baseUrl}/`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('Coop Game Portal'));
    assert.ok(text.includes('<app-root>'));
  });

  it('GET /studio should serve studio index.html', async () => {
    const res = await fetch(`${baseUrl}/studio`);
    assert.equal(res.status, 200);
    const text = await res.text();
    assert.ok(text.includes('Escape Studio'));
    assert.ok(text.includes('<app-root>'));
  });

  it('WebSocket connections to gateway should connect to real-time GameServer', async () => {
    const ws = new WebSocket(`ws://127.0.0.1:${port}`);

    await new Promise<void>((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
    });

    const roomJoinedPromise = new Promise<{ roomId: string }>((resolve) => {
      ws.on('message', (data) => {
        const msg = parseMessage(data.toString());
        if (msg && msg.type === 'room_joined') {
          resolve(msg.payload as { roomId: string });
        }
      });
    });

    ws.send(createMessage('join_room', {
      roomId: 'test-gateway-room',
      playerId: 'p-gateway-1',
      playerName: 'GatewayTester'
    }));

    const joined = await roomJoinedPromise;
    assert.equal(joined.roomId, 'test-gateway-room');

    ws.close();
  });

  it('POST /api/sessions and GET /api/admin/rooms should track and manage active rooms', async () => {
    // Create session
    const postRes = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: 'ADMIN-TEST-99',
        hostSecret: 'secret-99',
        scenarioId: 'pharaoh-crypt-01',
        scenarioTitle: "The Pharaoh's Crypt",
        seed: 'testseed99',
        playerCount: 2,
        playMode: 'online'
      })
    });
    assert.equal(postRes.status, 201);

    // Unauthenticated admin access should fail
    const unauthRes = await fetch(`${baseUrl}/api/admin/rooms`);
    assert.equal(unauthRes.status, 401);

    // Authenticated admin access should return rooms
    const adminRes = await fetch(`${baseUrl}/api/admin/rooms`, {
      headers: { Authorization: 'Bearer atlantis-admin' }
    });
    assert.equal(adminRes.status, 200);
    const json = await adminRes.json() as { rooms: Array<{ roomId: string }>; totalCount: number };
    assert.ok(json.rooms.some(r => r.roomId === 'ADMIN-TEST-99'));

    // Terminate room
    const termRes = await fetch(`${baseUrl}/api/admin/rooms/ADMIN-TEST-99/terminate`, {
      method: 'POST',
      headers: { Authorization: 'Bearer atlantis-admin' }
    });
    assert.equal(termRes.status, 200);
  });
});
