import { Router, type IRouter, type Request, type Response, type NextFunction } from "express";
import { and, asc, desc, eq, gte, lt } from "drizzle-orm";
import { getAuth } from "@clerk/express";
import { db, transactionsTable } from "@workspace/db";
import {
  CreateAssistantSummaryBody,
  CreateAssistantSummaryResponse,
  CreateTransactionBody,
  CreateTransactionResponse,
  DeleteTransactionParams,
  GetDashboardQueryParams,
  GetDashboardResponse,
  ListTransactionsQueryParams,
  ListTransactionsResponse,
  UpdateTransactionBody,
  UpdateTransactionParams,
  UpdateTransactionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

type AuthedRequest = Request & { userId?: string };

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const auth = getAuth(req);
  const userId = auth?.userId;
  if (!userId) {
    res.status(401).json({ error: "Unauthorized" });
    return;
  }
  req.userId = userId;
  next();
}

function currentMonth(): string {
  return new Date().toISOString().slice(0, 7);
}

function monthBounds(month: string): { start: string; end: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const nextMonth = monthNumber === 12 ? 1 : monthNumber + 1;
  const nextYear = monthNumber === 12 ? year + 1 : year;
  return {
    start: `${month}-01`,
    end: `${nextYear}-${String(nextMonth).padStart(2, "0")}-01`,
  };
}

function shiftMonth(month: string, offset: number): string {
  const [year, monthNumber] = month.split("-").map(Number);
  const date = new Date(Date.UTC(year, monthNumber - 1 + offset, 1));
  return date.toISOString().slice(0, 7);
}

function toApiTransaction(transaction: typeof transactionsTable.$inferSelect) {
  return {
    id: transaction.id,
    type: transaction.type as "income" | "expense",
    title: transaction.title,
    category: transaction.category,
    amount: Number(transaction.amount),
    date: new Date(`${transaction.date}T00:00:00.000Z`),
    note: transaction.note,
    createdAt: transaction.createdAt,
  };
}

async function ensureStarterData(userId: string): Promise<void> {
  const existing = await db
    .select({ id: transactionsTable.id })
    .from(transactionsTable)
    .where(eq(transactionsTable.userId, userId))
    .limit(1);
  if (existing.length > 0) return;

  const month = currentMonth();
  const samples = [
    { type: "income" as const, title: "Monthly salary", category: "Salary", amount: "5200.00", date: `${month}-02`, note: "Primary income" },
    { type: "income" as const, title: "Freelance project", category: "Freelance", amount: "860.00", date: `${month}-09`, note: "Design retainer" },
    { type: "expense" as const, title: "Apartment rent", category: "Housing", amount: "1450.00", date: `${month}-01`, note: "Monthly rent" },
    { type: "expense" as const, title: "Grocery run", category: "Food", amount: "186.42", date: `${month}-06`, note: null },
    { type: "expense" as const, title: "Train pass", category: "Transport", amount: "78.00", date: `${month}-11`, note: "Monthly commute" },
    { type: "expense" as const, title: "Streaming bundle", category: "Subscriptions", amount: "32.99", date: `${month}-14`, note: null },
    { type: "expense" as const, title: "Dinner with friends", category: "Food", amount: "64.50", date: `${month}-18`, note: null },
  ];
  await db.insert(transactionsTable).values(samples.map((sample) => ({ ...sample, userId })));
}

async function getUserTransactions(userId: string, month?: string) {
  const conditions = [eq(transactionsTable.userId, userId)];
  if (month) {
    const bounds = monthBounds(month);
    conditions.push(gte(transactionsTable.date, bounds.start));
    conditions.push(lt(transactionsTable.date, bounds.end));
  }
  return db.select().from(transactionsTable).where(and(...conditions)).orderBy(desc(transactionsTable.date), desc(transactionsTable.createdAt));
}

router.use(requireAuth);

router.get("/transactions", async (req: AuthedRequest, res: Response): Promise<void> => {
  const parsed = ListTransactionsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const transactions = await getUserTransactions(req.userId!, parsed.data.month);
  const filtered = parsed.data.type
    ? transactions.filter((transaction) => transaction.type === parsed.data.type)
    : transactions;
  res.json(ListTransactionsResponse.parse(filtered.map(toApiTransaction)));
});

router.post("/transactions", async (req: AuthedRequest, res: Response): Promise<void> => {
  const parsed = CreateTransactionBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const [transaction] = await db.insert(transactionsTable).values({
    userId: req.userId!,
    type: parsed.data.type,
    title: parsed.data.title,
    category: parsed.data.category,
    amount: parsed.data.amount.toFixed(2),
    date: parsed.data.date.toISOString().slice(0, 10),
    note: parsed.data.note ?? null,
  }).returning();
  res.status(201).json(CreateTransactionResponse.parse(toApiTransaction(transaction)));
});

router.patch("/transactions/:id", async (req: AuthedRequest, res: Response): Promise<void> => {
  const params = UpdateTransactionParams.safeParse(req.params);
  const parsed = UpdateTransactionBody.safeParse(req.body);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const update: Partial<typeof transactionsTable.$inferInsert> = {};
  if (parsed.data.type !== undefined) update.type = parsed.data.type;
  if (parsed.data.title !== undefined) update.title = parsed.data.title;
  if (parsed.data.category !== undefined) update.category = parsed.data.category;
  if (parsed.data.amount !== undefined) update.amount = parsed.data.amount.toFixed(2);
  if (parsed.data.date !== undefined) update.date = parsed.data.date.toISOString().slice(0, 10);
  if (parsed.data.note !== undefined) update.note = parsed.data.note;
  const [transaction] = await db.update(transactionsTable).set(update).where(and(eq(transactionsTable.id, params.data.id), eq(transactionsTable.userId, req.userId!))).returning();
  if (!transaction) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  res.json(UpdateTransactionResponse.parse(toApiTransaction(transaction)));
});

