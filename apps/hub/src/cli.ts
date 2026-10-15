import { HubServer } from './server.js';

const port = Number(process.env.HUB_PORT || process.env.PORT) || 3000;
const hub = new HubServer();

hub.start(port).then(boundPort => {
  console.log(`[Hub] Scenario Marketplace & Catalog API listening on http://0.0.0.0:${boundPort}`);
}).catch(err => {
  console.error('[Hub] Failed to start:', err);
  process.exit(1);
});
