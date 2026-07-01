import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Receipt, Search, Pencil, Trash2, CalendarDays, Wallet, PieChart as PieIcon,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
} from 'recharts';
import { expensesApi } from '../services/endpoints';
import { getMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Button, IconButton, Card, CardHeader, Badge, Field, Input, Select, Textarea,
  Loading, EmptyState, Pagination, PageHeader, StatCard,
} from '../components/ui/index.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import { money, moneyShort, formatDate, titleCase } from '../lib/format';

const AMBER = '#D97706';
const SLATE = '#94A3B8';
const CATEGORIES = ['equipment', 'supplies', 'utilities', 'rent', 'salaries', 'maintenance', 'other'];
const CAT_TONE = {
  equipment: 'navy', supplies: 'blue', utilities: 'amber', rent: 'red',
  salaries: 'green', maintenance: 'gray', other: 'gray',
};

export default function Expenses() {
  const toast = useToast();
  const { isAdmin } = useAuth();

  const [summary, setSummary] = useState(null);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0, filtered_total: 0 });
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [category, setCategory] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadSummary = useCallback(async () => {
    try {
      const res = await expensesApi.summary();
      setSummary(res.data);
    } catch { /* non-critical */ }
  }, []);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const query = { page, limit: 12 };
      if (search) query.search = search;
      if (category) query.category = category;
      const res = await expensesApi.list(query);
      setItems(res.data.items);
      setMeta({ page: res.data.page, pages: res.data.pages, total: res.data.total, filtered_total: res.data.filtered_total });
    } catch (err) {
      toast.error(getMessage(err, 'Could not load expenses.'));
    } finally {
      setLoading(false);
    }
  }, [page, search, category, toast]);

  useEffect(() => { loadSummary(); }, [loadSummary]);
  useEffect(() => { loadList(); }, [loadList]);

  const refresh = () => { loadSummary(); loadList(); };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await expensesApi.remove(toDelete.id);
      toast.success('Expense deleted.');
      setToDelete(null);
      refresh();
    } catch (err) {
      toast.error(getMessage(err, 'Could not delete expense.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Expenses" subtitle="Track clinic spending by category">
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={18} /> Add expense</Button>
      </PageHeader>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard icon={CalendarDays} label="This month" value={money(summary?.this_month || 0)} tone="amber" />
        <StatCard icon={Wallet} label="This year" value={money(summary?.this_year || 0)} tone="navy" />
        <StatCard icon={Receipt} label="All time" value={money(summary?.all_time || 0)} tone="slate" />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Monthly spending" subtitle="Last 6 months" />
          <div className="h-64 px-2 pb-4">
            {summary ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={summary.trend} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" vertical={false} />
                  <XAxis dataKey="label" stroke={SLATE} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke={SLATE} fontSize={12} tickLine={false} axisLine={false} tickFormatter={moneyShort} width={64} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Bar dataKey="total" name="Expenses" fill={AMBER} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Loading className="h-full" />}
          </div>
        </Card>

        <Card>
          <CardHeader title="By category" subtitle="This month" />
          <div className="space-y-2.5 p-4 pt-0">
            {summary?.by_category?.length ? summary.by_category.map((c) => {
              const pct = summary.this_month > 0 ? Math.round((c.total / summary.this_month) * 100) : 0;
              return (
                <div key={c.category}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <Badge tone={CAT_TONE[c.category] || 'gray'}>{titleCase(c.category)}</Badge>
                    <span className="nums font-semibold text-ink">{money(c.total)}</span>
                  </div>
                  <div className="h-1.5 overflow-hidden rounded-full bg-canvas">
                    <div className="h-full rounded-full bg-amber-500" style={{ width: `${pct}%` }} />
                  </div>
                </div>
              );
            }) : <p className="py-6 text-center text-sm text-muted">No expenses this month.</p>}
          </div>
        </Card>
      </div>

      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-ink">Expense log</h3>
            {(search || category) && <p className="text-xs text-muted">Filtered total: <span className="nums font-semibold text-amber-700">{money(meta.filtered_total)}</span></p>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input placeholder="Search…" className="pl-9 sm:w-52" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={category} onChange={(e) => { setCategory(e.target.value); setPage(1); }} className="sm:w-44">
              <option value="">All categories</option>
              {CATEGORIES.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
            </Select>
          </div>
        </div>

        {loading ? (
          <Loading label="Loading expenses…" className="py-16" />
        ) : items.length === 0 ? (
          <EmptyState icon={Receipt} title="No expenses" message={search || category ? 'Try a different filter.' : 'Add an expense to see it here.'} />
        ) : (
          <>
            <div className="overflow-x-auto scroll-slim">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Title</th>
                    <th className="px-5 py-3 font-semibold">Category</th>
                    <th className="px-5 py-3 font-semibold">Logged by</th>
                    <th className="px-5 py-3 text-right font-semibold">Amount</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((e) => (
                    <tr key={e.id} className="transition hover:bg-canvas/60">
                      <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDate(e.expense_date)}</td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-ink">{e.title}</p>
                        {e.notes && <p className="line-clamp-1 text-xs text-muted">{e.notes}</p>}
                      </td>
                      <td className="px-5 py-3"><Badge tone={CAT_TONE[e.category] || 'gray'}>{titleCase(e.category)}</Badge></td>
                      <td className="whitespace-nowrap px-5 py-3 text-muted">{e.created_by_name || '—'}</td>
                      <td className="nums whitespace-nowrap px-5 py-3 text-right font-bold text-amber-700">{money(e.amount)}</td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton onClick={() => { setEditing(e); setModalOpen(true); }} aria-label="Edit"><Pencil size={16} /></IconButton>
                          {isAdmin && <IconButton onClick={() => setToDelete(e)} aria-label="Delete" className="text-red-500 hover:bg-red-50"><Trash2 size={16} /></IconButton>}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <Pagination page={meta.page} pages={meta.pages} total={meta.total} onPage={setPage} />
          </>
        )}
      </Card>

      {modalOpen && (
        <ExpenseModal expense={editing}
          onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); refresh(); }} />
      )}
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete} loading={deleting}
        title="Delete expense?" message={toDelete ? `"${toDelete.title}" (${money(toDelete.amount)}) will be permanently removed.` : ''} confirmLabel="Delete" />
    </div>
  );
}

