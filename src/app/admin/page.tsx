"use client";

import { useState, useEffect } from "react";
import { User } from "@/lib/types";
import AdminDashboard from "@/components/AdminDashboard";
import { Shield, LogIn, ArrowLeft } from "lucide-react";
import Link from "next/link";

export default function AdminPage() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    const savedUser = localStorage.getItem("buddybill_user");
    if (savedUser) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        if (user.darkMode) {
          document.documentElement.classList.add("dark");
        }
        // Check admin status
        checkAdminStatus(user.id);
      } catch {
        setLoading(false);
      }
    } else {
      setLoading(false);
    }
  }, []);

  const checkAdminStatus = async (userId: number) => {
    setChecking(true);
    try {
      const res = await fetch(`/api/admin/check?userId=${userId}`);
      const data = await res.json();
      setIsAdmin(data.isAdmin);
    } catch {
      setIsAdmin(false);
    } finally {
      setLoading(false);
      setChecking(false);
    }
  };

  const promoteToAdmin = async () => {
    if (!currentUser) return;
    try {
      // Seed admin data (this auto-promotes first user to super_admin)
      await fetch("/api/admin/seed", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id }),
      });
      setIsAdmin(true);
    } catch (err) {
      console.error("Failed to setup admin:", err);
    }
  };

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

  // Logged in but not admin — offer setup
  if (!isAdmin) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-100 dark:bg-gray-900 px-4">
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow-lg p-8 max-w-md w-full text-center">
          <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <Shield className="w-8 h-8 text-purple-600" />
          </div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-2">Admin Setup</h1>
          <p className="text-gray-500 mb-2">
            Signed in as <span className="font-semibold text-gray-900 dark:text-white">{currentUser.name}</span>
          </p>
          <p className="text-gray-500 text-sm mb-6">
            Click below to activate admin access and seed default feature flags, integrations, and settings.
          </p>
          <div className="space-y-3">
            <button
              onClick={promoteToAdmin}
              className="w-full inline-flex items-center justify-center gap-2 px-6 py-3 bg-purple-600 text-white rounded-xl font-semibold hover:bg-purple-700 transition-colors"
            >
              <Shield className="w-4 h-4" />
              Activate Admin Access
            </button>
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
      onBack={() => {
        window.location.href = "/";
      }}
    />
  );
}
