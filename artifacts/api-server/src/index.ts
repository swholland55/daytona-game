import app from "./app";
import { logger } from "./lib/logger";
import { setupWebSocketServer } from "./wsServer.js";

const port = Number(process.env["PORT"] ?? 3001);

const server = app.listen(port, () => {
  logger.info({ port }, "Server listening");
});

server.on("error", (err: Error) => {
  logger.error({ err }, "Error listening on port");
  process.exit(1);
});

setupWebSocketServer(server);
