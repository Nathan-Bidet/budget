import { createHash } from "node:crypto";

// Normalise un libellé pour le dédoublonnage (casse, espaces, accents).
export function normalizeLabel(label: string): string {
  return label
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // retire les accents
    .replace(/\s+/g, " ")
    .trim();
}

// Empreinte d'une transaction : deux lignes identiques (même date, montant,
// libellé normalisé) produisent le même hash → évite les doublons à l'import.
export function transactionDedupeHash(input: {
  date: Date;
  amount: number | string;
  label: string;
}): string {
  const day = new Date(input.date).toISOString().slice(0, 10);
  const amount = Number(input.amount).toFixed(2);
  const label = normalizeLabel(input.label);
  return createHash("sha256").update(`${day}|${amount}|${label}`).digest("hex");
}

// Hash d'un fichier (buffer) pour repérer un relevé déjà importé.
export function fileHash(buffer: Buffer): string {
  return createHash("sha256").update(buffer).digest("hex");
}
