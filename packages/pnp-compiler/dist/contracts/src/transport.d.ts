/**
 * Normalized 2D coordinates for synchronized cursor and focus tracking (0.0 to 1.0).
 */
export interface CursorPosition {
    x: number;
    y: number;
    elementId?: string;
    isDragging?: boolean;
}
/**
 * Real-time player presence metadata.
 */
export interface PlayerPresence {
    playerId: string;
    playerName: string;
    roleIds: string[];
    color: string;
    cursor?: CursorPosition;
    focusedElementId?: string;
    lastActive: number;
}
/**
 * Standard transport status lifecycle.
 */
export type TransportStatus = 'disconnected' | 'connecting' | 'connected' | 'reconnecting';
/**
 * Event listener callback for incoming transport messages.
 */
export type TransportListener<T = unknown> = (payload: T) => void;
/**
 * Unsubscribe teardown function.
 */
export type UnsubscribeFn = () => void;
/**
 * Protocol message types exchanged across the transport layer.
 */
export type TransportMessageType = 'join_room' | 'leave_room' | 'room_joined' | 'player_joined' | 'player_left' | 'cursor_move' | 'focus_element' | 'presence_sync' | 'game_action' | 'state_sync' | 'error';
/**
 * Envelope for typed transport messages.
 */
export interface TransportMessage<T = unknown> {
    type: TransportMessageType | string;
    payload: T;
    senderId?: string;
    timestamp?: number;
}
/**
 * Payload for joining a room.
 */
export interface JoinRoomPayload {
    roomId: string;
    playerId: string;
    playerName: string;
    roleIds?: string[];
}
/**
 * Payload for leave room notifications.
 */
export interface LeaveRoomPayload {
    roomId: string;
    playerId: string;
}
/**
 * Payload for room joined confirmation.
 */
export interface RoomJoinedPayload {
    roomId: string;
    playerId: string;
    members: PlayerPresence[];
}
/**
 * Payload for cursor movement telemetry.
 */
export interface CursorMovePayload {
    x: number;
    y: number;
    elementId?: string;
    isDragging?: boolean;
}
/**
 * Payload for game state actions.
 */
export interface GameActionPayload {
    actionType: string;
    data: unknown;
}
/**
 * Payload for full state synchronization.
 */
export interface StateSyncPayload {
    state: unknown;
    version: number;
}
/**
 * Payload for transport errors.
 */
export interface TransportErrorPayload {
    code: string;
    message: string;
}
/**
 * Decoupled SessionTransport interface separating networking from client and server logic.
 */
export interface SessionTransport {
    readonly status: TransportStatus;
    connect(url?: string): Promise<void>;
    disconnect(): void;
    send<T = unknown>(type: string, payload: T): void;
    on<T = unknown>(type: string, handler: TransportListener<T>): UnsubscribeFn;
    onStatusChange?(handler: (status: TransportStatus) => void): UnsubscribeFn;
}
//# sourceMappingURL=transport.d.ts.map