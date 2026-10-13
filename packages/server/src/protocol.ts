import {
  TransportMessage,
  JoinRoomPayload,
  LeaveRoomPayload,
  RoomJoinedPayload,
  PlayerPresence,
  CursorMovePayload,
  GameActionPayload,
  StateSyncPayload,
  TransportErrorPayload
} from '@escape-system/contracts';

export type {
  TransportMessage,
  JoinRoomPayload,
  LeaveRoomPayload,
  RoomJoinedPayload,
  PlayerPresence,
  CursorMovePayload,
  GameActionPayload,
  StateSyncPayload,
  TransportErrorPayload
};

export function createMessage<T>(
  type: string,
  payload: T,
  senderId?: string
): string {
  const message: TransportMessage<T> = {
    type,
    payload,
    senderId,
    timestamp: Date.now()
  };
  return JSON.stringify(message);
}

export function parseMessage(data: string): TransportMessage<unknown> | null {
  try {
    const parsed = JSON.parse(data) as TransportMessage<unknown>;
    if (!parsed || typeof parsed.type !== 'string') {
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}
