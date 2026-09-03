import { useMemo, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { getListTransactionsQueryKey, useDeleteTransaction, useListTransactions } from '@workspace/api-client-react';
import type { Transaction } from '@workspace/api-client-react';
import { ArrowDownRight, ArrowUpRight, Edit3, Plus, Search, SlidersHorizontal, Trash2, X } from 'lucide-react';
import { WorkspaceShell } from '@/components/moneywise-shell';
import { TransactionDialog } from '@/components/transaction-dialog';
import { formatMoney, monthKey, shortDate } from '@/lib/format';
import { useToast } from '@/hooks/use-toast';

export default function Transactions() {
  const [month, setMonth] = useState(monthKey());
  const [type, setType] = useState<'all' | 'income' | 'expense'>('all');
  const [search, setSearch] = useState('');
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Transaction | null>(null);
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const queryParams = { month, ...(type === 'all' ? {} : { type }) };
  const transactionsQuery = useListTransactions(queryParams, { query: { queryKey: getListTransactionsQueryKey(queryParams) } });
  const deleteTransaction = useDeleteTransaction();
  const transactions = transactionsQuery.data || [];
  const filtered = useMemo(() => transactions.filter((item) => `${item.title} ${item.category} ${item.note || ''}`.toLowerCase().includes(search.toLowerCase())), [transactions, search]);
  const total = filtered.reduce((sum, item) => sum + (item.type === 'income' ? item.amount : -item.amount), 0);
  const openCreate = () => { setEditing(null); setDialogOpen(true); };
  const openEdit = (transaction: Transaction) => { setEditing(transaction); setDialogOpen(true); };
  const remove = (transaction: Transaction) => {
    if (!window.confirm(`Delete “${transaction.title}”? This cannot be undone.`)) return;
    deleteTransaction.mutate({ id: transaction.id }, { onSuccess: () => { queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(queryParams) }); toast({ title: 'Transaction removed', description: 'The line has been cleared from your month.' }); } });
  };
  return (
    <WorkspaceShell>
      <div className="animate-rise-in flex flex-col justify-between gap-5 md:flex-row md:items-end"><div><p className="text-xs font-bold uppercase tracking-[.18em] text-primary">Your history</p><h1 className="display-font mt-2 text-5xl font-semibold tracking-[-.06em]">Transactions</h1><p className="mt-3 text-sm text-muted-foreground">Every inflow and outflow, in one honest place.</p></div><button onClick={openCreate} className="flex items-center justify-center gap-2 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5" data-testid="button-new-transaction"><Plus className="h-4 w-4" /> Add transaction</button></div>
      <div className="mt-9 rounded-[1.4rem] border border-border bg-card p-4 md:p-5"><div className="flex flex-col gap-3 md:flex-row"><label className="relative flex-1"><Search className="absolute left-3 top-3 h-4 w-4 text-muted-foreground" /><input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search title, category, or note" className="field-input pl-10" data-testid="input-search-transactions" />{search && <button onClick={() => setSearch('')} className="absolute right-2 top-2 rounded-md p-1.5 text-muted-foreground hover:bg-muted" aria-label="Clear search" data-testid="button-clear-search"><X className="h-4 w-4" /></button>}</label><div className="flex gap-2"><select value={month} onChange={(e) => setMonth(e.target.value)} className="field-input min-w-[148px]" aria-label="Filter by month" data-testid="select-filter-month"><option value={monthKey()}>{new Date().toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}</option><option value={new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().slice(0, 7)}>Previous month</option></select><select value={type} onChange={(e) => setType(e.target.value as typeof type)} className="field-input min-w-[120px]" aria-label="Filter by type" data-testid="select-filter-type"><option value="all">All types</option><option value="income">Income</option><option value="expense">Expenses</option></select></div></div><div className="mt-4 flex items-center gap-2 text-xs text-muted-foreground"><SlidersHorizontal className="h-3.5 w-3.5" /><span data-testid="text-transaction-count">{filtered.length} {filtered.length === 1 ? 'transaction' : 'transactions'}</span><span className="ml-auto font-semibold text-foreground">Net <span className={total >= 0 ? 'text-[hsl(92_28%_39%)]' : 'text-destructive'}>{total >= 0 ? '+' : '−'}{formatMoney(Math.abs(total))}</span></span></div></div>
      <div className="mt-5 overflow-hidden rounded-[1.4rem] border border-border bg-card">{transactionsQuery.isLoading ? <RowsSkeleton /> : transactionsQuery.isError ? <div className="p-12 text-center"><p className="display-font text-2xl font-semibold">Couldn’t find your history.</p><button onClick={() => transactionsQuery.refetch()} className="mt-4 text-sm font-bold text-primary underline" data-testid="button-retry-transactions">Try again</button></div> : filtered.length === 0 ? <div className="p-14 text-center"><div className="mx-auto grid h-12 w-12 place-items-center rounded-2xl bg-muted text-muted-foreground"><Search className="h-5 w-5" /></div><h2 className="display-font mt-5 text-2xl font-semibold">{search ? 'Nothing matched that search' : 'A clean slate'}</h2><p className="mx-auto mt-2 max-w-xs text-sm leading-relaxed text-muted-foreground">{search ? 'Try a different title or category.' : 'Add your first transaction and your month will start to take shape.'}</p>{!search && <button onClick={openCreate} className="mt-5 rounded-xl bg-primary px-4 py-3 text-sm font-bold text-primary-foreground" data-testid="button-empty-add">Add your first transaction</button>}</div> : <div className="divide-y divide-border">{filtered.map((transaction) => <TransactionRow key={transaction.id} transaction={transaction} onEdit={openEdit} onDelete={remove} />)}</div>}</div>
      <TransactionDialog open={dialogOpen} onOpenChange={(value) => { setDialogOpen(value); if (!value) { queryClient.invalidateQueries({ queryKey: getListTransactionsQueryKey(queryParams) }); } }} transaction={editing} />
    </WorkspaceShell>
  );
}

