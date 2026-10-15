import { GameServer } from './index.js';

const port = Number(process.env.WS_PORT || process.env.PORT) || 8080;
const server = new GameServer();

server.start(port).then(boundPort => {
  console.log(`[SyncServer] Real-time WebSocket game server listening on ws://0.0.0.0:${boundPort}`);
}).catch(err => {
  console.error('[SyncServer] Failed to start:', err);
  process.exit(1);
});
