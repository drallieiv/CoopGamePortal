import { Injectable, signal, computed } from '@angular/core';
import {
  type SessionTransport,
  type TransportStatus,
  type TransportListener,
  type UnsubscribeFn,
  type PlayerPresence,
  type JoinRoomPayload,
  type CursorMovePayload,
  type GameActionPayload,
  type StateSyncPayload,
  type AssignSeatPayload,
  createMessage,
  parseMessage
} from '@escape-system/contracts';

function getWsDefaultUrl(): string {
  if (typeof window === 'undefined') return 'ws://localhost:8080';
  const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
  return `${protocol}//${window.location.host}`;
}

@Injectable({
  providedIn: 'root'
})
export class TransportService implements SessionTransport {
  protected ws: WebSocket | null = null;
  protected readonly _status = signal<TransportStatus>('disconnected');
  protected readonly _players = signal<PlayerPresence[]>([]);
  protected readonly _gameState = signal<Record<string, unknown>>({});
  protected readonly _stateVersion = signal<number>(0);
  protected readonly _remoteCursors = signal<Map<string, CursorMovePayload>>(new Map());

  get status(): TransportStatus {
    return this._status();
  }

  readonly statusSignal = computed(() => this._status());
  readonly players = computed(() => this._players());
  readonly gameState = computed(() => this._gameState());
  readonly stateVersion = computed(() => this._stateVersion());
  readonly remoteCursors = computed(() => this._remoteCursors());

  protected listeners = new Map<string, Set<TransportListener>>();

  connect(url?: string): Promise<void> {
    const targetUrl = url ?? getWsDefaultUrl();
    return new Promise((resolve, reject) => {
      this._status.set('connecting');
      try {
        this.ws = new WebSocket(targetUrl);

        this.ws.onopen = () => {
          this._status.set('connected');
          resolve();
        };

        this.ws.onerror = (err) => {
          this._status.set('disconnected');
          reject(err);
        };

        this.ws.onclose = () => {
          this._status.set('disconnected');
        };

        this.ws.onmessage = (event) => {
          this.handleIncoming(event.data);
        };
      } catch (err) {
        this._status.set('disconnected');
        reject(err);
      }
    });
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this._status.set('disconnected');
    this._players.set([]);
    this._remoteCursors.set(new Map());
  }

  joinRoom(roomId: string, playerId: string, playerName: string, roleIds?: string[], hostSecret?: string): void {
    const payload: JoinRoomPayload = { roomId, playerId, playerName, roleIds, hostSecret };
    this.send('join_room', payload);
  }

  assignSeat(targetPlayerId: string, seatId: string | null, seatName?: string | null, roleIds?: string[]): void {
    const payload: AssignSeatPayload = { targetPlayerId, seatId, seatName, roleIds };
    this.send('assign_seat', payload);
  }

  sendCursor(payload: CursorMovePayload): void {
    this.send('cursor_move', payload);
  }

  focusElement(elementId?: string): void {
    this.send('focus_element', { elementId });
  }

  dispatchAction(actionType: string, data: unknown): void {
    const payload: GameActionPayload = { actionType, data };
    this.send('game_action', payload);
  }

  send<T = unknown>(type: string, payload: T): void {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(createMessage(type, payload));
    }
  }

  on<T = unknown>(type: string, handler: TransportListener<T>): UnsubscribeFn {
    if (!this.listeners.has(type)) {
      this.listeners.set(type, new Set());
    }
    const set = this.listeners.get(type)!;
    set.add(handler as TransportListener);

    return () => {
      set.delete(handler as TransportListener);
    };
  }

  protected handleIncoming(data: string): void {
    const message = parseMessage(data);
    if (!message) return;

    switch (message.type) {
      case 'room_joined': {
        const payload = message.payload as { members: PlayerPresence[] };
        this._players.set(payload.members);
        break;
      }
      case 'player_joined': {
        const presence = message.payload as PlayerPresence;
        this._players.update((list) => [...list.filter((p) => p.playerId !== presence.playerId), presence]);
        break;
      }
      case 'player_updated': {
        const updated = message.payload as PlayerPresence;
        this._players.update((list) => list.map((p) => (p.playerId === updated.playerId ? updated : p)));
        break;
      }
      case 'player_left': {
        const payload = message.payload as { playerId: string };
        this._players.update((list) => list.filter((p) => p.playerId !== payload.playerId));
        this._remoteCursors.update((map) => {
          map.delete(payload.playerId);
          return new Map(map);
        });
        break;
      }
      case 'cursor_move': {
        const cursor = message.payload as CursorMovePayload;
        if (message.senderId) {
          this._remoteCursors.update((map) => {
            map.set(message.senderId!, cursor);
            return new Map(map);
          });
        }
        break;
      }
      case 'presence_sync': {
        const presence = message.payload as PlayerPresence;
        this._players.update((list) => list.map((p) => (p.playerId === presence.playerId ? presence : p)));
        break;
      }
      case 'state_sync': {
        const payload = message.payload as StateSyncPayload;
        this._gameState.set(payload.state as Record<string, unknown>);
        this._stateVersion.set(payload.version);
        break;
      }
    }

    const handlers = this.listeners.get(message.type);
    if (handlers) {
      for (const h of handlers) {
        h(message.payload);
      }
    }
  }
}
