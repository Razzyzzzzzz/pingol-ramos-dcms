import { useEffect, useState, useCallback, useMemo } from 'react';
import { Plus, Pencil, Trash2, Clock, Stethoscope } from 'lucide-react';
import { schedulesApi, lookupsApi } from '../services/endpoints';
import { getMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import {
  Button, IconButton, Card, CardHeader, Field, Select, Input,
  Loading, EmptyState, PageHeader,
} from '../components/ui/index.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';

const DAYS = [
  { value: 0, label: 'Sunday' },
  { value: 1, label: 'Monday' },
  { value: 2, label: 'Tuesday' },
  { value: 3, label: 'Wednesday' },
  { value: 4, label: 'Thursday' },
  { value: 5, label: 'Friday' },
  { value: 6, label: 'Saturday' },
];

function shortTime(hhmmss) {
  if (!hhmmss) return '';
  const [h, m] = hhmmss.split(':');
  const d = new Date();
  d.setHours(Number(h), Number(m), 0, 0);
  return d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
}

export default function DoctorSchedules() {
  const toast = useToast();
  const [dentists, setDentists] = useState([]);
  const [dentistId, setDentistId] = useState('');
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);

  const [modalOpen, setModalOpen] = useState(false);
  const [editing, setEditing] = useState(null);
  const [modalDay, setModalDay] = useState(0);
  const [toDelete, setToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);

  const loadDentists = useCallback(async () => {
    try {
      const res = await lookupsApi.only('dentists');
      setDentists(res.data || []);
      if (res.data?.length && !dentistId) setDentistId(String(res.data[0].id));
    } catch (err) {
      toast.error(getMessage(err, 'Could not load dentists.'));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [toast]);

  const loadShifts = useCallback(async () => {
    if (!dentistId) { setShifts([]); setLoading(false); return; }
    setLoading(true);
    try {
      const res = await schedulesApi.list(dentistId);
      setShifts(res.data || []);
    } catch (err) {
      toast.error(getMessage(err, 'Could not load the schedule.'));
    } finally {
      setLoading(false);
    }
  }, [dentistId, toast]);

  useEffect(() => { loadDentists(); }, [loadDentists]);
  useEffect(() => { loadShifts(); }, [loadShifts]);

  const byDay = useMemo(() => {
    const map = {};
    for (const day of DAYS) map[day.value] = [];
    for (const s of shifts) {
      (map[s.day_of_week] ||= []).push(s);
    }
    for (const day of DAYS) map[day.value].sort((a, b) => a.start_time.localeCompare(b.start_time));
    return map;
  }, [shifts]);

  const confirmDelete = async () => {
    if (!toDelete) return;
    setDeleting(true);
    try {
      await schedulesApi.remove(toDelete.id);
      toast.success('Shift removed.');
      setToDelete(null);
      loadShifts();
    } catch (err) {
      toast.error(getMessage(err, 'Could not remove the shift.'));
    } finally {
      setDeleting(false);
    }
  };

  return (
    <div>
      <PageHeader title="Doctor schedule" subtitle="Set weekly working hours per dentist — this drives the times patients can book">
        <Field label="" htmlFor="schedule-dentist" className="w-56">
          <Select
            id="schedule-dentist"
            value={dentistId}
            onChange={(e) => setDentistId(e.target.value)}
          >
            {dentists.map((d) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </Select>
        </Field>
      </PageHeader>

      {!dentists.length ? (
        <EmptyState icon={Stethoscope} title="No dentists yet" message="Add a dentist first, then set up their weekly schedule here." />
      ) : loading ? (
        <Loading label="Loading schedule…" className="py-16" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {DAYS.map((day) => (
            <Card key={day.value}>
              <CardHeader
                title={day.label}
                action={
                  <IconButton
                    aria-label={`Add shift on ${day.label}`}
                    onClick={() => { setEditing(null); setModalDay(day.value); setModalOpen(true); }}
                  >
                    <Plus size={16} />
                  </IconButton>
                }
              />
              {byDay[day.value].length === 0 ? (
                <p className="px-5 py-6 text-center text-sm text-muted">No shifts</p>
              ) : (
                <div className="divide-y divide-line">
                  {byDay[day.value].map((s) => (
                    <div key={s.id} className="flex items-center justify-between gap-2 px-5 py-3">
                      <span className="inline-flex items-center gap-2 text-sm text-ink">
                        <Clock size={14} className="text-muted" />
                        {shortTime(s.start_time)} – {shortTime(s.end_time)}
                      </span>
                      <div className="flex items-center gap-1">
                        <IconButton aria-label="Edit shift" onClick={() => { setEditing(s); setModalDay(day.value); setModalOpen(true); }}>
                          <Pencil size={15} />
                        </IconButton>
                        <IconButton aria-label="Delete shift" className="text-red-500 hover:bg-red-50" onClick={() => setToDelete(s)}>
                          <Trash2 size={15} />
                        </IconButton>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </Card>
          ))}
        </div>
      )}

      {modalOpen && (
        <ShiftModal
          dentistId={dentistId}
          dayOfWeek={modalDay}
          shift={editing}
          onClose={() => setModalOpen(false)}
          onSaved={() => { setModalOpen(false); loadShifts(); }}
        />
      )}

      <ConfirmDialog
        open={!!toDelete}
        onClose={() => setToDelete(null)}
        onConfirm={confirmDelete}
        loading={deleting}
        title="Remove shift?"
        message={toDelete ? `${shortTime(toDelete.start_time)} – ${shortTime(toDelete.end_time)} will be removed. Patients will no longer see this shift's slots as available.` : ''}
        confirmLabel="Remove"
      />
    </div>
  );
}

function ShiftModal({ dentistId, dayOfWeek, shift, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!shift;
  const [form, setForm] = useState({
    day_of_week: shift?.day_of_week ?? dayOfWeek,
    start_time: shift?.start_time?.slice(0, 5) || '08:00',
    end_time: shift?.end_time?.slice(0, 5) || '12:00',
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    if (form.end_time <= form.start_time) {
      setError('End time must be after start time.');
      return;
    }
    setSaving(true);
    const payload = {
      dentist_id: Number(dentistId),
      day_of_week: Number(form.day_of_week),
      start_time: form.start_time,
      end_time: form.end_time,
    };
    try {
      if (isEdit) {
        await schedulesApi.update(shift.id, payload);
        toast.success('Shift updated.');
      } else {
        await schedulesApi.create(payload);
        toast.success('Shift added.');
      }
      onSaved();
    } catch (err) {
      setError(getMessage(err, 'Could not save the shift.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={isEdit ? 'Edit shift' : 'Add shift'}
      subtitle={DAYS.find((d) => d.value === Number(form.day_of_week))?.label}
      size="sm"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button>
          <Button onClick={submit} loading={saving}>{isEdit ? 'Save changes' : 'Add shift'}</Button>
        </>
      }
    >
      <div className="grid gap-4">
        <Field label="Day">
          <Select value={form.day_of_week} onChange={(e) => set('day_of_week', e.target.value)}>
            {DAYS.map((d) => <option key={d.value} value={d.value}>{d.label}</option>)}
          </Select>
        </Field>
        <div className="grid grid-cols-2 gap-4">
          <Field label="Start time" required>
            <Input type="time" value={form.start_time} onChange={(e) => set('start_time', e.target.value)} />
          </Field>
          <Field label="End time" required>
            <Input type="time" value={form.end_time} onChange={(e) => set('end_time', e.target.value)} />
          </Field>
        </div>
      </div>
      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    </Modal>
  );
}