router.delete("/transactions/:id", async (req: AuthedRequest, res: Response): Promise<void> => {
  const params = DeleteTransactionParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const [transaction] = await db.delete(transactionsTable).where(and(eq(transactionsTable.id, params.data.id), eq(transactionsTable.userId, req.userId!))).returning();
  if (!transaction) {
    res.status(404).json({ error: "Transaction not found" });
    return;
  }
  res.sendStatus(204);
});

router.get("/dashboard", async (req: AuthedRequest, res: Response): Promise<void> => {
  const parsed = GetDashboardQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const month = parsed.data.month ?? currentMonth();
  await ensureStarterData(req.userId!);
  const transactions = await getUserTransactions(req.userId!);
  const monthTransactions = transactions.filter((transaction) => transaction.date.startsWith(month));
  const previousMonth = shiftMonth(month, -1);
  const previousTransactions = transactions.filter((transaction) => transaction.date.startsWith(previousMonth));
  const sum = (items: typeof transactions, type: "income" | "expense") =>
    items.filter((item) => item.type === type).reduce((total, item) => total + Number(item.amount), 0);
  const totalIncome = sum(monthTransactions, "income");
  const totalExpenses = sum(monthTransactions, "expense");
  const previousIncome = sum(previousTransactions, "income");
  const previousExpenses = sum(previousTransactions, "expense");
  const categoryAmounts = new Map<string, number>();
  monthTransactions.filter((item) => item.type === "expense").forEach((item) => {
    categoryAmounts.set(item.category, (categoryAmounts.get(item.category) ?? 0) + Number(item.amount));
  });
  const expenseBreakdown = [...categoryAmounts.entries()]
    .map(([category, amount]) => ({ category, amount: Number(amount.toFixed(2)), percentage: totalExpenses ? Number(((amount / totalExpenses) * 100).toFixed(1)) : 0 }))
    .sort((a, b) => b.amount - a.amount);
  const trend = Array.from({ length: 6 }, (_, index) => shiftMonth(month, index - 5)).map((trendMonth) => {
    const items = transactions.filter((transaction) => transaction.date.startsWith(trendMonth));
    const income = sum(items, "income");
    const expenses = sum(items, "expense");
    return { month: trendMonth, income: Number(income.toFixed(2)), expenses: Number(expenses.toFixed(2)), profit: Number((income - expenses).toFixed(2)) };
  });
  const response = {
    month,
    totalIncome: Number(totalIncome.toFixed(2)),
    totalExpenses: Number(totalExpenses.toFixed(2)),
    netProfit: Number((totalIncome - totalExpenses).toFixed(2)),
    incomeChange: previousIncome ? Number((((totalIncome - previousIncome) / previousIncome) * 100).toFixed(1)) : 0,
    expenseChange: previousExpenses ? Number((((totalExpenses - previousExpenses) / previousExpenses) * 100).toFixed(1)) : 0,
    savingsRate: totalIncome ? Number((((totalIncome - totalExpenses) / totalIncome) * 100).toFixed(1)) : 0,
    topExpenseCategory: expenseBreakdown[0]?.category ?? "None yet",
    expenseBreakdown,
    monthlyTrend: trend,
    recentTransactions: transactions.slice(0, 6).map(toApiTransaction),
  };
  res.json(GetDashboardResponse.parse(response));
});

router.post("/assistant/summary", async (req: AuthedRequest, res: Response): Promise<void> => {
  const parsed = CreateAssistantSummaryBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  await ensureStarterData(req.userId!);
  const transactions = await getUserTransactions(req.userId!, parsed.data.month);
  const income = transactions.filter((item) => item.type === "income").reduce((total, item) => total + Number(item.amount), 0);
  const expenses = transactions.filter((item) => item.type === "expense").reduce((total, item) => total + Number(item.amount), 0);
  const profit = income - expenses;
  const topCategory = [...transactions.filter((item) => item.type === "expense").reduce((map, item) => map.set(item.category, (map.get(item.category) ?? 0) + Number(item.amount)), new Map<string, number>())].sort((a, b) => b[1] - a[1])[0];
  const question = parsed.data.question?.trim();
  const message = question
    ? `For ${parsed.data.month}, your numbers show ${profit >= 0 ? "a healthy surplus" : "a deficit"} of $${Math.abs(profit).toFixed(2)}. You earned $${income.toFixed(2)} and spent $${expenses.toFixed(2)}.`
    : `In ${parsed.data.month}, you brought in $${income.toFixed(2)} and spent $${expenses.toFixed(2)}, leaving you with a ${profit >= 0 ? "surplus" : "shortfall"} of $${Math.abs(profit).toFixed(2)}.`;
  const response = {
    message,
    highlights: [
      profit >= 0 ? `You kept ${((profit / (income || 1)) * 100).toFixed(1)}% of your income.` : "Your spending was higher than your income this month.",
      topCategory ? `${topCategory[0]} was your largest expense category at $${topCategory[1].toFixed(2)}.` : "Add a few expenses to unlock category insights.",
      question ? `You asked: “${question}”` : "Ask me anything about this month's spending.",
    ],
  };
  res.json(CreateAssistantSummaryResponse.parse(response));
});

export default router;