"use client";

import { useState, useEffect, useCallback } from "react";
import { User, Group, DashboardStats, Activity, Achievement, Nudge } from "@/lib/types";
import Avatar from "./Avatar";
import Modal from "./Modal";
import GroupView from "./GroupView";
import StatsPanel from "./StatsPanel";
import SettingsPanel from "./SettingsPanel";
import AdminDashboard from "./AdminDashboard";
import {
  Plus, Users, LogOut, HandCoins, FolderOpen, UserPlus, ChevronRight, BarChart3, Settings,
  Moon, Sun, Bell, Award, Link2, Archive, Search, Activity as ActivityIcon, X, Shield
} from "lucide-react";

interface DashboardProps {
  currentUser: User;
  sessionToken: string;
  onLogout: () => void;
  onUserUpdate: (user: User) => void;
}

export default function Dashboard({ currentUser, sessionToken, onLogout, onUserUpdate }: DashboardProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [showJoinGroup, setShowJoinGroup] = useState(false);
  const [showStats, setShowStats] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showAchievements, setShowAchievements] = useState(false);
  const [showActivities, setShowActivities] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [showArchived, setShowArchived] = useState(false);

  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");

  const [inviteCode, setInviteCode] = useState("");
  const [joinError, setJoinError] = useState("");

  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [achievements, setAchievements] = useState<Achievement[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [nudges, setNudges] = useState<Nudge[]>([]);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdminDashboard, setShowAdminDashboard] = useState(false);

  const isDark = currentUser.darkMode;

  const fetchData = useCallback(async () => {
    try {
      const [groupsRes, usersRes, statsRes, achievementsRes, activitiesRes, nudgesRes] = await Promise.all([
        fetch(`/api/groups?userId=${currentUser.id}&includeArchived=${showArchived}`),
        fetch("/api/users"),
        fetch(`/api/stats?userId=${currentUser.id}`),
        fetch(`/api/users/${currentUser.id}/achievements`),
        fetch(`/api/activities?userId=${currentUser.id}&limit=20`),
        fetch(`/api/nudges?userId=${currentUser.id}`),
      ]);
      
      const [groupsData, usersData, statsData, achievementsData, activitiesData, nudgesData] = await Promise.all([
        groupsRes.json(),
        usersRes.json(),
        statsRes.json(),
        achievementsRes.json(),
        activitiesRes.json(),
        nudgesRes.json(),
      ]);

      setGroups(groupsData);
      setAllUsers(usersData);
      setStats(statsData);
      setAchievements(achievementsData);
      setActivities(activitiesData);
      setNudges(nudgesData.filter((n: Nudge) => !n.read));
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id, showArchived]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Check if user is admin
  useEffect(() => {
    const checkAdmin = async () => {
      try {
        const res = await fetch(`/api/admin/check?userId=${currentUser.id}`);
        const data = await res.json();
        setIsAdmin(data.isAdmin);
      } catch (err) {
        console.error("Failed to check admin status:", err);
      }
    };
    checkAdmin();
  }, [currentUser.id]);

  const handleCreateGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/groups", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newGroupName,
          description: newGroupDesc,
          createdBy: currentUser.id,
          memberIds: selectedMembers,
        }),
      });
      setShowCreateGroup(false);
      setNewGroupName("");
      setNewGroupDesc("");
      setSelectedMembers([]);
      fetchData();
    } catch (err) {
      console.error("Failed to create group:", err);
    }
  };

  const handleAddUser = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/users", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: newUserName,
          email: newUserEmail,
          password: newUserPassword || undefined,
        }),
      });
      setShowAddUser(false);
      setNewUserName("");
      setNewUserEmail("");
      setNewUserPassword("");
      fetchData();
    } catch (err) {
      console.error("Failed to add user:", err);
    }
  };

  const handleJoinGroup = async (e: React.FormEvent) => {
    e.preventDefault();
    setJoinError("");
    try {
      const res = await fetch("/api/groups/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode, userId: currentUser.id }),
      });
      const data = await res.json();
      if (!res.ok) {
        setJoinError(data.error);
        return;
      }
      setShowJoinGroup(false);
      setInviteCode("");
      fetchData();
    } catch (err) {
      setJoinError("Failed to join group");
    }
  };

  const toggleDarkMode = async () => {
    const newValue = !currentUser.darkMode;
    await fetch(`/api/users/${currentUser.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ darkMode: newValue }),
    });
    onUserUpdate({ ...currentUser, darkMode: newValue });
  };

  const toggleMember = (userId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (g.description?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  const unlockedAchievements = achievements.filter(a => a.unlockedAt);

  if (showAdminDashboard && isAdmin) {
    return (
      <AdminDashboard
        currentUser={currentUser}
        onBack={() => setShowAdminDashboard(false)}
      />
    );
  }

  if (selectedGroup) {
    return (
      <GroupView
        group={selectedGroup}
        currentUser={currentUser}
        allUsers={allUsers}
        onBack={() => {
          setSelectedGroup(null);
          fetchData();
        }}
      />
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "dark bg-gray-900" : "bg-gray-50"}`}>
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
              <HandCoins className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900 dark:text-white">BuddyBill</h1>
          </div>
          <div className="flex items-center gap-2">
            {nudges.length > 0 && (
              <button className="relative p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500">
                <Bell className="w-5 h-5" />
                <span className="absolute top-1 right-1 w-2 h-2 bg-red-500 rounded-full" />
              </button>
            )}
            <button
              onClick={toggleDarkMode}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            >
              {isDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
            <button
              onClick={() => setShowSettings(true)}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
            >
              <Settings className="w-5 h-5" />
            </button>
            {isAdmin && (
              <button
                onClick={() => setShowAdminDashboard(true)}
                className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-purple-600"
                title="Admin Dashboard"
              >
                <Shield className="w-5 h-5" />
              </button>
            )}
            <div className="flex items-center gap-2 ml-2">
              <Avatar name={currentUser.name} color={currentUser.avatarColor} size="sm" />
              <span className="text-sm font-medium text-gray-700 dark:text-gray-300 hidden sm:inline">
                {currentUser.name}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-500"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Stats Summary */}
        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">You&apos;re owed</p>
              <p className="text-xl font-bold text-green-600">${stats.totalOwed.toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">You owe</p>
              <p className="text-xl font-bold text-red-600">${stats.totalOwing.toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">This month</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">${stats.expensesThisMonth.toFixed(2)}</p>
            </div>
            <div className="bg-white dark:bg-gray-800 rounded-xl p-4 border border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-500 dark:text-gray-400">Groups</p>
              <p className="text-xl font-bold text-gray-900 dark:text-white">{stats.groupsCount}</p>
            </div>
          </div>
        )}

        {/* Quick Actions */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
          <button
            onClick={() => setShowCreateGroup(true)}
            className="flex items-center gap-3 p-4 bg-primary-600 text-white rounded-xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20"
          >
            <Plus className="w-5 h-5" />
            <span className="font-semibold text-sm">New Group</span>
          </button>
          <button
            onClick={() => setShowJoinGroup(true)}
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-300 transition-all"
          >
            <Link2 className="w-5 h-5 text-primary-600" />
            <span className="font-semibold text-sm text-gray-900 dark:text-white">Join Group</span>
          </button>
          <button
            onClick={() => setShowStats(true)}
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-300 transition-all"
          >
            <BarChart3 className="w-5 h-5 text-primary-600" />
            <span className="font-semibold text-sm text-gray-900 dark:text-white">Analytics</span>
          </button>
          <button
            onClick={() => setShowAchievements(true)}
            className="flex items-center gap-3 p-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-300 transition-all relative"
          >
            <Award className="w-5 h-5 text-primary-600" />
            <span className="font-semibold text-sm text-gray-900 dark:text-white">Badges</span>
            {unlockedAchievements.length > 0 && (
              <span className="absolute top-2 right-2 bg-yellow-400 text-yellow-900 text-xs font-bold px-1.5 py-0.5 rounded-full">
                {unlockedAchievements.length}
              </span>
            )}
          </button>
        </div>

        {/* Search and Filters */}
        <div className="flex items-center gap-3 mb-4">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search groups..."
              className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl text-sm text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
          <button
            onClick={() => setShowArchived(!showArchived)}
            className={`p-2.5 rounded-xl border transition-colors ${
              showArchived
                ? "bg-primary-50 border-primary-200 text-primary-600"
                : "bg-white dark:bg-gray-800 border-gray-200 dark:border-gray-700 text-gray-500"
            }`}
            title={showArchived ? "Hide archived" : "Show archived"}
          >
            <Archive className="w-4 h-4" />
          </button>
          <button
            onClick={() => setShowActivities(true)}
            className="p-2.5 rounded-xl bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 text-gray-500"
            title="Activity feed"
          >
            <ActivityIcon className="w-4 h-4" />
          </button>
        </div>

        {/* Groups */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 dark:text-white flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-600" />
              My Groups
            </h2>
            <button
              onClick={() => setShowAddUser(true)}
              className="text-sm text-primary-600 font-medium flex items-center gap-1 hover:text-primary-700"
            >
              <UserPlus className="w-4 h-4" />
              Add Friend
            </button>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-500 mt-3 text-sm">Loading groups...</p>
            </div>
          ) : filteredGroups.length === 0 ? (
            <div className="text-center py-16 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">
                {searchQuery ? "No groups found" : "No groups yet"}
              </h3>
              <p className="text-gray-500 text-sm mb-4">
                {searchQuery ? "Try a different search term" : "Create your first group to start splitting expenses"}
              </p>
              {!searchQuery && (
                <button
                  onClick={() => setShowCreateGroup(true)}
                  className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700"
                >
                  <Plus className="w-4 h-4" />
                  Create Group
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {filteredGroups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className={`w-full flex items-center gap-4 p-4 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 hover:border-primary-300 hover:shadow-md transition-all text-left group ${
                    group.archived ? "opacity-60" : ""
                  }`}
                >
                  <div className="w-12 h-12 bg-primary-100 dark:bg-primary-900/30 rounded-xl flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white truncate">{group.name}</h3>
                      {group.archived && (
                        <span className="text-xs bg-gray-100 dark:bg-gray-700 text-gray-500 px-2 py-0.5 rounded-full">
                          Archived
                        </span>
                      )}
                    </div>
                    {group.description && (
                      <p className="text-sm text-gray-500 truncate">{group.description}</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* All Users */}
        {allUsers.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 dark:text-white mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary-600" />
              All Users ({allUsers.length})
            </h2>
            <div className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 divide-y divide-gray-100 dark:divide-gray-700">
              {allUsers.slice(0, 10).map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3.5">
                  <Avatar name={user.name} color={user.avatarColor} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 dark:text-white text-sm truncate">
                      {user.name}
                      {user.id === currentUser.id && (
                        <span className="ml-2 text-xs bg-primary-100 text-primary-700 px-2 py-0.5 rounded-full">
                          You
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-500 truncate">{user.email}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* Create Group Modal */}
      <Modal isOpen={showCreateGroup} onClose={() => setShowCreateGroup(false)} title="Create New Group">
        <form onSubmit={handleCreateGroup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Group Name</label>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Weekend Trip"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description (optional)</label>
            <input
              type="text"
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Short description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Add Members</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {allUsers.filter((u) => u.id !== currentUser.id).map((user) => (
                <label
                  key={user.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                    selectedMembers.includes(user.id) ? "bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700" : "bg-gray-50 dark:bg-gray-700 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-600"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={selectedMembers.includes(user.id)}
                    onChange={() => toggleMember(user.id)}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <Avatar name={user.name} color={user.avatarColor} size="sm" />
                  <span className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</span>
                </label>
              ))}
              {allUsers.filter((u) => u.id !== currentUser.id).length === 0 && (
                <p className="text-sm text-gray-500 py-3 text-center">No other users yet. Add friends first!</p>
              )}
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700"
          >
            Create Group
          </button>
        </form>
      </Modal>

      {/* Join Group Modal */}
      <Modal isOpen={showJoinGroup} onClose={() => { setShowJoinGroup(false); setJoinError(""); }} title="Join Group">
        <form onSubmit={handleJoinGroup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Invite Code</label>
            <input
              type="text"
              value={inviteCode}
              onChange={(e) => setInviteCode(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white font-mono"
              placeholder="Enter invite code"
              required
            />
          </div>
          {joinError && (
            <div className="bg-danger-50 text-danger-600 text-sm p-3 rounded-xl">{joinError}</div>
          )}
          <button type="submit" className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700">
            Join Group
          </button>
        </form>
      </Modal>

      {/* Add User Modal */}
      <Modal isOpen={showAddUser} onClose={() => setShowAddUser(false)} title="Add New Friend">
        <form onSubmit={handleAddUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Full Name</label>
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Jane Smith"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Email Address</label>
            <input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="jane@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">
              Password <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Set a password"
              minLength={6}
            />
            <p className="text-xs text-gray-400 mt-1">
              Default: <span className="font-mono bg-gray-100 dark:bg-gray-600 px-1 rounded">changeme123</span>
            </p>
          </div>
          <button type="submit" className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700">
            Add Friend
          </button>
        </form>
      </Modal>

      {/* Stats Modal */}
      <Modal isOpen={showStats} onClose={() => setShowStats(false)} title="Analytics" size="lg">
        <StatsPanel stats={stats} userId={currentUser.id} />
      </Modal>

      {/* Settings Modal */}
      <Modal isOpen={showSettings} onClose={() => setShowSettings(false)} title="Settings" size="lg">
        <SettingsPanel
          user={currentUser}
          sessionToken={sessionToken}
          onUpdate={onUserUpdate}
          onLogout={onLogout}
        />
      </Modal>

      {/* Achievements Modal */}
      <Modal isOpen={showAchievements} onClose={() => setShowAchievements(false)} title="Achievements">
        <div className="space-y-3">
          {achievements.map((achievement) => (
            <div
              key={achievement.id}
              className={`flex items-center gap-4 p-4 rounded-xl border ${
                achievement.unlockedAt
                  ? "bg-yellow-50 dark:bg-yellow-900/20 border-yellow-200 dark:border-yellow-800"
                  : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 opacity-50"
              }`}
            >
              <div className="text-3xl">{achievement.icon}</div>
              <div className="flex-1">
                <h3 className="font-semibold text-gray-900 dark:text-white">{achievement.name}</h3>
                <p className="text-sm text-gray-500">{achievement.description}</p>
              </div>
              {achievement.unlockedAt && (
                <span className="text-xs text-yellow-600 dark:text-yellow-400 font-medium">Unlocked!</span>
              )}
            </div>
          ))}
          {achievements.length === 0 && (
            <p className="text-center text-gray-500 py-8">No achievements available yet</p>
          )}
        </div>
      </Modal>

      {/* Activities Modal */}
      <Modal isOpen={showActivities} onClose={() => setShowActivities(false)} title="Activity Feed">
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {activities.map((activity) => (
            <div key={activity.id} className="flex items-start gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl">
              <Avatar name={activity.userName} color={activity.userColor} size="sm" />
              <div className="flex-1 min-w-0">
                <p className="text-sm text-gray-900 dark:text-white">
                  <span className="font-medium">{activity.userName}</span>{" "}
                  {activity.action.replace(/_/g, " ")}
                </p>
                <p className="text-xs text-gray-500">
                  {new Date(activity.createdAt).toLocaleString()}
                </p>
              </div>
            </div>
          ))}
          {activities.length === 0 && (
            <p className="text-center text-gray-500 py-8">No recent activity</p>
          )}
        </div>
      </Modal>
    </div>
  );
}
