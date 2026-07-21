import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  color: z.string().default("#6366f1"),
  icon: z.string().optional(),
  parentId: z.string().optional(),
});

const ruleSchema = z.object({
  keyword: z.string().min(1),
  categoryId: z.string().min(1),
  minAmount: z.number().optional(),
  maxAmount: z.number().optional(),
  weight: z.number().int().min(1).default(1),
});

const categoryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("onRequest", fastify.authenticate);

  // Catégories du foyer (partagées entre tous les membres).
  fastify.get("/", async (req) => {
    return fastify.prisma.category.findMany({
      where: { householdId: req.user.householdId },
      orderBy: { name: "asc" },
    });
  });

  fastify.post("/", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const category = await fastify.prisma.category.create({
      data: { ...parsed.data, householdId: req.user.householdId },
    });
    return reply.code(201).send(category);
  });

  // ─── Règles de catégorisation ───────────────────
  fastify.get("/rules", async (req) => {
    return fastify.prisma.categoryRule.findMany({
      where: { householdId: req.user.householdId },
      orderBy: { weight: "desc" },
    });
  });

  fastify.post("/rules", async (req, reply) => {
    const parsed = ruleSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const rule = await fastify.prisma.categoryRule.create({
      data: { ...parsed.data, householdId: req.user.householdId },
    });
    return reply.code(201).send(rule);
  });
};

export default categoryRoutes;
