import { redirect } from "next/navigation";

// Keep old bookmarks working; expense creation now lives in a dialog.
export default function AddExpensePage() {
  redirect("/dashboard");
}
