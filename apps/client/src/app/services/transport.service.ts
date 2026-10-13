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
  createMessage,
  parseMessage
} from '@escape-system/contracts';

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

  connect(url = 'ws://localhost:8080'): Promise<void> {
    return new Promise((resolve, reject) => {
      this._status.set('connecting');
      try {
        this.ws = new WebSocket(url);

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

  joinRoom(roomId: string, playerId: string, playerName: string, roleIds?: string[]): void {
    const payload: JoinRoomPayload = { roomId, playerId, playerName, roleIds };
    this.send('join_room', payload);
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

  protected handleIncoming(rawData: string): void {
    const msg = parseMessage(rawData);
    if (!msg) {
      return;
    }

    switch (msg.type) {
      case 'room_joined': {
        const payload = msg.payload as { members: PlayerPresence[] };
        this._players.set(payload.members ?? []);
        break;
      }
      case 'player_joined': {
        const presence = msg.payload as PlayerPresence;
        this._players.update((list) => [...list.filter((p) => p.playerId !== presence.playerId), presence]);
        break;
      }
      case 'player_left': {
        const payload = msg.payload as { playerId: string };
        this._players.update((list) => list.filter((p) => p.playerId !== payload.playerId));
        this._remoteCursors.update((map) => {
          const next = new Map(map);
          next.delete(payload.playerId);
          return next;
        });
        break;
      }
      case 'cursor_move': {
        const cursor = msg.payload as CursorMovePayload;
        if (msg.senderId) {
          this._remoteCursors.update((map) => {
            const next = new Map(map);
            next.set(msg.senderId!, cursor);
            return next;
          });
        }
        break;
      }
      case 'state_sync': {
        const payload = msg.payload as StateSyncPayload;
        this._gameState.set(payload.state as Record<string, unknown>);
        this._stateVersion.set(payload.version);
        break;
      }
    }

    const set = this.listeners.get(msg.type);
    if (set) {
      for (const listener of set) {
        listener(msg.payload);
      }
    }
  }
}
