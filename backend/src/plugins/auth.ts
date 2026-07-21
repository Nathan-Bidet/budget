import fp from "fastify-plugin";
import fastifyJwt from "@fastify/jwt";
import type { FastifyPluginAsync, FastifyRequest, FastifyReply } from "fastify";
import { env } from "../env.js";

// Contenu du token
export interface AuthUser {
  id: string;
  householdId: string;
  role: "ADMIN" | "MEMBER";
}

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthUser;
    user: AuthUser;
  }
}

declare module "fastify" {
  interface FastifyInstance {
    // Vérifie le JWT, rejette si absent/invalide
    authenticate: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
    // Vérifie que l'utilisateur est admin (après authenticate)
    requireAdmin: (req: FastifyRequest, reply: FastifyReply) => Promise<void>;
  }
}

const authPlugin: FastifyPluginAsync = async (fastify) => {
  await fastify.register(fastifyJwt, {
    secret: env.JWT_SECRET,
    sign: { expiresIn: env.JWT_EXPIRES_IN },
  });

  fastify.decorate("authenticate", async (req: FastifyRequest, reply: FastifyReply) => {
    try {
      await req.jwtVerify();
    } catch {
      reply.code(401).send({ error: "Non authentifié" });
    }
  });

  fastify.decorate("requireAdmin", async (req: FastifyRequest, reply: FastifyReply) => {
    if (req.user?.role !== "ADMIN") {
      reply.code(403).send({ error: "Réservé aux administrateurs" });
    }
  });
};

export default fp(authPlugin, { name: "auth", dependencies: [] });
