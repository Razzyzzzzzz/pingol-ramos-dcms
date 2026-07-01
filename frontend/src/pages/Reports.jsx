import { useState } from 'react';
import {
  FileBarChart2, Users, CalendarCheck, Wallet, Receipt, Package,
  Download, Printer, Loader2, FileSpreadsheet,
} from 'lucide-react';
import {
  patientsApi, appointmentsApi, paymentsApi, expensesApi, inventoryApi,
} from '../services/endpoints';
import { getMessage } from '../lib/api';
import { useToast } from '../context/ToastContext';
import {
  Button, Card, Badge, PageHeader,
} from '../components/ui/index.jsx';
import { money, formatDate, titleCase } from '../lib/format';

/* Each report defines: how to fetch rows, the CSV columns, and how to
   render a row for the on-screen/print preview. */
const REPORTS = [
  {
    id: 'patients', label: 'Patient Directory', icon: Users, tone: 'navy',
    description: 'All registered patients with contact details.',
    fetch: async () => (await patientsApi.list({ limit: 1000 })).data.items,
    columns: [
      ['patient_code', 'Code'], ['first_name', 'First name'], ['last_name', 'Last name'],
      ['age', 'Age'], ['gender', 'Gender'], ['contact_number', 'Contact'], ['email', 'Email'],
      ['created_at', 'Registered', (v) => formatDate(v)],
    ],
  },
  {
    id: 'appointments', label: 'Appointments', icon: CalendarCheck, tone: 'lime',
    description: 'Full appointment log across all statuses.',
    fetch: async () => (await appointmentsApi.list({ limit: 1000 })).data.items,
    columns: [
      ['appointment_code', 'Code'], ['patient', 'Patient'], ['dentist', 'Dentist'],
      ['service', 'Service'], ['appointment_date', 'Date', (v) => formatDate(v)],
      ['start_time', 'Time'], ['status', 'Status', (v) => titleCase(v)],
    ],
  },
  {
    id: 'revenue', label: 'Revenue / Payments', icon: Wallet, tone: 'lime',
    description: 'Every recorded payment with method and amount.',
    fetch: async () => (await paymentsApi.list({ limit: 1000 })).data.items,
    columns: [
      ['payment_date', 'Date', (v) => formatDate(v)], ['patient_name', 'Patient'],
      ['description', 'Description'], ['payment_method', 'Method', (v) => titleCase(v)],
      ['amount', 'Amount', (v) => money(v)],
    ],
    total: (rows) => rows.reduce((s, r) => s + Number(r.amount || 0), 0),
  },
  {
    id: 'expenses', label: 'Expenses', icon: Receipt, tone: 'amber',
    description: 'Clinic spending log by category.',
    fetch: async () => (await expensesApi.list({ limit: 1000 })).data.items,
    columns: [
      ['expense_date', 'Date', (v) => formatDate(v)], ['title', 'Title'],
      ['category', 'Category', (v) => titleCase(v)], ['created_by_name', 'Logged by'],
      ['amount', 'Amount', (v) => money(v)],
    ],
    total: (rows) => rows.reduce((s, r) => s + Number(r.amount || 0), 0),
  },
  {
    id: 'inventory', label: 'Inventory', icon: Package, tone: 'navy',
    description: 'Current stock levels, prices and expiry.',
    fetch: async () => (await inventoryApi.list({ limit: 1000 })).data.items,
    columns: [
      ['product_name', 'Product'], ['category', 'Category'], ['quantity', 'Qty'],
      ['unit', 'Unit'], ['selling_price', 'Price', (v) => money(v)],
      ['supplier_name', 'Supplier'], ['expiration_date', 'Expiry', (v) => v ? formatDate(v) : '—'],
    ],
  },
];

