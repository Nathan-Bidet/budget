import { redirect } from "next/navigation";

// La racine redirige vers le login (la logique auth se fait côté client).
export default function Home() {
  redirect("/login");
}