function TransactionRow({ transaction, onEdit, onDelete }: { transaction: Transaction; onEdit: (transaction: Transaction) => void; onDelete: (transaction: Transaction) => void }) {
  const income = transaction.type === 'income';
  return <div className="group flex items-center gap-3 px-4 py-4 transition-colors hover:bg-muted/45 md:px-6" data-testid={`row-transaction-${transaction.id}`}><div className={`grid h-10 w-10 shrink-0 place-items-center rounded-xl ${income ? 'bg-[hsl(92_28%_49%/.16)] text-[hsl(92_28%_39%)]' : 'bg-muted text-muted-foreground'}`}>{income ? <ArrowDownRight className="h-4 w-4 rotate-180" /> : <ArrowDownRight className="h-4 w-4" />}</div><div className="min-w-0 flex-1"><p className="truncate text-sm font-bold">{transaction.title}</p><p className="mt-0.5 truncate text-xs text-muted-foreground">{transaction.category}{transaction.note ? ` · ${transaction.note}` : ''}</p></div><p className="hidden w-24 text-xs text-muted-foreground sm:block">{shortDate(transaction.date)}</p><p className={`mono-font w-24 text-right text-sm font-bold ${income ? 'text-[hsl(92_28%_39%)]' : ''}`}>{income ? '+' : '−'}{formatMoney(transaction.amount)}</p><div className="flex w-0 overflow-hidden opacity-0 transition-all duration-200 group-hover:w-[68px] group-hover:gap-1 group-hover:opacity-100"><button onClick={() => onEdit(transaction)} className="rounded-lg p-2 text-muted-foreground hover:bg-secondary hover:text-foreground" aria-label={`Edit ${transaction.title}`} data-testid={`button-edit-transaction-${transaction.id}`}><Edit3 className="h-4 w-4" /></button><button onClick={() => onDelete(transaction)} className="rounded-lg p-2 text-muted-foreground hover:bg-[hsl(var(--destructive)/.1)] hover:text-destructive" aria-label={`Delete ${transaction.title}`} data-testid={`button-delete-transaction-${transaction.id}`}><Trash2 className="h-4 w-4" /></button></div></div>;
}

function RowsSkeleton() { return <div className="animate-pulse divide-y divide-border">{[1, 2, 3, 4, 5].map((item) => <div key={item} className="flex items-center gap-3 px-4 py-5 md:px-6"><div className="h-10 w-10 rounded-xl bg-muted" /><div className="flex-1 space-y-2"><div className="h-3 w-32 rounded bg-muted" /><div className="h-2.5 w-20 rounded bg-muted" /></div><div className="h-3 w-20 rounded bg-muted" /></div>)}</div>; }