import { useEffect, useState, useCallback } from 'react';
import {
  Building2, KeyRound, UsersRound, Save, Plus, Pencil, Trash2, ShieldCheck, Loader2,
} from 'lucide-react';
import { settingsApi, usersApi, authApi } from '../services/endpoints';
import { getMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Button, IconButton, Card, CardHeader, Badge, Field, Input, Select, Loading,
  EmptyState, PageHeader,
} from '../components/ui/index.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import { formatDate, titleCase } from '../lib/format';

const ROLE_TONE = { admin: 'navy', dentist: 'blue', staff: 'gray' };

export default function Settings() {
  const { isAdmin } = useAuth();
  const [tab, setTab] = useState('clinic');

  const tabs = [
    { id: 'clinic', label: 'Clinic', icon: Building2 },
    { id: 'password', label: 'Password', icon: KeyRound },
    ...(isAdmin ? [{ id: 'users', label: 'Users', icon: UsersRound }] : []),
  ];

  return (
    <div>
      <PageHeader title="Settings" subtitle="Manage clinic information, security & staff access" />

      <div className="mb-5 flex flex-wrap gap-1 rounded-xl border border-line bg-white p-1 shadow-card sm:inline-flex">
        {tabs.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                active ? 'bg-navy-600 text-white' : 'text-muted hover:bg-canvas hover:text-ink'
              }`}
            >
              <Icon size={16} /> {t.label}
            </button>
          );
        })}
      </div>

      {tab === 'clinic' && <ClinicSettings />}
      {tab === 'password' && <PasswordSettings />}
      {tab === 'users' && isAdmin && <UserManagement />}
    </div>
  );
}

/* ---- Clinic information ---------------------------------------------------- */
function ClinicSettings() {
  const toast = useToast();
  const { isAdmin } = useAuth();
  const [form, setForm] = useState({
    clinic_name: '', clinic_address: '', clinic_phone: '', clinic_email: '',
    operating_hours: '', currency: '', appointment_slot_minutes: '',
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  useEffect(() => {
    settingsApi.get()
      .then((r) => setForm((f) => ({ ...f, ...r.data })))
      .catch((err) => toast.error(getMessage(err, 'Could not load settings.')))
      .finally(() => setLoading(false));
  }, [toast]);

  const save = async () => {
    setSaving(true);
    try {
      await settingsApi.update(form);
      toast.success('Settings saved.');
    } catch (err) {
      toast.error(getMessage(err, 'Could not save settings.'));
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <Loading label="Loading settings…" className="py-16" />;

  return (
    <Card className="max-w-3xl">
      <CardHeader title="Clinic information" subtitle={isAdmin ? 'Shown across the app and on printed documents' : 'Only administrators can edit these'} />
      <div className="grid gap-4 p-5 pt-0 sm:grid-cols-2">
        <Field label="Clinic name" className="sm:col-span-2">
          <Input value={form.clinic_name} onChange={(e) => set('clinic_name', e.target.value)} disabled={!isAdmin} />
        </Field>
        <Field label="Address" className="sm:col-span-2">
          <Input value={form.clinic_address} onChange={(e) => set('clinic_address', e.target.value)} disabled={!isAdmin} />
        </Field>
        <Field label="Phone">
          <Input value={form.clinic_phone} onChange={(e) => set('clinic_phone', e.target.value)} disabled={!isAdmin} />
        </Field>
        <Field label="Email">
          <Input type="email" value={form.clinic_email} onChange={(e) => set('clinic_email', e.target.value)} disabled={!isAdmin} />
        </Field>
        <Field label="Operating hours">
          <Input value={form.operating_hours} onChange={(e) => set('operating_hours', e.target.value)} placeholder="Mon–Sat, 9AM–6PM" disabled={!isAdmin} />
        </Field>
        <div className="grid grid-cols-2 gap-3">
          <Field label="Currency">
            <Input value={form.currency} onChange={(e) => set('currency', e.target.value)} placeholder="PHP" disabled={!isAdmin} />
          </Field>
          <Field label="Slot (min)" hint="Default duration">
            <Input type="number" min="5" step="5" value={form.appointment_slot_minutes} onChange={(e) => set('appointment_slot_minutes', e.target.value)} disabled={!isAdmin} />
          </Field>
        </div>
      </div>
      {isAdmin && (
        <div className="flex justify-end border-t border-line p-4">
          <Button onClick={save} loading={saving}><Save size={16} /> Save changes</Button>
        </div>
      )}
    </Card>
  );
}

/* ---- Change password ------------------------------------------------------ */
function PasswordSettings() {
  const toast = useToast();
  const [form, setForm] = useState({ current: '', next: '', confirm: '' });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    if (!form.current || !form.next) return setError('Please fill in all fields.');
    if (form.next.length < 6) return setError('New password must be at least 6 characters.');
    if (form.next !== form.confirm) return setError('New passwords do not match.');
    setSaving(true);
    try {
      await authApi.changePassword(form.current, form.next);
      toast.success('Password updated.');
      setForm({ current: '', next: '', confirm: '' });
    } catch (err) {
      setError(getMessage(err, 'Could not change password.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card className="max-w-lg">
      <CardHeader title="Change password" subtitle="Update the password for your account" />
      <div className="space-y-4 p-5 pt-0">
        <Field label="Current password">
          <Input type="password" autoComplete="current-password" value={form.current} onChange={(e) => set('current', e.target.value)} />
        </Field>
        <Field label="New password" hint="At least 6 characters">
          <Input type="password" autoComplete="new-password" value={form.next} onChange={(e) => set('next', e.target.value)} />
        </Field>
        <Field label="Confirm new password">
          <Input type="password" autoComplete="new-password" value={form.confirm} onChange={(e) => set('confirm', e.target.value)} />
        </Field>
        {error && <div className="rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
      </div>
      <div className="flex justify-end border-t border-line p-4">
        <Button onClick={submit} loading={saving}><KeyRound size={16} /> Update password</Button>
      </div>
    </Card>
  );
}

/* ---- User management (admin) ---------------------------------------------- */
const ROLES = ['admin', 'dentist', 'staff'];

function UserManagement() {
  const toast = useToast();
  const { user: me } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await usersApi.list();
      setUsers(res.data.items);
    } catch (err) {
      toast.error(getMessage(err, 'Could not load users.'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await usersApi.remove(toDelete.id);
      toast.success('User removed.');
      setToDelete(null);
      load();
    } catch (err) {
      toast.error(getMessage(err, 'Could not remove user.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <Card>
      <CardHeader
        title="Staff accounts"
        subtitle="Manage who can access the system"
        action={<Button size="sm" onClick={() => { setEditing(null); setModalOpen(true); }}><Plus size={16} /> Add user</Button>}
      />
      {loading ? (
        <Loading label="Loading users…" className="py-16" />
      ) : users.length === 0 ? (
        <EmptyState icon={UsersRound} title="No users" message="Add a staff account to get started." />
      ) : (
        <div className="overflow-x-auto scroll-slim">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                <th className="px-5 py-3 font-semibold">Name</th>
                <th className="px-5 py-3 font-semibold">Email</th>
                <th className="px-5 py-3 font-semibold">Role</th>
                <th className="px-5 py-3 font-semibold">Status</th>
                <th className="px-5 py-3 font-semibold">Added</th>
                <th className="px-5 py-3 text-right font-semibold">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {users.map((u) => (
                <tr key={u.id} className="transition hover:bg-canvas/60">
                  <td className="px-5 py-3">
                    <span className="font-semibold text-ink">{u.name}</span>
                    {me?.id === u.id && <span className="ml-2 text-xs text-muted">(you)</span>}
                  </td>
                  <td className="px-5 py-3 text-muted">{u.email}</td>
                  <td className="px-5 py-3"><Badge tone={ROLE_TONE[u.role]}>{titleCase(u.role)}</Badge></td>
                  <td className="px-5 py-3">
                    <Badge tone={u.status === 'active' ? 'green' : 'gray'}>{titleCase(u.status)}</Badge>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDate(u.created_at)}</td>
                  <td className="whitespace-nowrap px-5 py-3">
                    <div className="flex items-center justify-end gap-1">
                      <IconButton onClick={() => { setEditing(u); setModalOpen(true); }} aria-label="Edit"><Pencil size={16} /></IconButton>
                      {me?.id !== u.id && (
                        <IconButton onClick={() => setToDelete(u)} aria-label="Delete" className="text-red-500 hover:bg-red-50"><Trash2 size={16} /></IconButton>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {modalOpen && (
        <UserModal user={editing} onClose={() => setModalOpen(false)} onSaved={() => { setModalOpen(false); load(); }} />
      )}
      <ConfirmDialog open={!!toDelete} onClose={() => setToDelete(null)} onConfirm={confirmDelete} loading={deleting}
        title="Remove user?" message={toDelete ? `${toDelete.name} will lose access to the system.` : ''} confirmLabel="Remove" />
    </Card>
  );
}

function UserModal({ user, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!user;
  const [form, setForm] = useState(() => ({
    name: user?.name || '', email: user?.email || '', role: user?.role || 'staff',
    phone: user?.phone || '', status: user?.status || 'active', password: '',
  }));
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    if (!form.name.trim() || !form.email.trim()) return setError('Name and email are required.');
    if (!isEdit && form.password.length < 6) return setError('Password must be at least 6 characters.');
    setSaving(true);
    try {
      if (isEdit) {
        await usersApi.update(user.id, { name: form.name, email: form.email, role: form.role, phone: form.phone || null, status: form.status });
        if (form.password) {
          if (form.password.length < 6) { setError('Password must be at least 6 characters.'); setSaving(false); return; }
          await usersApi.setPassword(user.id, form.password);
        }
        toast.success('User updated.');
      } else {
        await usersApi.create({ name: form.name, email: form.email, role: form.role, phone: form.phone || null, status: form.status, password: form.password });
        toast.success('User created.');
      }
      onSaved();
    } catch (err) {
      setError(getMessage(err, 'Could not save user.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title={isEdit ? 'Edit user' : 'Add user'} subtitle="Staff account details" size="md"
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={submit} loading={saving}>{isEdit ? 'Save changes' : 'Create user'}</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Full name" required className="sm:col-span-2">
          <Input value={form.name} onChange={(e) => set('name', e.target.value)} />
        </Field>
        <Field label="Email" required className="sm:col-span-2">
          <Input type="email" value={form.email} onChange={(e) => set('email', e.target.value)} />
        </Field>
        <Field label="Role">
          <Select value={form.role} onChange={(e) => set('role', e.target.value)}>
            {ROLES.map((r) => <option key={r} value={r}>{titleCase(r)}</option>)}
          </Select>
        </Field>
        <Field label="Status">
          <Select value={form.status} onChange={(e) => set('status', e.target.value)}>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </Select>
        </Field>
        <Field label="Phone" className="sm:col-span-2">
          <Input value={form.phone} onChange={(e) => set('phone', e.target.value)} />
        </Field>
        <Field label={isEdit ? 'New password' : 'Password'} required={!isEdit} hint={isEdit ? 'Leave blank to keep current' : 'At least 6 characters'} className="sm:col-span-2">
          <Input type="password" autoComplete="new-password" value={form.password} onChange={(e) => set('password', e.target.value)} />
        </Field>
      </div>
      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    </Modal>
  );
}
