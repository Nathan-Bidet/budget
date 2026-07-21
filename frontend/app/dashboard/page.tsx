"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { api, getToken, setToken } from "@/lib/api";

interface Me {
  id: string;
  displayName: string;
  role: "ADMIN" | "MEMBER";
  household: { name: string };
}

interface TxItem {
  id: string;
  date: string;
  label: string;
  amount: string;
  category: { name: string; color: string } | null;
  account: { name: string };
}

export default function DashboardPage() {
  const router = useRouter();
  const [me, setMe] = useState<Me | null>(null);
  const [txs, setTxs] = useState<TxItem[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!getToken()) {
      router.replace("/login");
      return;
    }
    (async () => {
      try {
        const [{ user }, list] = await Promise.all([
          api<{ user: Me }>("/auth/me"),
          api<{ items: TxItem[] }>("/transactions?take=20"),
        ]);
        setMe(user);
        setTxs(list.items);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Erreur");
      } finally {
        setLoading(false);
      }
    })();
  }, [router]);

  function logout() {
    setToken(null);
    router.replace("/login");
  }

  if (loading) return <div className="container">Chargement…</div>;
  if (error) return <div className="container error">{error}</div>;

  const totalDepenses = txs
    .filter((t) => Number(t.amount) < 0)
    .reduce((s, t) => s + Number(t.amount), 0);
  const totalRevenus = txs
    .filter((t) => Number(t.amount) > 0)
    .reduce((s, t) => s + Number(t.amount), 0);

  return (
    <div className="container">
      <header style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
        <div>
          <h1 style={{ margin: 0 }}>{me?.household.name}</h1>
          <span className="muted">
            {me?.displayName} · {me?.role === "ADMIN" ? "Administrateur" : "Membre"}
          </span>
        </div>
        <button className="btn" style={{ width: "auto" }} onClick={logout}>Déconnexion</button>
      </header>

      <div className="stat-grid" style={{ marginBottom: 24 }}>
        <div className="stat">
          <span className="muted">Dépenses (20 dernières)</span>
          <div className="value" style={{ color: "var(--danger)" }}>{totalDepenses.toFixed(2)} €</div>
        </div>
        <div className="stat">
          <span className="muted">Revenus (20 derniers)</span>
          <div className="value" style={{ color: "#22c55e" }}>{totalRevenus.toFixed(2)} €</div>
        </div>
        <div className="stat">
          <span className="muted">Transactions</span>
          <div className="value">{txs.length}</div>
        </div>
      </div>

      <div className="card">
        <h2 style={{ marginTop: 0 }}>Dernières transactions</h2>
        {txs.length === 0 ? (
          <p className="muted">
            Aucune transaction. Importez un relevé PDF pour commencer
            (fonction à venir — parser à écrire pour ta banque).
          </p>
        ) : (
          <table style={{ width: "100%", borderCollapse: "collapse" }}>
            <thead>
              <tr style={{ textAlign: "left", color: "var(--muted)", fontSize: 13 }}>
                <th style={{ padding: "8px 0" }}>Date</th>
                <th>Libellé</th>
                <th>Catégorie</th>
                <th style={{ textAlign: "right" }}>Montant</th>
              </tr>
            </thead>
            <tbody>
              {txs.map((t) => (
                <tr key={t.id} style={{ borderTop: "1px solid var(--border)" }}>
                  <td style={{ padding: "8px 0" }}>{new Date(t.date).toLocaleDateString("fr-FR")}</td>
                  <td>{t.label}</td>
                  <td>
                    {t.category ? (
                      <span style={{ color: t.category.color }}>● {t.category.name}</span>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                  <td style={{ textAlign: "right", color: Number(t.amount) < 0 ? "var(--danger)" : "#22c55e" }}>
                    {Number(t.amount).toFixed(2)} €
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
