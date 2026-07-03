import { useEffect, useState, useCallback, useRef } from "react";
import { Link } from "react-router-dom";
import {
  CalendarCheck,
  Wallet,
  Stethoscope,
  Receipt,
  Plus,
} from "lucide-react";
import {
  patientPortalApi,
  publicAppointmentsApi,
} from "../../services/endpoints";
import { getMessage } from "../../lib/api";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../context/ToastContext";
import {
  Button,
  Card,
  CardHeader,
  Badge,
  Field,
  Input,
  Select,
  Textarea,
  Loading,
  EmptyState,
  PageHeader,
  StatCard,
} from "../../components/ui/index.jsx";
import { Modal } from "../../components/ui/Modal.jsx";
import {
  money,
  formatDate,
  formatTime,
  titleCase,
  STATUS_TONES,
} from "../../lib/format";

function todayInputValue() {
  const now = new Date();
  now.setMinutes(now.getMinutes() - now.getTimezoneOffset());
  return now.toISOString().slice(0, 10);
}

export default function PatientDashboard() {
  const { user } = useAuth();
  const toast = useToast();
  const [appointments, setAppointments] = useState([]);
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [bookOpen, setBookOpen] = useState(false);

  const load = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    try {
      const [apptRes, payRes] = await Promise.all([
        patientPortalApi.appointments(),
        patientPortalApi.payments(),
      ]);
      setAppointments(apptRes.data || []);
      setPayments(payRes.data || []);
    } catch (err) {
      if (!silent) toast.error(getMessage(err, "Could not load your dashboard."));
    } finally {
      if (!silent) setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    load();
  }, [load]);

  // Auto-refresh so an approval/status change made by staff shows up without
  // a manual reload. Paused while the booking modal is open. Reads `load`
  // through a ref so the interval's own lifecycle doesn't depend on `load`'s
  // identity (which changes whenever the toast/auth context re-renders) —
  // otherwise the timer gets torn down and restarted before it ever fires.
  const loadRef = useRef(load);
  useEffect(() => { loadRef.current = load; }, [load]);

  useEffect(() => {
    if (bookOpen) return;
    const interval = setInterval(() => loadRef.current(true), 30000);
    return () => clearInterval(interval);
  }, [bookOpen]);

  if (loading)
    return <Loading label="Loading your dashboard…" className="py-16" />;

  const today = new Date().toISOString().slice(0, 10);
  const nextAppointment = appointments
    .filter((a) => a.appointment_date >= today && a.status !== "cancelled")
    .sort((a, b) =>
      (a.appointment_date + a.start_time).localeCompare(
        b.appointment_date + b.start_time,
      ),
    )[0];
  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);
  const completedVisits = appointments.filter(
    (a) => a.status === "completed",
  ).length;

  return (
    <div>
      <PageHeader
        title={`Welcome, ${user?.name?.split(" ")[0] || "there"}`}
        subtitle="Your appointments and payment history"
      >
        <Button onClick={() => setBookOpen(true)}>
          <Plus size={18} /> Book appointment
        </Button>
      </PageHeader>

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-3">
        <StatCard
          icon={CalendarCheck}
          label="Next appointment"
          value={
            nextAppointment
              ? formatDate(nextAppointment.appointment_date)
              : "None scheduled"
          }
          sub={
            nextAppointment ? formatTime(nextAppointment.start_time) : undefined
          }
          tone="navy"
        />
        <StatCard
          icon={Stethoscope}
          label="Completed visits"
          value={completedVisits}
          tone="lime"
        />
        <StatCard
          icon={Wallet}
          label="Total paid"
          value={money(totalPaid)}
          tone="amber"
        />
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <Card>
          <CardHeader
            title="Recent appointments"
            subtitle="Your latest requests and visits"
          />
          {appointments.length === 0 ? (
            <EmptyState
              icon={CalendarCheck}
              title="No appointments yet"
              message="Use the Book appointment button to request your first visit."
            />
          ) : (
            <div className="divide-y divide-line">
              {appointments.slice(0, 5).map((a) => (
                <div
                  key={a.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {a.service || "General consultation"}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDate(a.appointment_date)} ·{" "}
                      {formatTime(a.start_time)}
                    </p>
                  </div>
                  <Badge tone={STATUS_TONES[a.status] || "gray"}>
                    {titleCase(a.status)}
                  </Badge>
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Recent transactions"
            subtitle="Your latest payments"
            action={
              <Link
                to="/portal/transactions"
                className="text-xs font-semibold text-navy-600 hover:text-navy-800"
              >
                View all
              </Link>
            }
          />
          {payments.length === 0 ? (
            <EmptyState
              icon={Receipt}
              title="No payments yet"
              message="Payments recorded by the clinic will appear here."
            />
          ) : (
            <div className="divide-y divide-line">
              {payments.slice(0, 5).map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between gap-3 px-5 py-3"
                >
                  <div className="min-w-0">
                    <p className="truncate text-sm font-semibold text-ink">
                      {p.description || titleCase(p.payment_method)}
                    </p>
                    <p className="text-xs text-muted">
                      {formatDate(p.payment_date)}
                    </p>
                  </div>
                  <span className="nums text-sm font-bold text-ink">
                    {money(p.amount)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>

      {bookOpen && (
        <BookAppointmentModal
          onClose={() => setBookOpen(false)}
          onBooked={() => {
            setBookOpen(false);
            load();
          }}
        />
      )}
    </div>
  );
}

function BookAppointmentModal({ onClose, onBooked }) {
  const toast = useToast();
  const [serviceOptions, setServiceOptions] = useState([]);
  const [form, setForm] = useState({
    service_id: "",
    appointment_date: todayInputValue(),
    start_time: "",
    notes: "",
  });
  const [slots, setSlots] = useState([]);
  const [slotsLoading, setSlotsLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (key, value) => setForm((f) => ({ ...f, [key]: value }));

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await publicAppointmentsApi.services();
        if (active) setServiceOptions(res.data || []);
      } catch {
        if (active) setServiceOptions([]);
      }
    })();
    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!form.appointment_date) {
      setSlots([]);
      return;
    }
    let active = true;
    setSlotsLoading(true);
    (async () => {
      try {
        const res = await publicAppointmentsApi.availability(
          form.appointment_date,
          form.service_id || undefined,
        );
        if (active) setSlots(res.data || []);
      } catch {
        if (active) setSlots([]);
      } finally {
        if (active) setSlotsLoading(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [form.appointment_date, form.service_id]);

  const submit = async () => {
    setError("");
    if (!form.start_time) {
      setError("Please choose an available time.");
      return;
    }
    setSaving(true);
    try {
      const res = await publicAppointmentsApi.create({
        ...form,
        service_id: form.service_id || null,
      });
      toast.success(
        `Appointment request submitted. Reference: ${res.data.appointment_code}`,
      );
      onBooked();
    } catch (err) {
      setError(getMessage(err, "Could not submit the appointment request."));
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title="Book an appointment"
      subtitle="Requests are added as pending for staff confirmation."
      size="md"
      footer={
        <>
          <Button variant="outline" onClick={onClose} disabled={saving}>
            Cancel
          </Button>
          <Button onClick={submit} loading={saving}>
            Book appointment
          </Button>
        </>
      }
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <Field label="Service" htmlFor="book-service">
          <Select
            id="book-service"
            value={form.service_id}
            onChange={(e) => {
              set("service_id", e.target.value);
              set("start_time", "");
            }}
          >
            <option value="">General consultation</option>
            {serviceOptions.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Preferred date" htmlFor="book-date" required>
          <Input
            id="book-date"
            type="date"
            min={todayInputValue()}
            value={form.appointment_date}
            onChange={(e) => {
              set("appointment_date", e.target.value);
              set("start_time", "");
            }}
            required
          />
        </Field>
        <Field
          label="Available time"
          htmlFor="book-time"
          required
          hint={
            slotsLoading
              ? "Checking open times…"
              : !slots.length
                ? "No open slots for this date — try another date."
                : undefined
          }
          className="sm:col-span-2"
        >
          <Select
            id="book-time"
            value={form.start_time}
            onChange={(e) => set("start_time", e.target.value)}
            disabled={slotsLoading || !slots.length}
            required
          >
            <option value="">
              {slotsLoading ? "Loading times…" : "Select a time"}
            </option>
            {slots.map((time) => (
              <option key={time} value={time}>
                {time}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Notes" htmlFor="book-notes" className="sm:col-span-2">
          <Textarea
            id="book-notes"
            rows={3}
            value={form.notes}
            onChange={(e) => set("notes", e.target.value)}
            placeholder="Tell us what you would like checked."
          />
        </Field>
      </div>
      {error && (
        <div className="mt-4 rounded-lg bg-red-50 px-3 py-2 text-sm text-red-700">
          {error}
        </div>
      )}
    </Modal>
  );
}
