import type { CategoryRule } from "@prisma/client";
import { normalizeLabel } from "./hash.js";

export interface CategorizableTx {
  label: string;
  amount: number;
}

// Applique les règles du foyer à une transaction et renvoie l'id de catégorie
// le plus probable (ou null). La règle la plus "lourde" (weight) gagne.
export function categorize(
  tx: CategorizableTx,
  rules: CategoryRule[]
): string | null {
  const label = normalizeLabel(tx.label);
  let best: { categoryId: string; weight: number } | null = null;

  for (const rule of rules) {
    const kw = normalizeLabel(rule.keyword);
    if (!kw || !label.includes(kw)) continue;

    if (rule.minAmount != null && tx.amount < Number(rule.minAmount)) continue;
    if (rule.maxAmount != null && tx.amount > Number(rule.maxAmount)) continue;

    if (!best || rule.weight > best.weight) {
      best = { categoryId: rule.categoryId, weight: rule.weight };
    }
  }

  return best?.categoryId ?? null;
}
