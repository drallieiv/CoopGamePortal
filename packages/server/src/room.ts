import type { WebSocket } from 'ws';
import {
  PlayerPresence,
  JoinRoomPayload,
  RoomJoinedPayload,
  CursorMovePayload,
  GameActionPayload,
  StateSyncPayload
} from '@escape-system/contracts';
import { createMessage } from './protocol.js';

export interface RoomMember {
  ws: WebSocket;
  presence: PlayerPresence;
}

const PLAYER_COLORS = [
  '#E63946',
  '#457B9D',
  '#2A9D8F',
  '#E76F51',
  '#9B5DE5',
  '#F15BB5',
  '#00BBF9',
  '#00F5D4'
];

export class Room {
  readonly roomId: string;
  protected readonly members = new Map<string, RoomMember>();
  protected gameState: Record<string, unknown> = {};
  protected stateVersion = 0;

  constructor(roomId: string, initialState: Record<string, unknown> = {}) {
    this.roomId = roomId;
    this.gameState = { ...initialState };
  }

  getMemberCount(): number {
    return this.members.size;
  }

  getMembers(): PlayerPresence[] {
    return Array.from(this.members.values()).map(m => m.presence);
  }

  getGameState(): { state: Record<string, unknown>; version: number } {
    return { state: { ...this.gameState }, version: this.stateVersion };
  }

  join(ws: WebSocket, payload: JoinRoomPayload): PlayerPresence {
    const colorIndex = this.members.size % PLAYER_COLORS.length;
    const presence: PlayerPresence = {
      playerId: payload.playerId,
      playerName: payload.playerName,
      roleIds: payload.roleIds ?? [],
      color: PLAYER_COLORS[colorIndex],
      lastActive: Date.now()
    };

    this.members.set(payload.playerId, { ws, presence });

    // Send room_joined acknowledgment with all current members
    const roomJoinedPayload: RoomJoinedPayload = {
      roomId: this.roomId,
      playerId: payload.playerId,
      members: this.getMembers()
    };
    this.sendTo(ws, 'room_joined', roomJoinedPayload);

    // Send current game state
    const stateSyncPayload: StateSyncPayload = {
      state: this.gameState,
      version: this.stateVersion
    };
    this.sendTo(ws, 'state_sync', stateSyncPayload);

    // Notify other members
    this.broadcast('player_joined', presence, payload.playerId);

    return presence;
  }

  leave(playerId: string): void {
    if (this.members.delete(playerId)) {
      this.broadcast('player_left', { roomId: this.roomId, playerId });
    }
  }

  handleCursor(playerId: string, payload: CursorMovePayload): void {
    const member = this.members.get(playerId);
    if (!member) {
      return;
    }

    member.presence.cursor = payload;
    member.presence.lastActive = Date.now();

    // Broadcast cursor to other players who share the same focused element (or all if not scoped)
    const cursorMsg = createMessage('cursor_move', payload, playerId);
    for (const [otherId, otherMember] of this.members.entries()) {
      if (otherId === playerId) {
        continue;
      }
      if (
        !payload.elementId ||
        !otherMember.presence.focusedElementId ||
        otherMember.presence.focusedElementId === payload.elementId
      ) {
        if (otherMember.ws.readyState === otherMember.ws.OPEN) {
          otherMember.ws.send(cursorMsg);
        }
      }
    }
  }

  handleFocus(playerId: string, elementId?: string): void {
    const member = this.members.get(playerId);
    if (!member) {
      return;
    }

    member.presence.focusedElementId = elementId;
    member.presence.lastActive = Date.now();

    this.broadcast('presence_sync', member.presence);
  }

  handleAction(playerId: string, action: GameActionPayload): void {
    this.stateVersion += 1;
    this.gameState = {
      ...this.gameState,
      lastAction: {
        type: action.actionType,
        by: playerId,
        data: action.data,
        timestamp: Date.now()
      }
    };

    const payload: StateSyncPayload = {
      state: this.gameState,
      version: this.stateVersion
    };

    this.broadcast('state_sync', payload);
  }

  protected broadcast<T>(type: string, payload: T, excludePlayerId?: string): void {
    const msg = createMessage(type, payload);
    for (const [id, member] of this.members.entries()) {
      if (excludePlayerId && id === excludePlayerId) {
        continue;
      }
      if (member.ws.readyState === member.ws.OPEN) {
        member.ws.send(msg);
      }
    }
  }

  protected sendTo<T>(ws: WebSocket, type: string, payload: T): void {
    if (ws.readyState === ws.OPEN) {
      ws.send(createMessage(type, payload));
    }
  }
}
