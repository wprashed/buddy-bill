"use client";

import { useState, useEffect, useCallback } from "react";
import { User, Group, GroupDetail, SplitType, ExpenseTemplate } from "@/lib/types";
import Avatar from "./Avatar";
import Modal from "./Modal";
import {
  ArrowLeft, Plus, Receipt, ArrowRightLeft, Users, TrendingUp, TrendingDown, UserPlus,
  DollarSign, Calendar, Tag, MessageSquare, Send, Trash2, Edit2, Copy, Link2, Archive,
  ArchiveRestore, Percent, Hash, PieChart, Save, FileText, Bell, ChevronDown, X
} from "lucide-react";

interface GroupViewProps {
  group: Group;
  currentUser: User;
  allUsers: User[];
  onBack: () => void;
}

const CATEGORIES = [
  "General", "Food & Drink", "Transport", "Groceries", "Entertainment",
  "Shopping", "Utilities", "Rent", "Travel", "Healthcare", "Other",
];

const CATEGORY_ICONS: Record<string, string> = {
  General: "📦", "Food & Drink": "🍔", Transport: "🚗", Groceries: "🛒",
  Entertainment: "🎬", Shopping: "🛍️", Utilities: "💡", Rent: "🏠",
  Travel: "✈️", Healthcare: "🏥", Other: "📌",
};

