import { useEffect, useState, useMemo, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ChevronLeft, ChevronRight, CalendarDays, Clock, Plus,
} from 'lucide-react';
import { appointmentsApi } from '../services/endpoints';
import { getMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import {
  Button, IconButton, Card, Badge, Loading, EmptyState, PageHeader,
} from '../components/ui/index.jsx';
import { formatDate, formatTime, STATUS_TONES, titleCase } from '../lib/format';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
const STATUS_DOT = {
  pending: 'bg-amber-500', approved: 'bg-blue-500',
  completed: 'bg-lime-500', cancelled: 'bg-red-400',
};
const ymd = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

export default function CalendarPage() {
  const toast = useToast();
  const navigate = useNavigate();
  const today = new Date();

  const [cursor, setCursor] = useState(new Date(today.getFullYear(), today.getMonth(), 1));
  const [byDate, setByDate] = useState({});
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(ymd(today));

  // Compute the visible 6-week grid range.
  const grid = useMemo(() => {
    const first = new Date(cursor.getFullYear(), cursor.getMonth(), 1);
    const start = new Date(first);
    start.setDate(first.getDate() - first.getDay()); // back to Sunday
    const days = [];
    for (let i = 0; i < 42; i++) {
      const d = new Date(start);
      d.setDate(start.getDate() + i);
      days.push(d);
    }
    return { start: days[0], end: days[41], days };
  }, [cursor]);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await appointmentsApi.list({ from: ymd(grid.start), to: ymd(grid.end), limit: 500 });
      const map = {};
      for (const a of res.data.items) {
        (map[a.appointment_date] ||= []).push(a);
      }
      // Sort each day's list by start time.
      Object.values(map).forEach((list) => list.sort((x, y) => (x.start_time || '').localeCompare(y.start_time || '')));
      setByDate(map);
    } catch (err) {
      toast.error(getMessage(err, 'Could not load calendar.'));
    } finally {
      setLoading(false);
    }
  }, [grid.start, grid.end, toast]);

  useEffect(() => { load(); }, [load]);

  const monthLabel = cursor.toLocaleDateString('en-PH', { month: 'long', year: 'numeric' });
  const goPrev = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() - 1, 1));
  const goNext = () => setCursor(new Date(cursor.getFullYear(), cursor.getMonth() + 1, 1));
  const goToday = () => { const t = new Date(); setCursor(new Date(t.getFullYear(), t.getMonth(), 1)); setSelected(ymd(t)); };

  const selectedList = byDate[selected] || [];

  return (
    <div>
      <PageHeader title="Calendar" subtitle="Monthly appointment overview">
        <Button variant="outline" onClick={() => navigate('/appointments')}><Plus size={16} /> New appointment</Button>
      </PageHeader>

      <div className="grid gap-5 lg:grid-cols-3">
        {/* Calendar grid */}
        <Card className="lg:col-span-2">
          <div className="flex items-center justify-between border-b border-line p-4">
            <h3 className="font-display text-lg font-bold text-ink">{monthLabel}</h3>
            <div className="flex items-center gap-1.5">
              <Button variant="subtle" size="sm" onClick={goToday}>Today</Button>
              <IconButton onClick={goPrev} aria-label="Previous month"><ChevronLeft size={18} /></IconButton>
              <IconButton onClick={goNext} aria-label="Next month"><ChevronRight size={18} /></IconButton>
            </div>
          </div>

          {loading ? (
            <Loading label="Loading…" className="py-24" />
          ) : (
            <div className="p-3">
              <div className="mb-1 grid grid-cols-7">
                {WEEKDAYS.map((d) => (
                  <div key={d} className="py-2 text-center text-xs font-semibold uppercase tracking-wide text-muted">{d}</div>
                ))}
              </div>
              <div className="grid grid-cols-7 gap-1">
                {grid.days.map((d) => {
                  const key = ymd(d);
                  const inMonth = d.getMonth() === cursor.getMonth();
                  const isToday = key === ymd(today);
                  const isSelected = key === selected;
                  const list = byDate[key] || [];
                  return (
                    <button
                      key={key}
                      onClick={() => setSelected(key)}
                      className={`flex min-h-[76px] flex-col rounded-lg border p-1.5 text-left transition ${
                        isSelected ? 'border-navy-500 bg-navy-50 ring-1 ring-navy-500'
                          : 'border-transparent hover:border-line hover:bg-canvas'
                      } ${!inMonth ? 'opacity-40' : ''}`}
                    >
                      <span className={`nums mb-1 grid h-6 w-6 place-items-center rounded-full text-xs font-semibold ${
                        isToday ? 'bg-navy-600 text-white' : 'text-ink'
                      }`}>
                        {d.getDate()}
                      </span>
                      <div className="flex flex-wrap gap-0.5">
                        {list.slice(0, 4).map((a) => (
                          <span key={a.id} className={`h-1.5 w-1.5 rounded-full ${STATUS_DOT[a.status] || 'bg-slate-400'}`} />
                        ))}
                      </div>
                      {list.length > 0 && (
                        <span className="mt-auto text-[10px] font-medium text-muted">{list.length} appt{list.length > 1 ? 's' : ''}</span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Legend */}
              <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1 border-t border-line px-1 pt-3 text-xs text-muted">
                {Object.entries(STATUS_DOT).map(([s, cls]) => (
                  <span key={s} className="flex items-center gap-1.5">
                    <span className={`h-2 w-2 rounded-full ${cls}`} /> {titleCase(s)}
                  </span>
                ))}
              </div>
            </div>
          )}
        </Card>

        {/* Selected day list */}
        <Card className="flex flex-col">
          <div className="border-b border-line p-4">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">Selected day</p>
            <p className="font-display text-lg font-bold text-ink">{formatDate(selected, { weekday: 'long', month: 'long', day: 'numeric' })}</p>
          </div>
          <div className="flex-1 p-2">
            {selectedList.length === 0 ? (
              <EmptyState icon={CalendarDays} title="Nothing scheduled" message="No appointments on this day." />
            ) : (
              <ul className="space-y-2 p-1">
                {selectedList.map((a) => (
                  <li key={a.id}>
                    <button
                      onClick={() => navigate('/appointments')}
                      className="w-full rounded-xl border border-line p-3 text-left transition hover:border-navy-300 hover:shadow-card"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="flex items-center gap-1.5 text-sm font-semibold text-ink">
                          <Clock size={14} className="text-muted" /> {formatTime(a.start_time)}
                        </span>
                        <Badge tone={STATUS_TONES[a.status]}>{titleCase(a.status)}</Badge>
                      </div>
                      <p className="mt-1.5 font-medium text-ink">{a.patient}</p>
                      <p className="text-xs text-muted">{a.service || 'General'} · {a.dentist || 'Unassigned'}</p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </Card>
      </div>
    </div>
  );
}
