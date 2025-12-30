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
  ExternalLink,
  AlertCircle,
  XCircle,
  Info
} from 'lucide-react';
import { supabase } from '@/utils/supabase';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Invoice {
  id: string;
  number: string;
  amount: number;
  balance: number;
  paid_to_date: number;
  status: string;
  status_id: string;
  date: string;
  due_date: string;
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
    
    // Handle tab visibility changes - refresh invoices when tab becomes visible
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible') {
        console.log('Invoices tab became visible, refreshing data...');
        await fetchInvoices();
      }
    };
    
    document.addEventListener('visibilitychange', handleVisibilityChange);
    
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [user, router]);

  const fetchInvoices = async () => {
    try {
      setIsLoading(true);
      setError(null);

      if (!user?.id) {
        throw new Error('No user ID found');
      }

      const response = await fetch(`/api/invoice-ninja/invoices?userId=${user.id}`);

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

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('de-DE', {
      style: 'currency',
      currency: 'EUR',
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('de-DE');
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'Bezahlt':
        return <CheckCircle className="w-4 h-4 text-green-400" />;
      case 'Gesendet':
      case 'Angesehen':
        return <Clock className="w-4 h-4 text-blue-400" />;
      case 'Überfällig':
        return <AlertCircle className="w-4 h-4 text-yellow-400" />;
      case 'Entwurf':
        return <FileText className="w-4 h-4 text-gray-400" />;
      case 'Storniert':
        return <XCircle className="w-4 h-4 text-gray-400" />;
      case 'Teilweise bezahlt':
        return <Clock className="w-4 h-4 text-green-400" />;
      default:
        return <Info className="w-4 h-4 text-gray-400" />;
    }
  };

  const getStatusText = (status: string) => {
    return status; // Invoice Ninja gibt bereits deutsche Labels zurück
  };

  const getStatusTooltip = (status: string) => {
    switch (status) {
      case 'Bezahlt':
        return 'Die Rechnung wurde erfolgreich bezahlt.';
      case 'Gesendet':
      case 'Angesehen':
        return 'Die Zahlung wird von deiner Bank bearbeitet. Dies kann bis zu 7 Tage dauern. Dein Abonnement ist aktiv und kann ohne Einschränkung genutzt werden.';
      case 'Überfällig':
        return 'Die Rechnung ist überfällig. Bitte prüfe deine Zahlungsmethode.';
      case 'Entwurf':
        return 'Diese Rechnung ist noch ein Entwurf und wurde noch nicht finalisiert.';
      case 'Teilweise bezahlt':
        return 'Die Rechnung wurde teilweise bezahlt.';
      case 'Storniert':
        return 'Diese Rechnung wurde storniert.';
      default:
        return '';
    }
  };

  const handleDownload = async (invoice: Invoice) => {
    try {
      // Invoice Ninja PDF Download URL
      const pdfUrl = `${process.env.NEXT_PUBLIC_INVOICE_NINJA_URL}/client/invoice/${invoice.id}.pdf`;
      window.open(pdfUrl, '_blank');
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
                                {formatDate(invoice.date)}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-sm text-neutral-300">
                            <Calendar className="w-4 h-4 mr-2" />
                            Fällig: {formatDate(invoice.due_date)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center text-white font-medium">
                            <Euro className="w-4 h-4 mr-1" />
                            {formatAmount(invoice.amount)}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center group relative">
                            {getStatusIcon(invoice.status)}
                            <span className="ml-2 text-sm text-neutral-300">
                              {getStatusText(invoice.status)}
                            </span>
                            {/* Tooltip */}
                            {getStatusTooltip(invoice.status) && (
                              <div className="absolute left-0 top-full mt-2 w-72 p-3 bg-neutral-800 text-white text-xs rounded-lg shadow-xl border border-neutral-700 opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-50">
                                <div className="flex items-start gap-2">
                                  <Info className="w-4 h-4 text-blue-400 flex-shrink-0 mt-0.5" />
                                  <p className="leading-relaxed">{getStatusTooltip(invoice.status)}</p>
                                </div>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4">
                          <div className="flex items-center space-x-2">
                            <button
                              onClick={() => handleDownload(invoice)}
                              className="flex items-center px-3 py-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-400 rounded-lg transition-all duration-300 border border-blue-500/20 hover:border-blue-500/40"
                            >
                              <Download className="w-4 h-4 mr-2" />
                              PDF
                            </button>
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
