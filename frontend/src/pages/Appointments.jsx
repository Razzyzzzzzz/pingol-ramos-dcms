import { useEffect, useMemo, useState, useCallback, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  Plus, Search, Filter, CalendarCheck, Printer, Pencil, Trash2, X, CheckCircle2, XCircle, Wallet,
} from 'lucide-react';
import { appointmentsApi, lookupsApi, patientsApi, paymentsApi } from '../services/endpoints';
import { getMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Button, IconButton, Card, Badge, Field, Input, Select, Textarea, Loading,
  EmptyState, Pagination, PageHeader,
} from '../components/ui/index.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import { formatDate, formatTime, STATUS_TONES, titleCase, money } from '../lib/format';

const STATUSES = ['pending', 'approved', 'completed', 'cancelled'];
const PAYMENT_METHODS = ['cash', 'card', 'gcash', 'bank_transfer', 'other'];

export default function Appointments() {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [lookups, setLookups] = useState({ dentists: [], services: [] });
  const [patients, setPatients] = useState([]);

  const [search, setSearch] = useState(params.get('search') || '');
  const [status, setStatus] = useState(params.get('status') || '');
  const [dentistId, setDentistId] = useState(params.get('dentist_id') || '');
  const [date, setDate] = useState(params.get('date') || '');
  const [page, setPage] = useState(Number(params.get('page') || 1));

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [paying, setPaying] = useState(null);

  // Load dropdown sources once.
  useEffect(() => {
    (async () => {
      try {
        const [lk, pt] = await Promise.all([lookupsApi.all(), patientsApi.list({ limit: 500 })]);
        setLookups({ dentists: lk.data.dentists || [], services: lk.data.services || [] });
        setPatients(pt.data.items || []);
      } catch (err) {
        toast.error(getMessage(err, 'Failed to load form options.'));
      }
    })();
  }, [toast]);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const query = { page, limit: 15 };
      if (search) query.search = search;
      if (status) query.status = status;
      if (dentistId) query.dentist_id = dentistId;
      if (date) query.date = date;
      const res = await appointmentsApi.list(query);
      setItems(res.data.items);
      setMeta({ page: res.data.page, pages: res.data.pages, total: res.data.total });
    } catch (err) {
      if (!silent) toast.error(getMessage(err, 'Could not load appointments.'));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [page, search, status, dentistId, date, toast]);

  useEffect(() => { load(); }, [load]);

  // Auto-refresh so status changes from other staff (or new patient requests)
  // show up without a manual reload. Paused while a modal/dialog is open so
  // it can't clobber in-progress edits. Reads `load` through a ref so the
  // interval's own lifecycle doesn't depend on `load`'s identity (which
  // changes whenever the toast context re-renders) — otherwise the timer
  // gets torn down and restarted before it ever fires.
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);

  useEffect(() => {
    if (modalOpen || toDelete || paying) return;
    const interval = setInterval(() => loadRef.current(true), 30000);
    return () => clearInterval(interval);
  }, [modalOpen, toDelete, paying]);

  // Keep URL in sync (shareable filters).
  useEffect(() => {
    const next = {};
    if (search) next.search = search;
    if (status) next.status = status;
    if (dentistId) next.dentist_id = dentistId;
    if (date) next.date = date;
    if (page > 1) next.page = String(page);
    setParams(next, { replace: true });
  }, [search, status, dentistId, date, page, setParams]);

  const openCreate = () => { setEditing(null); setModalOpen(true); };
  const openEdit = (a) => { setEditing(a); setModalOpen(true); };

  const changeStatus = async (a, newStatus) => {
    try {
      await appointmentsApi.setStatus(a.id, newStatus);
      toast.success(`Appointment marked ${newStatus}.`);
      load();
    } catch (err) {
      toast.error(getMessage(err, 'Could not update status.'));
    }
  };

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await appointmentsApi.remove(toDelete.id);
      toast.success('Appointment deleted.');
      setToDelete(null);
      load();
    } catch (err) {
      toast.error(getMessage(err, 'Could not delete appointment.'));
    } finally {
      setDeleting(false);
    }
  };

  const clearFilters = () => { setSearch(''); setStatus(''); setDentistId(''); setDate(''); setPage(1); };
  const hasFilters = search || status || dentistId || date;

  return (
    <div>
      <PageHeader title="Appointments" subtitle={`${meta.total} total booking${meta.total === 1 ? '' : 's'}`}>
        <Button onClick={openCreate}><Plus size={18} /> New appointment</Button>
      </PageHeader>

      {/* Filter bar */}
      <Card className="mb-5 p-3">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative flex-1">
            <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <Input
              placeholder="Search patient or code…"
              className="pl-10"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            />
          </div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:flex lg:items-center">
            <Select value={status} onChange={(e) => { setStatus(e.target.value); setPage(1); }} className="lg:w-40">
              <option value="">All statuses</option>
              {STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
            </Select>
            <Select value={dentistId} onChange={(e) => { setDentistId(e.target.value); setPage(1); }} className="lg:w-44">
              <option value="">All dentists</option>
              {lookups.dentists.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
            </Select>
            <Input type="date" value={date} onChange={(e) => { setDate(e.target.value); setPage(1); }} className="lg:w-40" />
            {hasFilters && (
              <IconButton onClick={clearFilters} aria-label="Clear filters" className="justify-self-start">
                <X size={17} />
              </IconButton>
            )}
          </div>
        </div>
      </Card>

      {loading ? (
        <Loading label="Loading appointments…" className="py-20" />
      ) : items.length === 0 ? (
        <Card className="p-4">
          <EmptyState
            icon={hasFilters ? Filter : CalendarCheck}
            title={hasFilters ? 'No matches' : 'No appointments yet'}
            message={hasFilters ? 'Try adjusting your filters.' : 'Book the first appointment to get started.'}
            action={hasFilters ? <Button variant="outline" onClick={clearFilters}>Clear filters</Button> : <Button onClick={openCreate}><Plus size={18} /> New appointment</Button>}
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-semibold">Code</th>
                  <th className="px-5 py-3 font-semibold">Patient</th>
                  <th className="px-5 py-3 font-semibold">Dentist</th>
                  <th className="px-5 py-3 font-semibold">Service</th>
                  <th className="px-5 py-3 font-semibold">Schedule</th>
                  <th className="px-5 py-3 font-semibold">Status</th>
                  <th className="px-5 py-3 font-semibold">Payment</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((a) => (
                  <tr key={a.id} className="transition hover:bg-canvas/60">
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-muted">{a.appointment_code}</td>
                    <td className="px-5 py-3">
                      <p className="font-semibold text-ink">{a.patient}</p>
                      {a.patient_contact && <p className="text-xs text-muted">{a.patient_contact}</p>}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted">{a.dentist || '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted">{a.service || '—'}</td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <p className="text-ink">{formatDate(a.appointment_date)}</p>
                      <p className="text-xs text-muted">{formatTime(a.start_time)}{a.end_time ? ` – ${formatTime(a.end_time)}` : ''}</p>
                    </td>
                    <td className="px-5 py-3">
                      <StatusSelect value={a.status} onChange={(s) => changeStatus(a, s)} />
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      {Number(a.paid_amount) > 0 ? (
                        <Badge tone="green">Paid {money(a.paid_amount)}</Badge>
                      ) : (
                        <Badge tone="amber">Unpaid</Badge>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <div className="flex items-center justify-end gap-1">
                        {isAdmin && (
                          <IconButton onClick={() => setPaying(a)} aria-label="Record payment"><Wallet size={16} /></IconButton>
                        )}
                        <IconButton onClick={() => printAppointment(a)} aria-label="Print"><Printer size={16} /></IconButton>
                        <IconButton onClick={() => openEdit(a)} aria-label="Edit"><Pencil size={16} /></IconButton>
                        <IconButton onClick={() => setToDelete(a)} aria-label="Delete" className="text-red-500 hover:bg-red-50"><Trash2 size={16} /></IconButton>
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
        <AppointmentModal
          appointment={editing}
          patients={patients}
          dentists={lookups.dentists}
          services={lookups.services}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); load(); }}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete appointment?"
        message={toDelete ? `This permanently removes ${toDelete.appointment_code} for ${toDelete.patient}.` : ''}
        confirmLabel="Delete"
      />

      {paying && (
        <PaymentModal
          appointment={paying}
          onClose={() => setPaying(null)}
          onSaved={() => { setPaying(null); load(); }}
        />
      )}
    </div>
  );
}

function PaymentModal({ appointment, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    amount: appointment.price ?? '',
    payment_method: 'cash',
    payment_date: new Date().toISOString().slice(0, 10),
    description: appointment.service ? `${appointment.service} · ${appointment.appointment_code}` : appointment.appointment_code,
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    if (!form.amount || Number(form.amount) <= 0) return setError('Amount must be greater than zero.');
    setSaving(true);
    try {
      await paymentsApi.create({
        patient_id: appointment.patient_id,
        appointment_id: appointment.id,
        amount: Number(form.amount),
        payment_method: form.payment_method,
        payment_date: form.payment_date,
        description: form.description || null,
      });
      toast.success('Payment recorded.');
      onSaved();
    } catch (err) {
      setError(getMessage(err, 'Could not record payment.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Record payment"
      subtitle={`${appointment.appointment_code} · ${appointment.patient}`}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>Record payment</Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Amount (₱)" required>
          <Input type="number" min="0" step="0.01" value={form.amount} onChange={(e) => set('amount', e.target.value)} placeholder="0.00" />
        </Field>
        <Field label="Method">
          <Select value={form.payment_method} onChange={(e) => set('payment_method', e.target.value)}>
            {PAYMENT_METHODS.map((m) => <option key={m} value={m}>{titleCase(m)}</option>)}
          </Select>
        </Field>
        <Field label="Date">
          <Input type="date" value={form.payment_date} onChange={(e) => set('payment_date', e.target.value)} />
        </Field>
        <Field label="Description">
          <Input value={form.description} onChange={(e) => set('description', e.target.value)} />
        </Field>
      </div>
      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    </Modal>
  );
}

function StatusSelect({ value, onChange }) {
  return (
    <select
      value={value}
      onChange={(e) => e.target.value !== value && onChange(e.target.value)}
      className={`nums cursor-pointer rounded-full border-0 px-3 py-1 text-xs font-semibold ring-1 ring-inset focus:outline-none focus:ring-2 ${badgeRing(value)}`}
    >
      {STATUSES.map((s) => <option key={s} value={s} className="bg-white text-ink">{titleCase(s)}</option>)}
    </select>
  );
}

function badgeRing(status) {
  const map = {
    pending: 'bg-amber-50 text-amber-700 ring-amber-200',
    approved: 'bg-blue-50 text-blue-700 ring-blue-200',
    completed: 'bg-lime-50 text-lime-700 ring-lime-200',
    cancelled: 'bg-red-50 text-red-700 ring-red-200',
  };
  return map[status] || 'bg-slate-50 text-slate-600 ring-slate-200';
}

function AppointmentModal({ appointment, patients, dentists, services, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!appointment;
  const [form, setForm] = useState(() => ({
    patient_id: appointment?.patient_id || '',
    dentist_id: appointment?.dentist_id || '',
    service_id: appointment?.service_id || '',
    appointment_date: appointment?.appointment_date || '',
    start_time: appointment?.start_time?.slice(0, 5) || '',
    end_time: appointment?.end_time?.slice(0, 5) || '',
    status: appointment?.status || 'pending',
    notes: appointment?.notes || '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const selectedService = useMemo(
    () => services.find((s) => String(s.id) === String(form.service_id)),
    [services, form.service_id]
  );

  // Auto-fill end time from the service duration when start changes.
  useEffect(() => {
    if (form.start_time && selectedService?.duration_minutes && !isEdit) {
      const [h, m] = form.start_time.split(':').map(Number);
      const end = new Date(2000, 0, 1, h, m + Number(selectedService.duration_minutes));
      set('end_time', `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [form.start_time, form.service_id]);

  const submit = async () => {
    setError('');
    if (!form.patient_id) return setError('Please select a patient.');
    if (!form.appointment_date) return setError('Please choose a date.');
    if (!form.start_time) return setError('Please choose a start time.');
    setSaving(true);
    const payload = {
      patient_id: Number(form.patient_id),
      dentist_id: form.dentist_id ? Number(form.dentist_id) : null,
      service_id: form.service_id ? Number(form.service_id) : null,
      appointment_date: form.appointment_date,
      start_time: form.start_time,
      end_time: form.end_time || null,
      status: form.status,
      notes: form.notes || null,
    };
    try {
      if (isEdit) {
        await appointmentsApi.update(appointment.id, payload);
        toast.success('Appointment updated.');
      } else {
        await appointmentsApi.create(payload);
        toast.success('Appointment booked.');
      }
      onSaved();
    } catch (err) {
      setError(getMessage(err, 'Could not save. The slot may be double-booked.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit appointment' : 'New appointment'}
      subtitle={isEdit ? appointment.appointment_code : 'Book a patient into the schedule'}
      size="lg"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{isEdit ? 'Save changes' : 'Book appointment'}</Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Patient" required className="sm:col-span-2">
          <Select value={form.patient_id} onChange={(e) => set('patient_id', e.target.value)}>
            <option value="">Select a patient…</option>
            {patients.map((p) => (
              <option key={p.id} value={p.id}>{p.first_name} {p.last_name} · {p.patient_code}</option>
            ))}
          </Select>
        </Field>

        <Field label="Dentist">
          <Select value={form.dentist_id} onChange={(e) => set('dentist_id', e.target.value)}>
            <option value="">Unassigned</option>
            {dentists.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>

        <Field label="Service" hint={selectedService ? `${money(selectedService.price)} · ${selectedService.duration_minutes} min` : undefined}>
          <Select value={form.service_id} onChange={(e) => set('service_id', e.target.value)}>
            <option value="">Select a service…</option>
            {services.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
          </Select>
        </Field>

        <Field label="Date" required>
          <Input type="date" value={form.appointment_date} onChange={(e) => set('appointment_date', e.target.value)} />
        </Field>

        <div className="grid grid-cols-2 gap-3">
          <Field label="Start time" required>
            <Input type="time" value={form.start_time} onChange={(e) => set('start_time', e.target.value)} />
          </Field>
          <Field label="End time">
            <Input type="time" value={form.end_time} onChange={(e) => set('end_time', e.target.value)} />
          </Field>
        </div>

        <Field label="Status">
          <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
            {STATUSES.map((s) => <option key={s} value={s}>{titleCase(s)}</option>)}
          </Select>
        </Field>

        <Field label="Notes" className="sm:col-span-2">
          <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} placeholder="Optional notes for this visit…" />
        </Field>
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    </Modal>
  );
}

// Print a single appointment via a clean pop-up window.
function printAppointment(a) {
  const w = window.open('', '_blank', 'width=720,height=900');
  if (!w) return;
  w.document.write(`
    <html><head><title>${a.appointment_code}</title>
    <style>
      body{font-family:Georgia,serif;color:#1c2333;padding:40px;max-width:640px;margin:auto}
      h1{color:#22317E;font-size:22px;margin:0}
      .sub{color:#7CB342;font-weight:bold;letter-spacing:.5px}
      table{width:100%;border-collapse:collapse;margin-top:24px}
      td{padding:10px 0;border-bottom:1px solid #e5e8ef;font-size:14px}
      td.k{color:#64748b;width:40%}
      .foot{margin-top:40px;font-size:12px;color:#94a3b8;text-align:center}
    </style></head><body>
      <h1>Pingol Ramos Dental Clinic</h1>
      <p class="sub">APPOINTMENT DETAILS</p>
      <table>
        <tr><td class="k">Reference</td><td>${a.appointment_code}</td></tr>
        <tr><td class="k">Patient</td><td>${a.patient}</td></tr>
        <tr><td class="k">Contact</td><td>${a.patient_contact || '—'}</td></tr>
        <tr><td class="k">Dentist</td><td>${a.dentist || '—'}</td></tr>
        <tr><td class="k">Service</td><td>${a.service || '—'}</td></tr>
        <tr><td class="k">Date</td><td>${formatDate(a.appointment_date)}</td></tr>
        <tr><td class="k">Time</td><td>${formatTime(a.start_time)}${a.end_time ? ' – ' + formatTime(a.end_time) : ''}</td></tr>
        <tr><td class="k">Status</td><td>${titleCase(a.status)}</td></tr>
        <tr><td class="k">Notes</td><td>${a.notes || '—'}</td></tr>
      </table>
      <p class="foot">Generated ${new Date().toLocaleString()}</p>
    </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 250);
}
