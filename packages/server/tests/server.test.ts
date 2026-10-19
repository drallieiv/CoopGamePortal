import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { WebSocket } from 'ws';
import { GameServer } from '../src/index.js';
import { createMessage, parseMessage } from '../src/protocol.js';
import type {
  RoomJoinedPayload,
  PlayerPresence,
  CursorMovePayload,
  StateSyncPayload
} from '../src/protocol.js';

describe('GameServer & Room Real-Time Sync', () => {
  let server: GameServer;
  let port: number;
  let serverUrl: string;

  before(async () => {
    server = new GameServer();
    port = await server.start(0);
    serverUrl = `ws://127.0.0.1:${port}`;
  });

  after(async () => {
    await server.stop();
  });

  function waitForOpen(ws: WebSocket): Promise<void> {
    return new Promise((resolve, reject) => {
      ws.on('open', () => resolve());
      ws.on('error', reject);
    });
  }

  function waitForMessage<T>(
    ws: WebSocket,
    expectedType: string,
    timeoutMs = 2000
  ): Promise<{ type: string; payload: T; senderId?: string }> {
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        reject(new Error(`Timeout waiting for message type: ${expectedType}`));
      }, timeoutMs);

      const handler = (data: Buffer | string) => {
        const msg = parseMessage(data.toString());
        if (msg && msg.type === expectedType) {
          clearTimeout(timer);
          ws.off('message', handler);
          resolve(msg as { type: string; payload: T; senderId?: string });
        }
      };

      ws.on('message', handler);
    });
  }

  it('should allow two clients to join a room and exchange player presence', async () => {
    const wsA = new WebSocket(serverUrl);
    const wsB = new WebSocket(serverUrl);

    await Promise.all([waitForOpen(wsA), waitForOpen(wsB)]);

    // Client A joins room
    const joinPromiseA = waitForMessage<RoomJoinedPayload>(wsA, 'room_joined');
    wsA.send(createMessage('join_room', {
      roomId: 'room-1',
      playerId: 'player-A',
      playerName: 'Alice',
      roleIds: ['navigator']
    }));
    const joinedA = await joinPromiseA;
    assert.equal(joinedA.payload.roomId, 'room-1');
    assert.equal(joinedA.payload.members.length, 1);

    // Client B joins room
    const playerJoinedOnA = waitForMessage<PlayerPresence>(wsA, 'player_joined');
    const joinPromiseB = waitForMessage<RoomJoinedPayload>(wsB, 'room_joined');

    wsB.send(createMessage('join_room', {
      roomId: 'room-1',
      playerId: 'player-B',
      playerName: 'Bob',
      roleIds: ['decoder']
    }));

    const joinedB = await joinPromiseB;
    const notifiedOnA = await playerJoinedOnA;

    assert.equal(joinedB.payload.members.length, 2);
    assert.equal(notifiedOnA.payload.playerId, 'player-B');

    wsA.close();
    wsB.close();
  });

  it('should broadcast normalized cursor movement between players in the same room', async () => {
    const wsA = new WebSocket(serverUrl);
    const wsB = new WebSocket(serverUrl);

    await Promise.all([waitForOpen(wsA), waitForOpen(wsB)]);

    wsA.send(createMessage('join_room', { roomId: 'room-cursor', playerId: 'p1', playerName: 'P1' }));
    wsB.send(createMessage('join_room', { roomId: 'room-cursor', playerId: 'p2', playerName: 'P2' }));

    await Promise.all([
      waitForMessage(wsA, 'room_joined'),
      waitForMessage(wsB, 'room_joined')
    ]);

    const cursorPromise = waitForMessage<CursorMovePayload>(wsB, 'cursor_move');

    const cursorPayload: CursorMovePayload = { x: 0.42, y: 0.88 };
    wsA.send(createMessage('cursor_move', cursorPayload));

    const receivedCursor = await cursorPromise;
    assert.equal(receivedCursor.payload.x, 0.42);
    assert.equal(receivedCursor.payload.y, 0.88);
    assert.equal(receivedCursor.senderId, 'p1');

    wsA.close();
    wsB.close();
  });

  it('should filter cursor movement to players focusing the same element when elementId is set', async () => {
    const wsA = new WebSocket(serverUrl);
    const wsB = new WebSocket(serverUrl);

    await Promise.all([waitForOpen(wsA), waitForOpen(wsB)]);

    wsA.send(createMessage('join_room', { roomId: 'room-focus', playerId: 'pA', playerName: 'PA' }));
    wsB.send(createMessage('join_room', { roomId: 'room-focus', playerId: 'pB', playerName: 'PB' }));

    await Promise.all([
      waitForMessage(wsA, 'room_joined'),
      waitForMessage(wsB, 'room_joined')
    ]);

    // B sets focus to 'schematic-1'
    const focusPromise = waitForMessage(wsA, 'presence_sync');
    wsB.send(createMessage('focus_element', { elementId: 'schematic-1' }));
    await focusPromise;

    // A sends cursor scoped to 'schematic-1' -> B should receive it
    const cursorPromise = waitForMessage<CursorMovePayload>(wsB, 'cursor_move');
    wsA.send(createMessage('cursor_move', { x: 0.1, y: 0.2, elementId: 'schematic-1' }));

    const received = await cursorPromise;
    assert.equal(received.payload.elementId, 'schematic-1');

    wsA.close();
    wsB.close();
  });

  it('should sync state when a game action is dispatched', async () => {
    const wsA = new WebSocket(serverUrl);
    const wsB = new WebSocket(serverUrl);

    await Promise.all([waitForOpen(wsA), waitForOpen(wsB)]);

    wsA.send(createMessage('join_room', { roomId: 'room-action', playerId: 'pA', playerName: 'PA' }));
    wsB.send(createMessage('join_room', { roomId: 'room-action', playerId: 'pB', playerName: 'PB' }));

    await Promise.all([
      waitForMessage(wsA, 'room_joined'),
      waitForMessage(wsA, 'state_sync'),
      waitForMessage(wsB, 'room_joined'),
      waitForMessage(wsB, 'state_sync')
    ]);

    const statePromiseA = waitForMessage<StateSyncPayload>(wsA, 'state_sync');
    const statePromiseB = waitForMessage<StateSyncPayload>(wsB, 'state_sync');

    wsA.send(createMessage('game_action', {
      actionType: 'solve_puzzle',
      data: { puzzleId: 'puzzle-vault-01', solution: ['♈︎', '84'] }
    }));

    const [syncA, syncB] = await Promise.all([statePromiseA, statePromiseB]);

    assert.equal(syncA.payload.version, 1);
    assert.equal(syncB.payload.version, 1);
    const stateRecord = syncA.payload.state as Record<string, unknown>;
    assert.ok(stateRecord.lastAction);

    wsA.close();
    wsB.close();
  });
});
