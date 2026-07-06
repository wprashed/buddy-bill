export interface User {
  id: number;
  name: string;
  email: string;
  avatarColor: string;
  createdAt: string;
}

export interface Group {
  id: number;
  name: string;
  description: string | null;
  createdBy: number;
  createdAt: string;
}

export interface ExpenseSplit {
  id: number;
  expenseId: number;
  userId: number;
  amount: string;
  settled: boolean;
  userName: string;
}

export interface Expense {
  id: number;
  groupId: number;
  paidById: number;
  description: string;
  amount: string;
  category: string;
  createdAt: string;
  paidByName: string;
  splits: ExpenseSplit[];
}

export interface Settlement {
  id: number;
  fromUserId: number;
  toUserId: number;
  amount: string;
  createdAt: string;
}

export interface GroupDetail {
  group: Group;
  members: User[];
  expenses: Expense[];
  settlements: Settlement[];
  balances: Record<number, number>;
}
