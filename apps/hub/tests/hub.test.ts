import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { HubServer } from '../src/server.js';
import type { ScenarioManifest } from '@escape-system/contracts';

describe('Hub API & Scenario Marketplace', () => {
  let server: HubServer;
  let port: number;
  let baseUrl: string;

  before(async () => {
    server = new HubServer();
    port = await server.start(0);
    baseUrl = `http://127.0.0.1:${port}`;
  });

  after(async () => {
    await server.stop();
  });

  it('GET /health should return 200 ok', async () => {
    const res = await fetch(`${baseUrl}/health`);
    assert.equal(res.status, 200);
    const json = await res.json() as { status: string };
    assert.equal(json.status, 'ok');
  });

  it('GET /api/scenarios should return seeded scenarios', async () => {
    const res = await fetch(`${baseUrl}/api/scenarios`);
    assert.equal(res.status, 200);
    const json = await res.json() as { scenarios: Array<{ id: string; title: string }>; count: number };
    assert.ok(json.count >= 1);
    const pharaoh = json.scenarios.find(s => s.id === 'pharaoh-crypt-01');
    assert.ok(pharaoh, 'Default Pharaoh Crypt scenario must be listed');
  });

  it('GET /api/scenarios/:id should return full manifest bundle', async () => {
    const res = await fetch(`${baseUrl}/api/scenarios/pharaoh-crypt-01`);
    assert.equal(res.status, 200);
    const json = await res.json() as { metadata: { id: string }; manifest: ScenarioManifest };
    assert.equal(json.metadata.id, 'pharaoh-crypt-01');
    assert.ok(json.manifest.nodes['antechamber']);
  });

  it('POST /api/scenarios/publish should validate and register new scenario', async () => {
    const newManifest: ScenarioManifest = {
      id: 'cyber-vault-99',
      version: '1.2.0',
      title: 'The Cybernetic Vault',
      author: { id: 'author-neo', name: 'Neo' },
      difficulty: 4,
      playerCount: { min: 2, max: 4, recommended: 3 },
      roles: [{ id: 'hacker', name: 'Hacker', exclusiveDossiers: [] }],
      roleAggregation: { '2_players': [{ roles: ['hacker'] }, { roles: [] }] },
      nodes: {
        server_room: {
          id: 'server_room',
          type: 'room',
          title: 'Mainframe Room',
          visibility: { type: 'common' },
          content: { visuals: [], narrativeText: 'Glowing green racks.', physicalFallback: { label: 'Sheet #9' } },
          transitions: []
        }
      },
      initialState: {
        unlockedNodeIds: ['server_room'],
        solvedPuzzleIds: [],
        activeDossiers: [],
        inventory: []
      },
      seedConfig: { defaultSeed: 'CYBER-99' }
    };

    const pubRes = await fetch(`${baseUrl}/api/scenarios/publish`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        manifest: newManifest,
        metadata: { tags: ['cyberpunk', 'hack'], pricing: { isFree: false, priceCents: 499, currency: 'USD' } }
      })
    });

    assert.equal(pubRes.status, 201);

    // Verify it is now fetchable
    const fetchRes = await fetch(`${baseUrl}/api/scenarios/cyber-vault-99`);
    assert.equal(fetchRes.status, 200);
    const json = await fetchRes.json() as { metadata: { pricing: { priceCents: number } }; manifest: ScenarioManifest };
    assert.equal(json.manifest.title, 'The Cybernetic Vault');
    assert.equal(json.metadata.pricing.priceCents, 499);
  });

  it('POST /api/sessions and GET /api/sessions/:roomId should manage in-memory game sessions', async () => {
    const postRes = await fetch(`${baseUrl}/api/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        roomId: 'ATLANTIS-5817',
        hostSecret: 'secret-token-xyz',
        scenarioId: 'fate-of-atlantis-01',
        scenarioTitle: 'Indiana Jones and the Fate of Atlantis',
        seed: '9k2f4x8m',
        playerCount: 3,
        playMode: 'online'
      })
    });

    assert.equal(postRes.status, 201);

    // Fetch session as joining player (without secret)
    const getRes = await fetch(`${baseUrl}/api/sessions/ATLANTIS-5817`);
    assert.equal(getRes.status, 200);
    const session = await getRes.json() as { roomId: string; seed: string; isHost: boolean };
    assert.equal(session.roomId, 'ATLANTIS-5817');
    assert.equal(session.seed, '9k2f4x8m');
    assert.equal(session.isHost, false);

    // Fetch session as host (with secret)
    const hostGetRes = await fetch(`${baseUrl}/api/sessions/ATLANTIS-5817?secret=secret-token-xyz`);
    assert.equal(hostGetRes.status, 200);
    const hostSession = await hostGetRes.json() as { isHost: boolean };
    assert.equal(hostSession.isHost, true);
  });
});
