import type { FastifyPluginAsync } from "fastify";
import { z } from "zod";

const createSchema = z.object({
  name: z.string().min(1),
  bank: z.string().optional(),
  type: z.enum(["CHECKING", "SAVINGS", "CARD", "CASH"]).default("CHECKING"),
  iban: z.string().optional(),
  isShared: z.boolean().default(false),
  ownerId: z.string().optional(), // admin peut affecter à un membre
});

const accountRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.addHook("onRequest", fastify.authenticate);

  // Liste des comptes visibles :
  // - admin → tous les comptes du foyer
  // - membre → ses comptes + les comptes communs
  fastify.get("/", async (req) => {
    const { id, householdId, role } = req.user;
    const where =
      role === "ADMIN"
        ? { householdId }
        : { householdId, OR: [{ ownerId: id }, { isShared: true }] };

    return fastify.prisma.account.findMany({
      where,
      orderBy: { createdAt: "asc" },
      include: { owner: { select: { id: true, displayName: true } } },
    });
  });

  fastify.post("/", async (req, reply) => {
    const parsed = createSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: parsed.error.flatten() });
    const { role, id, householdId } = req.user;
    const data = parsed.data;

    // Un membre ne peut créer que ses propres comptes (non partagés).
    const ownerId = role === "ADMIN" ? data.ownerId ?? (data.isShared ? null : id) : id;
    const isShared = role === "ADMIN" ? data.isShared : false;

    const account = await fastify.prisma.account.create({
      data: {
        name: data.name,
        bank: data.bank,
        type: data.type,
        iban: data.iban,
        isShared,
        ownerId,
        householdId,
      },
    });
    return reply.code(201).send(account);
  });
};

export default accountRoutes;
