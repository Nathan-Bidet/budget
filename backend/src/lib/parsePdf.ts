// Parsing des relevés bancaires PDF.
//
// ⚠️ Squelette : chaque banque a un format différent. On extrait d'abord le
// texte brut, puis un parser dédié par banque transforme les lignes en
// transactions. Fournir un relevé anonymisé pour écrire un parser fiable.

import { transactionDedupeHash } from "./hash.js";

export interface ParsedTransaction {
  date: Date;
  label: string;
  amount: number; // négatif = débit, positif = crédit
  dedupeHash: string;
}

export interface BankParser {
  bank: string;
  // Détecte si ce parser sait lire le texte fourni.
  matches: (text: string) => boolean;
  // Extrait les transactions du texte brut.
  parse: (text: string) => ParsedTransaction[];
}

// ─── Exemple de parser générique (à adapter par banque) ───
// Cherche des lignes du type "JJ/MM/AAAA  Libellé ...  -12,34"
const genericFrenchParser: BankParser = {
  bank: "generic-fr",
  matches: () => true, // fallback
  parse(text) {
    const out: ParsedTransaction[] = [];
    const lineRe =
      /(\d{2})\/(\d{2})\/(\d{4})\s+(.+?)\s+(-?\d[\d\s]*[.,]\d{2})\s*$/gm;
    let m: RegExpExecArray | null;
    while ((m = lineRe.exec(text)) !== null) {
      const [, dd, mm, yyyy, rawLabel, rawAmount] = m;
      const date = new Date(Number(yyyy), Number(mm) - 1, Number(dd));
      const amount = Number(
        rawAmount.replace(/\s/g, "").replace(",", ".")
      );
      const label = rawLabel.replace(/\s+/g, " ").trim();
      out.push({ date, label, amount, dedupeHash: transactionDedupeHash({ date, amount, label }) });
    }
    return out;
  },
};

const parsers: BankParser[] = [
  // TODO: ajouter les parsers spécifiques (BNP, Boursorama, CA, etc.)
  genericFrenchParser,
];

// Extrait le texte d'un PDF puis applique le premier parser compatible.
export async function parseStatement(buffer: Buffer): Promise<{
  bank: string;
  transactions: ParsedTransaction[];
}> {
  // Import dynamique pour éviter le coût au démarrage.
  const pdfParse = (await import("pdf-parse")).default;
  const { text } = await pdfParse(buffer);

  const parser = parsers.find((p) => p.matches(text)) ?? genericFrenchParser;
  return { bank: parser.bank, transactions: parser.parse(text) };
}
