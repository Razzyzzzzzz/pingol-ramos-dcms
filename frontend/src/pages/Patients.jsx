import { useEffect, useState, useCallback } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Plus, Search, Users, Pencil, Trash2, Eye, Phone, Mail } from 'lucide-react';
import { patientsApi } from '../services/endpoints';
import { getMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Button, IconButton, Card, Badge, Field, Input, Select, Textarea, Loading,
  EmptyState, Pagination, PageHeader,
} from '../components/ui/index.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import { formatDate, initials, titleCase } from '../lib/format';

export default function Patients() {
  const toast = useToast();
  const navigate = useNavigate();
  const { isAdmin } = useAuth();
  const [params, setParams] = useSearchParams();

  const [items, setItems] = useState([]);
  const [meta, setMeta] = useState({ page: 1, pages: 1, total: 0 });
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState(params.get('search') || '');
  const [page, setPage] = useState(Number(params.get('page') || 1));

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const query = { page, limit: 12 };
      if (search) query.search = search;
      const res = await patientsApi.list(query);
      setItems(res.data.items);
      setMeta({ page: res.data.page, pages: res.data.pages, total: res.data.total });
    } catch (err) {
      toast.error(getMessage(err, 'Could not load patients.'));
    } finally {
      setLoading(false);
    }
  }, [page, search, toast]);

  useEffect(() => { load(); }, [load]);

  // Debounce search from the topbar / input into the URL.
  useEffect(() => {
    const next = {};
    if (search) next.search = search;
    if (page > 1) next.page = String(page);
    setParams(next, { replace: true });
  }, [search, page, setParams]);

  // React to the global search param changing (topbar navigates here).
  useEffect(() => {
    const s = params.get('search') || '';
    setSearch((prev) => (prev === s ? prev : s));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [params.get('search')]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await patientsApi.remove(toDelete.id);
      toast.success('Patient deleted.');
      setToDelete(null);
      load();
    } catch (err) {
      toast.error(getMessage(err, 'Could not delete patient.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Patients" subtitle={`${meta.total} patient record${meta.total === 1 ? '' : 's'}`}>
        <Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={18} /> Add patient</Button>
      </PageHeader>

      <Card className="mb-5 p-3">
        <div className="relative">
          <Search size={17} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
          <Input
            placeholder="Search by name, code, contact, or email…"
            className="pl-10"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          />
        </div>
      </Card>

      {loading ? (
        <Loading label="Loading patients…" className="py-20" />
      ) : items.length === 0 ? (
        <Card className="p-4">
          <EmptyState
            icon={Users}
            title={search ? 'No matches' : 'No patients yet'}
            message={search ? 'Try a different search term.' : 'Add your first patient to begin building records.'}
            action={!search && <Button onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={18} /> Add patient</Button>}
          />
        </Card>
      ) : (
        <Card>
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-semibold">Patient</th>
                  <th className="px-5 py-3 font-semibold">Code</th>
                  <th className="px-5 py-3 font-semibold">Age / Gender</th>
                  <th className="px-5 py-3 font-semibold">Contact</th>
                  <th className="px-5 py-3 font-semibold">Registered</th>
                  <th className="px-5 py-3 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {items.map((p) => (
                  <tr
                    key={p.id}
                    className="cursor-pointer transition hover:bg-canvas/60"
                    onClick={() => navigate(`/patients/${p.id}`)}
                  >
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-3">
                        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-full bg-navy-100 text-xs font-bold text-navy-700">
                          {initials(`${p.first_name} ${p.last_name}`)}
                        </span>
                        <p className="font-semibold text-ink">{p.first_name} {p.last_name}</p>
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 font-mono text-xs text-muted">{p.patient_code}</td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted">
                      {p.age != null ? `${p.age} yrs` : '—'}{p.gender ? ` · ${titleCase(p.gender)}` : ''}
                    </td>
                    <td className="whitespace-nowrap px-5 py-3">
                      <div className="space-y-0.5 text-xs text-muted">
                        {p.contact_number && <p className="flex items-center gap-1.5"><Phone size={12} /> {p.contact_number}</p>}
                        {p.email && <p className="flex items-center gap-1.5"><Mail size={12} /> {p.email}</p>}
                        {!p.contact_number && !p.email && '—'}
                      </div>
                    </td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDate(p.created_at)}</td>
                    <td className="whitespace-nowrap px-5 py-3" onClick={(e) => e.stopPropagation()}>
                      <div className="flex items-center justify-end gap-1">
                        <IconButton onClick={() => navigate(`/patients/${p.id}`)} aria-label="View"><Eye size={16} /></IconButton>
                        <IconButton onClick={() => { setEditing(p); setModalOpen(true); }} aria-label="Edit"><Pencil size={16} /></IconButton>
                        {isAdmin && (
                          <IconButton onClick={() => setToDelete(p)} aria-label="Delete" className="text-red-500 hover:bg-red-50"><Trash2 size={16} /></IconButton>
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
        <PatientModal
          patient={editing}
          onClose={() => setModalOpen(false)}
          onSaved={(id, goDetail) => { setModalOpen(false); load(); if (goDetail && id) navigate(`/patients/${id}`); }}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Delete patient?"
        message={toDelete ? `This permanently removes ${toDelete.first_name} ${toDelete.last_name} and all linked records.` : ''}
        confirmLabel="Delete"
      />
    </div>
  );
}

const GENDERS = ['male', 'female', 'other'];

export function PatientModal({ patient, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!patient;
  const [form, setForm] = useState(() => ({
    first_name: patient?.first_name || '',
    last_name: patient?.last_name || '',
    birthdate: patient?.birthdate || '',
    gender: patient?.gender || '',
    contact_number: patient?.contact_number || '',
    email: patient?.email || '',
    address: patient?.address || '',
    medical_history: patient?.medical_history || '',
    allergies: patient?.allergies || '',
    existing_conditions: patient?.existing_conditions || '',
    emergency_contact_name: patient?.emergency_contact_name || '',
    emergency_contact_number: patient?.emergency_contact_number || '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    if (!form.first_name.trim() || !form.last_name.trim()) {
      return setError('First and last name are required.');
    }
    setSaving(true);
    const payload = { ...form, gender: form.gender || null };
    try {
      if (isEdit) {
        await patientsApi.update(patient.id, payload);
        toast.success('Patient updated.');
        onSaved(patient.id, false);
      } else {
        const res = await patientsApi.create(payload);
        toast.success('Patient added.');
        onSaved(res.data.id, true);
      }
    } catch (err) {
      setError(getMessage(err, 'Could not save patient.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit patient' : 'Add patient'}
      subtitle={isEdit ? patient.patient_code : 'Create a new patient record'}
      size="xl"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{isEdit ? 'Save changes' : 'Add patient'}</Button>
        </>
      }
    >
      <div className="space-y-6">
        <section>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-navy-600">Personal information</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="First name" required>
              <Input value={form.first_name} onChange={(e) => set('first_name', e.target.value)} />
            </Field>
            <Field label="Last name" required>
              <Input value={form.last_name} onChange={(e) => set('last_name', e.target.value)} />
            </Field>
            <Field label="Birthdate">
              <Input type="date" value={form.birthdate} onChange={(e) => set('birthdate', e.target.value)} />
            </Field>
            <Field label="Gender">
              <Select value={form.gender} onChange={(e) => set('gender', e.target.value)}>
                <option value="">Prefer not to say</option>
                {GENDERS.map((g) => <option key={g} value={g}>{titleCase(g)}</option>)}
              </Select>
            </Field>
            <Field label="Contact number">
              <Input value={form.contact_number} onChange={(e) => set('contact_number', e.target.value)} placeholder="0917…" />
            </Field>
            <Field label="Email">
              <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
            </Field>
            <Field label="Address" className="sm:col-span-2">
              <Textarea rows={2} value={form.address} onChange={(e) => set('address', e.target.value)} />
            </Field>
          </div>
        </section>

        <section>
          <h4 className="mb-3 text-xs font-bold uppercase tracking-wide text-navy-600">Medical information</h4>
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label="Medical history" className="sm:col-span-2">
              <Textarea rows={2} value={form.medical_history} onChange={(e) => set('medical_history', e.target.value)} />
            </Field>
            <Field label="Allergies">
              <Textarea rows={2} value={form.allergies} onChange={(e) => set('allergies', e.target.value)} />
            </Field>
            <Field label="Existing conditions">
              <Textarea rows={2} value={form.existing_conditions} onChange={(e) => set('existing_conditions', e.target.value)} />
            </Field>
            <Field label="Emergency contact name">
              <Input value={form.emergency_contact_name} onChange={(e) => set('emergency_contact_name', e.target.value)} />
            </Field>
            <Field label="Emergency contact number">
              <Input value={form.emergency_contact_number} onChange={(e) => set('emergency_contact_number', e.target.value)} />
            </Field>
          </div>
        </section>
      </div>

      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    </Modal>
  );
}
