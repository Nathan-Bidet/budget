// Seed : catégories par défaut d'un foyer (exécuté à la création si besoin).
// Usage : npm run seed  (nécessite qu'un foyer existe déjà, sinon adapter).
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const DEFAULT_CATEGORIES = [
  { name: "Alimentation", color: "#22c55e" },
  { name: "Logement", color: "#3b82f6" },
  { name: "Transport", color: "#f59e0b" },
  { name: "Santé", color: "#ef4444" },
  { name: "Loisirs", color: "#a855f7" },
  { name: "Abonnements", color: "#06b6d4" },
  { name: "Revenus", color: "#10b981" },
  { name: "Divers", color: "#6b7280" },
];

async function main() {
  const household = await prisma.household.findFirst();
  if (!household) {
    console.log("Aucun foyer : crée d'abord un compte via /api/auth/register.");
    return;
  }
  for (const c of DEFAULT_CATEGORIES) {
    await prisma.category.upsert({
      where: { householdId_name: { householdId: household.id, name: c.name } },
      update: {},
      create: { ...c, householdId: household.id },
    });
  }
  console.log(`Catégories par défaut créées pour le foyer "${household.name}".`);
}

main()
  .catch((e) => { console.error(e); process.exit(1); })
  .finally(() => prisma.$disconnect());
