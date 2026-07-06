"use client";

import { useState, useEffect } from "react";
import { User } from "@/lib/types";
import LoginScreen from "@/components/LoginScreen";
import Dashboard from "@/components/Dashboard";

export default function Home() {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [sessionToken, setSessionToken] = useState<string>("");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const savedUser = localStorage.getItem("buddybill_user");
    const savedToken = localStorage.getItem("buddybill_token");
    
    if (savedUser && savedToken) {
      try {
        const user = JSON.parse(savedUser);
        setCurrentUser(user);
        setSessionToken(savedToken);
        
        // Apply dark mode
        if (user.darkMode) {
          document.documentElement.classList.add("dark");
        }
      } catch {
        localStorage.removeItem("buddybill_user");
        localStorage.removeItem("buddybill_token");
      }
    }
    setLoading(false);
  }, []);

  const handleLogin = (user: User, token: string) => {
    setCurrentUser(user);
    setSessionToken(token);
    localStorage.setItem("buddybill_user", JSON.stringify(user));
    localStorage.setItem("buddybill_token", token);
    
    if (user.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleLogout = async () => {
    if (sessionToken) {
      await fetch("/api/auth/logout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionToken }),
      });
    }
    
    setCurrentUser(null);
    setSessionToken("");
    localStorage.removeItem("buddybill_user");
    localStorage.removeItem("buddybill_token");
    document.documentElement.classList.remove("dark");
  };

  const handleUserUpdate = (user: User) => {
    setCurrentUser(user);
    localStorage.setItem("buddybill_user", JSON.stringify(user));
    
    if (user.darkMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={handleLogin} />;
  }

  return (
    <Dashboard
      currentUser={currentUser}
      sessionToken={sessionToken}
      onLogout={handleLogout}
      onUserUpdate={handleUserUpdate}
    />
  );
}
