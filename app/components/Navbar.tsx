"use client";
import Link from "next/link";
import { useState } from "react";
import { useSession, signOut } from "next-auth/react";
import { useNotification } from "@/app/components/elements/NotificationProvider";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import {
  faBars,
  faPlus,
  faRightFromBracket,
  faRightToBracket,
  faGauge,
  faChevronDown,
} from "@fortawesome/free-solid-svg-icons";
import Image from "next/image";
import ConfirmationModal from "./ConfirmationModal";

export default function Navbar() {
  const [open, setOpen] = useState(false);
  const [profileOpen, setProfileOpen] = useState(false);
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const { data: session } = useSession();
  const { showNotification } = useNotification();

  const handleLogout = async () => {
    setIsLoggingOut(true);
    try {
      showNotification("Logged out successfully", "success");
    } catch (e) {}
    await signOut({ callbackUrl: "/" });
  };

  return (
    <header className="fixed top-0 left-0 right-0 z-40">
      <nav className="backdrop-blur-sm bg-white/60 dark:bg-black/60 border-b border-gray-200 dark:border-gray-800">
        <div className="px-6 lg:px-12 3xl:px-60 py-3 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/dashboard" className="flex items-center gap-3">
              <span className="h-9 w-9 rounded-lg bg-gradient-to-br from-indigo-500 to-fuchsia-500 flex items-center justify-center text-white font-bold">ET</span>
              <div className="hidden sm:block">
                <div className="font-semibold">Expense Tracker</div>
                <div className="text-xs text-gray-600 dark:text-gray-300">Analytics · Simple · Fast</div>
              </div>
            </Link>
          </div>

          <div className="hidden md:flex items-center gap-3">
            <Link href="/dashboard" className="text-sm font-semibold text-gray-700 dark:text-gray-200 hover:underline flex items-center gap-2">
              <FontAwesomeIcon icon={faGauge} className="w-4 h-4" /> Dashboard
            </Link>

            {/* <Link href="/add-expenses" className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-sm font-semibold shadow-sm transition">
              <FontAwesomeIcon icon={faPlus} className="w-4 h-4" /> Add Expense
            </Link> */}

            {session ? (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="flex items-center gap-2 px-3 py-2 cursor-pointer  rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition border border-gray-200 dark:border-gray-700"
                >
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                      {session.user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                  <span className="text-sm font-medium text-gray-700  dark:text-gray-200 hidden sm:inline">
                    {session.user?.name?.split(" ")[0]}
                  </span>
                  <FontAwesomeIcon icon={faChevronDown} className="w-3 h-3 text-gray-600 dark:text-gray-400" />
                </button>

                {profileOpen && (
                  <div className="absolute cursor-pointer  right-0 mt-2 w-64 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-gradient-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-600">
                      <div className="flex items-center gap-3">
                        {session.user?.image ? (
                          <Image
                            src={session.user.image}
                            alt={session.user.name || "User"}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {session.user?.name?.charAt(0).toUpperCase() || "U"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {session.user?.name}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {session.user?.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3 ">
                      <button
                        onClick={() => {
                          setShowLogoutConfirm(true);
                          setProfileOpen(false);
                        }}
                        className="w-full flex items-center cursor-pointer  gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      >
                        <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <Link href="/login" className="inline-flex items-center gap-2 px-3 py-2 border border-indigo-600 text-indigo-600 rounded-lg hover:bg-indigo-50 transition text-sm">
                <FontAwesomeIcon icon={faRightToBracket} className="w-4 h-4" /> Login
              </Link>
            )}
          </div>

          <div className="md:hidden flex items-center gap-2">
            {session && (
              <div className="relative">
                <button
                  onClick={() => setProfileOpen(!profileOpen)}
                  className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-900 transition"
                >
                  {session.user?.image ? (
                    <Image
                      src={session.user.image}
                      alt={session.user.name || "User"}
                      width={24}
                      height={24}
                      className="w-6 h-6 rounded-full object-cover"
                    />
                  ) : (
                    <div className="w-6 h-6 rounded-full bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white text-xs font-bold">
                      {session.user?.name?.charAt(0).toUpperCase() || "U"}
                    </div>
                  )}
                </button>

                {profileOpen && (
                  <div className="absolute right-0 mt-2 w-56 bg-white dark:bg-gray-800 rounded-lg shadow-xl border border-gray-200 dark:border-gray-700 overflow-hidden z-50">
                    <div className="p-4 border-b border-gray-200 dark:border-gray-700 bg-linear-to-r from-purple-50 to-pink-50 dark:from-gray-700 dark:to-gray-600">
                      <div className="flex items-center gap-3">
                        {session.user?.image ? (
                          <Image
                            src={session.user.image}
                            alt={session.user.name || "User"}
                            width={40}
                            height={40}
                            className="w-10 h-10 rounded-full object-cover"
                          />
                        ) : (
                          <div className="w-10 h-10 rounded-full bg-linear-to-br from-purple-500 to-pink-500 flex items-center justify-center text-white font-bold">
                            {session.user?.name?.charAt(0).toUpperCase() || "U"}
                          </div>
                        )}
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-semibold text-gray-900 dark:text-white truncate">
                            {session.user?.name}
                          </p>
                          <p className="text-xs text-gray-600 dark:text-gray-400 truncate">
                            {session.user?.email}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="p-3">
                      <button
                        onClick={() => {
                          setShowLogoutConfirm(true);
                          setProfileOpen(false);
                        }}
                        className="w-full cursor-pointer flex items-center gap-2 px-3 py-2 text-sm text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition"
                      >
                        <FontAwesomeIcon icon={faRightFromBracket} className="w-4 h-4" /> Logout
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
            <button onClick={() => setOpen((v) => !v)} aria-label="menu" className="p-2 rounded-md text-gray-700 dark:text-gray-200">
              <FontAwesomeIcon icon={faBars} className="w-5 h-5" />
            </button>
          </div>
        </div>

        {open && (
          <div className="md:hidden border-t border-gray-200 dark:border-gray-800 bg-white/80 dark:bg-black/70 backdrop-blur-sm">
            <div className="max-w-7xl mx-auto px-6 py-4 flex flex-col gap-3">
              <Link href="/dashboard" className="text-sm font-medium text-gray-700 dark:text-gray-200">Dashboard</Link>
              <Link href="/add-expenses" className="text-sm font-medium text-indigo-600">Add Expense</Link>
              {!session && (
                <Link href="/login" className="text-sm text-indigo-600">Login</Link>
              )}
            </div>
          </div>
        )}
      </nav>
      <div className="h-16" />

      {showLogoutConfirm && (
        <ConfirmationModal
          title="Logout?"
          message="Are you sure you want to logout from your account?"
          confirmText="Yes"
          cancelText="No"
          isLoading={isLoggingOut}
          isDangerous={true}
          onConfirm={handleLogout}
          onCancel={() => setShowLogoutConfirm(false)}
        />
      )}
    </header>
  );
}
