import { useEffect, useState, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Pencil, Printer, Plus, Upload, FileText, Image as ImageIcon,
  Download, Trash2, Stethoscope, CalendarCheck, Wallet, Paperclip, X,
  Phone, Mail, MapPin, AlertCircle, HeartPulse, Activity, User,
} from 'lucide-react';
import { patientsApi, treatmentsApi, recordsApi, lookupsApi } from '../services/endpoints';
import { getMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import { useAuth } from '../context/AuthContext';
import {
  Button, IconButton, Card, CardHeader, Badge, Field, Input, Select, Textarea,
  Loading, EmptyState,
} from '../components/ui/index.jsx';
import { Modal, ConfirmDialog } from '../components/ui/Modal.jsx';
import { PatientModal } from './Patients.jsx';
import {
  formatDate, formatTime, money, initials, titleCase, STATUS_TONES,
} from '../lib/format';

const RECORD_CATEGORIES = ['xray', 'lab_result', 'document', 'prescription', 'other'];
const CATEGORY_LABEL = {
  xray: 'X-ray', lab_result: 'Lab result', document: 'Document',
  prescription: 'Prescription', other: 'Other',
};
const TABS = [
  { id: 'appointments', label: 'Appointments', icon: CalendarCheck },
  { id: 'treatments', label: 'Treatments', icon: Stethoscope },
  { id: 'files', label: 'Dental Records', icon: Paperclip },
  { id: 'payments', label: 'Payments', icon: Wallet },
];

export default function PatientDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const { isAdmin } = useAuth();

  const [bundle, setBundle] = useState(null);
  const [loading, setLoading] = useState(true);
  const [tab, setTab] = useState('appointments');
  const [dentists, setDentists] = useState([]);

  const [editOpen, setEditOpen] = useState(false);
  const [treatmentOpen, setTreatmentOpen] = useState(false);
  const [uploadOpen, setUploadOpen] = useState(false);
  const [preview, setPreview] = useState(null);
  const [toDeleteFile, setToDeleteFile] = useState(null);
  const [toDeleteTreatment, setToDeleteTreatment] = useState(null);

  const load = useCallback(async () => {
    try {
      const res = await patientsApi.get(id);
      setBundle(res.data);
    } catch (err) {
      toast.error(getMessage(err, 'Could not load patient.'));
      navigate('/patients');
    } finally {
      setLoading(false);
    }
  }, [id, toast, navigate]);

  useEffect(() => { load(); }, [load]);
  useEffect(() => {
    lookupsApi.only('dentists').then((r) => setDentists(r.data)).catch(() => {});
  }, []);

  const openPreview = async (file) => {
    try {
      const blob = await recordsApi.fetchBlob(file.id);
      const url = URL.createObjectURL(blob);
      setPreview({ ...file, url, blobType: blob.type });
    } catch (err) {
      toast.error(getMessage(err, 'Could not open file.'));
    }
  };

  const downloadFile = async (file) => {
    try {
      const blob = await recordsApi.fetchBlob(file.id);
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = file.file_name || file.title;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
    } catch (err) {
      toast.error(getMessage(err, 'Could not download file.'));
    }
  };

  const deleteFile = async () => {
    if (!toDeleteFile) return;
    try {
      await recordsApi.remove(toDeleteFile.id);
      toast.success('File removed.');
      setToDeleteFile(null);
      load();
    } catch (err) {
      toast.error(getMessage(err, 'Could not remove file.'));
    }
  };

  const deleteTreatment = async () => {
    if (!toDeleteTreatment) return;
    try {
      await treatmentsApi.remove(toDeleteTreatment.id);
      toast.success('Treatment removed.');
      setToDeleteTreatment(null);
      load();
    } catch (err) {
      toast.error(getMessage(err, 'Could not remove treatment.'));
    }
  };

  if (loading) return <Loading label="Loading patient…" className="py-24" />;
  if (!bundle) return null;

  const { patient, appointments, treatments, files, payments } = bundle;
  const fullName = `${patient.first_name} ${patient.last_name}`;
  const counts = {
    appointments: appointments.length,
    treatments: treatments.length,
    files: files.length,
    payments: payments.length,
  };

  return (
    <div className="space-y-6">
      {/* Back + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <button onClick={() => navigate('/patients')} className="inline-flex items-center gap-1.5 text-sm font-medium text-muted transition hover:text-ink">
          <ArrowLeft size={16} /> All patients
        </button>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={() => printPatientRecord(bundle)}><Printer size={16} /> Print record</Button>
          <Button variant="outline" onClick={() => setEditOpen(true)}><Pencil size={16} /> Edit</Button>
        </div>
      </div>

      {/* Header card */}
      <Card className="overflow-hidden">
        <div className="flex flex-col gap-5 p-6 sm:flex-row sm:items-start">
          <span className="grid h-20 w-20 shrink-0 place-items-center rounded-2xl bg-navy-100 text-2xl font-bold text-navy-700">
            {initials(fullName)}
          </span>
          <div className="flex-1">
            <div className="flex flex-wrap items-center gap-3">
              <h1 className="font-display text-2xl font-bold text-ink">{fullName}</h1>
              <Badge tone="blue">{patient.patient_code}</Badge>
            </div>
            <div className="mt-3 grid gap-x-8 gap-y-2 text-sm sm:grid-cols-2 lg:grid-cols-3">
              <Info icon={User} label="Age / Gender" value={`${patient.age != null ? patient.age + ' yrs' : '—'}${patient.gender ? ' · ' + titleCase(patient.gender) : ''}`} />
              <Info icon={Phone} label="Contact" value={patient.contact_number || '—'} />
              <Info icon={Mail} label="Email" value={patient.email || '—'} />
              <Info icon={MapPin} label="Address" value={patient.address || '—'} />
              <Info icon={AlertCircle} label="Emergency" value={patient.emergency_contact_name ? `${patient.emergency_contact_name} · ${patient.emergency_contact_number || ''}` : '—'} />
              <Info icon={CalendarCheck} label="Registered" value={formatDate(patient.created_at)} />
            </div>
          </div>
        </div>

        {/* Medical strip */}
        {(patient.medical_history || patient.allergies || patient.existing_conditions) && (
          <div className="grid gap-px border-t border-line bg-line sm:grid-cols-3">
            <MedBox icon={HeartPulse} tone="navy" label="Medical history" value={patient.medical_history} />
            <MedBox icon={Activity} tone="red" label="Allergies" value={patient.allergies} />
            <MedBox icon={AlertCircle} tone="amber" label="Existing conditions" value={patient.existing_conditions} />
          </div>
        )}
      </Card>

      {/* Tabs */}
      <div className="flex flex-wrap gap-1 rounded-xl border border-line bg-white p-1 shadow-card">
        {TABS.map((t) => {
          const Icon = t.icon;
          const active = tab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition ${
                active ? 'bg-navy-600 text-white shadow-sm' : 'text-muted hover:bg-canvas hover:text-ink'
              }`}
            >
              <Icon size={16} /> {t.label}
              <span className={`nums rounded-full px-1.5 text-xs ${active ? 'bg-white/20' : 'bg-canvas text-muted'}`}>{counts[t.id]}</span>
            </button>
          );
        })}
      </div>

      {/* Tab body */}
      {tab === 'appointments' && (
        <Card>
          <CardHeader title="Appointment history" />
          <div className="p-2">
            {appointments.length === 0 ? <MiniEmpty icon={CalendarCheck} text="No appointments recorded." /> : (
              <ul className="divide-y divide-line">
                {appointments.map((a) => (
                  <li key={a.id} className="flex items-center gap-4 px-3 py-3">
                    <div className="flex h-11 w-11 shrink-0 flex-col items-center justify-center rounded-lg bg-canvas text-center">
                      <span className="text-[10px] font-semibold uppercase text-muted">{formatDate(a.appointment_date, { month: 'short' })}</span>
                      <span className="nums text-sm font-bold text-ink">{new Date(a.appointment_date).getDate()}</span>
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{a.service || 'General appointment'}</p>
                      <p className="text-xs text-muted">{a.dentist || 'Unassigned'} · {formatTime(a.start_time)} · {a.appointment_code}</p>
                    </div>
                    <Badge tone={STATUS_TONES[a.status]}>{titleCase(a.status)}</Badge>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}

      {tab === 'treatments' && (
        <Card>
          <CardHeader title="Treatment & procedure history" action={
            <Button size="sm" onClick={() => setTreatmentOpen(true)}><Plus size={16} /> Add treatment</Button>
          } />
          <div className="p-2">
            {treatments.length === 0 ? <MiniEmpty icon={Stethoscope} text="No treatments recorded yet." /> : (
              <ul className="space-y-3 p-2">
                {treatments.map((t) => (
                  <li key={t.id} className="rounded-xl border border-line p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-semibold text-ink">{t.treatment_name}</p>
                        <p className="text-xs text-muted">{formatDate(t.treatment_date)} · {t.dentist_name || t.dentist || 'Unassigned'}{t.tooth_number ? ` · Tooth ${t.tooth_number}` : ''}</p>
                      </div>
                      <div className="flex items-center gap-2">
                        {Number(t.cost) > 0 && <span className="nums text-sm font-bold text-navy-700">{money(t.cost)}</span>}
                        <IconButton onClick={() => setToDeleteTreatment(t)} aria-label="Delete" className="text-red-500 hover:bg-red-50"><Trash2 size={15} /></IconButton>
                      </div>
                    </div>
                    {(t.diagnosis || t.procedure_notes || t.prescription) && (
                      <div className="mt-3 grid gap-2 text-sm sm:grid-cols-3">
                        {t.diagnosis && <Detail label="Diagnosis" value={t.diagnosis} />}
                        {t.procedure_notes && <Detail label="Procedure" value={t.procedure_notes} />}
                        {t.prescription && <Detail label="Prescription" value={t.prescription} />}
                      </div>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}

      {tab === 'files' && (
        <Card>
          <CardHeader title="Uploaded records" subtitle="X-rays, lab results, prescriptions & documents" action={
            <Button size="sm" onClick={() => setUploadOpen(true)}><Upload size={16} /> Upload file</Button>
          } />
          <div className="p-4">
            {files.length === 0 ? <MiniEmpty icon={Paperclip} text="No files uploaded yet." /> : (
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {files.map((f) => {
                  const isImg = (f.file_type || '').startsWith('image/');
                  return (
                    <div key={f.id} className="group rounded-xl border border-line p-4 transition hover:shadow-card">
                      <div className="flex items-start gap-3">
                        <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-lg ${isImg ? 'bg-lime-100 text-lime-700' : 'bg-navy-100 text-navy-700'}`}>
                          {isImg ? <ImageIcon size={18} /> : <FileText size={18} />}
                        </span>
                        <div className="min-w-0 flex-1">
                          <p className="truncate font-semibold text-ink" title={f.title}>{f.title}</p>
                          <p className="text-xs text-muted">{CATEGORY_LABEL[f.category] || f.category} · {formatDate(f.created_at)}</p>
                        </div>
                      </div>
                      {f.notes && <p className="mt-2 line-clamp-2 text-xs text-muted">{f.notes}</p>}
                      <div className="mt-3 flex items-center gap-1 border-t border-line pt-3">
                        <Button variant="ghost" size="sm" onClick={() => openPreview(f)}><Eye size={15} /> Preview</Button>
                        <Button variant="ghost" size="sm" onClick={() => downloadFile(f)}><Download size={15} /></Button>
                        <IconButton onClick={() => setToDeleteFile(f)} aria-label="Delete" className="ml-auto text-red-500 hover:bg-red-50"><Trash2 size={15} /></IconButton>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </Card>
      )}

      {tab === 'payments' && (
        <Card>
          <CardHeader title="Payment history" />
          <div className="p-2">
            {payments.length === 0 ? <MiniEmpty icon={Wallet} text="No payments recorded." /> : (
              <ul className="divide-y divide-line">
                {payments.map((p) => (
                  <li key={p.id} className="flex items-center gap-4 px-3 py-3">
                    <span className="grid h-10 w-10 shrink-0 place-items-center rounded-lg bg-lime-100 text-lime-700"><Wallet size={16} /></span>
                    <div className="min-w-0 flex-1">
                      <p className="font-semibold text-ink">{p.description || 'Payment'}</p>
                      <p className="text-xs text-muted">{titleCase(p.payment_method)} · {formatDate(p.payment_date)}</p>
                    </div>
                    <span className="nums font-bold text-lime-700">{money(p.amount)}</span>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      )}

      {/* Modals */}
      {editOpen && (
        <PatientModal patient={patient} onClose={() => setEditOpen(false)} onSaved={() => { setEditOpen(false); load(); }} />
      )}
      {treatmentOpen && (
        <TreatmentModal patientId={patient.id} dentists={dentists} appointments={appointments}
          onClose={() => setTreatmentOpen(false)} onSaved={() => { setTreatmentOpen(false); load(); }} />
      )}
      {uploadOpen && (
        <UploadModal patientId={patient.id} onClose={() => setUploadOpen(false)} onSaved={() => { setUploadOpen(false); load(); }} />
      )}
      {preview && <PreviewModal file={preview} onClose={() => { URL.revokeObjectURL(preview.url); setPreview(null); }} onDownload={() => downloadFile(preview)} />}

      <ConfirmDialog open={!!toDeleteFile} onClose={() => setToDeleteFile(null)} onConfirm={deleteFile}
        title="Remove file?" message={toDeleteFile ? `"${toDeleteFile.title}" will be permanently deleted.` : ''} confirmLabel="Remove" />
      <ConfirmDialog open={!!toDeleteTreatment} onClose={() => setToDeleteTreatment(null)} onConfirm={deleteTreatment}
        title="Remove treatment?" message={toDeleteTreatment ? `"${toDeleteTreatment.treatment_name}" will be permanently deleted.` : ''} confirmLabel="Remove" />
    </div>
  );
}

/* ---- small presentational bits ------------------------------------------- */

function Info({ icon: Icon, label, value }) {
  return (
    <div className="flex items-start gap-2">
      <Icon size={15} className="mt-0.5 shrink-0 text-muted" />
      <div className="min-w-0">
        <p className="text-xs text-muted">{label}</p>
        <p className="truncate font-medium text-ink">{value}</p>
      </div>
    </div>
  );
}

function MedBox({ icon: Icon, tone, label, value }) {
  if (!value) return <div className="bg-white p-4" />;
  const tones = { navy: 'text-navy-600', red: 'text-red-500', amber: 'text-amber-600' };
  return (
    <div className="bg-white p-4">
      <p className={`mb-1 flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide ${tones[tone]}`}>
        <Icon size={14} /> {label}
      </p>
      <p className="text-sm text-ink">{value}</p>
    </div>
  );
}

function Detail({ label, value }) {
  return (
    <div className="rounded-lg bg-canvas p-2.5">
      <p className="text-[11px] font-semibold uppercase tracking-wide text-muted">{label}</p>
      <p className="mt-0.5 text-ink">{value}</p>
    </div>
  );
}

function MiniEmpty({ icon: Icon, text }) {
  return (
    <div className="flex flex-col items-center gap-2 py-12 text-center">
      <span className="grid h-11 w-11 place-items-center rounded-full bg-canvas text-muted"><Icon size={20} /></span>
      <p className="text-sm text-muted">{text}</p>
    </div>
  );
}

// Lightweight "Eye" glyph re-export to avoid an extra import line up top.
function Eye(props) {
  return (
    <svg {...props} xmlns="http://www.w3.org/2000/svg" width={props.size || 16} height={props.size || 16}
      viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z" /><circle cx="12" cy="12" r="3" />
    </svg>
  );
}

/* ---- Treatment modal ------------------------------------------------------ */

function TreatmentModal({ patientId, dentists, appointments, onClose, onSaved }) {
  const toast = useToast();
  const [form, setForm] = useState({
    treatment_name: '', dentist_id: '', appointment_id: '', tooth_number: '',
    diagnosis: '', procedure_notes: '', prescription: '', cost: '',
    treatment_date: new Date().toISOString().slice(0, 10),
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const submit = async () => {
    setError('');
    if (!form.treatment_name.trim()) return setError('Treatment / procedure name is required.');
    setSaving(true);
    try {
      await treatmentsApi.create({
        patient_id: patientId,
        treatment_name: form.treatment_name,
        dentist_id: form.dentist_id ? Number(form.dentist_id) : null,
        appointment_id: form.appointment_id ? Number(form.appointment_id) : null,
        tooth_number: form.tooth_number || null,
        diagnosis: form.diagnosis || null,
        procedure_notes: form.procedure_notes || null,
        prescription: form.prescription || null,
        cost: Number(form.cost || 0),
        treatment_date: form.treatment_date,
      });
      toast.success('Treatment recorded.');
      onSaved();
    } catch (err) {
      setError(getMessage(err, 'Could not save treatment.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Add treatment" subtitle="Record a clinical procedure" size="lg"
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={submit} loading={saving}>Save treatment</Button></>}>
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Treatment / procedure" required className="sm:col-span-2">
          <Input value={form.treatment_name} onChange={(e) => set('treatment_name', e.target.value)} placeholder="e.g. Tooth extraction" />
        </Field>
        <Field label="Dentist">
          <Select value={form.dentist_id} onChange={(e) => set('dentist_id', e.target.value)}>
            <option value="">Unassigned</option>
            {dentists.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
          </Select>
        </Field>
        <Field label="Link to appointment">
          <Select value={form.appointment_id} onChange={(e) => set('appointment_id', e.target.value)}>
            <option value="">None</option>
            {appointments.map((a) => <option key={a.id} value={a.id}>{a.appointment_code} · {formatDate(a.appointment_date)}</option>)}
          </Select>
        </Field>
        <Field label="Tooth number">
          <Input value={form.tooth_number} onChange={(e) => set('tooth_number', e.target.value)} placeholder="e.g. 26" />
        </Field>
        <Field label="Cost (₱)">
          <Input type="number" min="0" step="0.01" value={form.cost} onChange={(e) => set('cost', e.target.value)} />
        </Field>
        <Field label="Treatment date">
          <Input type="date" value={form.treatment_date} onChange={(e) => set('treatment_date', e.target.value)} />
        </Field>
        <Field label="Diagnosis" className="sm:col-span-2">
          <Textarea rows={2} value={form.diagnosis} onChange={(e) => set('diagnosis', e.target.value)} />
        </Field>
        <Field label="Procedure notes">
          <Textarea rows={2} value={form.procedure_notes} onChange={(e) => set('procedure_notes', e.target.value)} />
        </Field>
        <Field label="Prescription">
          <Textarea rows={2} value={form.prescription} onChange={(e) => set('prescription', e.target.value)} />
        </Field>
      </div>
      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    </Modal>
  );
}

/* ---- Upload modal --------------------------------------------------------- */

function UploadModal({ patientId, onClose, onSaved }) {
  const toast = useToast();
  const fileRef = useRef(null);
  const [form, setForm] = useState({ title: '', category: 'xray', notes: '' });
  const [file, setFile] = useState(null);
  const [progress, setProgress] = useState(0);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const pick = (f) => {
    if (!f) return;
    setFile(f);
    if (!form.title) set('title', f.name.replace(/\.[^.]+$/, ''));
  };

  const submit = async () => {
    setError('');
    if (!form.title.trim()) return setError('Please give the file a title.');
    if (!file) return setError('Please choose a file to upload.');
    setSaving(true);
    setProgress(0);
    const fd = new FormData();
    fd.append('patient_id', patientId);
    fd.append('title', form.title);
    fd.append('category', form.category);
    fd.append('notes', form.notes);
    fd.append('file', file);
    try {
      await recordsApi.upload(fd, (e) => {
        if (e.total) setProgress(Math.round((e.loaded / e.total) * 100));
      });
      toast.success('File uploaded.');
      onSaved();
    } catch (err) {
      setError(getMessage(err, 'Upload failed.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal open onClose={onClose} title="Upload record" subtitle="PDF, image, or document (max 10 MB)" size="md"
      footer={<><Button variant="outline" onClick={onClose} disabled={saving}>Cancel</Button><Button onClick={submit} loading={saving}>Upload</Button></>}>
      <div className="space-y-4">
        <div
          onClick={() => fileRef.current?.click()}
          onDragOver={(e) => e.preventDefault()}
          onDrop={(e) => { e.preventDefault(); pick(e.dataTransfer.files?.[0]); }}
          className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed border-line bg-canvas/50 py-8 text-center transition hover:border-navy-300 hover:bg-canvas"
        >
          <span className="grid h-12 w-12 place-items-center rounded-full bg-navy-100 text-navy-600"><Upload size={20} /></span>
          {file ? (
            <div className="flex items-center gap-2 text-sm">
              <FileText size={15} className="text-navy-600" />
              <span className="font-medium text-ink">{file.name}</span>
              <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-muted hover:text-red-500"><X size={15} /></button>
            </div>
          ) : (
            <p className="text-sm text-muted"><span className="font-semibold text-navy-600">Click to browse</span> or drag a file here</p>
          )}
          <input ref={fileRef} type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.webp,.doc,.docx"
            onChange={(e) => pick(e.target.files?.[0])} />
        </div>

        {saving && progress > 0 && (
          <div className="h-2 overflow-hidden rounded-full bg-canvas">
            <div className="h-full rounded-full bg-lime-500 transition-all" style={{ width: `${progress}%` }} />
          </div>
        )}

        <Field label="Title" required>
          <Input value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Panoramic X-ray" />
        </Field>
        <Field label="Category">
          <Select value={form.category} onChange={(e) => set('category', e.target.value)}>
            {RECORD_CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABEL[c]}</option>)}
          </Select>
        </Field>
        <Field label="Notes">
          <Textarea rows={2} value={form.notes} onChange={(e) => set('notes', e.target.value)} />
        </Field>
      </div>
      {error && <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">{error}</div>}
    </Modal>
  );
}

/* ---- Preview modal -------------------------------------------------------- */

function PreviewModal({ file, onClose, onDownload }) {
  const isImg = (file.blobType || file.file_type || '').startsWith('image/');
  const isPdf = (file.blobType || file.file_type || '').includes('pdf');
  return (
    <Modal open onClose={onClose} title={file.title} subtitle={CATEGORY_LABEL[file.category] || file.category} size="xl"
      footer={<><Button variant="outline" onClick={onClose}>Close</Button><Button onClick={onDownload}><Download size={16} /> Download</Button></>}>
      <div className="flex max-h-[65vh] items-center justify-center overflow-auto rounded-xl bg-canvas p-2">
        {isImg ? (
          <img src={file.url} alt={file.title} className="max-h-[60vh] rounded-lg object-contain" />
        ) : isPdf ? (
          <iframe src={file.url} title={file.title} className="h-[60vh] w-full rounded-lg" />
        ) : (
          <div className="flex flex-col items-center gap-3 py-16 text-center">
            <FileText size={40} className="text-muted" />
            <p className="text-sm text-muted">Preview isn't available for this file type.</p>
            <Button onClick={onDownload}><Download size={16} /> Download to view</Button>
          </div>
        )}
      </div>
    </Modal>
  );
}

/* ---- Print full record ---------------------------------------------------- */

function printPatientRecord({ patient, appointments, treatments, payments }) {
  const w = window.open('', '_blank', 'width=800,height=1000');
  if (!w) return;
  const row = (k, v) => `<tr><td class="k">${k}</td><td>${v || '—'}</td></tr>`;
  const apptRows = appointments.map((a) =>
    `<tr><td>${formatDate(a.appointment_date)}</td><td>${a.service || '—'}</td><td>${a.dentist || '—'}</td><td>${titleCase(a.status)}</td></tr>`).join('') || '<tr><td colspan="4">No appointments</td></tr>';
  const txRows = treatments.map((t) =>
    `<tr><td>${formatDate(t.treatment_date)}</td><td>${t.treatment_name}</td><td>${t.tooth_number || '—'}</td><td>${money(t.cost)}</td></tr>`).join('') || '<tr><td colspan="4">No treatments</td></tr>';
  const totalPaid = payments.reduce((s, p) => s + Number(p.amount || 0), 0);
  w.document.write(`
    <html><head><title>${patient.patient_code} — ${patient.first_name} ${patient.last_name}</title>
    <style>
      body{font-family:Georgia,serif;color:#1c2333;padding:40px;max-width:720px;margin:auto}
      h1{color:#22317E;font-size:22px;margin:0}h2{color:#22317E;font-size:15px;margin:28px 0 8px;border-bottom:2px solid #7CB342;padding-bottom:4px}
      .sub{color:#7CB342;font-weight:bold;letter-spacing:.5px;margin:2px 0 0}
      table{width:100%;border-collapse:collapse;margin-top:6px;font-size:13px}
      td,th{padding:7px 8px;border-bottom:1px solid #e5e8ef;text-align:left}
      th{color:#64748b;font-size:11px;text-transform:uppercase}
      td.k{color:#64748b;width:35%}
      .foot{margin-top:36px;font-size:11px;color:#94a3b8;text-align:center}
    </style></head><body>
      <h1>Pingol Ramos Dental Clinic</h1><p class="sub">COMPLETE PATIENT RECORD</p>
      <h2>Patient information</h2>
      <table>
        ${row('Patient code', patient.patient_code)}
        ${row('Full name', patient.first_name + ' ' + patient.last_name)}
        ${row('Age / Gender', (patient.age != null ? patient.age + ' yrs' : '—') + (patient.gender ? ' · ' + titleCase(patient.gender) : ''))}
        ${row('Contact', patient.contact_number)}
        ${row('Email', patient.email)}
        ${row('Address', patient.address)}
        ${row('Emergency contact', patient.emergency_contact_name ? patient.emergency_contact_name + ' · ' + (patient.emergency_contact_number || '') : '')}
      </table>
      <h2>Medical</h2>
      <table>
        ${row('Medical history', patient.medical_history)}
        ${row('Allergies', patient.allergies)}
        ${row('Existing conditions', patient.existing_conditions)}
      </table>
      <h2>Appointments</h2>
      <table><tr><th>Date</th><th>Service</th><th>Dentist</th><th>Status</th></tr>${apptRows}</table>
      <h2>Treatments</h2>
      <table><tr><th>Date</th><th>Procedure</th><th>Tooth</th><th>Cost</th></tr>${txRows}</table>
      <h2>Payments</h2>
      <table>${row('Total paid', money(totalPaid))}</table>
      <p class="foot">Generated ${new Date().toLocaleString()} · Confidential medical record</p>
    </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
