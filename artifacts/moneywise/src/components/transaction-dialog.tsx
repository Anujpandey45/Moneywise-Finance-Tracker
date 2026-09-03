import { useEffect, useState, type FormEvent } from 'react';
import { useCreateTransaction, useUpdateTransaction } from '@workspace/api-client-react';
import type { Transaction, TransactionInputType } from '@workspace/api-client-react';
import { X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

type Draft = { type: TransactionInputType; title: string; category: string; amount: string; date: string; note: string };
const emptyDraft: Draft = { type: 'expense', title: '', category: 'Home', amount: '', date: new Date().toISOString().slice(0, 10), note: '' };
const categories = ['Home', 'Food & dining', 'Transport', 'Health', 'Shopping', 'Work', 'Subscriptions', 'Travel', 'Other'];

export function TransactionDialog({ open, onOpenChange, transaction }: { open: boolean; onOpenChange: (open: boolean) => void; transaction?: Transaction | null }) {
  const [draft, setDraft] = useState<Draft>(emptyDraft);
  const createTransaction = useCreateTransaction();
  const updateTransaction = useUpdateTransaction();
  const { toast } = useToast();
  const editing = Boolean(transaction);

  useEffect(() => {
    if (transaction) setDraft({ type: transaction.type, title: transaction.title, category: transaction.category, amount: String(transaction.amount), date: transaction.date, note: transaction.note || '' });
    else setDraft(emptyDraft);
  }, [transaction, open]);

  if (!open) return null;
  const set = (key: keyof Draft, value: string) => setDraft((current) => ({ ...current, [key]: value }));
  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!draft.title.trim() || !draft.category.trim() || Number(draft.amount) <= 0) return;
    const data = { type: draft.type, title: draft.title.trim(), category: draft.category.trim(), amount: Number(draft.amount), date: draft.date, note: draft.note.trim() || undefined };
    const onSuccess = () => { onOpenChange(false); toast({ title: editing ? 'Transaction updated' : 'Transaction saved', description: editing ? 'Your money story is up to date.' : 'A new line has been added to your month.' }); };
    if (editing) updateTransaction.mutate({ id: transaction!.id, data }, { onSuccess });
    else createTransaction.mutate({ data }, { onSuccess });
  };
  const pending = createTransaction.isPending || updateTransaction.isPending;
  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center bg-[hsl(var(--foreground)/.35)] p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" data-testid="dialog-transaction">
      <div className="animate-rise-in w-full max-w-xl rounded-t-[1.5rem] border border-border bg-card p-6 shadow-2xl sm:rounded-[1.5rem] md:p-8">
        <div className="flex items-start justify-between">
          <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-muted-foreground">{editing ? 'Edit line item' : 'New line item'}</p><h2 className="display-font mt-1 text-3xl font-semibold tracking-tight">{editing ? 'Tune the details' : 'Where did it go?'}</h2></div>
          <button onClick={() => onOpenChange(false)} className="rounded-lg p-2 text-muted-foreground transition-colors hover:bg-muted hover:text-foreground" aria-label="Close transaction form" data-testid="button-close-transaction"><X className="h-5 w-5" /></button>
        </div>
        <form onSubmit={submit} className="mt-7 space-y-5">
          <div className="grid grid-cols-2 gap-2 rounded-xl bg-muted p-1">
            {(['expense', 'income'] as const).map((type) => <button key={type} type="button" onClick={() => set('type', type)} className={`rounded-lg py-2.5 text-sm font-semibold capitalize transition-all ${draft.type === type ? 'bg-card text-foreground shadow-sm' : 'text-muted-foreground'}`} data-testid={`button-type-${type}`}>{type}</button>)}
          </div>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="sm:col-span-2"><span className="field-label">Title</span><input autoFocus value={draft.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Studio rent" className="field-input" data-testid="input-transaction-title" required /></label>
            <label><span className="field-label">Amount</span><div className="relative"><span className="pointer-events-none absolute left-3 top-2.5 text-muted-foreground">$</span><input type="number" min="0.01" step="0.01" value={draft.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" className="field-input pl-7" data-testid="input-transaction-amount" required /></div></label>
            <label><span className="field-label">Date</span><input type="date" value={draft.date} onChange={(e) => set('date', e.target.value)} className="field-input" data-testid="input-transaction-date" required /></label>
            <label><span className="field-label">Category</span><select value={draft.category} onChange={(e) => set('category', e.target.value)} className="field-input" data-testid="select-transaction-category">{categories.map((category) => <option key={category} value={category}>{category}</option>)}</select></label>
            <label><span className="field-label">Note <span className="font-normal normal-case tracking-normal text-muted-foreground">(optional)</span></span><input value={draft.note} onChange={(e) => set('note', e.target.value)} placeholder="Add a little context" className="field-input" data-testid="input-transaction-note" /></label>
          </div>
          <button disabled={pending} type="submit" className="flex w-full items-center justify-center rounded-xl bg-primary py-3.5 text-sm font-bold text-primary-foreground transition-transform hover:-translate-y-0.5 disabled:opacity-60" data-testid="button-save-transaction">{pending ? 'Saving…' : editing ? 'Save changes' : 'Save transaction'}</button>
        </form>
      </div>
    </div>
  );
}