import { useEffect, useState, useCallback } from 'react';
import { Receipt } from 'lucide-react';
import { patientPortalApi } from '../../services/endpoints';
import { getMessage } from '../../lib/api';
import { useToast } from '../../context/ToastContext';
import {
  Card, Badge, Loading, EmptyState, PageHeader, StatCard,
} from '../../components/ui/index.jsx';
import { money, formatDate, titleCase } from '../../lib/format';

const METHOD_TONE = {
  cash: 'green',
  card: 'blue',
  gcash: 'amber',
  bank_transfer: 'navy',
  other: 'gray',
};

export default function PatientTransactions() {
  const toast = useToast();
  const [payments, setPayments] = useState([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const res = await patientPortalApi.payments();
      setPayments(res.data || []);
    } catch (err) {
      toast.error(getMessage(err, 'Could not load your transaction history.'));
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { load(); }, [load]);

  const totalPaid = payments.reduce((sum, p) => sum + Number(p.amount || 0), 0);

  return (
    <div>
      <PageHeader title="Transaction history" subtitle="Payments recorded against your account" />

      <div className="mb-5 grid grid-cols-1 gap-3 sm:grid-cols-2">
        <StatCard icon={Receipt} label="Total transactions" value={payments.length} tone="navy" />
        <StatCard icon={Receipt} label="Total paid" value={money(totalPaid)} tone="amber" />
      </div>

      <Card>
        {loading ? (
          <Loading label="Loading transactions…" className="py-16" />
        ) : payments.length === 0 ? (
          <EmptyState icon={Receipt} title="No transactions yet" message="Payments recorded by the clinic will appear here." />
        ) : (
          <div className="overflow-x-auto scroll-slim">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-line text-left text-xs uppercase tracking-wide text-muted">
                  <th className="px-5 py-3 font-semibold">Date</th>
                  <th className="px-5 py-3 font-semibold">Description</th>
                  <th className="px-5 py-3 font-semibold">Method</th>
                  <th className="px-5 py-3 font-semibold">Appointment</th>
                  <th className="px-5 py-3 text-right font-semibold">Amount</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-line">
                {payments.map((p) => (
                  <tr key={p.id} className="transition hover:bg-canvas/60">
                    <td className="whitespace-nowrap px-5 py-3 text-muted">{formatDate(p.payment_date)}</td>
                    <td className="px-5 py-3 text-ink">{p.description || '—'}</td>
                    <td className="px-5 py-3"><Badge tone={METHOD_TONE[p.payment_method] || 'gray'}>{titleCase(p.payment_method)}</Badge></td>
                    <td className="whitespace-nowrap px-5 py-3 text-muted">{p.appointment_code || '—'}</td>
                    <td className="nums whitespace-nowrap px-5 py-3 text-right font-bold text-ink">{money(p.amount)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
