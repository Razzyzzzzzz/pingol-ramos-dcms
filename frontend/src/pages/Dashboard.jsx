import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Users, CalendarCheck, CalendarClock, CalendarPlus, Clock3, CheckCircle2,
  Wallet, Receipt, Package, AlertTriangle, TrendingUp, ArrowUpRight,
} from 'lucide-react';
import {
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, LineChart, Line,
  PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid, Tooltip, Legend,
} from 'recharts';
import { dashboardApi } from '../services/endpoints';
import { getMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import {
  Card, CardHeader, StatCard, Badge, Loading, EmptyState,
} from '../components/ui/index.jsx';
import {
  money, moneyShort, number, formatDate, timeAgo, initials, STATUS_TONES, titleCase,
} from '../lib/format';

const NAVY = '#22317E';
const LIME = '#7CB342';
const AMBER = '#D97706';
const RED = '#DC2626';
const SLATE = '#94A3B8';
const STATUS_COLORS = { Pending: AMBER, Approved: NAVY, Completed: LIME, Cancelled: RED };
const INV_COLORS = { 'In Stock': LIME, 'Low Stock': AMBER, 'Out of Stock': RED };

export default function Dashboard() {
  const toast = useToast();
  const navigate = useNavigate();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      try {
        const res = await dashboardApi.overview();
        if (active) setData(res.data);
      } catch (err) {
        toast.error(getMessage(err, 'Could not load the dashboard.'));
      } finally {
        if (active) setLoading(false);
      }
    })();
    return () => { active = false; };
  }, [toast]);

  if (loading) return <Loading label="Loading dashboard…" className="py-24" />;
  if (!data) return <EmptyState icon={TrendingUp} title="No data yet" message="Once the clinic has activity, insights will appear here." />;

  const { cards, charts, recent } = data;

  const stats = [
    { icon: Users, label: 'Total Patients', value: number(cards.total_patients), tone: 'navy', to: '/patients' },
    { icon: CalendarCheck, label: 'Total Appointments', value: number(cards.total_appointments), tone: 'navy', to: '/appointments' },
    { icon: CalendarClock, label: "Today's Appointments", value: number(cards.today_appointments), tone: 'lime', to: '/calendar' },
    { icon: CalendarPlus, label: 'Upcoming', value: number(cards.upcoming_appointments), tone: 'lime', to: '/appointments' },
    { icon: Clock3, label: 'Pending', value: number(cards.pending_appointments), tone: 'amber', to: '/appointments?status=pending' },
    { icon: CheckCircle2, label: 'Completed', value: number(cards.completed_appointments), tone: 'lime', to: '/appointments?status=completed' },
    { icon: Wallet, label: 'Monthly Revenue', value: money(cards.monthly_revenue), tone: 'lime', to: '/revenue' },
    { icon: Receipt, label: 'Monthly Expenses', value: money(cards.monthly_expenses), tone: 'amber', to: '/expenses' },
    { icon: Package, label: 'Inventory Items', value: number(cards.inventory_items), tone: 'navy', to: '/inventory' },
    { icon: AlertTriangle, label: 'Low Stock Alerts', value: number(cards.low_stock), tone: cards.low_stock > 0 ? 'red' : 'slate', to: '/inventory?filter=low' },
  ];

  const netPositive = Number(cards.net_income) >= 0;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <h1 className="font-display text-2xl font-bold tracking-tight text-ink">Dashboard</h1>
          <p className="mt-1 text-sm text-muted">A live snapshot of your clinic today.</p>
        </div>
        {/* Net income pill */}
        <div className="flex items-center gap-3 rounded-xl border border-line bg-white px-4 py-2.5 shadow-card">
          <span className={`grid h-10 w-10 place-items-center rounded-lg ${netPositive ? 'bg-lime-100 text-lime-700' : 'bg-red-100 text-red-700'}`}>
            <TrendingUp size={18} />
          </span>
          <div>
            <p className="text-xs font-medium text-muted">Net Income (this month)</p>
            <p className={`nums text-lg font-bold ${netPositive ? 'text-lime-700' : 'text-red-600'}`}>
              {money(cards.net_income)}
            </p>
          </div>
        </div>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        {stats.map((s) => (
          <StatCard key={s.label} icon={s.icon} label={s.label} value={s.value} tone={s.tone} onClick={() => navigate(s.to)} />
        ))}
      </div>

      {/* Charts row 1 */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Revenue vs Expenses" subtitle="Last 6 months" />
          <div className="h-72 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={charts.revenue_expenses} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
                <defs>
                  <linearGradient id="rev" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={LIME} stopOpacity={0.35} />
                    <stop offset="95%" stopColor={LIME} stopOpacity={0} />
                  </linearGradient>
                  <linearGradient id="exp" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor={AMBER} stopOpacity={0.3} />
                    <stop offset="95%" stopColor={AMBER} stopOpacity={0} />
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" vertical={false} />
                <XAxis dataKey="month" stroke={SLATE} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={SLATE} fontSize={12} tickLine={false} axisLine={false} tickFormatter={moneyShort} width={64} />
                <Tooltip content={<MoneyTooltip />} />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12, paddingTop: 8 }} />
                <Area type="monotone" dataKey="revenue" name="Revenue" stroke={LIME} strokeWidth={2.5} fill="url(#rev)" />
                <Area type="monotone" dataKey="expenses" name="Expenses" stroke={AMBER} strokeWidth={2.5} fill="url(#exp)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Appointments" subtitle="By status" />
          <div className="h-72 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={charts.appointment_status}
                  dataKey="count"
                  nameKey="status"
                  cx="50%"
                  cy="50%"
                  innerRadius={52}
                  outerRadius={82}
                  paddingAngle={3}
                >
                  {charts.appointment_status.map((entry) => (
                    <Cell key={entry.status} fill={STATUS_COLORS[entry.status] || SLATE} />
                  ))}
                </Pie>
                <Tooltip />
                <Legend iconType="circle" wrapperStyle={{ fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Charts row 2 */}
      <div className="grid gap-5 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader title="Patient Growth" subtitle="New patients per month" />
          <div className="h-64 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={charts.patient_growth} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" vertical={false} />
                <XAxis dataKey="month" stroke={SLATE} fontSize={12} tickLine={false} axisLine={false} />
                <YAxis stroke={SLATE} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                <Tooltip />
                <Line type="monotone" dataKey="patients" name="New patients" stroke={NAVY} strokeWidth={2.5} dot={{ r: 4, fill: NAVY }} activeDot={{ r: 6 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>

        <Card>
          <CardHeader title="Inventory Status" />
          <div className="h-64 px-2 pb-4">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={charts.inventory_status} margin={{ top: 10, right: 16, left: 4, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#EEF1F6" vertical={false} />
                <XAxis dataKey="label" stroke={SLATE} fontSize={11} tickLine={false} axisLine={false} />
                <YAxis stroke={SLATE} fontSize={12} tickLine={false} axisLine={false} allowDecimals={false} width={32} />
                <Tooltip />
                <Bar dataKey="value" name="Items" radius={[6, 6, 0, 0]}>
                  {charts.inventory_status.map((entry) => (
                    <Cell key={entry.label} fill={INV_COLORS[entry.label] || SLATE} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </Card>
      </div>

      {/* Recent activity */}
      <div className="grid gap-5 lg:grid-cols-3">
        <RecentCard title="Latest Appointments" onSeeAll={() => navigate('/appointments')}>
          {recent.appointments.length === 0 ? (
            <MiniEmpty text="No appointments yet." />
          ) : recent.appointments.map((a) => (
            <button
              key={a.id}
              onClick={() => navigate('/appointments')}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-canvas"
            >
              <Avatar name={a.patient} />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{a.patient}</p>
                <p className="truncate text-xs text-muted">{a.service || 'General'} · {formatDate(a.appointment_date)}</p>
              </div>
              <Badge tone={STATUS_TONES[a.status]}>{titleCase(a.status)}</Badge>
            </button>
          ))}
        </RecentCard>

        <RecentCard title="New Patients" onSeeAll={() => navigate('/patients')}>
          {recent.patients.length === 0 ? (
            <MiniEmpty text="No patients yet." />
          ) : recent.patients.map((p) => (
            <button
              key={p.id}
              onClick={() => navigate(`/patients/${p.id}`)}
              className="flex w-full items-center gap-3 rounded-lg px-2 py-2 text-left transition hover:bg-canvas"
            >
              <Avatar name={p.name} tone="lime" />
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{p.name}</p>
                <p className="truncate text-xs text-muted">{p.patient_code} · {timeAgo(p.created_at)}</p>
              </div>
              <ArrowUpRight size={15} className="text-muted" />
            </button>
          ))}
        </RecentCard>

        <RecentCard title="Recent Payments" onSeeAll={() => navigate('/revenue')}>
          {recent.payments.length === 0 ? (
            <MiniEmpty text="No payments yet." />
          ) : recent.payments.map((p) => (
            <div key={p.id} className="flex items-center gap-3 rounded-lg px-2 py-2">
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-lime-100 text-lime-700">
                <Wallet size={16} />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-semibold text-ink">{p.patient || 'Walk-in'}</p>
                <p className="truncate text-xs text-muted">{titleCase(p.payment_method)} · {formatDate(p.payment_date)}</p>
              </div>
              <p className="nums text-sm font-bold text-lime-700">{money(p.amount)}</p>
            </div>
          ))}
        </RecentCard>
      </div>
    </div>
  );
}

function RecentCard({ title, onSeeAll, children }) {
  return (
    <Card>
      <CardHeader title={title} action={
        <button onClick={onSeeAll} className="text-xs font-medium text-navy-600 hover:text-navy-700">See all</button>
      } />
      <div className="space-y-0.5 p-2">{children}</div>
    </Card>
  );
}

function Avatar({ name, tone = 'navy' }) {
  const tones = { navy: 'bg-navy-100 text-navy-700', lime: 'bg-lime-100 text-lime-700' };
  return (
    <span className={`grid h-9 w-9 shrink-0 place-items-center rounded-full text-xs font-bold ${tones[tone]}`}>
      {initials(name)}
    </span>
  );
}

function MiniEmpty({ text }) {
  return <p className="px-2 py-8 text-center text-sm text-muted">{text}</p>;
}

function MoneyTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="rounded-lg border border-line bg-white px-3 py-2 text-xs shadow-pop">
      <p className="mb-1 font-semibold text-ink">{label}</p>
      {payload.map((p) => (
        <p key={p.dataKey} className="flex items-center gap-2">
          <span className="inline-block h-2 w-2 rounded-full" style={{ background: p.color }} />
          <span className="text-muted">{p.name}:</span>
          <span className="nums font-semibold text-ink">{money(p.value)}</span>
        </p>
      ))}
    </div>
  );
}
