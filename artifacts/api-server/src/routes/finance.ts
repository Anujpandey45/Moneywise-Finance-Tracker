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

async function getUserTransactions(userId: string, month?: string) {
  const conditions = [eq(transactionsTable.userId, userId)];
  if (month) {
    const bounds = monthBounds(month);
    conditions.push(gte(transactionsTable.date, bounds.start));
    conditions.push(lt(transactionsTable.date, bounds.end));
  }
  return db.select().from(transactionsTable).where(and(...conditions)).orderBy(desc(transactionsTable.date), desc(transactionsTable.createdAt));
}

type FinanceTransaction = Awaited<ReturnType<typeof getUserTransactions>>[number];

function formatAssistantMoney(amount: number): string {
  return `$${amount.toFixed(2)}`;
}

function extractQuestionAmount(question: string): number | null {
  const match = question.match(/(?:₹|rs\.?|inr|\$)?\s*(\d[\d,]*(?:\.\d{1,2})?)/i);
  if (!match) return null;
  const amount = Number(match[1].replace(/,/g, ""));
  return Number.isFinite(amount) && amount > 0 ? amount : null;
}

function weekWindow(month: string): { start: string; end: string } {
  const [year, monthNumber] = month.split("-").map(Number);
  const monthEnd = new Date(Date.UTC(year, monthNumber, 0));
  const reference = month === currentMonth() ? new Date() : monthEnd;
  const end = new Date(Date.UTC(reference.getUTCFullYear(), reference.getUTCMonth(), reference.getUTCDate()));
  const start = new Date(end);
  start.setUTCDate(start.getUTCDate() - 6);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

function sumTransactions(items: FinanceTransaction[], type: "income" | "expense"): number {
  return items.filter((item) => item.type === type).reduce((total, item) => total + Number(item.amount), 0);
}

function buildAssistantResponse(month: string, transactions: FinanceTransaction[], rawQuestion?: string) {
  const question = rawQuestion?.trim() ?? "";
  const normalizedQuestion = question.toLowerCase();
  const income = sumTransactions(transactions, "income");
  const expenses = sumTransactions(transactions, "expense");
  const profit = income - expenses;
  const window = weekWindow(month);
  const weeklyTransactions = transactions.filter((item) => item.date >= window.start && item.date <= window.end);
  const weeklyIncome = sumTransactions(weeklyTransactions, "income");
  const weeklyExpenses = sumTransactions(weeklyTransactions, "expense");
  const categoryTotals = transactions
    .filter((item) => item.type === "expense")
    .reduce((map, item) => map.set(item.category, (map.get(item.category) ?? 0) + Number(item.amount)), new Map<string, number>());
  const categories = [...categoryTotals.entries()].sort((a, b) => b[1] - a[1]);
  const topCategory = categories[0];
  const topCategoryShare = topCategory && expenses > 0 ? (topCategory[1] / expenses) * 100 : 0;
  const amount = extractQuestionAmount(question);
  const available = Math.max(0, profit);
  const monthlySavingsRate = income > 0 ? (profit / income) * 100 : 0;
  const weeklySurplus = weeklyIncome - weeklyExpenses;
  const highlights = [
    income > 0
      ? `You kept ${monthlySavingsRate.toFixed(1)}% of income this month (${formatAssistantMoney(profit)}).`
      : "Add income to see your true savings rate.",
    `Last 7 days: ${formatAssistantMoney(weeklyExpenses)} out${weeklyIncome > 0 ? ` against ${formatAssistantMoney(weeklyIncome)} in` : ""}.`,
    topCategory
      ? `${topCategory[0]} is your biggest line at ${formatAssistantMoney(topCategory[1])}.`
      : "Add a few expenses to unlock category insights.",
  ];

  let message = `For ${month}, you earned ${formatAssistantMoney(income)} and spent ${formatAssistantMoney(expenses)}, leaving a ${profit >= 0 ? "surplus" : "shortfall"} of ${formatAssistantMoney(Math.abs(profit))}.`;

  if (amount !== null && /(can i|afford|spend|buy|purchase|expense|should i)/.test(normalizedQuestion)) {
    if (profit <= 0) {
      message = `I’d pause on a ${formatAssistantMoney(amount)} purchase for now. Your month is currently ${formatAssistantMoney(Math.abs(profit))} below break-even, so there isn’t a recorded surplus to safely spend.`;
      highlights.unshift("Protect essentials first, then revisit this once your balance is positive.");
    } else if (amount <= available) {
      const afterPurchase = available - amount;
      message = `Based on the transactions I can see, yes — ${formatAssistantMoney(amount)} fits inside your current ${formatAssistantMoney(available)} surplus. You would have about ${formatAssistantMoney(afterPurchase)} left after it.`;
      highlights.unshift(amount > available * 0.25
        ? "It fits, but it uses more than a quarter of your available surplus; consider waiting 24 hours."
        : "It fits without using your full surplus. Keep your recurring bills covered before spending.");
    } else {
      message = `I’d hold off on ${formatAssistantMoney(amount)} today. Your recorded surplus is ${formatAssistantMoney(available)}, so this would leave the month ${formatAssistantMoney(amount - available)} beyond it.`;
      highlights.unshift("Try a smaller version or wait until another income entry lands.");
    }
  } else if (/save|saving|set aside/.test(normalizedQuestion) && /week/.test(normalizedQuestion)) {
    const suggestedWeeklySave = Math.max(0, weeklySurplus);
    message = suggestedWeeklySave > 0
      ? `You could set aside about ${formatAssistantMoney(suggestedWeeklySave)} from the last 7 days without going below the spending you recorded.`
      : `The last 7 days ran ${formatAssistantMoney(Math.abs(weeklySurplus))} over income, so I wouldn’t force a savings transfer this week.`;
    highlights.unshift(suggestedWeeklySave > 0
      ? "Move that amount after your essential bills clear, then treat the remainder as your flexible budget."
      : "Focus on bringing this week back to break-even before trying to save more.");
  } else if (/overspend|over spend|too much|largest|category/.test(normalizedQuestion)) {
    if (topCategory) {
      message = `${topCategory[0]} is where you’re spending the most this month: ${formatAssistantMoney(topCategory[1])}, or ${topCategoryShare.toFixed(1)}% of all expenses.`;
      highlights.unshift(topCategoryShare >= 35
        ? `Alert: ${topCategory[0]} is taking more than a third of your spending. Set a cap before your next purchase.`
        : `This category is leading, but it is not dominating the month. Watch the next few entries for a trend.`);
    } else {
      message = "There is not enough expense data to call out an overspending category yet.";
    }
  } else if (/week|weekly|last 7/.test(normalizedQuestion)) {
    message = `This week you brought in ${formatAssistantMoney(weeklyIncome)} and spent ${formatAssistantMoney(weeklyExpenses)}, for a ${weeklySurplus >= 0 ? "surplus" : "shortfall"} of ${formatAssistantMoney(Math.abs(weeklySurplus))}.`;
  } else if (question) {
    highlights.unshift(`I used your ${month} activity to answer: “${question}”`);
  }

  if (topCategory && topCategoryShare >= 35 && !highlights.some((item) => item.startsWith("Alert:"))) {
    highlights.push(`Alert: ${topCategory[0]} is ${topCategoryShare.toFixed(1)}% of this month's spending. A small cap there could protect your surplus.`);
  }

  return { message, highlights: highlights.slice(0, 4) };
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
  const transactions = await getUserTransactions(req.userId!, parsed.data.month);
  const response = buildAssistantResponse(parsed.data.month, transactions, parsed.data.question);
  res.json(CreateAssistantSummaryResponse.parse(response));
});

export default router;