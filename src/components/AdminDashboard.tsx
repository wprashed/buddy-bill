"use client";

import { useState, useEffect, useCallback } from "react";
import { User, FeatureFlag, Integration, SystemSetting, AdminAuditLog, AdminStats } from "@/lib/types";
import Avatar from "./Avatar";
import Modal from "./Modal";
import {
  LayoutDashboard, ToggleLeft, ToggleRight, Plug, Settings, Users, Shield, Activity,
  Plus, Trash2, Save, Search, RefreshCw, ArrowLeft,
  TrendingUp, DollarSign, Layers, CheckCircle, XCircle, AlertCircle
} from "lucide-react";

interface AdminDashboardProps {
  currentUser: User;
  sessionToken: string;
  onBack: () => void;
}

type TabType = "overview" | "features" | "integrations" | "settings" | "users" | "audit";

export default function AdminDashboard({ currentUser, sessionToken, onBack }: AdminDashboardProps) {
  const [activeTab, setActiveTab] = useState<TabType>("overview");
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [features, setFeatures] = useState<FeatureFlag[]>([]);
  const [integrations, setIntegrations] = useState<Integration[]>([]);
  const [settings, setSettings] = useState<SystemSetting[]>([]);
  const [auditLogs, setAuditLogs] = useState<AdminAuditLog[]>([]);
  const [users, setUsers] = useState<Array<User & { isAdmin: boolean; adminRole: string | null }>>([]);
  const [usersPagination, setUsersPagination] = useState({ page: 1, totalPages: 1, total: 0 });
  const [notice, setNotice] = useState<{ type: "success" | "error"; message: string } | null>(null);
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);

  const [showAddFeature, setShowAddFeature] = useState(false);
  const [showAddIntegration, setShowAddIntegration] = useState(false);
  const [showEditIntegration, setShowEditIntegration] = useState(false);
  const [showAddSetting, setShowAddSetting] = useState(false);
  const [editingIntegration, setEditingIntegration] = useState<Integration | null>(null);

  const [searchQuery, setSearchQuery] = useState("");

  // Form states
  const [newFeature, setNewFeature] = useState({ key: "", name: "", description: "", category: "general" });
  const [newIntegration, setNewIntegration] = useState({ key: "", name: "", description: "", category: "payment" });
  const [integrationConfig, setIntegrationConfig] = useState<Record<string, string>>({});
  const [newSetting, setNewSetting] = useState({ key: "", value: "", type: "string", category: "general", description: "" });
  const [settingDrafts, setSettingDrafts] = useState<Record<string, string>>({});

  const isDark = currentUser.darkMode;
  const adminHeaders = {
    "Content-Type": "application/json",
    "x-session-token": sessionToken,
  };

  const fetchData = useCallback(async () => {
    setLoading(true);
    setNotice(null);
    try {
      const [statsRes, featuresRes, integrationsRes, settingsRes, auditRes, usersRes] = await Promise.all([
        fetch("/api/admin", { headers: { "x-session-token": sessionToken } }),
        fetch("/api/admin/features", { headers: { "x-session-token": sessionToken } }),
        fetch("/api/admin/integrations", { headers: { "x-session-token": sessionToken } }),
        fetch("/api/admin/settings", { headers: { "x-session-token": sessionToken } }),
        fetch("/api/admin/audit?limit=50", { headers: { "x-session-token": sessionToken } }),
        fetch("/api/admin/users?page=1&limit=20", { headers: { "x-session-token": sessionToken } }),
      ]);

      const failed = [statsRes, featuresRes, integrationsRes, settingsRes, auditRes, usersRes].find((res) => !res.ok);
      if (failed) {
        throw new Error(failed.status === 403 ? "Your admin session has expired. Please sign in again." : "Could not load admin data.");
      }

      const [statsData, featuresData, integrationsData, settingsData, auditData, usersData] = await Promise.all([
        statsRes.json(),
        featuresRes.json(),
        integrationsRes.json(),
        settingsRes.json(),
        auditRes.json(),
        usersRes.json(),
      ]);

      setStats(statsData);
      setFeatures(Array.isArray(featuresData) ? featuresData : []);
      setIntegrations(Array.isArray(integrationsData) ? integrationsData : []);
      setSettings(Array.isArray(settingsData) ? settingsData : []);
      setAuditLogs(Array.isArray(auditData) ? auditData : []);
      setUsers(usersData.users || []);
      setUsersPagination(usersData.pagination || { page: 1, totalPages: 1, total: 0 });
      setSettingDrafts(
        Array.isArray(settingsData)
          ? Object.fromEntries(settingsData.map((setting: SystemSetting) => [setting.key, setting.value || ""]))
          : {}
      );
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Failed to fetch admin data:", err);
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Could not load admin data.",
      });
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    void Promise.resolve().then(fetchData);
  }, [fetchData]);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", isDark);
  }, [isDark]);

  useEffect(() => {
    void Promise.resolve().then(() => setSearchQuery(""));
  }, [activeTab]);

  const runAction = async (key: string, successMessage: string, action: () => Promise<void>) => {
    setBusyAction(key);
    setNotice(null);
    try {
      await action();
      setNotice({ type: "success", message: successMessage });
    } catch (err) {
      console.error(err);
      setNotice({
        type: "error",
        message: err instanceof Error ? err.message : "Something went wrong. Please try again.",
      });
    } finally {
      setBusyAction(null);
    }
  };

  const assertOk = async (res: Response) => {
    if (res.ok) return;
    const body = await res.json().catch(() => null);
    throw new Error(body?.error || "Request failed.");
  };

  const toggleFeature = async (flagId: number, enabled: boolean) => {
    await runAction(`feature-${flagId}`, `Feature ${enabled ? "enabled" : "disabled"}.`, async () => {
      const res = await fetch("/api/admin/features", {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify({ flagId, enabled }),
      });
      await assertOk(res);
      setFeatures((prev) => prev.map((f) => (f.id === flagId ? { ...f, enabled } : f)));
    });
  };

  const toggleIntegration = async (integrationId: number, enabled: boolean) => {
    await runAction(`integration-${integrationId}`, `Integration ${enabled ? "enabled" : "disabled"}.`, async () => {
      const res = await fetch("/api/admin/integrations", {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify({ integrationId, enabled }),
      });
      await assertOk(res);
      setIntegrations((prev) => prev.map((i) => (i.id === integrationId ? { ...i, enabled } : i)));
    });
  };

  const handleAddFeature = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAction("add-feature", "Feature flag added.", async () => {
      const res = await fetch("/api/admin/features", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ ...newFeature, enabled: true }),
      });
      await assertOk(res);
      setShowAddFeature(false);
      setNewFeature({ key: "", name: "", description: "", category: "general" });
      await fetchData();
    });
  };

  const handleDeleteFeature = async (flagId: number) => {
    if (!confirm("Delete this feature flag?")) return;
    await runAction(`delete-feature-${flagId}`, "Feature flag deleted.", async () => {
      const res = await fetch(`/api/admin/features?flagId=${flagId}`, { method: "DELETE", headers: { "x-session-token": sessionToken } });
      await assertOk(res);
      await fetchData();
    });
  };

  const handleAddIntegration = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAction("add-integration", "Integration added.", async () => {
      const res = await fetch("/api/admin/integrations", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ ...newIntegration, enabled: false }),
      });
      await assertOk(res);
      setShowAddIntegration(false);
      setNewIntegration({ key: "", name: "", description: "", category: "payment" });
      await fetchData();
    });
  };

  const handleConfigureIntegration = (integration: Integration) => {
    setEditingIntegration(integration);
    setIntegrationConfig((integration.config as Record<string, string>) || {});
    setShowEditIntegration(true);
  };

  const handleSaveIntegrationConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingIntegration) return;
    await runAction("save-integration", "Integration configuration saved.", async () => {
      const res = await fetch("/api/admin/integrations", {
        method: "PATCH",
        headers: adminHeaders,
        body: JSON.stringify({ integrationId: editingIntegration.id, config: integrationConfig }),
      });
      await assertOk(res);
      setShowEditIntegration(false);
      setEditingIntegration(null);
      setIntegrationConfig({});
      await fetchData();
    });
  };

  const handleDeleteIntegration = async (integrationId: number) => {
    if (!confirm("Delete this integration?")) return;
    await runAction(`delete-integration-${integrationId}`, "Integration deleted.", async () => {
      const res = await fetch(`/api/admin/integrations?integrationId=${integrationId}`, { method: "DELETE", headers: { "x-session-token": sessionToken } });
      await assertOk(res);
      await fetchData();
    });
  };

  const handleAddSetting = async (e: React.FormEvent) => {
    e.preventDefault();
    await runAction("add-setting", "Setting added.", async () => {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify(newSetting),
      });
      await assertOk(res);
      setShowAddSetting(false);
      setNewSetting({ key: "", value: "", type: "string", category: "general", description: "" });
      await fetchData();
    });
  };

  const handleUpdateSetting = async (key: string, value: string) => {
    await runAction(`setting-${key}`, "Setting saved.", async () => {
      const res = await fetch("/api/admin/settings", {
        method: "POST",
        headers: adminHeaders,
        body: JSON.stringify({ key, value }),
      });
      await assertOk(res);
      setSettings((prev) => prev.map((s) => (s.key === key ? { ...s, value } : s)));
    });
  };

  const handleDeleteSetting = async (key: string) => {
    if (!confirm("Delete this setting?")) return;
    await runAction(`delete-setting-${key}`, "Setting deleted.", async () => {
      const res = await fetch(`/api/admin/settings?key=${key}`, { method: "DELETE", headers: { "x-session-token": sessionToken } });
      await assertOk(res);
      await fetchData();
    });
  };

  const seedAdminData = async () => {
    await runAction("seed", "Default admin data seeded.", async () => {
      const res = await fetch("/api/admin/seed", {
        method: "POST",
        headers: adminHeaders,
      });
      await assertOk(res);
      await fetchData();
    });
  };

  const filteredFeatures = features.filter(
    (f) => f.name.toLowerCase().includes(searchQuery.toLowerCase()) || f.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredIntegrations = integrations.filter(
    (i) => i.name.toLowerCase().includes(searchQuery.toLowerCase()) || i.key.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const groupedFeatures = filteredFeatures.reduce((acc, feature) => {
    const cat = feature.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(feature);
    return acc;
  }, {} as Record<string, FeatureFlag[]>);

  const groupedIntegrations = filteredIntegrations.reduce((acc, integration) => {
    const cat = integration.category || "other";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(integration);
    return acc;
  }, {} as Record<string, Integration[]>);

  const groupedSettings = settings.reduce((acc, setting) => {
    const cat = setting.category || "general";
    if (!acc[cat]) acc[cat] = [];
    acc[cat].push(setting);
    return acc;
  }, {} as Record<string, SystemSetting[]>);

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleString("en-US", {
      month: "short", day: "numeric", hour: "2-digit", minute: "2-digit",
    });
  };

  const tabs: { key: TabType; label: string; description: string; icon: React.ElementType; count?: number }[] = [
    { key: "overview", label: "Overview", description: "System health and activity", icon: LayoutDashboard },
    { key: "features", label: "Features", description: "Feature flags by category", icon: ToggleRight, count: features.length },
    { key: "integrations", label: "Integrations", description: "Payment and notification providers", icon: Plug, count: integrations.length },
    { key: "settings", label: "Settings", description: "Runtime configuration", icon: Settings, count: settings.length },
    { key: "users", label: "Users", description: "Accounts and admin roles", icon: Users, count: usersPagination.total },
    { key: "audit", label: "Audit Log", description: "Recent admin changes", icon: Activity, count: auditLogs.length },
  ];

  const activeTabConfig = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
  const enabledFeatureCount = features.filter((feature) => feature.enabled).length;
  const enabledIntegrationCount = integrations.filter((integration) => integration.enabled).length;
  const hasSearch = activeTab === "features" || activeTab === "integrations";

  if (loading) {
    return (
      <div className={`min-h-screen ${isDark ? "dark bg-gray-900" : "bg-gray-50"}`}>
        <div className="max-w-7xl mx-auto px-4 py-8 space-y-4">
          <div className="h-14 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg animate-pulse" />
          <div className="grid grid-cols-1 lg:grid-cols-[15rem_1fr] gap-4">
            <div className="h-72 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg animate-pulse" />
            <div className="space-y-4">
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
                {[1, 2, 3, 4].map((item) => (
                  <div key={item} className="h-28 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg animate-pulse" />
                ))}
              </div>
              <div className="h-80 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg animate-pulse" />
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "dark bg-gray-900" : "bg-gray-100"}`}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-900 border-b border-gray-200 dark:border-gray-800">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
            <div className="flex items-center gap-3 min-w-0">
              <button
                onClick={onBack}
                className="p-2 text-gray-500 hover:text-gray-900 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-white dark:hover:bg-gray-800 rounded-lg"
                aria-label="Back to app"
              >
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-10 h-10 bg-gray-900 dark:bg-primary-600 rounded-lg flex items-center justify-center shrink-0">
                  <Shield className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <h1 className="text-xl font-semibold text-gray-900 dark:text-white">Admin Dashboard</h1>
                  <p className="text-sm text-gray-500 dark:text-gray-400 truncate">Manage product controls, users, and system configuration</p>
                </div>
              </div>
            </div>
            <div className="flex items-center justify-between md:justify-end gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-medium text-gray-900 dark:text-white">{currentUser.name}</span>
                <span className="text-xs text-gray-500 dark:text-gray-400">
                  {lastUpdated ? `Updated ${lastUpdated.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}` : "Ready"}
                </span>
              </div>
              <button
                onClick={seedAdminData}
                disabled={busyAction === "seed"}
                className="flex items-center gap-2 px-3 py-2 bg-gray-900 hover:bg-gray-800 disabled:opacity-60 dark:bg-gray-800 dark:hover:bg-gray-700 text-white rounded-lg text-sm font-medium"
              >
                <RefreshCw className={`w-4 h-4 ${busyAction === "seed" ? "animate-spin" : ""}`} />
                Seed Data
              </button>
              <Avatar name={currentUser.name} color={currentUser.avatarColor} size="sm" />
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 py-6">
        {notice && (
          <div
            className={`mb-4 flex items-start gap-3 rounded-lg border px-4 py-3 text-sm ${
              notice.type === "success"
                ? "border-green-200 bg-green-50 text-green-800 dark:border-green-900/50 dark:bg-green-900/20 dark:text-green-200"
                : "border-red-200 bg-red-50 text-red-800 dark:border-red-900/50 dark:bg-red-900/20 dark:text-red-200"
            }`}
          >
            {notice.type === "success" ? <CheckCircle className="w-4 h-4 mt-0.5 shrink-0" /> : <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" />}
            <span className="flex-1">{notice.message}</span>
            <button onClick={() => setNotice(null)} className="text-current/70 hover:text-current" aria-label="Dismiss message">
              <XCircle className="w-4 h-4" />
            </button>
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-[15rem_1fr] gap-6">
          {/* Sidebar */}
          <div className="lg:w-60">
            <nav className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden lg:sticky lg:top-4">
              {tabs.map((tab) => (
                <button
                  key={tab.key}
                  onClick={() => setActiveTab(tab.key)}
                  className={`w-full flex items-center gap-3 px-4 py-3 text-left text-sm transition-colors ${
                    activeTab === tab.key
                      ? "bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-200 border-l-2 border-primary-600"
                      : "text-gray-600 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-700"
                  }`}
                >
                  <tab.icon className="w-4 h-4 shrink-0" />
                  <span className="flex-1 min-w-0">
                    <span className="block font-medium">{tab.label}</span>
                    <span className="hidden sm:block text-xs text-gray-500 dark:text-gray-400 truncate">{tab.description}</span>
                  </span>
                  {tab.count !== undefined && (
                    <span className="px-2 py-0.5 text-xs rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
                      {tab.count}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 min-w-0">
            <div className="mb-5 flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900 dark:text-white">{activeTabConfig.label}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{activeTabConfig.description}</p>
              </div>
              {hasSearch && (
                <div className="relative w-full md:w-80">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder={`Search ${activeTabConfig.label.toLowerCase()}...`}
                    className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg text-sm"
                  />
                </div>
              )}
            </div>

            {/* Overview Tab */}
            {activeTab === "overview" && stats && (
              <div className="space-y-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-blue-100 dark:bg-blue-900/30 rounded-lg flex items-center justify-center">
                        <Users className="w-5 h-5 text-blue-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalUsers}</p>
                        <p className="text-xs text-gray-500">Total Users</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-lg flex items-center justify-center">
                        <Layers className="w-5 h-5 text-green-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.totalGroups}</p>
                        <p className="text-xs text-gray-500">Total Groups</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-purple-100 dark:bg-purple-900/30 rounded-lg flex items-center justify-center">
                        <DollarSign className="w-5 h-5 text-purple-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">${stats.totalExpenseAmount.toFixed(0)}</p>
                        <p className="text-xs text-gray-500">Total Expenses</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 bg-orange-100 dark:bg-orange-900/30 rounded-lg flex items-center justify-center">
                        <TrendingUp className="w-5 h-5 text-orange-600" />
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-gray-900 dark:text-white">{stats.activeUsersToday}</p>
                        <p className="text-xs text-gray-500">Active Today</p>
                      </div>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Quick Stats</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">New users (7 days)</span>
                        <span className="font-medium text-gray-900 dark:text-white">{stats.newUsersThisWeek}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total expenses</span>
                        <span className="font-medium text-gray-900 dark:text-white">{stats.totalExpenses}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Total settlements</span>
                        <span className="font-medium text-gray-900 dark:text-white">{stats.totalSettlements}</span>
                      </div>
                    </div>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-xl p-5 border border-gray-200 dark:border-gray-700">
                    <h3 className="font-semibold text-gray-900 dark:text-white mb-4">Feature Status</h3>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Enabled features</span>
                        <span className="font-medium text-green-600">{features.filter(f => f.enabled).length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Disabled features</span>
                        <span className="font-medium text-gray-500">{features.filter(f => !f.enabled).length}</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <span className="text-sm text-gray-600 dark:text-gray-400">Active integrations</span>
                        <span className="font-medium text-blue-600">{integrations.filter(i => i.enabled).length}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Features Tab */}
            {activeTab === "features" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowAddFeature(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Feature
                  </button>
                </div>

                {Object.entries(groupedFeatures).map(([category, categoryFeatures]) => (
                  <div key={category} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 dark:text-white capitalize">{category}</h3>
                        <span className="text-xs text-gray-500">{categoryFeatures.filter((feature) => feature.enabled).length} enabled</span>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {categoryFeatures.map((feature) => (
                        <div key={feature.id} className="flex flex-col gap-3 px-4 py-3 sm:flex-row sm:items-center sm:justify-between">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900 dark:text-white">{feature.name}</p>
                              <code className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded">
                                {feature.key}
                              </code>
                            </div>
                            {feature.description && (
                              <p className="text-sm text-gray-500 mt-0.5">{feature.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-3">
                            <button
                              onClick={() => toggleFeature(feature.id, !feature.enabled)}
                              disabled={busyAction === `feature-${feature.id}`}
                              aria-label={`${feature.enabled ? "Disable" : "Enable"} ${feature.name}`}
                              className={`relative w-12 h-6 rounded-full transition-colors ${
                                feature.enabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                              } ${busyAction === `feature-${feature.id}` ? "opacity-60" : ""}`}
                            >
                              <div
                                className={`absolute top-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${
                                  feature.enabled ? "translate-x-6" : "translate-x-0.5"
                                }`}
                              />
                            </button>
                            <button
                              onClick={() => handleDeleteFeature(feature.id)}
                              disabled={busyAction === `delete-feature-${feature.id}`}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              aria-label={`Delete ${feature.name}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {filteredFeatures.length === 0 && (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <ToggleLeft className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No feature flags found</p>
                    <button
                      onClick={seedAdminData}
                      className="mt-3 text-primary-600 text-sm font-medium hover:text-primary-700"
                    >
                      Seed default features
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Integrations Tab */}
            {activeTab === "integrations" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowAddIntegration(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Integration
                  </button>
                </div>

                {Object.entries(groupedIntegrations).map(([category, categoryIntegrations]) => (
                  <div key={category}>
                    <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3 capitalize">
                      {category}
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {categoryIntegrations.map((integration) => (
                        <div
                          key={integration.id}
                          className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4"
                        >
                          <div className="flex items-start gap-3">
                            <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-lg flex items-center justify-center shrink-0">
                              {integration.iconUrl ? (
                                <img src={integration.iconUrl} alt="" className="w-6 h-6" />
                              ) : (
                                <Plug className="w-5 h-5 text-gray-400" />
                              )}
                            </div>
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between">
                                <h4 className="font-medium text-gray-900 dark:text-white">{integration.name}</h4>
                                <button
                                  onClick={() => toggleIntegration(integration.id, !integration.enabled)}
                                  disabled={busyAction === `integration-${integration.id}`}
                                  aria-label={`${integration.enabled ? "Disable" : "Enable"} ${integration.name}`}
                                  className={`relative w-10 h-5 rounded-full transition-colors ${
                                    integration.enabled ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                                  } ${busyAction === `integration-${integration.id}` ? "opacity-60" : ""}`}
                                >
                                  <div
                                    className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                      integration.enabled ? "translate-x-5" : "translate-x-0.5"
                                    }`}
                                  />
                                </button>
                              </div>
                              {integration.description && (
                                <p className="text-xs text-gray-500 mt-1">{integration.description}</p>
                              )}
                              <div className="flex items-center gap-2 mt-2">
                                <button
                                  onClick={() => handleConfigureIntegration(integration)}
                                  className="text-xs text-primary-600 font-medium hover:text-primary-700"
                                >
                                  Configure
                                </button>
                                <span className="text-gray-300">•</span>
                                <button
                                  onClick={() => handleDeleteIntegration(integration.id)}
                                  disabled={busyAction === `delete-integration-${integration.id}`}
                                  className="text-xs text-red-500 font-medium hover:text-red-600"
                                >
                                  Delete
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {filteredIntegrations.length === 0 && (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <Plug className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No integrations found</p>
                    <button
                      onClick={seedAdminData}
                      className="mt-3 text-primary-600 text-sm font-medium hover:text-primary-700"
                    >
                      Seed default integrations
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Settings Tab */}
            {activeTab === "settings" && (
              <div className="space-y-4">
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowAddSetting(true)}
                    className="flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg text-sm font-medium hover:bg-primary-700"
                  >
                    <Plus className="w-4 h-4" />
                    Add Setting
                  </button>
                </div>

                {Object.entries(groupedSettings).map(([category, categorySettings]) => (
                  <div key={category} className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
                      <div className="flex items-center justify-between">
                        <h3 className="font-semibold text-gray-900 dark:text-white capitalize">{category}</h3>
                        <span className="text-xs text-gray-500">{categorySettings.length} settings</span>
                      </div>
                    </div>
                    <div className="divide-y divide-gray-100 dark:divide-gray-700">
                      {categorySettings.map((setting) => (
                        <div key={setting.id} className="flex flex-col gap-3 px-4 py-3 lg:flex-row lg:items-center">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2">
                              <code className="text-sm font-medium text-gray-900 dark:text-white">{setting.key}</code>
                              <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-1.5 py-0.5 rounded">
                                {setting.type}
                              </span>
                            </div>
                            {setting.description && (
                              <p className="text-xs text-gray-500 mt-0.5">{setting.description}</p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {setting.type === "boolean" ? (
                              <button
                                onClick={() => handleUpdateSetting(setting.key, setting.value === "true" ? "false" : "true")}
                                disabled={busyAction === `setting-${setting.key}`}
                                className={`relative w-10 h-5 rounded-full transition-colors ${
                                  setting.value === "true" ? "bg-green-500" : "bg-gray-300 dark:bg-gray-600"
                                } ${busyAction === `setting-${setting.key}` ? "opacity-60" : ""}`}
                                aria-label={`${setting.value === "true" ? "Disable" : "Enable"} ${setting.key}`}
                              >
                                <div
                                  className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-transform ${
                                    setting.value === "true" ? "translate-x-5" : "translate-x-0.5"
                                  }`}
                                />
                              </button>
                            ) : (
                              <input
                                type={setting.type === "number" ? "number" : "text"}
                                value={settingDrafts[setting.key] ?? setting.value ?? ""}
                                onChange={(e) => setSettingDrafts((prev) => ({ ...prev, [setting.key]: e.target.value }))}
                                onKeyDown={(e) => {
                                  if (e.key === "Enter") {
                                    handleUpdateSetting(setting.key, settingDrafts[setting.key] ?? "");
                                  }
                                }}
                                className="w-full sm:w-56 px-2 py-1.5 text-sm border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                              />
                            )}
                            {setting.type !== "boolean" && (
                              <button
                                onClick={() => handleUpdateSetting(setting.key, settingDrafts[setting.key] ?? "")}
                                disabled={(settingDrafts[setting.key] ?? "") === (setting.value || "") || busyAction === `setting-${setting.key}`}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded bg-gray-900 text-white hover:bg-gray-800 disabled:opacity-40 disabled:cursor-not-allowed dark:bg-gray-700 dark:hover:bg-gray-600"
                              >
                                <Save className="w-3 h-3" />
                                Save
                              </button>
                            )}
                            <button
                              onClick={() => handleDeleteSetting(setting.key)}
                              disabled={busyAction === `delete-setting-${setting.key}`}
                              className="p-1.5 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                              aria-label={`Delete ${setting.key}`}
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                ))}

                {settings.length === 0 && (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <Settings className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No settings configured</p>
                    <button
                      onClick={seedAdminData}
                      className="mt-3 text-primary-600 text-sm font-medium hover:text-primary-700"
                    >
                      Seed default settings
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Users Tab */}
            {activeTab === "users" && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Total users</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{usersPagination.total}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs text-gray-500 uppercase font-semibold">Admins</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{users.filter((user) => user.isAdmin).length}</p>
                  </div>
                  <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-4">
                    <p className="text-xs text-gray-500 uppercase font-semibold">New this week</p>
                    <p className="mt-1 text-2xl font-semibold text-gray-900 dark:text-white">{stats?.newUsersThisWeek ?? 0}</p>
                  </div>
                </div>

                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="overflow-x-auto">
                  <table className="w-full min-w-[680px]">
                    <thead className="bg-gray-50 dark:bg-gray-700/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">User</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Joined</th>
                        <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase">Role</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 dark:divide-gray-700">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-4 py-3">
                            <div className="flex items-center gap-3">
                              <Avatar name={user.name} color={user.avatarColor} size="sm" />
                              <span className="font-medium text-gray-900 dark:text-white">{user.name}</span>
                            </div>
                          </td>
                          <td className="px-4 py-3 text-sm text-gray-500">{user.email}</td>
                          <td className="px-4 py-3 text-sm text-gray-500">{formatDate(user.createdAt)}</td>
                          <td className="px-4 py-3">
                            {user.isAdmin ? (
                              <span className="inline-flex items-center gap-1 px-2 py-1 bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300 text-xs font-medium rounded-full">
                                <Shield className="w-3 h-3" />
                                {user.adminRole}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-400">User</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                  </div>
                </div>

                {usersPagination.totalPages > 1 && (
                  <div className="flex items-center justify-center gap-2">
                    <span className="text-sm text-gray-500">
                      Page {usersPagination.page} of {usersPagination.totalPages} ({usersPagination.total} users)
                    </span>
                  </div>
                )}
              </div>
            )}

            {/* Audit Log Tab */}
            {activeTab === "audit" && (
              <div className="space-y-4">
                <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
                  <div className="px-4 py-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700 flex items-center justify-between">
                    <span className="text-sm font-medium text-gray-900 dark:text-white">Latest admin activity</span>
                    <span className="text-xs text-gray-500">Last {auditLogs.length} events</span>
                  </div>
                  <div className="divide-y divide-gray-100 dark:divide-gray-700">
                    {auditLogs.map((log) => (
                      <div key={log.id} className="flex items-start gap-3 px-4 py-3">
                        <div className="w-8 h-8 bg-gray-100 dark:bg-gray-700 rounded-full flex items-center justify-center shrink-0">
                          <Activity className="w-4 h-4 text-gray-500" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-gray-900 dark:text-white">
                            <span className="font-medium">{log.adminUserName}</span>{" "}
                            <span className="text-gray-600 dark:text-gray-400">
                              {log.action.replace(/_/g, " ")}
                            </span>
                            {log.entityType && (
                              <span className="text-gray-500"> on {log.entityType}</span>
                            )}
                          </p>
                          <p className="text-xs text-gray-500 mt-0.5">
                            {formatDate(log.createdAt)}
                            {log.ipAddress && ` • ${log.ipAddress}`}
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {auditLogs.length === 0 && (
                  <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-xl border border-gray-200 dark:border-gray-700">
                    <Activity className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                    <p className="text-gray-500">No audit logs yet</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Add Feature Modal */}
      <Modal isOpen={showAddFeature} onClose={() => setShowAddFeature(false)} title="Add Feature Flag">
        <form onSubmit={handleAddFeature} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Key</label>
            <input
              type="text"
              value={newFeature.key}
              onChange={(e) => setNewFeature({ ...newFeature, key: e.target.value.toLowerCase().replace(/\s/g, "_") })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              placeholder="feature_key"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
            <input
              type="text"
              value={newFeature.name}
              onChange={(e) => setNewFeature({ ...newFeature, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Feature Name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <textarea
              value={newFeature.description}
              onChange={(e) => setNewFeature({ ...newFeature, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="What does this feature do?"
              rows={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
            <select
              value={newFeature.category}
              onChange={(e) => setNewFeature({ ...newFeature, category: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="general">General</option>
              <option value="ui">UI</option>
              <option value="expenses">Expenses</option>
              <option value="groups">Groups</option>
              <option value="notifications">Notifications</option>
              <option value="analytics">Analytics</option>
              <option value="gamification">Gamification</option>
              <option value="export">Export</option>
            </select>
          </div>
          <button type="submit" className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">
            Add Feature
          </button>
        </form>
      </Modal>

      {/* Add Integration Modal */}
      <Modal isOpen={showAddIntegration} onClose={() => setShowAddIntegration(false)} title="Add Integration">
        <form onSubmit={handleAddIntegration} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Key</label>
            <input
              type="text"
              value={newIntegration.key}
              onChange={(e) => setNewIntegration({ ...newIntegration, key: e.target.value.toLowerCase().replace(/\s/g, "_") })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              placeholder="integration_key"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Name</label>
            <input
              type="text"
              value={newIntegration.name}
              onChange={(e) => setNewIntegration({ ...newIntegration, name: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Integration Name"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
            <select
              value={newIntegration.category}
              onChange={(e) => setNewIntegration({ ...newIntegration, category: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="payment">Payment</option>
              <option value="communication">Communication</option>
              <option value="auth">Authentication</option>
              <option value="email">Email</option>
              <option value="sms">SMS</option>
              <option value="banking">Banking</option>
              <option value="other">Other</option>
            </select>
          </div>
          <button type="submit" className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">
            Add Integration
          </button>
        </form>
      </Modal>

      {/* Configure Integration Modal */}
      <Modal isOpen={showEditIntegration} onClose={() => { setShowEditIntegration(false); setEditingIntegration(null); }} title={`Configure ${editingIntegration?.name || ""}`}>
        <form onSubmit={handleSaveIntegrationConfig} className="space-y-4">
          <p className="text-sm text-gray-500">Enter the configuration values for this integration:</p>
          
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">API Key</label>
            <input
              type="password"
              value={integrationConfig.apiKey || ""}
              onChange={(e) => setIntegrationConfig({ ...integrationConfig, apiKey: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              placeholder="Enter API key..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">API Secret</label>
            <input
              type="password"
              value={integrationConfig.apiSecret || ""}
              onChange={(e) => setIntegrationConfig({ ...integrationConfig, apiSecret: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              placeholder="Enter API secret..."
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Webhook URL (optional)</label>
            <input
              type="url"
              value={integrationConfig.webhookUrl || ""}
              onChange={(e) => setIntegrationConfig({ ...integrationConfig, webhookUrl: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="https://..."
            />
          </div>
          <button type="submit" className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">
            Save Configuration
          </button>
        </form>
      </Modal>

      {/* Add Setting Modal */}
      <Modal isOpen={showAddSetting} onClose={() => setShowAddSetting(false)} title="Add Setting">
        <form onSubmit={handleAddSetting} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Key</label>
            <input
              type="text"
              value={newSetting.key}
              onChange={(e) => setNewSetting({ ...newSetting, key: e.target.value.toLowerCase().replace(/\s/g, "_") })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              placeholder="setting_key"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Value</label>
            <input
              type="text"
              value={newSetting.value}
              onChange={(e) => setNewSetting({ ...newSetting, value: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Value"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Type</label>
              <select
                value={newSetting.type}
                onChange={(e) => setNewSetting({ ...newSetting, type: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="string">String</option>
                <option value="number">Number</option>
                <option value="boolean">Boolean</option>
                <option value="json">JSON</option>
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
              <select
                value={newSetting.category}
                onChange={(e) => setNewSetting({ ...newSetting, category: e.target.value })}
                className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="general">General</option>
                <option value="branding">Branding</option>
                <option value="limits">Limits</option>
                <option value="security">Security</option>
                <option value="auth">Authentication</option>
                <option value="localization">Localization</option>
                <option value="support">Support</option>
                <option value="system">System</option>
              </select>
            </div>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <input
              type="text"
              value={newSetting.description}
              onChange={(e) => setNewSetting({ ...newSetting, description: e.target.value })}
              className="w-full px-4 py-2.5 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="What does this setting control?"
            />
          </div>
          <button type="submit" className="w-full py-2.5 bg-primary-600 text-white rounded-lg font-medium hover:bg-primary-700">
            Add Setting
          </button>
        </form>
      </Modal>
    </div>
  );
}
