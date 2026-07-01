import { useEffect, useState, useCallback } from 'react';
import {
  Plus, Wallet, CalendarDays, CalendarRange, TrendingUp, Search,
  Pencil, Trash2, CreditCard, X,
} from 'lucide-react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, Cell,
} from 'recharts';
import { paymentsApi, patientsApi } from '../services/endpoints';
import { getMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Button, IconButton, Card, CardHeader, Badge, Field, Input, Select, Textarea,
  Loading, EmptyState, Pagination, PageHeader, StatCard,
} from '../components/ui/index.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import { money, moneyShort, formatDate, titleCase } from '../lib/format';

const LIME = '#7CB342';
const AMBER = '#D97706';
const NAVY = '#22317E';
const SLATE = '#94A3B8';
const METHODS = ['cash', 'card', 'gcash', 'bank_transfer', 'other'];
const METHOD_LABEL = { cash: 'Cash', card: 'Card', gcash: 'GCash', bank_transfer: 'Bank transfer', other: 'Other' };
const METHOD_TONE = { cash: 'green', card: 'blue', gcash: 'navy', bank_transfer: 'amber', other: 'gray' };

export default function Revenue() {
  const toast = useToast();
  const { isAdmin } = useAuth();

  const [rev, setRev] = useState(null);
  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0, filtered_total: 0 });
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState('');
  const [method, setMethod] = useState('');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    patientsApi.list({ limit: 500 }).then((r) => setPatients(r.data.items)).catch(() => {});
  }, []);

  const loadRevenue = useCallback(async () => {
    try {
      const res = await paymentsApi.revenue();
      setRev(res.data);
    } catch (err) {
      toast.error(getMessage(err, 'Could not load revenue.'));
    }
  }, [toast]);

  const loadList = useCallback(async () => {
    setLoading(true);
    try {
      const query = { page, limit: 12 };
      if (search) query.search = search;
      if (method) query.method = method;
      const res = await paymentsApi.list(query);
      setItems(res.data.items);
      setMeta({ page: res.data.page, pages: res.data.pages, total: res.data.total, filtered_total: res.data.filtered_total });
    } catch (err) {
      toast.error(getMessage(err, 'Could not load payments.'));
    } finally {
      setLoading(false);
    }
  }, [page, search, method, toast]);

  useEffect(() => { loadRevenue(); }, [loadRevenue]);
  useEffect(() => { loadList(); }, [loadList]);

  const refresh = () => { loadRevenue(); loadList(); };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await paymentsApi.remove(toDelete.id);
      toast.success('Payment deleted.');
      setToDelete(null);
      refresh();
    } catch (err) {
      toast.error(getMessage(err, 'Could not delete payment.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Revenue" subtitle="Payments, income & financial trends">
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={18} /> Record payment</Button>
      </PageHeader>

      {/* Headline cards */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={CalendarDays} label="Today" value={money(rev?.daily || 0)} tone="lime" />
        <StatCard icon={CalendarRange} label="This week" value={money(rev?.weekly || 0)} tone="navy" />
        <StatCard icon={Wallet} label="This month" value={money(rev?.monthly || 0)} tone="lime" />
        <StatCard icon={TrendingUp} label="This year" value={money(rev?.annual || 0)} tone="navy" />
      </div>

      <div className="mb-5 grid gap-5 lg:grid-cols-3">
        {/* Trend */}
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue vs Expenses" subtitle="Last 6 months" />
          <div className="h-72 px-2 pb-4">
            {rev ? (
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={rev.trend} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" vertical={false} />
                  <XAxis dataKey="label" stroke={SLATE} fontSize={12} tickLine={false} axisLine={false} />
                  <YAxis stroke={SLATE} fontSize={12} tickLine={false} axisLine={false} tickFormatter={moneyShort} width={64} />
                  <Tooltip formatter={(v) => money(v)} />
                  <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                  <Bar dataKey="revenue" name="Revenue" fill={LIME} radius={[5, 5, 0, 0]} />
                  <Bar dataKey="expenses" name="Expenses" fill={AMBER} radius={[5, 5, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            ) : <Loading className="h-full" />}
          </div>
        </Card>

        {/* Net + by method */}
        <div className="space-y-5">
          <Card className="p-5">
            <p className="text-xs font-medium text-muted">Net income (this month)</p>
            <p className={`nums mt-1 text-3xl font-bold ${Number(rev?.net_income) >= 0 ? 'text-lime-700' : 'text-red-600'}`}>
              {money(rev?.net_income || 0)}
            </p>
            <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-lg bg-lime-50 p-3">
                <p className="text-xs text-muted">Revenue</p>
                <p className="nums font-bold text-lime-700">{money(rev?.monthly || 0)}</p>
              </div>
              <div className="rounded-lg bg-amber-50 p-3">
                <p className="text-xs text-muted">Expenses</p>
                <p className="nums font-bold text-amber-700">{money(rev?.month_expenses || 0)}</p>
              </div>
            </div>
          </Card>

          <Card>
            <CardHeader title="By payment method" subtitle="This month" />
            <div className="space-y-2 p-4 pt-0">
              {rev?.by_method?.length ? rev.by_method.map((m) => (
                <div key={m.payment_method} className="flex items-center justify-between">
                  <Badge tone={METHOD_TONE[m.payment_method] || 'gray'}>{METHOD_LABEL[m.payment_method] || m.payment_method}</Badge>
                  <span className="nums text-sm font-semibold text-ink">{money(m.total)}</span>
                </div>
              )) : <p className="py-4 text-center text-sm text-muted">No payments this month.</p>}
            </div>
          </Card>
        </div>
      </div>

      {/* Payment history */}
      <Card>
        <div className="flex flex-col gap-3 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h3 className="font-semibold text-ink">Payment history</h3>
            {(search || method) && <p className="text-xs text-muted">Filtered total: <span className="nums font-semibold text-lime-700">{money(meta.filtered_total)}</span></p>}
          </div>
          <div className="flex flex-col gap-2 sm:flex-row">
            <div className="relative">
              <Search size={16} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
              <Input placeholder="Search…" className="pl-9 sm:w-52" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
            </div>
            <Select value={method} onChange={(e) => { setMethod(e.target.value); setPage(1); }} className="sm:w-44">
              <option value="">All methods</option>
              {METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
            </Select>
          </div>
        </div>

        {loading ? (
          <Loading label="Loading payments…" className="py-16" />
        ) : items.length === 0 ? (
          <EmptyState icon={Wallet} title="No payments" message={search || method ? 'Try a different filter.' : 'Record a payment to see it here.'} />
        ) : (
          <>
            <div className="overflow-x-auto scroll-slim">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                    <th className="px-5 py-3 font-semibold">Date</th>
                    <th className="px-5 py-3 font-semibold">Patient</th>
                    <th className="px-5 py-3 font-semibold">Description</th>
                    <th className="px-5 py-3 font-semibold">Method</th>
                    <th className="px-5 py-3 text-right font-semibold">Amount</th>
                    <th className="px-5 py-3 text-right font-semibold">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line">
                  {items.map((p) => (
                    <tr key={p.id} className="transition hover:bg-canvas/60">
                      <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDate(p.payment_date)}</td>
                      <td className="px-5 py-3">
                        <p className="font-semibold text-ink">{p.patient_name || 'Walk-in'}</p>
                        {p.patient_code && <p className="text-xs text-muted">{p.patient_code}</p>}
                      </td>
                      <td className="px-5 py-3 text-muted">{p.description || '—'}</td>
                      <td className="px-5 py-3"><Badge tone={METHOD_TONE[p.payment_method] || 'gray'}>{METHOD_LABEL[p.payment_method] || p.payment_method}</Badge></td>
                      <td className="nums whitespace-nowrap px-5 py-3 text-right font-bold text-lime-700">{money(p.amount)}</td>
                      <td className="whitespace-nowrap px-5 py-3">
                        <div className="flex items-center justify-end gap-1">
                          <IconButton onClick={() => { setEditing(p); setModalOpen(true); }} aria-label="Edit"><Pencil size={16} /></IconButton>
                          {isAdmin && <IconButton onClick={() => setToDelete(p)} aria-label="Delete" className="text-red-500 hover:bg-red-50"><Trash2 size={16} /></IconButton>}
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
        <PaymentModal payment={editing} patients={patients}
          onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); refresh(); }} />
      )}
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete} loading={deleting}
        title="Delete payment?" message={toDelete ? `${money(toDelete.amount)} payment will be permanently removed.` : ''} confirmLabel="Delete" />
    </div>
  );
}

function PaymentModal({ payment, patients, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!payment;
  const [form, setForm] = useState(() => ({
    patient_id: payment?.patient_id || '',
    amount: payment?.amount ?? '',
    payment_method: payment?.payment_method || 'cash',
    payment_date: payment?.payment_date || new Date().toISOString().slice(0, 10),
    description: payment?.description || '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    if (!form.amount || Number(form.amount) <= 0) return setError('Amount must be greater than zero.');
    setSaving(true);
    const payload = {
      patient_id: form.patient_id ? Number(form.patient_id) : null,
      amount: Number(form.amount),
      payment_method: form.payment_method,
      payment_date: form.payment_date,
      description: form.description || null,
    };
    try {
      if (isEdit) {
        await paymentsApi.update(payment.id, payload);
        toast.success('Payment updated.');
      } else {
        await paymentsApi.create(payload);
        toast.success('Payment recorded.');
      }
      onSaved();
    } catch (err) {
      setError(getMessage(err, 'Could not save payment.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit payment' : 'Record payment'} subtitle="Log a patient payment" size="md"
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button variant="accent" onClick={submit} loading={saving}>{isEdit ? 'Save changes' : 'Record payment'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Patient" className="sm:col-span-2">
          <Select value={form.patient_id} onChange={(e) => set('patient_id', e.target.value)}>
            <option value="">Walk-in / unlinked</option>
            {patients.map((p) => <option key={p.id} value={p.id}>{p.first_name} {p.last_name} · {p.patient_code}</option>)}
          </Select>
        </Field>
        <Field label="Amount (₱)" required>
          <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Payment method">
          <Select value={form.payment_method} onChange={(e) => set('payment_method', e.target.value)}>
            {METHODS.map((m) => <option key={m} value={m}>{METHOD_LABEL[m]}</option>)}
          </Select>
        </Field>
        <Field label="Date">
          <Input type="date" value={form.payment_date} onChange={(e) => set('payment_date', e.target.value)} />
        </Field>
        <Field label="Description" className="sm:col-span-2">
          <Textarea rows={2} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="e.g. Consultation + cleaning" />
        </Field>
      </div>
      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    </Modal>
  );
}