export default function GroupView({ group, currentUser, allUsers, onBack }: GroupViewProps) {
  const [data, setData] = useState<GroupDetail | null>(null);
  const [templates, setTemplates] = useState<ExpenseTemplate[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expenses" | "balances" | "settle">("expenses");
  
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showEditExpense, setShowEditExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);
  const [showInvite, setShowInvite] = useState(false);
  const [showTemplates, setShowTemplates] = useState(false);
  const [showSaveTemplate, setShowSaveTemplate] = useState(false);
  const [showNudge, setShowNudge] = useState(false);

  const [editingExpenseId, setEditingExpenseId] = useState<number | null>(null);
  const [commentText, setCommentText] = useState("");
  const [activeCommentExpense, setActiveCommentExpense] = useState<number | null>(null);

  // Expense form
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expPaidBy, setExpPaidBy] = useState(currentUser.id);
  const [expCategory, setExpCategory] = useState("General");
  const [expSplitType, setExpSplitType] = useState<SplitType>("equal");
  const [expSplitAmong, setExpSplitAmong] = useState<number[]>([]);
  const [expSplitDetails, setExpSplitDetails] = useState<Record<number, number>>({});

  // Settle form
  const [settleFrom, setSettleFrom] = useState(currentUser.id);
  const [settleTo, setSettleTo] = useState(0);
  const [settleAmount, setSettleAmount] = useState("");
  const [settleNote, setSettleNote] = useState("");
  const [settlePartial, setSettlePartial] = useState(false);

  // Add member
  const [addMemberUserId, setAddMemberUserId] = useState(0);

  // Template
  const [templateName, setTemplateName] = useState("");

  // Nudge
  const [nudgeUserId, setNudgeUserId] = useState(0);
  const [nudgeMessage, setNudgeMessage] = useState("");

  const [copiedInvite, setCopiedInvite] = useState(false);

  const fetchGroupData = useCallback(async () => {
    try {
      const [groupRes, templatesRes] = await Promise.all([
        fetch(`/api/groups/${group.id}`),
        fetch(`/api/groups/${group.id}/templates`),
      ]);
      const [groupData, templatesData] = await Promise.all([
        groupRes.json(),
        templatesRes.json(),
      ]);
      setData(groupData);
      setTemplates(templatesData);
      if (groupData.members) {
        setExpSplitAmong(groupData.members.map((m: User) => m.id));
      }
    } catch (err) {
      console.error("Failed to fetch group:", err);
    } finally {
      setLoading(false);
    }
  }, [group.id]);

  useEffect(() => {
    fetchGroupData();
  }, [fetchGroupData]);

  const resetExpenseForm = () => {
    setExpDesc("");
    setExpAmount("");
    setExpCategory("General");
    setExpPaidBy(currentUser.id);
    setExpSplitType("equal");
    setExpSplitDetails({});
    if (data?.members) {
      setExpSplitAmong(data.members.map((m) => m.id));
    }
  };

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const payload: Record<string, unknown> = {
        groupId: group.id,
        paidById: expPaidBy,
        description: expDesc,
        amount: expAmount,
        category: expCategory,
        splitType: expSplitType,
        splitAmong: expSplitAmong,
      };

      if (expSplitType !== "equal") {
        payload.splitDetails = expSplitAmong.map((uid) => ({
          userId: uid,
          value: expSplitDetails[uid] || 0,
        }));
      }

      const res = await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const result = await res.json();
      if (result.duplicate) {
        if (!confirm("This looks like a duplicate expense. Add anyway?")) {
          return;
        }
        // Force add by slightly modifying the description
        payload.description = expDesc + " ";
        await fetch("/api/expenses", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }

      setShowAddExpense(false);
      resetExpenseForm();
      fetchGroupData();
    } catch (err) {
      console.error("Failed to add expense:", err);
    }
  };

  const handleEditExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingExpenseId) return;

    try {
      const payload: Record<string, unknown> = {
        description: expDesc,
        amount: expAmount,
        category: expCategory,
        splitType: expSplitType,
        splitAmong: expSplitAmong,
        updatedBy: currentUser.id,
      };

      if (expSplitType !== "equal") {
        payload.splitDetails = expSplitAmong.map((uid) => ({
          userId: uid,
          value: expSplitDetails[uid] || 0,
        }));
      }

      await fetch(`/api/expenses/${editingExpenseId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      setShowEditExpense(false);
      setEditingExpenseId(null);
      resetExpenseForm();
      fetchGroupData();
    } catch (err) {
      console.error("Failed to edit expense:", err);
    }
  };

  const handleDeleteExpense = async (expenseId: number) => {
    if (!confirm("Are you sure you want to delete this expense?")) return;
    try {
      await fetch(`/api/expenses/${expenseId}?deletedBy=${currentUser.id}`, {
        method: "DELETE",
      });
      fetchGroupData();
    } catch (err) {
      console.error("Failed to delete expense:", err);
    }
  };

  const openEditExpense = (expense: { id: number; description: string; amount: string; category: string; splitType: string; paidById: number; splits: { userId: number; amount: string; percentage: string | null; shares: number | null }[] }) => {
    setEditingExpenseId(expense.id);
    setExpDesc(expense.description);
    setExpAmount(expense.amount);
    setExpCategory(expense.category || "General");
    setExpSplitType(expense.splitType as SplitType);
    setExpPaidBy(expense.paidById);
    setExpSplitAmong(expense.splits.map((s) => s.userId));
    
    const details: Record<number, number> = {};
    expense.splits.forEach((s) => {
      if (expense.splitType === "percentage") {
        details[s.userId] = parseFloat(s.percentage || "0");
      } else if (expense.splitType === "shares") {
        details[s.userId] = s.shares || 1;
      } else if (expense.splitType === "exact") {
        details[s.userId] = parseFloat(s.amount);
      }
    });
    setExpSplitDetails(details);
    setShowEditExpense(true);
  };

  const handleSettleUp = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/settlements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: group.id,
          fromUserId: settleFrom,
          toUserId: settleTo,
          amount: settleAmount,
          isPartial: settlePartial,
          note: settleNote || null,
        }),
      });
      setShowSettleUp(false);
      setSettleAmount("");
      setSettleNote("");
      setSettlePartial(false);
      fetchGroupData();
    } catch (err) {
      console.error("Failed to settle:", err);
    }
  };

  const handleAddMember = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`/api/groups/${group.id}/members`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: addMemberUserId }),
      });
      setShowAddMember(false);
      setAddMemberUserId(0);
      fetchGroupData();
    } catch (err) {
      console.error("Failed to add member:", err);
    }
  };

  const handleLeaveGroup = async () => {
    const balance = data?.balances[currentUser.id] || 0;
    if (Math.abs(balance) > 0.01) {
      alert("You have an outstanding balance. Please settle up before leaving.");
      return;
    }
    if (!confirm("Are you sure you want to leave this group?")) return;

    await fetch(`/api/groups/${group.id}/members?userId=${currentUser.id}`, {
      method: "DELETE",
    });
    onBack();
  };

  const handleArchiveGroup = async () => {
    await fetch(`/api/groups/${group.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ archived: !group.archived }),
    });
    onBack();
  };

  const handleAddComment = async (expenseId: number) => {
    if (!commentText.trim()) return;
    try {
      await fetch(`/api/expenses/${expenseId}/comments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: currentUser.id, content: commentText }),
      });
      setCommentText("");
      setActiveCommentExpense(null);
      fetchGroupData();
    } catch (err) {
      console.error("Failed to add comment:", err);
    }
  };

  const handleSaveTemplate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch(`/api/groups/${group.id}/templates`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: templateName,
          description: expDesc,
          amount: expAmount || null,
          category: expCategory,
          splitType: expSplitType,
          splitConfig: expSplitType !== "equal" ? expSplitDetails : null,
          createdBy: currentUser.id,
        }),
      });
      setShowSaveTemplate(false);
      setTemplateName("");
      fetchGroupData();
    } catch (err) {
      console.error("Failed to save template:", err);
    }
  };

  const applyTemplate = (template: ExpenseTemplate) => {
    setExpDesc(template.description);
    if (template.amount) setExpAmount(template.amount);
    setExpCategory(template.category || "General");
    setExpSplitType(template.splitType as SplitType);
    if (template.splitConfig) {
      setExpSplitDetails(template.splitConfig as Record<number, number>);
    }
    setShowTemplates(false);
  };

  const handleSendNudge = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const balance = data?.balances[nudgeUserId] || 0;
      await fetch("/api/nudges", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          fromUserId: currentUser.id,
          toUserId: nudgeUserId,
          groupId: group.id,
          amount: balance < 0 ? Math.abs(balance).toFixed(2) : null,
          message: nudgeMessage || null,
        }),
      });
      setShowNudge(false);
      setNudgeUserId(0);
      setNudgeMessage("");
      alert("Reminder sent!");
    } catch (err) {
      console.error("Failed to send nudge:", err);
    }
  };

  const copyInviteLink = () => {
    if (group.inviteCode) {
      navigator.clipboard.writeText(group.inviteCode);
      setCopiedInvite(true);
      setTimeout(() => setCopiedInvite(false), 2000);
    }
  };

  const toggleSplitMember = (userId: number) => {
    setExpSplitAmong((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const updateSplitDetail = (userId: number, value: number) => {
    setExpSplitDetails((prev) => ({ ...prev, [userId]: value }));
  };

  const getSimplifiedDebts = () => {
    if (!data) return [];
    const { balances, members } = data;
    const debts: { from: User; to: User; amount: number }[] = [];

    const debtors = members
      .filter((m) => (balances[m.id] || 0) < -0.01)
      .map((m) => ({ user: m, amount: Math.abs(balances[m.id] || 0) }))
      .sort((a, b) => b.amount - a.amount);

    const creditors = members
      .filter((m) => (balances[m.id] || 0) > 0.01)
      .map((m) => ({ user: m, amount: balances[m.id] || 0 }))
      .sort((a, b) => b.amount - a.amount);

    let i = 0, j = 0;
    while (i < debtors.length && j < creditors.length) {
      const amount = Math.min(debtors[i].amount, creditors[j].amount);
      if (amount > 0.01) {
        debts.push({ from: debtors[i].user, to: creditors[j].user, amount });
      }
      debtors[i].amount -= amount;
      creditors[j].amount -= amount;
      if (debtors[i].amount < 0.01) i++;
      if (creditors[j].amount < 0.01) j++;
    }
    return debts;
  };

  const formatDate = (dateStr: string) => {
    return new Date(dateStr).toLocaleDateString("en-US", {
      month: "short", day: "numeric", year: "numeric",
    });
  };

  const calculateSplitPreview = () => {
    const total = parseFloat(expAmount) || 0;
    if (expSplitType === "equal") {
      return expSplitAmong.length > 0 ? (total / expSplitAmong.length).toFixed(2) : "0.00";
    }
    return null;
  };

  const isDark = currentUser.darkMode;
  const totalExpenses = data?.expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
  const nonMembers = allUsers.filter((u) => !data?.members.some((m) => m.id === u.id));
  const simplifiedDebts = getSimplifiedDebts();
  const currentUserRole = data?.members.find((m) => m.id === currentUser.id)?.role;
  const isAdmin = currentUserRole === "admin";

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "dark bg-gray-900" : ""}`}>
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${isDark ? "dark bg-gray-900" : ""}`}>
        <p className="text-gray-500">Failed to load group data.</p>
      </div>
    );
  }

  return (
    <div className={`min-h-screen ${isDark ? "dark bg-gray-900" : "bg-gray-50"}`}>
      {/* Header */}
      <header className="bg-primary-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-3">
              <button onClick={onBack} className="p-1.5 rounded-lg hover:bg-white/10">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h1 className="text-xl font-bold truncate">{group.name}</h1>
              {group.archived && (
                <span className="text-xs bg-white/20 px-2 py-0.5 rounded-full">Archived</span>
              )}
            </div>
            <div className="flex items-center gap-2">
              <button onClick={() => setShowInvite(true)} className="p-2 hover:bg-white/10 rounded-lg">
                <Link2 className="w-4 h-4" />
              </button>
              {isAdmin && (
                <button onClick={handleArchiveGroup} className="p-2 hover:bg-white/10 rounded-lg">
                  {group.archived ? <ArchiveRestore className="w-4 h-4" /> : <Archive className="w-4 h-4" />}
                </button>
              )}
            </div>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-3 gap-3 mt-4">
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">${totalExpenses.toFixed(2)}</p>
              <p className="text-xs text-primary-200">Total Expenses</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{data.expenses.length}</p>
              <p className="text-xs text-primary-200">Transactions</p>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3 text-center">
              <p className="text-2xl font-bold">{data.members.length}</p>
              <p className="text-xs text-primary-200">Members</p>
            </div>
          </div>

          {/* Members */}
          <div className="flex items-center gap-2 mt-4 overflow-x-auto pb-1">
            {data.members.map((m) => (
              <div key={m.id} className="flex flex-col items-center gap-1 min-w-fit">
                <Avatar name={m.name} color={m.avatarColor} size="sm" />
                <span className="text-xs text-primary-200 whitespace-nowrap">
                  {m.id === currentUser.id ? "You" : m.name.split(" ")[0]}
                </span>
              </div>
            ))}
            <button onClick={() => setShowAddMember(true)} className="flex flex-col items-center gap-1 min-w-fit">
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <span className="text-xs text-primary-200">Add</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-0 z-20 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
        <div className="max-w-4xl mx-auto px-4 flex">
          {[
            { key: "expenses" as const, label: "Expenses", icon: Receipt },
            { key: "balances" as const, label: "Balances", icon: TrendingUp },
            { key: "settle" as const, label: "Settle", icon: ArrowRightLeft },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === key
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700 dark:hover:text-gray-300"
              }`}
            >
              <Icon className="w-4 h-4" />
              {label}
            </button>
          ))}
        </div>
      </div>

      <main className="max-w-4xl mx-auto px-4 py-6">
        {/* Expenses Tab */}
        {activeTab === "expenses" && (
          <div>
            <div className="flex gap-2 mb-4">
              <button
                onClick={() => { resetExpenseForm(); setShowAddExpense(true); }}
                className="flex-1 flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 shadow-lg shadow-primary-500/20"
              >
                <Plus className="w-5 h-5" />
                Add Expense
              </button>
              {templates.length > 0 && (
                <button
                  onClick={() => setShowTemplates(true)}
                  className="px-4 py-3 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-xl hover:border-primary-300"
                >
                  <FileText className="w-5 h-5 text-primary-600" />
                </button>
              )}
            </div>

            {data.expenses.length === 0 ? (
              <div className="text-center py-12 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700">
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-1">No expenses yet</h3>
                <p className="text-gray-500 text-sm">Add your first expense to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.expenses.map((expense) => {
                  const paidByMember = data.members.find((m) => m.id === expense.paidById);
                  const isExpanded = activeCommentExpense === expense.id;
                  
                  return (
                    <div key={expense.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4">
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gray-100 dark:bg-gray-700 rounded-xl flex items-center justify-center text-lg shrink-0">
                          {CATEGORY_ICONS[expense.category] || "📦"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-gray-900 dark:text-white">{expense.description}</h3>
                              <div className="flex items-center gap-2 mt-0.5 flex-wrap">
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Tag className="w-3 h-3" />{expense.category}
                                </span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />{formatDate(expense.createdAt)}
                                </span>
                                {expense.splitType !== "equal" && (
                                  <>
                                    <span className="text-xs text-gray-400">•</span>
                                    <span className="text-xs text-primary-500 capitalize">{expense.splitType} split</span>
                                  </>
                                )}
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-gray-900 dark:text-white text-lg">
                                ${parseFloat(expense.amount).toFixed(2)}
                              </p>
                              <div className="flex items-center gap-1 mt-1">
                                <button
                                  onClick={() => openEditExpense(expense)}
                                  className="p-1 text-gray-400 hover:text-primary-500"
                                >
                                  <Edit2 className="w-3 h-3" />
                                </button>
                                <button
                                  onClick={() => handleDeleteExpense(expense.id)}
                                  className="p-1 text-gray-400 hover:text-red-500"
                                >
                                  <Trash2 className="w-3 h-3" />
                                </button>
                              </div>
                            </div>
                          </div>
                          
                          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700">
                            <p className="text-sm text-gray-600 dark:text-gray-400">
                              <span className="font-medium" style={{ color: paidByMember?.avatarColor }}>
                                {expense.paidById === currentUser.id ? "You" : expense.paidByName}
                              </span>{" "}paid
                            </p>
                          </div>

                          {/* Comments */}
                          <div className="mt-2">
                            <button
                              onClick={() => setActiveCommentExpense(isExpanded ? null : expense.id)}
                              className="text-xs text-gray-500 flex items-center gap-1 hover:text-primary-500"
                            >
                              <MessageSquare className="w-3 h-3" />
                              {expense.comments?.length || 0} comment{(expense.comments?.length || 0) !== 1 ? "s" : ""}
                              <ChevronDown className={`w-3 h-3 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                            </button>
                            
                            {isExpanded && (
                              <div className="mt-2 space-y-2">
                                {expense.comments?.map((comment) => (
                                  <div key={comment.id} className="flex gap-2 pl-2 border-l-2 border-gray-200 dark:border-gray-600">
                                    <Avatar name={comment.userName} color={comment.userColor} size="xs" />
                                    <div>
                                      <p className="text-xs font-medium text-gray-900 dark:text-white">{comment.userName}</p>
                                      <p className="text-xs text-gray-600 dark:text-gray-400">{comment.content}</p>
                                    </div>
                                  </div>
                                ))}
                                <div className="flex gap-2 mt-2">
                                  <input
                                    type="text"
                                    value={commentText}
                                    onChange={(e) => setCommentText(e.target.value)}
                                    placeholder="Add a comment..."
                                    className="flex-1 text-xs px-3 py-2 border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                                    onKeyDown={(e) => e.key === "Enter" && handleAddComment(expense.id)}
                                  />
                                  <button
                                    onClick={() => handleAddComment(expense.id)}
                                    className="p-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
                                  >
                                    <Send className="w-3 h-3" />
                                  </button>
                                </div>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Balances Tab */}
        {activeTab === "balances" && (
          <div className="space-y-3">
            {data.members.map((member) => {
              const balance = data.balances[member.id] || 0;
              const isPositive = balance > 0.01;
              const isNegative = balance < -0.01;
              
              return (
                <div key={member.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
                  <Avatar name={member.name} color={member.avatarColor} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900 dark:text-white">
                      {member.id === currentUser.id ? "You" : member.name}
                    </h3>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                  <div className="text-right">
                    <p className={`font-bold text-lg ${isPositive ? "text-green-600" : isNegative ? "text-red-600" : "text-gray-500"}`}>
                      {isPositive && "+"}${balance.toFixed(2)}
                    </p>
                    <p className="text-xs text-gray-500">
                      {isPositive ? (
                        <span className="flex items-center gap-1 text-green-600 justify-end">
                          <TrendingUp className="w-3 h-3" /> gets back
                        </span>
                      ) : isNegative ? (
                        <span className="flex items-center gap-1 text-red-600 justify-end">
                          <TrendingDown className="w-3 h-3" /> owes
                        </span>
                      ) : "settled up"}
                    </p>
                  </div>
                  {isNegative && member.id !== currentUser.id && (
                    <button
                      onClick={() => { setNudgeUserId(member.id); setShowNudge(true); }}
                      className="p-2 text-gray-400 hover:text-primary-500 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg"
                      title="Send reminder"
                    >
                      <Bell className="w-4 h-4" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* Settle Tab */}
        {activeTab === "settle" && (
          <div>
            <button
              onClick={() => setShowSettleUp(true)}
              className="w-full mb-4 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 shadow-lg shadow-green-500/20"
            >
              <DollarSign className="w-5 h-5" />
              Record Payment
            </button>

            {simplifiedDebts.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Suggested Settlements
                </h3>
                <div className="space-y-3">
                  {simplifiedDebts.map((debt, i) => (
                    <div key={i} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
                      <Avatar name={debt.from.name} color={debt.from.avatarColor} size="sm" />
                      <div className="flex-1 text-center">
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-semibold">{debt.from.id === currentUser.id ? "You" : debt.from.name}</span>
                        </p>
                        <div className="flex items-center justify-center gap-2 my-1">
                          <div className="h-px bg-gray-300 dark:bg-gray-600 flex-1" />
                          <span className="font-bold text-primary-600 text-sm">${debt.amount.toFixed(2)}</span>
                          <ArrowRightLeft className="w-4 h-4 text-primary-500" />
                          <div className="h-px bg-gray-300 dark:bg-gray-600 flex-1" />
                        </div>
                        <p className="text-sm text-gray-600 dark:text-gray-400">
                          <span className="font-semibold">{debt.to.id === currentUser.id ? "You" : debt.to.name}</span>
                        </p>
                      </div>
                      <Avatar name={debt.to.name} color={debt.to.avatarColor} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 mb-6">
                <div className="text-4xl mb-2">🎉</div>
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">All settled up!</h3>
                <p className="text-gray-500 text-sm">No outstanding balances</p>
              </div>
            )}

            {data.settlements.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 dark:text-gray-400 uppercase tracking-wide mb-3">
                  Payment History
                </h3>
                <div className="space-y-3">
                  {data.settlements.map((s) => {
                    const fromUser = data.members.find((m) => m.id === s.fromUserId);
                    const toUser = data.members.find((m) => m.id === s.toUserId);
                    return (
                      <div key={s.id} className="bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 p-4 flex items-center gap-3">
                        <div className="w-10 h-10 bg-green-100 dark:bg-green-900/30 rounded-xl flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 dark:text-white text-sm">
                            <span className="font-semibold">{s.fromUserId === currentUser.id ? "You" : fromUser?.name}</span>
                            {" "}paid{" "}
                            <span className="font-semibold">{s.toUserId === currentUser.id ? "You" : toUser?.name}</span>
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(s.createdAt)}</p>
                          {s.note && <p className="text-xs text-gray-400 mt-1">{s.note}</p>}
                        </div>
                        <div className="text-right">
                          <p className="font-bold text-green-600">${parseFloat(s.amount).toFixed(2)}</p>
                          {s.isPartial && <span className="text-xs text-gray-400">Partial</span>}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="mt-6 flex justify-center">
              <button
                onClick={handleLeaveGroup}
                className="text-sm text-red-500 hover:text-red-600"
              >
                Leave Group
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Add Expense Modal */}
      <Modal isOpen={showAddExpense} onClose={() => setShowAddExpense(false)} title="Add Expense" size="lg">
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <input
              type="text"
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Dinner at restaurant"
              required
            />
          </div>
          
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount ($)</label>
              <input
                type="number"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="0.00"
                min="0.01"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Paid By</label>
            <select
              value={expPaidBy}
              onChange={(e) => setExpPaidBy(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl focus:ring-2 focus:ring-primary-500 bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {data.members.map((m) => (
                <option key={m.id} value={m.id}>{m.id === currentUser.id ? `${m.name} (You)` : m.name}</option>
              ))}
            </select>
          </div>

          {/* Split Type */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Split Type</label>
            <div className="grid grid-cols-4 gap-2">
              {[
                { type: "equal" as const, icon: Users, label: "Equal" },
                { type: "percentage" as const, icon: Percent, label: "%" },
                { type: "exact" as const, icon: DollarSign, label: "Exact" },
                { type: "shares" as const, icon: PieChart, label: "Shares" },
              ].map(({ type, icon: Icon, label }) => (
                <button
                  key={type}
                  type="button"
                  onClick={() => setExpSplitType(type)}
                  className={`p-3 rounded-xl border flex flex-col items-center gap-1 transition-colors ${
                    expSplitType === type
                      ? "bg-primary-50 dark:bg-primary-900/30 border-primary-300 dark:border-primary-700 text-primary-600"
                      : "bg-gray-50 dark:bg-gray-700 border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-gray-300"
                  }`}
                >
                  <Icon className="w-4 h-4" />
                  <span className="text-xs font-medium">{label}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Split Among */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">Split Among</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {data.members.map((member) => (
                <div
                  key={member.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl transition-colors ${
                    expSplitAmong.includes(member.id) ? "bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700" : "bg-gray-50 dark:bg-gray-700 border border-transparent"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={expSplitAmong.includes(member.id)}
                    onChange={() => toggleSplitMember(member.id)}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <Avatar name={member.name} color={member.avatarColor} size="sm" />
                  <span className="flex-1 text-sm font-medium text-gray-900 dark:text-white">
                    {member.id === currentUser.id ? `${member.name} (You)` : member.name}
                  </span>
                  
                  {expSplitType !== "equal" && expSplitAmong.includes(member.id) && (
                    <div className="flex items-center gap-1">
                      <input
                        type="number"
                        value={expSplitDetails[member.id] || ""}
                        onChange={(e) => updateSplitDetail(member.id, parseFloat(e.target.value) || 0)}
                        className="w-20 px-2 py-1 text-sm border border-gray-200 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-600 text-gray-900 dark:text-white"
                        placeholder={expSplitType === "percentage" ? "%" : expSplitType === "shares" ? "shares" : "$"}
                        min="0"
                        step={expSplitType === "exact" ? "0.01" : "1"}
                      />
                      <span className="text-xs text-gray-500">
                        {expSplitType === "percentage" ? "%" : expSplitType === "shares" ? "x" : "$"}
                      </span>
                    </div>
                  )}
                </div>
              ))}
            </div>
            {expSplitType === "equal" && expSplitAmong.length > 0 && expAmount && (
              <p className="text-xs text-gray-500 mt-2">Each person pays: ${calculateSplitPreview()}</p>
            )}
          </div>

          <div className="flex gap-2">
            <button
              type="submit"
              disabled={expSplitAmong.length === 0}
              className="flex-1 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50"
            >
              Add Expense
            </button>
            <button
              type="button"
              onClick={() => setShowSaveTemplate(true)}
              className="px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl hover:bg-gray-200 dark:hover:bg-gray-600"
              title="Save as template"
            >
              <Save className="w-5 h-5" />
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Expense Modal */}
      <Modal isOpen={showEditExpense} onClose={() => { setShowEditExpense(false); setEditingExpenseId(null); }} title="Edit Expense" size="lg">
        <form onSubmit={handleEditExpense} className="space-y-4">
          {/* Same form fields as Add Expense */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Description</label>
            <input
              type="text"
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount ($)</label>
              <input
                type="number"
                value={expAmount}
                onChange={(e) => setExpAmount(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
                min="0.01"
                step="0.01"
                required
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Category</label>
              <select
                value={expCategory}
                onChange={(e) => setExpCategory(e.target.value)}
                className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat} value={cat}>{CATEGORY_ICONS[cat]} {cat}</option>
                ))}
              </select>
            </div>
          </div>
          <button type="submit" className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700">
            Save Changes
          </button>
        </form>
      </Modal>

      {/* Settle Up Modal */}
      <Modal isOpen={showSettleUp} onClose={() => setShowSettleUp(false)} title="Record Payment">
        <form onSubmit={handleSettleUp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Who paid?</label>
            <select
              value={settleFrom}
              onChange={(e) => setSettleFrom(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              {data.members.map((m) => (
                <option key={m.id} value={m.id}>{m.id === currentUser.id ? `${m.name} (You)` : m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Paid to?</label>
            <select
              value={settleTo}
              onChange={(e) => setSettleTo(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value={0}>Select person...</option>
              {data.members.filter((m) => m.id !== settleFrom).map((m) => (
                <option key={m.id} value={m.id}>{m.id === currentUser.id ? `${m.name} (You)` : m.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Amount ($)</label>
            <input
              type="number"
              value={settleAmount}
              onChange={(e) => setSettleAmount(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Note (optional)</label>
            <input
              type="text"
              value={settleNote}
              onChange={(e) => setSettleNote(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Venmo payment"
            />
          </div>
          <label className="flex items-center gap-2 text-sm text-gray-700 dark:text-gray-300">
            <input
              type="checkbox"
              checked={settlePartial}
              onChange={(e) => setSettlePartial(e.target.checked)}
              className="w-4 h-4 text-primary-600 rounded"
            />
            This is a partial payment
          </label>
          <button
            type="submit"
            disabled={settleTo === 0}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 disabled:opacity-50"
          >
            Record Payment
          </button>
        </form>
      </Modal>

      {/* Add Member Modal */}
      <Modal isOpen={showAddMember} onClose={() => setShowAddMember(false)} title="Add Member">
        <form onSubmit={handleAddMember} className="space-y-4">
          {nonMembers.length > 0 ? (
            <>
              <div className="space-y-2 max-h-64 overflow-y-auto">
                {nonMembers.map((user) => (
                  <label
                    key={user.id}
                    className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                      addMemberUserId === user.id ? "bg-primary-50 dark:bg-primary-900/30 border border-primary-200 dark:border-primary-700" : "bg-gray-50 dark:bg-gray-700 border border-transparent hover:bg-gray-100 dark:hover:bg-gray-600"
                    }`}
                  >
                    <input
                      type="radio"
                      name="addMember"
                      checked={addMemberUserId === user.id}
                      onChange={() => setAddMemberUserId(user.id)}
                      className="w-4 h-4 text-primary-600"
                    />
                    <Avatar name={user.name} color={user.avatarColor} size="sm" />
                    <div>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</p>
                      <p className="text-xs text-gray-500">{user.email}</p>
                    </div>
                  </label>
                ))}
              </div>
              <button
                type="submit"
                disabled={addMemberUserId === 0}
                className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 disabled:opacity-50"
              >
                Add to Group
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">All users are already in this group.</p>
            </div>
          )}
        </form>
      </Modal>

      {/* Invite Modal */}
      <Modal isOpen={showInvite} onClose={() => setShowInvite(false)} title="Invite Members">
        <div className="text-center">
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">
            Share this invite code with friends to let them join the group:
          </p>
          <div className="bg-gray-100 dark:bg-gray-700 rounded-xl p-4 flex items-center justify-center gap-3">
            <code className="text-lg font-mono font-bold text-gray-900 dark:text-white">
              {group.inviteCode}
            </code>
            <button
              onClick={copyInviteLink}
              className={`p-2 rounded-lg transition-colors ${copiedInvite ? "bg-green-100 text-green-600" : "bg-gray-200 dark:bg-gray-600 text-gray-600 dark:text-gray-300 hover:bg-gray-300 dark:hover:bg-gray-500"}`}
            >
              {copiedInvite ? "✓" : <Copy className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </Modal>

      {/* Templates Modal */}
      <Modal isOpen={showTemplates} onClose={() => setShowTemplates(false)} title="Expense Templates">
        <div className="space-y-2">
          {templates.map((template) => (
            <button
              key={template.id}
              onClick={() => applyTemplate(template)}
              className="w-full flex items-center gap-3 p-3 bg-gray-50 dark:bg-gray-700 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-600 transition-colors text-left"
            >
              <div className="text-2xl">{CATEGORY_ICONS[template.category] || "📦"}</div>
              <div className="flex-1">
                <p className="font-medium text-gray-900 dark:text-white">{template.name}</p>
                <p className="text-xs text-gray-500">{template.description}</p>
              </div>
              {template.amount && (
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  ${template.amount}
                </span>
              )}
            </button>
          ))}
          {templates.length === 0 && (
            <p className="text-center text-gray-500 py-4">No templates saved yet</p>
          )}
        </div>
      </Modal>

      {/* Save Template Modal */}
      <Modal isOpen={showSaveTemplate} onClose={() => setShowSaveTemplate(false)} title="Save as Template">
        <form onSubmit={handleSaveTemplate} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Template Name</label>
            <input
              type="text"
              value={templateName}
              onChange={(e) => setTemplateName(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="e.g., Monthly Rent"
              required
            />
          </div>
          <button type="submit" className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700">
            Save Template
          </button>
        </form>
      </Modal>

      {/* Nudge Modal */}
      <Modal isOpen={showNudge} onClose={() => setShowNudge(false)} title="Send Reminder">
        <form onSubmit={handleSendNudge} className="space-y-4">
          <p className="text-sm text-gray-600 dark:text-gray-400">
            Send a friendly reminder to pay up!
          </p>
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">Message (optional)</label>
            <input
              type="text"
              value={nudgeMessage}
              onChange={(e) => setNudgeMessage(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 dark:border-gray-600 rounded-xl bg-gray-50 dark:bg-gray-700 text-gray-900 dark:text-white"
              placeholder="Hey, don't forget about..."
            />
          </div>
          <button type="submit" className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700">
            Send Reminder
          </button>
        </form>
      </Modal>
    </div>
  );
}
