"use client";

import { useState } from "react";
import { DashboardStats } from "@/lib/types";
import { Download, TrendingUp, PieChart } from "lucide-react";

interface StatsPanelProps {
  stats: DashboardStats | null;
  userId: number;
}

export default function StatsPanel({ stats, userId }: StatsPanelProps) {
  const [exporting, setExporting] = useState(false);

  const handleExport = async () => {
    setExporting(true);
    try {
      const res = await fetch(`/api/export?userId=${userId}&format=csv`);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `expenses-${new Date().toISOString().split("T")[0]}.csv`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error("Export failed:", err);
    } finally {
      setExporting(false);
    }
  };

  if (!stats) {
    return <p className="text-center text-gray-500 py-8">Loading statistics...</p>;
  }

  const maxCategory = Math.max(...stats.categoryBreakdown.map((c) => c.amount), 1);
  const maxMonth = Math.max(...stats.monthlySpending.map((m) => m.amount), 1);

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-2 gap-3">
        <div className="bg-green-50 dark:bg-green-900/20 rounded-xl p-4 text-center">
          <p className="text-xs text-green-600 dark:text-green-400 font-medium">Others owe you</p>
          <p className="text-2xl font-bold text-green-700 dark:text-green-300">
            ${stats.totalOwed.toFixed(2)}
          </p>
        </div>
        <div className="bg-red-50 dark:bg-red-900/20 rounded-xl p-4 text-center">
          <p className="text-xs text-red-600 dark:text-red-400 font-medium">You owe others</p>
          <p className="text-2xl font-bold text-red-700 dark:text-red-300">
            ${stats.totalOwing.toFixed(2)}
          </p>
        </div>
      </div>

      {/* Category Breakdown */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <PieChart className="w-4 h-4 text-primary-500" />
          Spending by Category
        </h3>
        {stats.categoryBreakdown.length > 0 ? (
          <div className="space-y-2">
            {stats.categoryBreakdown.slice(0, 6).map((cat) => (
              <div key={cat.category} className="flex items-center gap-3">
                <span className="text-sm text-gray-600 dark:text-gray-400 w-24 truncate">
                  {cat.category}
                </span>
                <div className="flex-1 h-6 bg-gray-100 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-primary-500 rounded-full transition-all chart-bar"
                    style={{ width: `${(cat.amount / maxCategory) * 100}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-gray-900 dark:text-white w-20 text-right">
                  ${cat.amount.toFixed(2)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">No expense data yet</p>
        )}
      </div>

      {/* Monthly Spending */}
      <div>
        <h3 className="text-sm font-semibold text-gray-700 dark:text-gray-300 mb-3 flex items-center gap-2">
          <TrendingUp className="w-4 h-4 text-primary-500" />
          Monthly Spending (Last 6 Months)
        </h3>
        {stats.monthlySpending.length > 0 ? (
          <div className="flex items-end justify-between gap-2 h-32">
            {stats.monthlySpending.map((month) => (
              <div key={month.month} className="flex-1 flex flex-col items-center gap-1">
                <div className="w-full bg-gray-100 dark:bg-gray-700 rounded-t flex-1 relative min-h-4">
                  <div
                    className="absolute bottom-0 left-0 right-0 bg-primary-500 rounded-t transition-all chart-bar"
                    style={{ height: `${(month.amount / maxMonth) * 100}%` }}
                  />
                </div>
                <span className="text-[10px] text-gray-500 dark:text-gray-400">
                  {month.month.slice(5)}
                </span>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-sm text-gray-500 text-center py-4">No monthly data yet</p>
        )}
      </div>

      {/* Export Button */}
      <button
        onClick={handleExport}
        disabled={exporting}
        className="w-full py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-xl font-semibold hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Download className="w-4 h-4" />
        {exporting ? "Exporting..." : "Export to CSV"}
      </button>
    </div>
  );
}
