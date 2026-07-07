"use client";

import { useState, useEffect } from "react";
import { User } from "@/lib/types";
import AdminDashboard from "@/components/AdminDashboard";
import { Shield, LogIn, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState("");
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    const loadAdminStatus = async () => {
      const savedUser = localStorage.getItem("buddybill_user");
      const savedToken = localStorage.getItem("buddybill_token");

      if (savedUser && savedToken) {
        try {
          const user = JSON.parse(savedUser);
          if (user.darkMode) {
            document.documentElement.classList.add("dark");
          }
          const res = await fetch("/api/admin/check", {
            headers: { "x-session-token": savedToken },
          });
          const data = await res.json();
          if (!mounted) return;
          setCurrentUser(user);
          setSessionToken(savedToken);
          setIsAdmin(data.isAdmin);
        } catch {
          if (mounted) setIsAdmin(false);
        } finally {
          if (mounted) {
            setLoading(false);
          }
        }
      } else {
        if (mounted) setLoading(false);
      }
    };

    loadAdminStatus();

    return () => {
      mounted = false;
    };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin" />
      </div>
    );
  }

  // Not logged in
  if (!currentUser) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Admin Access Required</h1>
          <p className="text-gray-500 mb-6">You need to sign in first to access the admin dashboard.</p>
          <Link
            href="/"
            className="inline-flex items-center gap-2 px-6 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
          >
            <LogIn className="w-4 h-4" />
            Go to Login
          </Link>
        </div>
      </div>
    );
  }

  // Logged in but not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-red-100 dark:bg-red-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-red-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Admin Access Required</h1>
          <p className="text-gray-500 mb-2">
            Signed in as <span className="font-semibold text-gray-900 dark:text-white">{currentUser.name}</span>
          </p>
          <p className="text-gray-500 text-sm mb-6">
            This account does not have permission to access the admin dashboard.
          </p>
          <div className="space-y-3">
            <Link
              href="/"
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to App
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Admin — show dashboard
  return (
    <AdminDashboard
      currentUser={currentUser}
      sessionToken={sessionToken}
      onBack={() => {
        window.location.href = "/";
      }}
    />
  );
}
