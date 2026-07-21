"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { api, setToken } from "@/lib/api";

type Mode = "login" | "register";

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [displayName, setDisplayName] = useState("");
  const [householdName, setHouseholdName] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const path = mode === "login" ? "/auth/login" : "/auth/register";
      const body =
        mode === "login"
          ? { email, password }
          : { email, password, displayName, householdName };
      const res = await api<{ token: string }>(path, {
        method: "POST",
        body: JSON.stringify(body),
      });
      setToken(res.token);
      router.push("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Une erreur est survenue");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="container" style={{ maxWidth: 420, paddingTop: 80 }}>
      <h1 style={{ textAlign: "center" }}>Budget Familial</h1>
      <div className="card">
        <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
          <button
            className="btn"
            style={{ background: mode === "login" ? "var(--accent)" : "transparent", border: "1px solid var(--border)" }}
            onClick={() => setMode("login")}
            type="button"
          >
            Connexion
          </button>
          <button
            className="btn"
            style={{ background: mode === "register" ? "var(--accent)" : "transparent", border: "1px solid var(--border)" }}
            onClick={() => setMode("register")}
            type="button"
          >
            Créer un foyer
          </button>
        </div>

        <form onSubmit={submit}>
          {mode === "register" && (
            <>
              <label className="label">Votre nom</label>
              <input className="input" value={displayName} onChange={(e) => setDisplayName(e.target.value)} required />
              <label className="label">Nom du foyer</label>
              <input className="input" value={householdName} onChange={(e) => setHouseholdName(e.target.value)} placeholder="Foyer Bidet" />
            </>
          )}
          <label className="label">Email</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} required />
          <label className="label">Mot de passe</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} required minLength={mode === "register" ? 8 : 1} />

          {error && <div className="error">{error}</div>}

          <div style={{ marginTop: 20 }}>
            <button className="btn" disabled={loading} type="submit">
              {loading ? "..." : mode === "login" ? "Se connecter" : "Créer le foyer"}
            </button>
          </div>
        </form>
      </div>
      <p className="muted" style={{ textAlign: "center", marginTop: 16, fontSize: 13 }}>
        {mode === "login" ? "Pas encore de foyer ? Créez-en un." : "Le créateur du foyer devient administrateur."}
      </p>
    </div>
  );
}
