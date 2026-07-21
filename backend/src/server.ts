import Fastify from "fastify";
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import { env } from "./env.js";
import prismaPlugin from "./plugins/prisma.js";
import authPlugin from "./plugins/auth.js";
import authRoutes from "./routes/auth.js";
import accountRoutes from "./routes/accounts.js";
import categoryRoutes from "./routes/categories.js";
import transactionRoutes from "./routes/transactions.js";

const app = Fastify({
  logger: { level: env.NODE_ENV === "production" ? "info" : "debug" },
});

await app.register(cors, { origin: true, credentials: true });
await app.register(multipart, { limits: { fileSize: 20 * 1024 * 1024 } }); // 20 Mo

// Plugins applicatifs
await app.register(prismaPlugin);
await app.register(authPlugin);

// Healthcheck (utilisé par Docker)
app.get("/api/health", async () => ({ status: "ok", ts: Date.now() }));

// Routes API (préfixe /api pour le reverse proxy)
await app.register(authRoutes, { prefix: "/api/auth" });
await app.register(accountRoutes, { prefix: "/api/accounts" });
await app.register(categoryRoutes, { prefix: "/api/categories" });
await app.register(transactionRoutes, { prefix: "/api/transactions" });

try {
  await app.listen({ port: env.BACKEND_PORT, host: "0.0.0.0" });
  app.log.info(`Backend prêt sur le port ${env.BACKEND_PORT}`);
} catch (err) {
  app.log.error(err);
  process.exit(1);
}
