"use client";

import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { faArrowRight } from "@fortawesome/free-solid-svg-icons";
import { faGoogle } from "@fortawesome/free-brands-svg-icons";

export default function LoginClient() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (status === "authenticated" && session) {
      router.push("/dashboard");
    }
  }, [status, session, router]);

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    await signIn("google", { callbackUrl: "/dashboard" });
  };

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-purple-400 border-t-purple-600 animate-spin"></div>
          <p className="text-gray-300">Loading...</p>
        </div>
      </div>
    );
  }

  if (status === "authenticated") {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900 flex items-center justify-center px-4 py-12">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 left-10 w-72 h-72 bg-purple-500/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-20 right-10 w-72 h-72 bg-blue-500/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
      </div>

      <div className="relative w-full max-w-md">
        <div className="bg-white/10 backdrop-blur-xl rounded-2xl p-8 md:p-12 border border-white/20 shadow-2xl">
          {/* Logo Section */}
          <div className="flex justify-center mb-10">
            <div className="h-16 w-16 rounded-2xl bg-gradient-to-br from-purple-500 via-pink-500 to-red-500 flex items-center justify-center shadow-lg transform hover:scale-105 transition-transform duration-300">
              <span className="text-2xl font-black text-white">ET</span>
            </div>
          </div>

          {/* Heading */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-white mb-2">Welcome Back</h1>
            <p className="text-gray-300 text-sm md:text-base">
              Track your expenses with intelligence and ease
            </p>
          </div>

          {/* Features */}
          <div className="space-y-4 mb-10">
            <div className="flex items-start gap-3 text-gray-200">
              <div className="mt-1 w-5 h-5 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                ✓
              </div>
              <div>
                <p className="font-semibold">Smart Analytics</p>
                <p className="text-xs text-gray-400">Real-time insights on your spending</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-gray-200">
              <div className="mt-1 w-5 h-5 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                ✓
              </div>
              <div>
                <p className="font-semibold">Secure & Private</p>
                <p className="text-xs text-gray-400">Your data is encrypted and safe</p>
              </div>
            </div>
            <div className="flex items-start gap-3 text-gray-200">
              <div className="mt-1 w-5 h-5 rounded-full bg-gradient-to-br from-green-500 to-emerald-500 flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                ✓
              </div>
              <div>
                <p className="font-semibold">Lightning Fast</p>
                <p className="text-xs text-gray-400">Optimized performance for mobile & web</p>
              </div>
            </div>
          </div>

          {/* Auth Button */}
          <button
            onClick={handleGoogleSignIn}
            disabled={isLoading}
            className="w-full cursor-pointer bg-gradient-to-r from-purple-600 to-pink-600 hover:from-purple-700 hover:to-pink-700 disabled:opacity-50 disabled:cursor-not-allowed text-white font-semibold py-3 px-6 rounded-lg transition duration-300 flex items-center justify-center gap-3 shadow-lg hover:shadow-purple-500/50"
          >
            <FontAwesomeIcon icon={faGoogle} className="w-5 h-5" />
            <span>{isLoading ? "Signing in..." : "Sign in with Google"}</span>
            {!isLoading && <FontAwesomeIcon icon={faArrowRight} className="w-4 h-4" />}
          </button>

          {/* Footer */}
          <div className="mt-8 text-center text-xs text-gray-400">
            <p>By signing in, you agree to our Terms of Service</p>
            <p className="mt-1">and acknowledge our Privacy Policy</p>
          </div>
        </div>

        {/* Bottom decoration */}
        <div className="mt-8 text-center text-gray-400 text-sm">
          <p>Build your financial awareness today</p>
        </div>
      </div>
    </div>
  );
}
