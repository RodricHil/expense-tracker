import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import SettingsClient from "./settingsclient";

export const metadata = {
  title: "Settings | Finex",
  description: "Manage your display preferences and saved payment cards",
  alternates: {
    canonical: "https://finex-tracker.vercel.app/settings",
  },
};

export default async function SettingsPage() {
    // Defence in depth (ET-H2): authorization must not depend on middleware alone.
    const session = await getServerSession(authOptions);
    if (!session) {
        redirect("/login");
    }

    return <SettingsClient />;
}
