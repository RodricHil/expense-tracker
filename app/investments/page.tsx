import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import InvestmentsClient from "./investmentsclient";
export const metadata = { title: "Investments | Finex", description: "Track investments, contributions and insurance in one place." };
export const dynamic = "force-dynamic";
export default async function InvestmentsPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id) redirect("/login");
  return <InvestmentsClient />;
}
