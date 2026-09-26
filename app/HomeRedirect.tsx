"use client";

import { useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect } from "react";

export default function HomeRedirect() {
  const { status } = useSession();
  const router = useRouter();

  useEffect(() => {
    if (status === "authenticated") {
      router.push("/dashboard");
    } else if (status === "unauthenticated") {
      router.push("/login");
    }
  }, [status, router]);

  return <main className="min-h-screen flex items-center justify-center"><p role="status" className="muted">Opening Finex…</p></main>;
}
