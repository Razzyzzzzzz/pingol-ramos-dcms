import { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Package, PackageX, AlertTriangle, CalendarClock,
  Pencil, Trash2, Filter, X,
} from 'lucide-react';
import { inventoryApi, lookupsApi } from '../services/endpoints';
import { getMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Button, IconButton, Card, Badge, Field, Input, Select, Loading,
  EmptyState, Pagination, PageHeader, StatCard,
} from '../components/ui/index.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import { money, number, formatDate } from '../lib/format';

const FILTERS = [
  { id: '', label: 'All items' },
  { id: 'low', label: 'Low stock' },
  { id: 'out', label: 'Out of stock' },
  { id: 'expired', label: 'Expired' },
];

export default function Inventory() {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [summary, setSummary] = useState({ total: 0, low: 0, out: 0, expiring: 0 });
  const [suppliers, setSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);

  const [search, setSearch] = useState(params.get('search') || '');
  const [filter, setFilter] = useState(params.get('filter') || '');
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    lookupsApi.only('suppliers').then((r) => setSuppliers(r.data)).catch(() => {});
  }, []);

  const loadSummary = useCallback(async () => {
    try {
      const res = await inventoryApi.summary();
      setSummary(res.data);
    } catch { /* non-critical */ }
  }, []);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = { page, limit: 12 };
      if (search) query.search = search;
      if (filter) query.filter = filter;
      const res = await inventoryApi.list(query);
      setItems(res.data.items);
      setMeta({ page: res.data.page, pages: res.data.pages, total: res.data.total });
    } catch (err) {
      toast.error(getMessage(err, 'Could not load inventory.'));
    } finally {
      setLoading(false);
    }
  }, [page, search, filter, toast]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => { loadSummary(); }, [loadSummary]);

  useEffect(() => {
    const next = {};
    if (search) next.search = search;
    if (filter) next.filter = filter;
    setParams(next, { replace: true });
  }, [search, filter, setParams]);

  const refresh = () => { load(); loadSummary(); };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await inventoryApi.remove(toDelete.id);
      toast.success('Item deleted.');
      setToDelete(null);
      refresh();
    } catch (err) {
      toast.error(getMessage(err, 'Could not delete item.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Inventory" subtitle="Track supplies, stock levels & expiry">
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={18} /> Add item</Button>
      </PageHeader>

      {/* Summary */}
      <div className="mb-5 grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard icon={Package} label="Active items" value={number(summary.total)} tone="navy" onClick={() => { setFilter(''); setPage(1); }} />
        <StatCard icon={AlertTriangle} label="Low stock" value={number(summary.low)} tone={summary.low ? 'amber' : 'slate'} onClick={() => { setFilter('low'); setPage(1); }} />
        <StatCard icon={PackageX} label="Out of stock" value={number(summary.out)} tone={summary.out ? 'red' : 'slate'} onClick={() => { setFilter('out'); setPage(1); }} />
        <StatCard icon={CalendarClock} label="Expiring soon" value={number(summary.expiring)} tone={summary.expiring ? 'amber' : 'slate'} onClick={() => { setFilter('expired'); setPage(1); }} />
      </div>

      {/* Filter bar */}
      <Card className="mb-5 p-3">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
          <div className="relative flex-1">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input placeholder="Search products or categories…" className="pl-10" value={search} onChange={(e) => { setSearch(e.target.value); setPage(1); }} />
          </div>
          <div className="flex flex-wrap gap-1.5">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                onClick={() => { setFilter(f.id); setPage(1); }}
                className={`rounded-lg px-3 py-2 text-sm font-medium transition ${
                  filter === f.id ? 'bg-navy-600 text-white' : 'bg-canvas text-muted hover:text-ink'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>
      </Card>

      {loading ? (
        <Loading label="Loading inventory…" className="py-20" />
      ) : items.length === 0 ? (
        <Card className="p-4">
          <EmptyState
            icon={search || filter ? Filter : Package}
            title={search || filter ? 'No matches' : 'No inventory items'}
            message={search || filter ? 'Try adjusting the filter.' : 'Add your first item to start tracking stock.'}
            action={!search && !filter && <Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={18} /> Add item</Button>}
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-semibold">Product</th>
                  <th className="px-5 py-3 font-semibold">Category</th>
                  <th className="px-5 py-3 font-semibold">Stock</th>
                  <th className="px-5 py-3 font-semibold">Selling price</th>
                  <th className="px-5 py-3 font-semibold">Supplier</th>
                  <th className="px-5 py-3 font-semibold">Expiry</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((it) => (
                  <tr key={it.id} className="transition hover:bg-canvas/60">
                    <td className="px-5 py-3 font-semibold text-ink">{it.product_name}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted">{it.category || '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="nums font-semibold text-ink">{number(it.quantity)}</span>
                        <span className="text-xs text-muted">{it.unit}</span>
                        <StockBadge state={it.stock_state} />
                      </div>
                    </td>
                    <td className="nums whitespace-nowrap px-5 py-3 text-ink">{money(it.selling_price)}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted">{it.supplier_name || '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3">
                      {it.expiration_date ? (
                        <span className={Number(it.is_expired) ? 'font-medium text-red-600' : 'text-muted'}>
                          {formatDate(it.expiration_date)}
                        </span>
                      ) : <span className="text-muted">—</span>}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        <IconButton onClick={() => { setEditing(it); setModalOpen(true); }} aria-label="Edit"><Pencil size={16} /></IconButton>
                        {isAdmin && (
                          <IconButton onClick={() => setToDelete(it)} aria-label="Delete" className="text-red-500 hover:bg-red-50"><Trash2 size={16} /></IconButton>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Pagination page={meta.page} pages={meta.pages} total={meta.total} onPage={setPage} />
        </Card>
      )}

      {modalOpen && (
        <InventoryModal
          item={editing}
          suppliers={suppliers}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); refresh(); }}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete item?"
        message={toDelete ? `"${toDelete.product_name}" will be permanently removed.` : ''}
        confirmLabel="Delete"
      />
    </div>
  );
}

function StockBadge({ state }) {
  if (state === 'out') return <Badge tone="red">Out</Badge>;
  if (state === 'low') return <Badge tone="amber">Low</Badge>;
  return <Badge tone="green">OK</Badge>;
}

function InventoryModal({ item, suppliers, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!item;
  const [form, setForm] = useState(() => ({
    product_name: item?.product_name || '',
    category: item?.category || '',
    quantity: item?.quantity ?? '',
    unit: item?.unit || 'pcs',
    reorder_level: item?.reorder_level ?? 10,
    purchase_price: item?.purchase_price ?? '',
    selling_price: item?.selling_price ?? '',
    supplier_id: item?.supplier_id || '',
    expiration_date: item?.expiration_date || '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    if (!form.product_name.trim()) return setError('Product name is required.');
    setSaving(true);
    const payload = {
      product_name: form.product_name,
      category: form.category || null,
      quantity: Number(form.quantity || 0),
      unit: form.unit || 'pcs',
      reorder_level: Number(form.reorder_level || 0),
      purchase_price: Number(form.purchase_price || 0),
      selling_price: Number(form.selling_price || 0),
      supplier_id: form.supplier_id ? Number(form.supplier_id) : null,
      expiration_date: form.expiration_date || null,
    };
    try {
      if (isEdit) {
        await inventoryApi.update(item.id, payload);
        toast.success('Item updated.');
      } else {
        await inventoryApi.create(payload);
        toast.success('Item added.');
      }
      onSaved();
    } catch (err) {
      setError(getMessage(err, 'Could not save item.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit item' : 'Add item'} subtitle="Inventory product details" size="lg"
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={submit} loading={saving}>{isEdit ? 'Save changes' : 'Add item'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Product name" required className="sm:col-span-2">
          <Input value={form.product_name} onChange={(e) => set('product_name', e.target.value)} placeholder="e.g. Disposable gloves (M)" />
        </Field>
        <Field label="Category">
          <Input value={form.category} onChange={(e) => set('category', e.target.value)} placeholder="e.g. Consumables" />
        </Field>
        <Field label="Supplier">
          <Select value={form.supplier_id} onChange={(e) => set('supplier_id', e.target.value)}>
            <option value="">None</option>
            {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Quantity">
            <Input type="number" min="0" value={form.quantity} onChange={(e) => set('quantity', e.target.value)} />
          </Field>
          <Field label="Unit">
            <Input value={form.unit} onChange={(e) => set('unit', e.target.value)} placeholder="pcs, box…" />
          </Field>
        </div>
        <Field label="Reorder level" hint="Alert when stock hits this">
          <Input type="number" min="0" value={form.reorder_level} onChange={(e) => set('reorder_level', e.target.value)} />
        </Field>
        <Field label="Purchase price (₱)">
          <Input type="number" min="0" step="0.01" value={form.purchase_price} onChange={(e) => set('purchase_price', e.target.value)} />
        </Field>
        <Field label="Selling price (₱)">
          <Input type="number" min="0" step="0.01" value={form.selling_price} onChange={(e) => set('selling_price', e.target.value)} />
        </Field>
        <Field label="Expiration date" className="sm:col-span-2">
          <Input type="date" value={form.expiration_date} onChange={(e) => set('expiration_date', e.target.value)} />
        </Field>
      </div>
      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    </Modal>
  );
}