function ExpenseModal({ expense, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!expense;
  const [form, setForm] = useState(() => ({
    title: expense?.title || '',
    category: expense?.category || 'supplies',
    amount: expense?.amount ?? '',
    expense_date: expense?.expense_date || new Date().toISOString().slice(0, 10),
    notes: expense?.notes || '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    if (!form.title.trim()) return setError('Title is required.');
    if (!form.amount || Number(form.amount) <= 0) return setError('Amount must be greater than zero.');
    setSaving(true);
    const payload = {
      title: form.title,
      category: form.category,
      amount: Number(form.amount),
      expense_date: form.expense_date,
      notes: form.notes || null,
    };
    try {
      if (isEdit) {
        await expensesApi.update(expense.id, payload);
        toast.success('Expense updated.');
      } else {
        await expensesApi.create(payload);
        toast.success('Expense recorded.');
      }
      onSaved();
    } catch (err) {
      setError(getMessage(err, 'Could not save expense.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit expense' : 'Add expense'} subtitle="Log a clinic expense" size="md"
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={submit} loading={saving}>{isEdit ? 'Save changes' : 'Add expense'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Title" required className="sm:col-span-2">
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Electricity bill" />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
            {CATEGORIES.map((c) => <option key={c} value={c}>{titleCase(c)}</option>)}
          </Select>
        </Field>
        <Field label="Amount (₱)" required>
          <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Date" className="sm:col-span-2">
          <Input type="date" value={form.expense_date} onChange={(e) => set('expense_date', e.target.value)} />
        </Field>
        <Field label="Notes" className="sm:col-span-2">
          <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    </Modal>
  );
}