export default function Reports() {
  const toast = useToast();
  const [busy, setBusy] = useState(null); // report id currently loading
  const [preview, setPreview] = useState(null); // { report, rows }

  const run = async (report, action) => {
    setBusy(report.id);
    try {
      const rows = await report.fetch();
      if (!rows.length) {
        toast.info('No data available for this report yet.');
        return;
      }
      if (action === 'csv') exportCsv(report, rows);
      else if (action === 'print') printReport(report, rows);
      else setPreview({ report, rows });
    } catch (err) {
      toast.error(getMessage(err, 'Could not generate report.'));
    } finally {
      setBusy(null);
    }
  };

  return (
    <div>
      <PageHeader title="Reports" subtitle="Generate, preview, print & export clinic data" />

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {REPORTS.map((r) => {
          const Icon = r.icon;
          const loading = busy === r.id;
          const toneCls = {
            navy: 'bg-navy-50 text-navy-700', lime: 'bg-lime-100 text-lime-700', amber: 'bg-amber-100 text-amber-700',
          }[r.tone];
          return (
            <Card key={r.id} className="flex flex-col p-5">
              <div className="flex items-start gap-3">
                <span className={`grid h-11 w-11 shrink-0 place-items-center rounded-xl ${toneCls}`}><Icon size={20} /></span>
                <div>
                  <h3 className="font-semibold text-ink">{r.label}</h3>
                  <p className="mt-0.5 text-xs text-muted">{r.description}</p>
                </div>
              </div>
              <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-line pt-4">
                <Button size="sm" variant="outline" onClick={() => run(r, 'preview')} disabled={loading}>
                  {loading ? <Loader2 size={15} className="animate-spin" /> : <FileBarChart2 size={15} />} Preview
                </Button>
                <Button size="sm" variant="subtle" onClick={() => run(r, 'csv')} disabled={loading}>
                  <FileSpreadsheet size={15} /> CSV
                </Button>
                <Button size="sm" variant="ghost" onClick={() => run(r, 'print')} disabled={loading}>
                  <Printer size={15} /> Print
                </Button>
              </div>
            </Card>
          );
        })}
      </div>

      {preview && (
        <Card className="mt-6">
          <div className="flex flex-col gap-2 border-b border-line p-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h3 className="font-semibold text-ink">{preview.report.label}</h3>
              <p className="text-xs text-muted">{preview.rows.length} rows{preview.report.total ? ` · Total ${money(preview.report.total(preview.rows))}` : ''}</p>
            </div>
            <div className="flex items-center gap-2">
              <Button size="sm" variant="outline" onClick={() => exportCsv(preview.report, preview.rows)}><Download size={15} /> Export CSV</Button>
              <Button size="sm" variant="subtle" onClick={() => printReport(preview.report, preview.rows)}><Printer size={15} /> Print</Button>
              <Button size="sm" variant="ghost" onClick={() => setPreview(null)}>Close</Button>
            </div>
          </div>
          <div className="max-h-[60vh] overflow-auto scroll-slim">
            <table className="w-full text-sm">
              <thead className="sticky top-0 bg-white">
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  {preview.report.columns.map(([key, label]) => (
                    <th key={key} className="whitespace-nowrap px-4 py-3 font-semibold">{label}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {preview.rows.map((row, i) => (
                  <tr key={i} className="hover:bg-canvas/60">
                    {preview.report.columns.map(([key, , fmt]) => (
                      <td key={key} className="whitespace-nowrap px-4 py-2.5 text-ink">
                        {fmt ? fmt(row[key]) : (row[key] ?? '—')}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </div>
  );
}

/* ---- CSV export ----------------------------------------------------------- */
function exportCsv(report, rows) {
  const esc = (v) => {
    const s = String(v ?? '');
    return /[",\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s;
  };
  const header = report.columns.map(([, label]) => esc(label)).join(',');
  const body = rows.map((row) =>
    report.columns.map(([key, , fmt]) => esc(fmt ? fmt(row[key]) : row[key])).join(',')
  ).join('\n');
  const csv = `${header}\n${body}`;
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `pingol-ramos-${report.id}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  URL.revokeObjectURL(url);
}

/* ---- Print ---------------------------------------------------------------- */
function printReport(report, rows) {
  const w = window.open('', '_blank', 'width=900,height=1000');
  if (!w) return;
  const head = report.columns.map(([, label]) => `<th>${label}</th>`).join('');
  const body = rows.map((row) =>
    `<tr>${report.columns.map(([key, , fmt]) => `<td>${fmt ? fmt(row[key]) : (row[key] ?? '—')}</td>`).join('')}</tr>`
  ).join('');
  const totalRow = report.total
    ? `<tr class="total"><td colspan="${report.columns.length - 1}">TOTAL</td><td>${money(report.total(rows))}</td></tr>` : '';
  w.document.write(`
    <html><head><title>${report.label}</title>
    <style>
      body{font-family:Georgia,serif;color:#1c2333;padding:32px}
      h1{color:#22317E;font-size:20px;margin:0}
      .sub{color:#7CB342;font-weight:bold;letter-spacing:.5px;margin:2px 0 20px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{padding:6px 8px;border-bottom:1px solid #e5e8ef;text-align:left}
      th{background:#f3f5f9;color:#22317E;text-transform:uppercase;font-size:10px}
      tr.total td{font-weight:bold;border-top:2px solid #22317E;color:#22317E}
      .foot{margin-top:24px;font-size:11px;color:#94a3b8;text-align:center}
    </style></head><body>
      <h1>Pingol Ramos Dental Clinic</h1>
      <p class="sub">${report.label.toUpperCase()} — ${rows.length} RECORDS</p>
      <table><thead><tr>${head}</tr></thead><tbody>${body}${totalRow}</tbody></table>
      <p class="foot">Generated ${new Date().toLocaleString()}</p>
    </body></html>`);
  w.document.close();
  w.focus();
  setTimeout(() => w.print(), 300);
}
