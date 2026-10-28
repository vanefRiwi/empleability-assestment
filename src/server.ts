import { loadConfig } from "./config/env";
import { buildContainer } from "./container";
import { createApp } from "./presentation/http/app";

const config = loadConfig();
const container = buildContainer(config);
const server = createApp(container).listen(config.port, () => {
  console.log(`auth-service listening on port ${config.port}`);
});

function shutdown(): void {
  server.close(() => {
    void container.pool.end().then(() => process.exit(0));
  });
}

process.on("SIGTERM", shutdown);
process.on("SIGINT", shutdown);
