"use client";

import { useState } from "react";
import { User } from "@/lib/types";
import { Users, LogIn, UserPlus, HandCoins, Eye, EyeOff, Lock, Mail, KeyRound } from "lucide-react";

interface LoginScreenProps {
  onLogin: (user: User, sessionToken: string) => void;
}

export default function LoginScreen({ onLogin }: LoginScreenProps) {
  const [mode, setMode] = useState<"login" | "register" | "reset">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [resetToken, setResetToken] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const switchMode = (newMode: "login" | "register" | "reset") => {
    setMode(newMode);
    setError("");
    setSuccess("");
    setPassword("");
    setConfirmPassword("");
    setResetToken("");
    setNewPassword("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    setSuccess("");

    try {
      if (mode === "reset") {
        if (resetToken && newPassword) {
          // Complete password reset
          if (newPassword.length < 6) {
            setError("Password must be at least 6 characters");
            setLoading(false);
            return;
          }
          const res = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ token: resetToken, newPassword }),
          });
          const data = await res.json();
          if (!res.ok) {
            setError(data.error);
          } else {
            setSuccess("Password reset successfully! You can now sign in.");
            setTimeout(() => switchMode("login"), 2000);
          }
        } else {
          // Request reset token
          const res = await fetch("/api/auth/reset-password", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ email }),
          });
          const data = await res.json();
          if (data.resetToken) {
            // In development, show the token
            setResetToken(data.resetToken);
            setSuccess("Reset token generated! In production, this would be emailed.");
          } else {
            setSuccess(data.message);
          }
        }
        setLoading(false);
        return;
      }

      if (mode === "register") {
        if (password.length < 6) {
          setError("Password must be at least 6 characters");
          setLoading(false);
          return;
        }
        if (password !== confirmPassword) {
          setError("Passwords do not match");
          setLoading(false);
          return;
        }
      }

      const endpoint = mode === "login" ? "/api/auth/login" : "/api/auth/register";
      const payload = mode === "login" ? { email, password } : { name, email, password };

      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Something went wrong. Please try again.");
        setLoading(false);
        return;
      }

      // Seed achievements (non-blocking, don't fail login if this errors)
      fetch("/api/seed", { method: "POST" }).catch(() => {});

      onLogin(data, data.sessionToken);
    } catch (err) {
      console.error("Auth error:", err);
      setError("Could not connect to the server. Check if the database is running.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gradient-to-br from-primary-600 via-primary-700 to-primary-900 px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-white/20 backdrop-blur-sm rounded-2xl mb-4">
            <HandCoins className="w-10 h-10 text-white" />
          </div>
          <h1 className="text-4xl font-extrabold text-white tracking-tight">BuddyBill</h1>
          <p className="text-primary-200 mt-2 text-lg">Bills between buddies, simplified</p>
        </div>

        <div className="bg-white rounded-2xl shadow-2xl p-8">
          {mode !== "reset" ? (
            <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
              <button
                type="button"
                onClick={() => switchMode("login")}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  mode === "login" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
              <button
                type="button"
                onClick={() => switchMode("register")}
                className={`flex-1 py-2.5 px-4 rounded-lg text-sm font-semibold transition-all flex items-center justify-center gap-2 ${
                  mode === "register" ? "bg-white text-primary-700 shadow-sm" : "text-gray-500 hover:text-gray-700"
                }`}
              >
                <UserPlus className="w-4 h-4" />
                Register
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-6">
              <KeyRound className="w-5 h-5 text-primary-600" />
              <h2 className="text-lg font-bold text-gray-900">Reset Password</h2>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-gray-900 bg-gray-50"
                  placeholder="John Doe"
                  required
                />
              </div>
            )}

            {(mode === "login" || mode === "register" || (mode === "reset" && !resetToken)) && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Mail className="w-4 h-4" />
                  </div>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="w-full pl-10 pr-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-gray-900 bg-gray-50"
                    placeholder="you@example.com"
                    required
                  />
                </div>
              </div>
            )}

            {mode === "reset" && resetToken && (
              <>
                <div className="bg-green-50 text-green-700 text-sm p-3 rounded-xl">
                  Reset token: <code className="bg-green-100 px-1 rounded">{resetToken}</code>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1.5">New Password</label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                      <Lock className="w-4 h-4" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-gray-900 bg-gray-50"
                      placeholder="Min 6 characters"
                      required
                      minLength={6}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((p) => !p)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
              </>
            )}

            {(mode === "login" || mode === "register") && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Password</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showPassword ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full pl-10 pr-11 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-gray-900 bg-gray-50"
                    placeholder={mode === "register" ? "Min 6 characters" : "Enter your password"}
                    required
                    minLength={mode === "register" ? 6 : 1}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
              </div>
            )}

            {mode === "register" && (
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Confirm Password</label>
                <div className="relative">
                  <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">
                    <Lock className="w-4 h-4" />
                  </div>
                  <input
                    type={showConfirm ? "text" : "password"}
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`w-full pl-10 pr-11 py-3 border rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none transition-all text-gray-900 bg-gray-50 ${
                      confirmPassword && confirmPassword !== password ? "border-red-300 bg-red-50/50" : "border-gray-200"
                    }`}
                    placeholder="Re-enter your password"
                    required
                    minLength={6}
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirm((p) => !p)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600"
                  >
                    {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <p className="text-xs text-red-500 mt-1">Passwords do not match</p>
                )}
              </div>
            )}

            {error && (
              <div className="bg-danger-50 text-danger-600 text-sm p-3 rounded-xl flex items-start gap-2">
                <span className="shrink-0 mt-0.5">⚠️</span>
                <span>{error}</span>
              </div>
            )}

            {success && (
              <div className="bg-success-50 text-success-600 text-sm p-3 rounded-xl flex items-start gap-2">
                <span className="shrink-0 mt-0.5">✅</span>
                <span>{success}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading || (mode === "register" && password !== confirmPassword)}
              className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed shadow-lg shadow-primary-500/30"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  Please wait...
                </span>
              ) : mode === "login" ? (
                "Sign In"
              ) : mode === "register" ? (
                "Create Account"
              ) : resetToken ? (
                "Reset Password"
              ) : (
                "Send Reset Link"
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-gray-100 text-center space-y-2">
            {mode === "login" && (
              <>
                <p className="text-sm text-gray-500">
                  Don&apos;t have an account?{" "}
                  <button type="button" onClick={() => switchMode("register")} className="text-primary-600 font-semibold hover:text-primary-700">
                    Register
                  </button>
                </p>
                <p className="text-sm text-gray-500">
                  <button type="button" onClick={() => switchMode("reset")} className="text-primary-600 font-semibold hover:text-primary-700">
                    Forgot password?
                  </button>
                </p>
              </>
            )}
            {mode === "register" && (
              <p className="text-sm text-gray-500">
                Already have an account?{" "}
                <button type="button" onClick={() => switchMode("login")} className="text-primary-600 font-semibold hover:text-primary-700">
                  Sign In
                </button>
              </p>
            )}
            {mode === "reset" && (
              <p className="text-sm text-gray-500">
                <button type="button" onClick={() => switchMode("login")} className="text-primary-600 font-semibold hover:text-primary-700">
                  ← Back to Sign In
                </button>
              </p>
            )}
          </div>
        </div>

        <p className="text-primary-300 text-center text-sm mt-6">
          <Users className="w-4 h-4 inline mr-1" />
          Split bills with friends &middot; Stay balanced
        </p>
      </div>
    </div>
  );
}
