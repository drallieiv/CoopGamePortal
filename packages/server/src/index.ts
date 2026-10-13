import { WebSocketServer, WebSocket } from 'ws';
import type { Server } from 'http';
import { Room } from './room.js';
import { parseMessage, createMessage } from './protocol.js';
import type {
  JoinRoomPayload,
  CursorMovePayload,
  GameActionPayload
} from './protocol.js';

export * from './room.js';
export * from './protocol.js';

export class GameServer {
  protected wss: WebSocketServer | null = null;
  protected rooms = new Map<string, Room>();
  protected clientRoomMap = new WeakMap<WebSocket, { roomId: string; playerId: string }>();

  getRoom(roomId: string): Room {
    let room = this.rooms.get(roomId);
    if (!room) {
      room = new Room(roomId);
      this.rooms.set(roomId, room);
    }
    return room;
  }

  start(port = 0, server?: Server): Promise<number> {
    return new Promise((resolve, reject) => {
      try {
        const wssOptions = server ? { server } : { port };
        this.wss = new WebSocketServer(wssOptions, () => {
          const address = this.wss?.address();
          if (address && typeof address === 'object') {
            resolve(address.port);
          } else {
            resolve(port);
          }
        });

        this.wss.on('connection', (ws: WebSocket) => {
          this.handleConnection(ws);
        });

        this.wss.on('error', (err) => {
          reject(err);
        });
      } catch (err) {
        reject(err);
      }
    });
  }

  stop(): Promise<void> {
    return new Promise((resolve) => {
      if (this.wss) {
        this.wss.close(() => {
          this.wss = null;
          this.rooms.clear();
          resolve();
        });
      } else {
        resolve();
      }
    });
  }

  protected handleConnection(ws: WebSocket): void {
    ws.on('message', (data: string | Buffer) => {
      const msgStr = typeof data === 'string' ? data : data.toString('utf-8');
      const message = parseMessage(msgStr);
      if (!message) {
        ws.send(createMessage('error', { code: 'INVALID_MESSAGE', message: 'Malformed JSON payload' }));
        return;
      }

      this.routeMessage(ws, message.type, message.payload);
    });

    ws.on('close', () => {
      const info = this.clientRoomMap.get(ws);
      if (info) {
        const room = this.rooms.get(info.roomId);
        if (room) {
          room.leave(info.playerId);
          if (room.getMemberCount() === 0) {
            this.rooms.delete(info.roomId);
          }
        }
      }
    });
  }

  protected routeMessage(ws: WebSocket, type: string, payload: unknown): void {
    if (type === 'join_room') {
      const joinPayload = payload as JoinRoomPayload;
      if (!joinPayload.roomId || !joinPayload.playerId) {
        ws.send(createMessage('error', { code: 'BAD_REQUEST', message: 'roomId and playerId required' }));
        return;
      }
      const room = this.getRoom(joinPayload.roomId);
      room.join(ws, joinPayload);
      this.clientRoomMap.set(ws, { roomId: joinPayload.roomId, playerId: joinPayload.playerId });
      return;
    }

    const info = this.clientRoomMap.get(ws);
    if (!info) {
      ws.send(createMessage('error', { code: 'UNAUTHORIZED', message: 'Must join room first' }));
      return;
    }

    const room = this.rooms.get(info.roomId);
    if (!room) {
      ws.send(createMessage('error', { code: 'NOT_FOUND', message: 'Room not found' }));
      return;
    }

    switch (type) {
      case 'cursor_move':
        room.handleCursor(info.playerId, payload as CursorMovePayload);
        break;
      case 'focus_element':
        room.handleFocus(info.playerId, (payload as { elementId?: string })?.elementId);
        break;
      case 'game_action':
        room.handleAction(info.playerId, payload as GameActionPayload);
        break;
      case 'leave_room':
        room.leave(info.playerId);
        this.clientRoomMap.delete(ws);
        if (room.getMemberCount() === 0) {
          this.rooms.delete(info.roomId);
        }
        break;
      default:
        ws.send(createMessage('error', { code: 'UNKNOWN_TYPE', message: `Unknown message type: ${type}` }));
        break;
    }
  }
}
