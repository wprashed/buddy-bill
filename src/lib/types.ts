export interface User {
  id: number;
  name: string;
  email: string;
  avatarColor: string;
  darkMode: boolean;
  emailNotifications: boolean;
  createdAt: string;
}

export interface Group {
  id: number;
  name: string;
  description: string | null;
  createdBy: number;
  archived: boolean;
  inviteCode: string | null;
  createdAt: string;
}

export interface ExpenseSplit {
  id: number;
  expenseId: number;
  userId: number;
  amount: string;
  percentage: string | null;
  shares: number | null;
  settled: boolean;
  userName: string;
}

export interface ExpenseComment {
  id: number;
  expenseId: number;
  userId: number;
  userName: string;
  userColor: string;
  content: string;
  createdAt: string;
}

export interface Expense {
  id: number;
  groupId: number;
  paidById: number;
  description: string;
  amount: string;
  category: string;
  splitType: string;
  receiptUrl: string | null;
  createdAt: string;
  updatedAt: string;
  paidByName: string;
  splits: ExpenseSplit[];
  comments?: ExpenseComment[];
}

export interface Settlement {
  id: number;
  fromUserId: number;
  toUserId: number;
  amount: string;
  isPartial: boolean;
  note: string | null;
  createdAt: string;
}

export interface Activity {
  id: number;
  groupId: number | null;
  userId: number;
  userName: string;
  userColor: string;
  action: string;
  entityType: string | null;
  entityId: number | null;
  metadata: Record<string, unknown> | null;
  createdAt: string;
}

export interface Achievement {
  id: number;
  code: string;
  name: string;
  description: string;
  icon: string;
  unlockedAt?: string;
}

export interface ExpenseTemplate {
  id: number;
  groupId: number;
  name: string;
  description: string;
  amount: string | null;
  category: string;
  splitType: string;
  splitConfig: Record<string, unknown> | null;
}

export interface Nudge {
  id: number;
  fromUserId: number;
  fromUserName: string;
  toUserId: number;
  groupId: number;
  groupName: string;
  amount: string | null;
  message: string | null;
  read: boolean;
  createdAt: string;
}

export interface GroupMember extends User {
  role: string;
  joinedAt: string;
}

export interface GroupDetail {
  group: Group;
  members: GroupMember[];
  expenses: Expense[];
  settlements: Settlement[];
  balances: Record<number, number>;
  activities: Activity[];
}

export interface DashboardStats {
  totalOwed: number;
  totalOwing: number;
  groupsCount: number;
  expensesThisMonth: number;
  topCategory: string;
  categoryBreakdown: { category: string; amount: number }[];
  monthlySpending: { month: string; amount: number }[];
}

export interface Friend {
  id: number;
  friendId: number;
  name: string;
  email: string;
  avatarColor: string;
  createdAt: string;
}

export type SplitType = "equal" | "percentage" | "exact" | "shares";

export interface FeatureFlag {
  id: number;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  category: string;
  createdAt: string;
  updatedAt: string;
}

export interface Integration {
  id: number;
  key: string;
  name: string;
  description: string | null;
  enabled: boolean;
  config: Record<string, unknown> | null;
  category: string;
  iconUrl: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface SystemSetting {
  id: number;
  key: string;
  value: string | null;
  type: string;
  category: string;
  description: string | null;
  updatedAt: string;
}

export interface AdminAuditLog {
  id: number;
  adminUserId: number;
  adminUserName?: string;
  action: string;
  entityType: string | null;
  entityId: number | null;
  oldValue: Record<string, unknown> | null;
  newValue: Record<string, unknown> | null;
  ipAddress: string | null;
  createdAt: string;
}

export interface AdminStats {
  totalUsers: number;
  totalGroups: number;
  totalExpenses: number;
  totalSettlements: number;
  activeUsersToday: number;
  newUsersThisWeek: number;
  totalExpenseAmount: number;
}
