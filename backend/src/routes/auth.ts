import type { FastifyPluginAsync } from "fastify";
import bcrypt from "bcryptjs";
import { z } from "zod";

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, "Mot de passe : 8 caractères minimum"),
  displayName: z.string().min(1),
  // Pour créer un foyer (premier utilisateur = admin) OU rejoindre un foyer existant
  householdName: z.string().min(1).optional(),
  householdId: z.string().optional(),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

const authRoutes: FastifyPluginAsync = async (fastify) => {
  // ─── Inscription ────────────────────────────────
  // Sans householdId → crée un foyer et l'utilisateur devient ADMIN.
  // Avec householdId → rejoint le foyer en tant que MEMBER.
  fastify.post("/register", async (req, reply) => {
    const parsed = registerSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.code(400).send({ error: parsed.error.flatten() });
    }
    const { email, password, displayName, householdName, householdId } = parsed.data;

    const existing = await fastify.prisma.user.findUnique({ where: { email } });
    if (existing) return reply.code(409).send({ error: "Email déjà utilisé" });

    const passwordHash = await bcrypt.hash(password, 12);

    const user = await fastify.prisma.$transaction(async (tx) => {
      let hid = householdId;
      let role: "ADMIN" | "MEMBER" = "MEMBER";

      if (!hid) {
        const household = await tx.household.create({
          data: { name: householdName ?? `Foyer de ${displayName}` },
        });
        hid = household.id;
        role = "ADMIN"; // créateur du foyer
      } else {
        const household = await tx.household.findUnique({ where: { id: hid } });
        if (!household) throw new Error("HOUSEHOLD_NOT_FOUND");
      }

      return tx.user.create({
        data: { email, passwordHash, displayName, role, householdId: hid },
      });
    }).catch((e) => {
      if (e instanceof Error && e.message === "HOUSEHOLD_NOT_FOUND") return null;
      throw e;
    });

    if (!user) return reply.code(404).send({ error: "Foyer introuvable" });

    const token = fastify.jwt.sign({
      id: user.id,
      householdId: user.householdId,
      role: user.role,
    });

    return reply.code(201).send({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        householdId: user.householdId,
      },
    });
  });

  // ─── Connexion ──────────────────────────────────
  fastify.post("/login", async (req, reply) => {
    const parsed = loginSchema.safeParse(req.body);
    if (!parsed.success) return reply.code(400).send({ error: "Requête invalide" });
    const { email, password } = parsed.data;

    const user = await fastify.prisma.user.findUnique({ where: { email } });
    if (!user) return reply.code(401).send({ error: "Identifiants incorrects" });

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) return reply.code(401).send({ error: "Identifiants incorrects" });

    const token = fastify.jwt.sign({
      id: user.id,
      householdId: user.householdId,
      role: user.role,
    });

    return reply.send({
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        role: user.role,
        householdId: user.householdId,
      },
    });
  });

  // ─── Profil courant ─────────────────────────────
  fastify.get("/me", { onRequest: [fastify.authenticate] }, async (req, reply) => {
    const user = await fastify.prisma.user.findUnique({
      where: { id: req.user.id },
      select: {
        id: true, email: true, displayName: true, role: true,
        householdId: true, household: { select: { name: true } },
      },
    });
    if (!user) return reply.code(404).send({ error: "Utilisateur introuvable" });
    return reply.send({ user });
  });
};

export default authRoutes;
