'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { 
  Download, 
  FileText, 
  Calendar, 
  Euro, 
  CheckCircle, 
  Clock,
  ArrowLeft,
  ExternalLink
} from 'lucide-react';
import { supabase } from '@/utils/supabase';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Invoice {
  id: string;
  number: string;
  amount: number;
  currency: string;
  status: 'paid' | 'open' | 'void';
  created: number;
  period_start: number;
  period_end: number;
  invoice_pdf: string;
  hosted_invoice_url: string;
  description: string;
}

export default function InvoicesPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchInvoices();
  }, [user, router]);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      setError(null);

      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error('No session found');
      }

      const response = await fetch('/api/stripe/invoices', {
        headers: {
          'Authorization': `Bearer ${session.access_token}`,
        },
      });

      if (!response.ok) {
        throw new Error('Failed to fetch invoices');
      }

      const data = await response.json();
      setInvoices(data.invoices || []);
    } catch (err) {
      console.error('Error fetching invoices:', err);
      setError('Fehler beim Laden der Rechnungen');
    } finally {
      setIsLoading(false);
    }
  };

  const formatAmount = (amount: number, currency: string) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: currency.toUpperCase(),
    }).format(amount / 100);
  };

  const formatDate = (timestamp: number) => {
    return new Date(timestamp * 1000).toLocaleDateString('de-DE');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'paid':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'open':
        return <Clock className="w-4 h-4 text-yellow-400" />;
      case 'void':
        return <FileText className="w-4 h-4 text-gray-400" />;
      default:
        return <FileText className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'paid':
        return 'Bezahlt';
      case 'open':
        return 'Offen';
      case 'void':
        return 'Storniert';
      default:
        return status;
    }
  };

  const handleDownload = async (invoice: Invoice) => {
    try {
      if (invoice.invoice_pdf) {
        // Direct download from Stripe
        window.open(invoice.invoice_pdf, '_blank');
      } else if (invoice.hosted_invoice_url) {
        // Open hosted invoice page
        window.open(invoice.hosted_invoice_url, '_blank');
      } else {
        setError('Download nicht verfügbar für diese Rechnung');
      }
    } catch (err) {
      console.error('Download error:', err);
      setError('Fehler beim Download der Rechnung');
    }
  };

  if (!user) {
    return <LoadingSpinner />;
  }

  return (
    <div className="min-h-screen bg-black pt-24">
      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8">
          <button
            onClick={() => router.back()}
            className="flex items-center text-neutral-400 hover:text-white mb-4 transition-colors"
          >
            <ArrowLeft className="w-4 h-4 mr-2" />
            Zurück
          </button>
          <h1 className="text-3xl font-bold text-white mb-2">Rechnungen</h1>
          <p className="text-neutral-400">Verwalte und lade deine Rechnungen herunter</p>
        </div>

        {/* Error Message */}
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-6 p-4 bg-red-500/10 backdrop-blur-md rounded-2xl border border-red-500/20"
          >
            <p className="text-red-400">{error}</p>
          </motion.div>
        )}

        {/* Loading State */}
        {isLoading ? (
          <div className="flex justify-center py-12">
            <LoadingSpinner />
          </div>
        ) : (
          /* Invoices Table */
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-3xl border border-neutral-700 overflow-hidden"
          >
            {invoices.length === 0 ? (
              <div className="p-8 text-center">
                <FileText className="w-12 h-12 text-neutral-400 mx-auto mb-4" />
                <h3 className="text-lg font-semibold text-white mb-2">Keine Rechnungen gefunden</h3>
                <p className="text-neutral-400">Es wurden noch keine Rechnungen für dein Konto erstellt.</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead className="bg-neutral-800/50">
                    <tr>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-300">Rechnung</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-300">Rechnungszeitraum</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-300">Betrag</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-300">Status</th>
                      <th className="px-6 py-4 text-left text-sm font-medium text-neutral-300">Aktionen</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-neutral-700">
                    {invoices.map((invoice, index) => (
                      <motion.tr
                        key={invoice.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="hover:bg-neutral-800/30 transition-colors"
                      >
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            <FileText className="w-4 h-4 text-neutral-400 mr-3" />
                            <div>
                              <div className="text-white font-medium">
                                {invoice.number || invoice.id.slice(-8)}
                              </div>
                              <div className="text-sm text-neutral-400">
                                {formatDate(invoice.created)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-neutral-300">
                            <Calendar className="w-4 h-4 mr-2" />
                            {formatDate(invoice.period_start)} - {formatDate(invoice.period_end)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-white font-medium">
                            <Euro className="w-4 h-4 mr-1" />
                            {formatAmount(invoice.amount, invoice.currency)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center">
                            {getStatusIcon(invoice.status)}
                            <span className="ml-2 text-sm text-neutral-300">
                              {getStatusText(invoice.status)}
                            </span>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleDownload(invoice)}
                              className="flex items-center px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all duration-300 border border-blue-500/20 hover:border-blue-500/40"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              Download
                            </button>
                            {invoice.hosted_invoice_url && (
                              <button
                                onClick={() => window.open(invoice.hosted_invoice_url, '_blank')}
                                className="flex items-center px-3 py-2 bg-neutral-500/10 hover:bg-neutral-500/20 text-neutral-400 rounded-lg transition-all duration-300 border border-neutral-500/20 hover:border-neutral-500/40"
                              >
                                <ExternalLink className="w-4 h-4" />
                              </button>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </motion.div>
        )}
      </div>
    </div>
  );
}
