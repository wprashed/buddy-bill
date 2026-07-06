"use client";

import { useState, useEffect, useCallback } from "react";
import { User, Group } from "@/lib/types";
import Avatar from "./Avatar";
import Modal from "./Modal";
import GroupView from "./GroupView";
import {
  Plus,
  Users,
  LogOut,
  Wallet,
  FolderOpen,
  UserPlus,
  ChevronRight,
} from "lucide-react";

interface DashboardProps {
  currentUser: User;
  onLogout: () => void;
}

export default function Dashboard({ currentUser, onLogout }: DashboardProps) {
  const [groups, setGroups] = useState<Group[]>([]);
  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [selectedGroup, setSelectedGroup] = useState<Group | null>(null);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [showAddUser, setShowAddUser] = useState(false);
  const [loading, setLoading] = useState(true);

  // Create group form
  const [newGroupName, setNewGroupName] = useState("");
  const [newGroupDesc, setNewGroupDesc] = useState("");
  const [selectedMembers, setSelectedMembers] = useState<number[]>([]);

  // Add user form
  const [newUserName, setNewUserName] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("");

  const fetchData = useCallback(async () => {
    try {
      const [groupsRes, usersRes] = await Promise.all([
        fetch(`/api/groups?userId=${currentUser.id}`),
        fetch("/api/users"),
      ]);
      const [groupsData, usersData] = await Promise.all([
        groupsRes.json(),
        usersRes.json(),
      ]);
      setGroups(groupsData);
      setAllUsers(usersData);
    } catch (err) {
      console.error("Failed to fetch data:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser.id]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

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

  const toggleMember = (userId: number) => {
    setSelectedMembers((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

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
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-30">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 bg-primary-600 rounded-xl flex items-center justify-center">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <h1 className="text-xl font-bold text-gray-900">SplitEase</h1>
          </div>
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2">
              <Avatar name={currentUser.name} color={currentUser.avatarColor} size="sm" />
              <span className="text-sm font-medium text-gray-700 hidden sm:inline">
                {currentUser.name}
              </span>
            </div>
            <button
              onClick={onLogout}
              className="p-2 rounded-lg hover:bg-gray-100 transition-colors text-gray-500"
              title="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Quick Actions */}
        <div className="grid grid-cols-2 gap-3 mb-8">
          <button
            onClick={() => setShowCreateGroup(true)}
            className="flex items-center gap-3 p-4 bg-primary-600 text-white rounded-2xl hover:bg-primary-700 transition-all shadow-lg shadow-primary-500/20"
          >
            <div className="w-10 h-10 bg-white/20 rounded-xl flex items-center justify-center">
              <Plus className="w-5 h-5" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm">New Group</div>
              <div className="text-xs text-primary-200">Create a group</div>
            </div>
          </button>
          <button
            onClick={() => setShowAddUser(true)}
            className="flex items-center gap-3 p-4 bg-white border border-gray-200 rounded-2xl hover:border-primary-300 hover:bg-primary-50 transition-all"
          >
            <div className="w-10 h-10 bg-primary-100 rounded-xl flex items-center justify-center">
              <UserPlus className="w-5 h-5 text-primary-600" />
            </div>
            <div className="text-left">
              <div className="font-semibold text-sm text-gray-900">Add Friend</div>
              <div className="text-xs text-gray-500">Register a user</div>
            </div>
          </button>
        </div>

        {/* Groups */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-gray-900 flex items-center gap-2">
              <Users className="w-5 h-5 text-primary-600" />
              My Groups
            </h2>
            <span className="text-sm text-gray-500">{groups.length} group{groups.length !== 1 ? "s" : ""}</span>
          </div>

          {loading ? (
            <div className="text-center py-12">
              <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-500 mt-3 text-sm">Loading groups...</p>
            </div>
          ) : groups.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-2xl border border-gray-200">
              <FolderOpen className="w-12 h-12 text-gray-300 mx-auto mb-3" />
              <h3 className="text-lg font-semibold text-gray-900 mb-1">No groups yet</h3>
              <p className="text-gray-500 text-sm mb-4">
                Create your first group to start splitting expenses
              </p>
              <button
                onClick={() => setShowCreateGroup(true)}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-primary-600 text-white rounded-xl text-sm font-semibold hover:bg-primary-700 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Create Group
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              {groups.map((group) => (
                <button
                  key={group.id}
                  onClick={() => setSelectedGroup(group)}
                  className="w-full flex items-center gap-4 p-4 bg-white rounded-2xl border border-gray-200 hover:border-primary-300 hover:shadow-md transition-all text-left group"
                >
                  <div className="w-12 h-12 bg-primary-100 rounded-xl flex items-center justify-center shrink-0">
                    <Users className="w-6 h-6 text-primary-600" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 truncate">{group.name}</h3>
                    {group.description && (
                      <p className="text-sm text-gray-500 truncate">{group.description}</p>
                    )}
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-400 group-hover:text-primary-500 transition-colors" />
                </button>
              ))}
            </div>
          )}
        </div>

        {/* All Users */}
        {allUsers.length > 0 && (
          <div>
            <h2 className="text-lg font-bold text-gray-900 mb-4 flex items-center gap-2">
              <UserPlus className="w-5 h-5 text-primary-600" />
              All Users
            </h2>
            <div className="bg-white rounded-2xl border border-gray-200 divide-y divide-gray-100">
              {allUsers.map((user) => (
                <div key={user.id} className="flex items-center gap-3 p-3.5">
                  <Avatar name={user.name} color={user.avatarColor} size="sm" />
                  <div className="flex-1 min-w-0">
                    <div className="font-medium text-gray-900 text-sm truncate">
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
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Group Name</label>
            <input
              type="text"
              value={newGroupName}
              onChange={(e) => setNewGroupName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50 text-gray-900"
              placeholder="e.g., Weekend Trip"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description (optional)</label>
            <input
              type="text"
              value={newGroupDesc}
              onChange={(e) => setNewGroupDesc(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50 text-gray-900"
              placeholder="Short description"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Add Members</label>
            <div className="space-y-2 max-h-48 overflow-y-auto">
              {allUsers
                .filter((u) => u.id !== currentUser.id)
                .map((user) => (
                  <label
                    key={user.id}
                    className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                      selectedMembers.includes(user.id) ? "bg-primary-50 border border-primary-200" : "bg-gray-50 border border-transparent hover:bg-gray-100"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={selectedMembers.includes(user.id)}
                      onChange={() => toggleMember(user.id)}
                      className="w-4 h-4 text-primary-600 rounded"
                    />
                    <Avatar name={user.name} color={user.avatarColor} size="sm" />
                    <span className="text-sm font-medium text-gray-900">{user.name}</span>
                  </label>
                ))}
              {allUsers.filter((u) => u.id !== currentUser.id).length === 0 && (
                <p className="text-sm text-gray-500 py-3 text-center">
                  No other users yet. Add friends first!
                </p>
              )}
            </div>
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
          >
            Create Group
          </button>
        </form>
      </Modal>

      {/* Add User Modal */}
      <Modal isOpen={showAddUser} onClose={() => setShowAddUser(false)} title="Add New Friend">
        <form onSubmit={handleAddUser} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Full Name</label>
            <input
              type="text"
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50 text-gray-900"
              placeholder="Jane Smith"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Email Address</label>
            <input
              type="email"
              value={newUserEmail}
              onChange={(e) => setNewUserEmail(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50 text-gray-900"
              placeholder="jane@example.com"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">
              Password <span className="text-gray-400 font-normal">(optional)</span>
            </label>
            <input
              type="password"
              value={newUserPassword}
              onChange={(e) => setNewUserPassword(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50 text-gray-900"
              placeholder="Set a password for them"
              minLength={6}
            />
            <p className="text-xs text-gray-400 mt-1">
              If left blank, the default password will be <span className="font-mono bg-gray-100 px-1 rounded">changeme123</span>
            </p>
          </div>
          <button
            type="submit"
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors"
          >
            Add Friend
          </button>
        </form>
      </Modal>
    </div>
  );
}
