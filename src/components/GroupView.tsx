"use client";

import { useState, useEffect, useCallback } from "react";
import { User, Group, GroupDetail } from "@/lib/types";
import Avatar from "./Avatar";
import Modal from "./Modal";
import {
  ArrowLeft,
  Plus,
  Receipt,
  ArrowRightLeft,
  Users,
  TrendingUp,
  TrendingDown,
  UserPlus,
  DollarSign,
  Calendar,
  Tag,
} from "lucide-react";

interface GroupViewProps {
  group: Group;
  currentUser: User;
  allUsers: User[];
  onBack: () => void;
}

const CATEGORIES = [
  "General",
  "Food & Drink",
  "Transport",
  "Groceries",
  "Entertainment",
  "Shopping",
  "Utilities",
  "Rent",
  "Travel",
  "Healthcare",
  "Other",
];

const CATEGORY_ICONS: Record<string, string> = {
  General: "📦",
  "Food & Drink": "🍔",
  Transport: "🚗",
  Groceries: "🛒",
  Entertainment: "🎬",
  Shopping: "🛍️",
  Utilities: "💡",
  Rent: "🏠",
  Travel: "✈️",
  Healthcare: "🏥",
  Other: "📌",
};

export default function GroupView({ group, currentUser, allUsers, onBack }: GroupViewProps) {
  const [data, setData] = useState<GroupDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<"expenses" | "balances" | "settle">("expenses");
  const [showAddExpense, setShowAddExpense] = useState(false);
  const [showAddMember, setShowAddMember] = useState(false);
  const [showSettleUp, setShowSettleUp] = useState(false);

  // Expense form
  const [expDesc, setExpDesc] = useState("");
  const [expAmount, setExpAmount] = useState("");
  const [expPaidBy, setExpPaidBy] = useState(currentUser.id);
  const [expCategory, setExpCategory] = useState("General");
  const [expSplitAmong, setExpSplitAmong] = useState<number[]>([]);

  // Settle form
  const [settleFrom, setSettleFrom] = useState(currentUser.id);
  const [settleTo, setSettleTo] = useState(0);
  const [settleAmount, setSettleAmount] = useState("");

  // Add member
  const [addMemberUserId, setAddMemberUserId] = useState(0);

  const fetchGroupData = useCallback(async () => {
    try {
      const res = await fetch(`/api/groups/${group.id}`);
      const groupData = await res.json();
      setData(groupData);
      // Initialize split among to all members
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

  const handleAddExpense = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await fetch("/api/expenses", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          groupId: group.id,
          paidById: expPaidBy,
          description: expDesc,
          amount: expAmount,
          category: expCategory,
          splitAmong: expSplitAmong,
        }),
      });
      setShowAddExpense(false);
      setExpDesc("");
      setExpAmount("");
      setExpCategory("General");
      setExpPaidBy(currentUser.id);
      fetchGroupData();
    } catch (err) {
      console.error("Failed to add expense:", err);
    }
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
        }),
      });
      setShowSettleUp(false);
      setSettleAmount("");
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

  const toggleSplitMember = (userId: number) => {
    setExpSplitAmong((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const getSimplifiedDebts = () => {
    if (!data) return [];
    const { balances, members } = data;
    const debts: { from: User; to: User; amount: number }[] = [];

    // Create arrays of debtors (negative balance) and creditors (positive balance)
    const debtors = members
      .filter((m) => (balances[m.id] || 0) < -0.01)
      .map((m) => ({ user: m, amount: Math.abs(balances[m.id] || 0) }))
      .sort((a, b) => b.amount - a.amount);

    const creditors = members
      .filter((m) => (balances[m.id] || 0) > 0.01)
      .map((m) => ({ user: m, amount: balances[m.id] || 0 }))
      .sort((a, b) => b.amount - a.amount);

    let i = 0;
    let j = 0;
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
    const date = new Date(dateStr);
    return date.toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const totalExpenses = data?.expenses.reduce((sum, e) => sum + parseFloat(e.amount), 0) || 0;
  const nonMembers = allUsers.filter(
    (u) => !data?.members.some((m) => m.id === u.id)
  );

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="w-8 h-8 border-4 border-primary-200 border-t-primary-600 rounded-full animate-spin"></div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <p className="text-gray-500">Failed to load group data.</p>
      </div>
    );
  }

  const simplifiedDebts = getSimplifiedDebts();

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-primary-600 text-white">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center gap-3 mb-3">
            <button
              onClick={onBack}
              className="p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h1 className="text-xl font-bold truncate">{group.name}</h1>
          </div>
          {group.description && (
            <p className="text-primary-200 text-sm ml-10">{group.description}</p>
          )}

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
            <button
              onClick={() => setShowAddMember(true)}
              className="flex flex-col items-center gap-1 min-w-fit"
            >
              <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center">
                <UserPlus className="w-4 h-4" />
              </div>
              <span className="text-xs text-primary-200">Add</span>
            </button>
          </div>
        </div>
      </header>

      {/* Tabs */}
      <div className="sticky top-0 z-20 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 flex">
          {[
            { key: "expenses" as const, label: "Expenses", icon: Receipt },
            { key: "balances" as const, label: "Balances", icon: TrendingUp },
            { key: "settle" as const, label: "Settle Up", icon: ArrowRightLeft },
          ].map(({ key, label, icon: Icon }) => (
            <button
              key={key}
              onClick={() => setActiveTab(key)}
              className={`flex-1 py-3 flex items-center justify-center gap-2 text-sm font-semibold border-b-2 transition-colors ${
                activeTab === key
                  ? "border-primary-600 text-primary-600"
                  : "border-transparent text-gray-500 hover:text-gray-700"
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
            <button
              onClick={() => setShowAddExpense(true)}
              className="w-full mb-4 flex items-center justify-center gap-2 py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors shadow-lg shadow-primary-500/20"
            >
              <Plus className="w-5 h-5" />
              Add Expense
            </button>

            {data.expenses.length === 0 ? (
              <div className="text-center py-12 bg-white rounded-2xl border border-gray-200">
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                <h3 className="text-lg font-semibold text-gray-900 mb-1">No expenses yet</h3>
                <p className="text-gray-500 text-sm">Add your first expense to get started</p>
              </div>
            ) : (
              <div className="space-y-3">
                {data.expenses.map((expense) => {
                  const paidByMember = data.members.find((m) => m.id === expense.paidById);
                  return (
                    <div
                      key={expense.id}
                      className="bg-white rounded-2xl border border-gray-200 p-4"
                    >
                      <div className="flex items-start gap-3">
                        <div className="w-10 h-10 bg-gray-100 rounded-xl flex items-center justify-center text-lg shrink-0">
                          {CATEGORY_ICONS[expense.category] || "📦"}
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <div>
                              <h3 className="font-semibold text-gray-900">{expense.description}</h3>
                              <div className="flex items-center gap-2 mt-0.5">
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Tag className="w-3 h-3" />
                                  {expense.category}
                                </span>
                                <span className="text-xs text-gray-400">•</span>
                                <span className="text-xs text-gray-500 flex items-center gap-1">
                                  <Calendar className="w-3 h-3" />
                                  {formatDate(expense.createdAt)}
                                </span>
                              </div>
                            </div>
                            <div className="text-right shrink-0">
                              <p className="font-bold text-gray-900 text-lg">
                                ${parseFloat(expense.amount).toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <div className="mt-2 pt-2 border-t border-gray-100">
                            <p className="text-sm text-gray-600">
                              <span className="font-medium" style={{ color: paidByMember?.avatarColor }}>
                                {expense.paidById === currentUser.id
                                  ? "You"
                                  : expense.paidByName}
                              </span>{" "}
                              paid &middot; Split among{" "}
                              {expense.splits.map((s, i) => (
                                <span key={s.id}>
                                  {i > 0 && ", "}
                                  <span className="font-medium">
                                    {s.userId === currentUser.id ? "You" : s.userName}
                                  </span>
                                  {" "}(${parseFloat(s.amount).toFixed(2)})
                                </span>
                              ))}
                            </p>
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
                <div
                  key={member.id}
                  className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3"
                >
                  <Avatar name={member.name} color={member.avatarColor} />
                  <div className="flex-1 min-w-0">
                    <h3 className="font-semibold text-gray-900">
                      {member.id === currentUser.id ? "You" : member.name}
                    </h3>
                    <p className="text-sm text-gray-500">{member.email}</p>
                  </div>
                  <div className="text-right">
                    <p
                      className={`font-bold text-lg ${
                        isPositive
                          ? "text-green-600"
                          : isNegative
                          ? "text-red-600"
                          : "text-gray-500"
                      }`}
                    >
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
                      ) : (
                        "settled up"
                      )}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Settle Up Tab */}
        {activeTab === "settle" && (
          <div>
            <button
              onClick={() => setShowSettleUp(true)}
              className="w-full mb-4 flex items-center justify-center gap-2 py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors shadow-lg shadow-green-500/20"
            >
              <DollarSign className="w-5 h-5" />
              Record Payment
            </button>

            {/* Simplified debts */}
            {simplifiedDebts.length > 0 ? (
              <div className="mb-6">
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Suggested Settlements
                </h3>
                <div className="space-y-3">
                  {simplifiedDebts.map((debt, i) => (
                    <div
                      key={i}
                      className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3"
                    >
                      <Avatar name={debt.from.name} color={debt.from.avatarColor} size="sm" />
                      <div className="flex-1 text-center">
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">
                            {debt.from.id === currentUser.id ? "You" : debt.from.name}
                          </span>
                        </p>
                        <div className="flex items-center justify-center gap-2 my-1">
                          <div className="h-px bg-gray-300 flex-1" />
                          <span className="font-bold text-primary-600 text-sm">
                            ${debt.amount.toFixed(2)}
                          </span>
                          <ArrowRightLeft className="w-4 h-4 text-primary-500" />
                          <div className="h-px bg-gray-300 flex-1" />
                        </div>
                        <p className="text-sm text-gray-600">
                          <span className="font-semibold">
                            {debt.to.id === currentUser.id ? "You" : debt.to.name}
                          </span>
                        </p>
                      </div>
                      <Avatar name={debt.to.name} color={debt.to.avatarColor} size="sm" />
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="text-center py-8 bg-white rounded-2xl border border-gray-200 mb-6">
                <div className="text-4xl mb-2">🎉</div>
                <h3 className="text-lg font-semibold text-gray-900">All settled up!</h3>
                <p className="text-gray-500 text-sm">No outstanding balances</p>
              </div>
            )}

            {/* Settlement History */}
            {data.settlements.length > 0 && (
              <div>
                <h3 className="text-sm font-semibold text-gray-500 uppercase tracking-wide mb-3">
                  Payment History
                </h3>
                <div className="space-y-3">
                  {data.settlements.map((s) => {
                    const fromUser = data.members.find((m) => m.id === s.fromUserId);
                    const toUser = data.members.find((m) => m.id === s.toUserId);
                    return (
                      <div
                        key={s.id}
                        className="bg-white rounded-2xl border border-gray-200 p-4 flex items-center gap-3"
                      >
                        <div className="w-10 h-10 bg-green-100 rounded-xl flex items-center justify-center">
                          <DollarSign className="w-5 h-5 text-green-600" />
                        </div>
                        <div className="flex-1">
                          <p className="font-medium text-gray-900 text-sm">
                            <span className="font-semibold">
                              {s.fromUserId === currentUser.id ? "You" : fromUser?.name}
                            </span>{" "}
                            paid{" "}
                            <span className="font-semibold">
                              {s.toUserId === currentUser.id ? "You" : toUser?.name}
                            </span>
                          </p>
                          <p className="text-xs text-gray-500">{formatDate(s.createdAt)}</p>
                        </div>
                        <p className="font-bold text-green-600">
                          ${parseFloat(s.amount).toFixed(2)}
                        </p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Add Expense Modal */}
      <Modal isOpen={showAddExpense} onClose={() => setShowAddExpense(false)} title="Add Expense">
        <form onSubmit={handleAddExpense} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Description</label>
            <input
              type="text"
              value={expDesc}
              onChange={(e) => setExpDesc(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50 text-gray-900"
              placeholder="e.g., Dinner at restaurant"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount ($)</label>
            <input
              type="number"
              value={expAmount}
              onChange={(e) => setExpAmount(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50 text-gray-900"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Category</label>
            <select
              value={expCategory}
              onChange={(e) => setExpCategory(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50 text-gray-900"
            >
              {CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {CATEGORY_ICONS[cat]} {cat}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Paid By</label>
            <select
              value={expPaidBy}
              onChange={(e) => setExpPaidBy(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50 text-gray-900"
            >
              {data.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === currentUser.id ? `${m.name} (You)` : m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Split Among</label>
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {data.members.map((member) => (
                <label
                  key={member.id}
                  className={`flex items-center gap-3 p-2.5 rounded-xl cursor-pointer transition-colors ${
                    expSplitAmong.includes(member.id)
                      ? "bg-primary-50 border border-primary-200"
                      : "bg-gray-50 border border-transparent hover:bg-gray-100"
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={expSplitAmong.includes(member.id)}
                    onChange={() => toggleSplitMember(member.id)}
                    className="w-4 h-4 text-primary-600 rounded"
                  />
                  <Avatar name={member.name} color={member.avatarColor} size="sm" />
                  <span className="text-sm font-medium text-gray-900">
                    {member.id === currentUser.id ? `${member.name} (You)` : member.name}
                  </span>
                </label>
              ))}
            </div>
            {expSplitAmong.length > 0 && expAmount && (
              <p className="text-xs text-gray-500 mt-2">
                Each person pays: ${(parseFloat(expAmount) / expSplitAmong.length).toFixed(2)}
              </p>
            )}
          </div>
          <button
            type="submit"
            disabled={expSplitAmong.length === 0}
            className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Add Expense
          </button>
        </form>
      </Modal>

      {/* Settle Up Modal */}
      <Modal isOpen={showSettleUp} onClose={() => setShowSettleUp(false)} title="Record Payment">
        <form onSubmit={handleSettleUp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Who paid?</label>
            <select
              value={settleFrom}
              onChange={(e) => setSettleFrom(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50 text-gray-900"
            >
              {data.members.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.id === currentUser.id ? `${m.name} (You)` : m.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Paid to?</label>
            <select
              value={settleTo}
              onChange={(e) => setSettleTo(parseInt(e.target.value))}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50 text-gray-900"
            >
              <option value={0}>Select person...</option>
              {data.members
                .filter((m) => m.id !== settleFrom)
                .map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.id === currentUser.id ? `${m.name} (You)` : m.name}
                  </option>
                ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1.5">Amount ($)</label>
            <input
              type="number"
              value={settleAmount}
              onChange={(e) => setSettleAmount(e.target.value)}
              className="w-full px-4 py-3 border border-gray-200 rounded-xl focus:ring-2 focus:ring-primary-500 focus:border-transparent outline-none bg-gray-50 text-gray-900"
              placeholder="0.00"
              min="0.01"
              step="0.01"
              required
            />
          </div>
          <button
            type="submit"
            disabled={settleTo === 0}
            className="w-full py-3 bg-green-600 text-white rounded-xl font-semibold hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
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
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Select a user to add
                </label>
                <div className="space-y-2 max-h-64 overflow-y-auto">
                  {nonMembers.map((user) => (
                    <label
                      key={user.id}
                      className={`flex items-center gap-3 p-3 rounded-xl cursor-pointer transition-colors ${
                        addMemberUserId === user.id
                          ? "bg-primary-50 border border-primary-200"
                          : "bg-gray-50 border border-transparent hover:bg-gray-100"
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
                        <p className="text-sm font-medium text-gray-900">{user.name}</p>
                        <p className="text-xs text-gray-500">{user.email}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </div>
              <button
                type="submit"
                disabled={addMemberUserId === 0}
                className="w-full py-3 bg-primary-600 text-white rounded-xl font-semibold hover:bg-primary-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Add to Group
              </button>
            </>
          ) : (
            <div className="text-center py-4">
              <Users className="w-12 h-12 text-gray-300 mx-auto mb-2" />
              <p className="text-gray-500 text-sm">
                All registered users are already in this group. Add new friends from the dashboard first.
              </p>
            </div>
          )}
        </form>
      </Modal>
    </div>
  );
}
