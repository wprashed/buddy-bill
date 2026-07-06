"use client";

import { useState, useEffect } from "react";
import { User } from "@/lib/types";
import Avatar from "./Avatar";
import { Moon, Sun, Bell, BellOff, Smartphone, Trash2, LogOut, Palette } from "lucide-react";

interface SettingsPanelProps {
  user: User;
  sessionToken: string;
  onUpdate: (user: User) => void;
  onLogout: () => void;
}

interface Session {
  id: number;
  userAgent: string | null;
  ipAddress: string | null;
  lastActive: string;
  createdAt: string;
}

const AVATAR_COLORS = [
  "#6366f1", "#8b5cf6", "#ec4899", "#f43f5e", "#ef4444",
  "#f97316", "#eab308", "#22c55e", "#14b8a6", "#06b6d4",
  "#3b82f6", "#a855f7",
];

export default function SettingsPanel({ user, sessionToken, onUpdate, onLogout }: SettingsPanelProps) {
  const [sessions, setSessions] = useState<Session[]>([]);
  const [loading, setLoading] = useState(true);
  const [name, setName] = useState(user.name);
  const [showColorPicker, setShowColorPicker] = useState(false);

  useEffect(() => {
    fetchSessions();
  }, [user.id]);

  const fetchSessions = async () => {
    try {
      const res = await fetch(`/api/users/${user.id}/sessions`);
      const data = await res.json();
      setSessions(data);
    } catch (err) {
      console.error("Failed to fetch sessions:", err);
    } finally {
      setLoading(false);
    }
  };

  const updateSetting = async (key: string, value: unknown) => {
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ [key]: value }),
      });
      const updated = await res.json();
      onUpdate(updated);
    } catch (err) {
      console.error("Failed to update setting:", err);
    }
  };

  const revokeSession = async (sessionId: number) => {
    try {
      await fetch(`/api/users/${user.id}/sessions?sessionId=${sessionId}`, {
        method: "DELETE",
      });
      fetchSessions();
    } catch (err) {
      console.error("Failed to revoke session:", err);
    }
  };

  const revokeAllOtherSessions = async () => {
    try {
      await fetch(`/api/users/${user.id}/sessions?currentToken=${sessionToken}`, {
        method: "DELETE",
      });
      fetchSessions();
    } catch (err) {
      console.error("Failed to revoke sessions:", err);
    }
  };

  const handleNameUpdate = async () => {
    if (name.trim() && name !== user.name) {
      await updateSetting("name", name.trim());
    }
  };

  return (
    <div className="space-y-6">
      {/* Profile Section */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Profile
        </h3>
        <div className="bg-gray-50 dark:bg-gray-700 rounded-xl p-4">
          <div className="flex items-center gap-4 mb-4">
            <div className="relative">
              <Avatar name={user.name} color={user.avatarColor} size="lg" />
              <button
                onClick={() => setShowColorPicker(!showColorPicker)}
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-white dark:bg-gray-600 rounded-full border-2 border-gray-200 dark:border-gray-500 flex items-center justify-center shadow"
              >
                <Palette className="w-3 h-3 text-gray-500" />
              </button>
            </div>
            <div className="flex-1">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                onBlur={handleNameUpdate}
                className="font-semibold text-lg text-gray-900 dark:text-white bg-transparent border-b border-transparent hover:border-gray-300 focus:border-primary-500 outline-none w-full"
              />
              <p className="text-sm text-gray-500">{user.email}</p>
            </div>
          </div>
          
          {showColorPicker && (
            <div className="flex flex-wrap gap-2 pt-3 border-t border-gray-200 dark:border-gray-600">
              {AVATAR_COLORS.map((color) => (
                <button
                  key={color}
                  onClick={() => {
                    updateSetting("avatarColor", color);
                    setShowColorPicker(false);
                  }}
                  className={`w-8 h-8 rounded-full transition-transform hover:scale-110 ${
                    user.avatarColor === color ? "ring-2 ring-offset-2 ring-primary-500" : ""
                  }`}
                  style={{ backgroundColor: color }}
                />
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Preferences */}
      <div>
        <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
          Preferences
        </h3>
        <div className="space-y-2">
          <button
            onClick={() => updateSetting("darkMode", !user.darkMode)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              {user.darkMode ? <Moon className="w-5 h-5 text-primary-500" /> : <Sun className="w-5 h-5 text-yellow-500" />}
              <span className="font-medium text-gray-900 dark:text-white">Dark Mode</span>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors ${user.darkMode ? "bg-primary-500" : "bg-gray-300"}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${user.darkMode ? "translate-x-6 ml-0.5" : "translate-x-0.5"}`} />
            </div>
          </button>

          <button
            onClick={() => updateSetting("emailNotifications", !user.emailNotifications)}
            className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors"
          >
            <div className="flex items-center gap-3">
              {user.emailNotifications ? <Bell className="w-5 h-5 text-primary-500" /> : <BellOff className="w-5 h-5 text-gray-400" />}
              <span className="font-medium text-gray-900 dark:text-white">Email Notifications</span>
            </div>
            <div className={`w-12 h-6 rounded-full transition-colors ${user.emailNotifications ? "bg-primary-500" : "bg-gray-300"}`}>
              <div className={`w-5 h-5 bg-white rounded-full shadow transition-transform mt-0.5 ${user.emailNotifications ? "translate-x-6 ml-0.5" : "translate-x-0.5"}`} />
            </div>
          </button>
        </div>
      </div>

      {/* Sessions */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide">
            Active Sessions
          </h3>
          {sessions.length > 1 && (
            <button
              onClick={revokeAllOtherSessions}
              className="text-xs text-red-500 hover:text-red-600 font-medium"
            >
              Revoke all others
            </button>
          )}
        </div>
        
        {loading ? (
          <p className="text-sm text-gray-500 text-center py-4">Loading sessions...</p>
        ) : (
          <div className="space-y-2">
            {sessions.map((session) => (
              <div
                key={session.id}
                className="flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl"
              >
                <Smartphone className="w-5 h-5 text-gray-400 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-gray-900 dark:text-white truncate">
                    {session.userAgent?.split(" ")[0] || "Unknown Device"}
                  </p>
                  <p className="text-xs text-gray-500">
                    {session.ipAddress || "Unknown IP"} • Last active: {new Date(session.lastActive).toLocaleDateString()}
                  </p>
                </div>
                <button
                  onClick={() => revokeSession(session.id)}
                  className="p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Logout */}
      <button
        onClick={onLogout}
        className="w-full py-3 bg-red-50 dark:bg-red-900/20 text-red-600 dark:text-red-400 rounded-xl font-semibold hover:bg-red-100 dark:hover:bg-red-900/30 transition-colors flex items-center justify-center gap-2"
      >
        <LogOut className="w-4 h-4" />
        Sign Out
      </button>
    </div>
  );
}
