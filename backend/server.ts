import http from 'http';
import app from './app.js';
import { initSocket } from './socket.js';
import { config } from './config/index.js';

const server = http.createServer(app);

// Initialize WebSockets
initSocket(server);

const PORT = config.PORT;

server.listen(PORT, () => {
  console.log(`🚀 Aero MAGE Server running in [${config.NODE_ENV}] mode on http://localhost:${PORT}`);
});
