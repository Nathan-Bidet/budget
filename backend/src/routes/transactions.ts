import type { FastifyPluginAsync } from "fastify";
import { Prisma } from "@prisma/client";
import { z } from "zod";

const listQuery = z.object({
  accountId: z.string().optional(),
  categoryId: z.string().optional(),
  from: z.string().optional(), // ISO date
  to: z.string().optional(),
  take: z.coerce.number().min(1).max(500).default(100),
  skip: z.coerce.number().min(0).default(0),
});

const updateSchema = z.object({
  categoryId: z.string().nullable().optional(),
  note: z.string().optional(),
  ownerId: z.string().nullable().optional(),
});

const categoryRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("onRequest", fastify.authenticate);

  // Restreint la visibilité selon le rôle (admin=tout, membre=sien+commun).
  function scopeFilter(user: {
    id: string;
    householdId: string;
    role: string;
  }): Prisma.TransactionWhereInput {
    if (user.role === "ADMIN") {
      return { account: { householdId: user.householdId } };
    }
    return {
      account: {
        householdId: user.householdId,
        OR: [{ ownerId: user.id }, { isShared: true }],
      },
    };
  }

  // ─── Liste filtrée ──────────────────────────────
  fastify.get("/", async (req, reply) => {
    const parsed = listQuery.safeParse(req.query);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const q = parsed.data;

    const where: Prisma.TransactionWhereInput = { ...scopeFilter(req.user) };
    if (q.accountId) where.accountId = q.accountId;
    if (q.categoryId) where.categoryId = q.categoryId;
    if (q.from || q.to) {
      where.date = {
        ...(q.from ? { gte: new Date(q.from) } : {}),
        ...(q.to ? { lte: new Date(q.to) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      fastify.prisma.transaction.findMany({
        where,
        orderBy: { date: "desc" },
        take: q.take,
        skip: q.skip,
        include: {
          category: { select: { id: true, name: true, color: true } },
          account: { select: { id: true, name: true } },
        },
      }),
      fastify.prisma.transaction.count({ where }),
    ]);

    return reply.send({ items, total, take: q.take, skip: q.skip });
  });

  // ─── Résumé par catégorie (pour le dashboard) ───
  fastify.get("/summary", async (req, reply) => {
    const q = z.object({ from: z.string().optional(), to: z.string().optional() })
      .parse(req.query);

    const where: Prisma.TransactionWhereInput = { ...scopeFilter(req.user) };
    if (q.from || q.to) {
      where.date = {
        ...(q.from ? { gte: new Date(q.from) } : {}),
        ...(q.to ? { lte: new Date(q.to) } : {}),
      };
    }

    const grouped = await fastify.prisma.transaction.groupBy({
      by: ["categoryId"],
      where,
      _sum: { amount: true },
      _count: true,
    });

    return reply.send({ byCategory: grouped });
  });

  // ─── Mise à jour (catégorie / note / titulaire) ─
  fastify.patch("/:id", async (req, reply) => {
    const { id } = z.object({ id: z.string() }).parse(req.params);
    const parsed = updateSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });

    // Vérifie que la transaction est bien dans le périmètre de l'utilisateur.
    const tx = await fastify.prisma.transaction.findFirst({
      where: { id, ...scopeFilter(req.user) },
    });
    if (!tx) return reply.code(404).send({ error: "Transaction introuvable" });

    const data: Record<string, unknown> = { ...parsed.data };
    // Une correction manuelle de catégorie verrouille l'auto-catégorisation.
    if (parsed.data.categoryId !== undefined) data.categoryLocked = true;

    const updated = await fastify.prisma.transaction.update({ where: { id }, data });
    return reply.send(updated);
  });
};

export default categoryRoutes;
