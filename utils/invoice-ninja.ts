import axios, { AxiosInstance, AxiosError } from 'axios';

// =====================================================
// Invoice Ninja API Client
// =====================================================
// Dokumentation: https://api-docs.invoicing.co

const client: AxiosInstance = axios.create({
  baseURL: process.env.INVOICE_NINJA_URL,
  headers: {
    'X-API-TOKEN': process.env.INVOICE_NINJA_API_TOKEN!,
    'X-Requested-With': 'XMLHttpRequest',
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 Sekunden Timeout
});

// Error Handler
function handleApiError(error: unknown): never {
  if (axios.isAxiosError(error)) {
    const axiosError = error as AxiosError;
    console.error('[Invoice Ninja API Error]', {
      status: axiosError.response?.status,
      data: axiosError.response?.data,
      message: axiosError.message,
    });
    throw new Error(`Invoice Ninja API Error: ${axiosError.message}`);
  }
  console.error('[Invoice Ninja Unknown Error]', error);
  throw error;
}

// =====================================================
// TypeScript Interfaces
// =====================================================

export interface InvoiceNinjaClient {
  id: string;
  name: string;
  email: string;
  contacts: Array<{
    id: string;
    first_name: string;
    last_name: string;
    email: string;
    contact_key: string; // Für Client Portal Login
  }>;
}

export interface InvoiceNinjaRecurringInvoice {
  id: string;
  client_id: string;
  frequency_id: string; // '5' = monthly
  status_id: string; // '2' = active, '3' = paused, '4' = completed
  auto_bill: string; // 'always', 'optout', 'optin', 'off'
  next_send_date: string;
  remaining_cycles: number;
  line_items: Array<{
    product_key: string;
    notes: string;
    cost: number;
    quantity: number;
  }>;
}

export interface InvoiceNinjaInvoice {
  id: string;
  client_id: string;
  status_id: string; // '1' = draft, '2' = sent, '3' = viewed, '4' = paid, '5' = partial
  number: string;
  date: string;
  due_date: string;
  amount: number;
  balance: number;
  paid_to_date: number;
}

export interface SubscriptionStatus {
  isActive: boolean;
  status: 'active' | 'past_due' | 'canceled' | 'pending';
  currentPeriodEnd?: Date;
  lastInvoice?: InvoiceNinjaInvoice;
}

// =====================================================
// Client Management
// =====================================================

/**
 * Erstellt einen neuen Client (Customer) in Invoice Ninja
 */
export async function createClient(data: {
  name: string;
  email: string;
  user_id?: string; // Custom Field für unsere User ID
}): Promise<InvoiceNinjaClient> {
  try {
    const response = await client.post('/api/v1/clients', {
      name: data.name,
      contacts: [
        {
          first_name: data.name.split(' ')[0] || data.name,
          last_name: data.name.split(' ').slice(1).join(' ') || '',
          email: data.email,
        },
      ],
      custom_value1: data.user_id || '', // Speichere unsere User ID
    });
    
    console.log('[Invoice Ninja] Client erstellt:', response.data.data.id);
    return response.data.data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Lädt einen Client anhand der ID
 */
export async function getClient(clientId: string): Promise<InvoiceNinjaClient> {
  try {
    const response = await client.get(`/api/v1/clients/${clientId}`);
    return response.data.data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Aktualisiert einen Client
 */
export async function updateClient(
  clientId: string,
  data: Partial<InvoiceNinjaClient>
): Promise<InvoiceNinjaClient> {
  try {
    const response = await client.put(`/api/v1/clients/${clientId}`, data);
    console.log('[Invoice Ninja] Client aktualisiert:', clientId);
    return response.data.data;
  } catch (error) {
    handleApiError(error);
  }
}

// =====================================================
// Recurring Invoice (Subscription) Management
// =====================================================

/**
 * Erstellt eine Recurring Invoice (= Abo) für einen Client
 */
export async function createRecurringInvoice(data: {
  client_id: string;
  line_items: Array<{
    product_key: string;
    notes: string;
    cost: number;
    quantity: number;
  }>;
  frequency_id?: string; // '5' = monthly (default)
  auto_bill?: string; // 'always' = automatisch via GoCardless (default)
  next_send_date?: string; // Wann erste Rechnung erstellt wird
}): Promise<InvoiceNinjaRecurringInvoice> {
  try {
    const response = await client.post('/api/v1/recurring_invoices', {
      client_id: data.client_id,
      frequency_id: data.frequency_id || '5', // Monthly
      auto_bill: data.auto_bill || 'always', // GoCardless auto-bill
      auto_bill_enabled: true,
      line_items: data.line_items,
      next_send_date: data.next_send_date || new Date().toISOString().split('T')[0],
      status_id: '2', // Active
    });
    
    console.log('[Invoice Ninja] Recurring Invoice erstellt:', response.data.data.id);
    return response.data.data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Lädt eine Recurring Invoice
 */
export async function getRecurringInvoice(
  subscriptionId: string
): Promise<InvoiceNinjaRecurringInvoice> {
  try {
    const response = await client.get(`/api/v1/recurring_invoices/${subscriptionId}`);
    return response.data.data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Aktualisiert eine Recurring Invoice (z.B. pausieren, kündigen)
 */
export async function updateRecurringInvoice(
  subscriptionId: string,
  data: {
    status_id?: string; // '2' = active, '3' = paused, '4' = completed
    is_deleted?: boolean;
  }
): Promise<InvoiceNinjaRecurringInvoice> {
  try {
    const response = await client.put(
      `/api/v1/recurring_invoices/${subscriptionId}`,
      data
    );
    console.log('[Invoice Ninja] Recurring Invoice aktualisiert:', subscriptionId);
    return response.data.data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Stoppt eine Recurring Invoice (= Abo kündigen)
 */
export async function stopRecurringInvoice(
  subscriptionId: string
): Promise<InvoiceNinjaRecurringInvoice> {
  return updateRecurringInvoice(subscriptionId, { status_id: '4' }); // Completed
}

/**
 * Pausiert eine Recurring Invoice
 */
export async function pauseRecurringInvoice(
  subscriptionId: string
): Promise<InvoiceNinjaRecurringInvoice> {
  return updateRecurringInvoice(subscriptionId, { status_id: '3' }); // Paused
}

/**
 * Reaktiviert eine pausierte Recurring Invoice
 */
export async function resumeRecurringInvoice(
  subscriptionId: string
): Promise<InvoiceNinjaRecurringInvoice> {
  return updateRecurringInvoice(subscriptionId, { status_id: '2' }); // Active
}

// =====================================================
// Invoices & Status Check
// =====================================================

/**
 * Lädt alle Invoices eines Clients mit optionalen Filtern
 */
export async function getClientInvoices(
  clientId: string,
  params?: {
    status?: 'paid' | 'unpaid' | 'overdue';
    date_from?: string; // YYYY-MM-DD
    date_to?: string; // YYYY-MM-DD
  }
): Promise<{ data: InvoiceNinjaInvoice[] }> {
  try {
    const queryParams: Record<string, string> = {
      client_id: clientId,
      sort: 'date|desc', // Neueste zuerst
    };

    // Status Filter
    if (params?.status === 'paid') {
      queryParams.status_id = '4'; // Paid
    } else if (params?.status === 'unpaid') {
      queryParams.status_id = '2,3'; // Sent, Viewed (unbezahlt)
    } else if (params?.status === 'overdue') {
      queryParams.is_overdue = 'true';
    }

    // Datum Filter
    if (params?.date_from) {
      queryParams.date_from = params.date_from;
    }
    if (params?.date_to) {
      queryParams.date_to = params.date_to;
    }

    const response = await client.get('/api/v1/invoices', {
      params: queryParams,
    });

    return { data: response.data.data || [] };
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Lädt eine einzelne Invoice
 */
export async function getInvoice(invoiceId: string): Promise<InvoiceNinjaInvoice> {
  try {
    const response = await client.get(`/api/v1/invoices/${invoiceId}`);
    return response.data.data;
  } catch (error) {
    handleApiError(error);
  }
}

/**
 * Wendet einen Rabatt auf eine Invoice an (für Referral-System)
 */
export async function applyDiscountToInvoice(
  invoiceId: string,
  discountAmount: number // in €
): Promise<InvoiceNinjaInvoice> {
  try {
    const response = await client.put(`/api/v1/invoices/${invoiceId}`, {
      discount: discountAmount,
      is_amount_discount: true, // Fester Betrag, nicht Prozent
    });
    console.log('[Invoice Ninja] Rabatt angewendet:', invoiceId, discountAmount);
    return response.data.data;
  } catch (error) {
    handleApiError(error);
  }
}

// =====================================================
// Client Portal
// =====================================================

/**
 * Generiert die Client Portal URL für einen Kunden
 * Client kann sich damit direkt einloggen und Rechnungen sehen/bezahlen
 */
export function getClientPortalUrl(clientContactKey: string): string {
  const baseUrl = process.env.NEXT_PUBLIC_INVOICE_NINJA_URL;
  return `${baseUrl}/client/key_login/${clientContactKey}`;
}

// =====================================================
// Status Helper - OHNE Webhooks
// =====================================================

/**
 * Prüft den Subscription-Status eines Clients via API
 * Wird beim Login/Seitenaufruf aufgerufen (alle 5 Minuten)
 * 
 * VERBESSERTE LOGIK: Prüft ZUERST Recurring Invoices, dann Zahlungen
 */
export async function checkSubscriptionStatus(
  clientId: string
): Promise<SubscriptionStatus> {
  try {
    const today = new Date();
    const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000);

    // SCHRITT 1: Prüfe ZUERST Recurring Invoices (= Abo-Status)
    console.log('[Invoice Ninja] Prüfe Recurring Invoices für Client:', clientId);
    const recurringInvoices = await getClientRecurringInvoices(clientId);
    
    // Finde aktive Recurring Invoice (status_id = '2' = Active)
    const activeRecurring = recurringInvoices.find(
      (inv: any) => inv.status_id === '2' || inv.status_id === 2
    );

    if (activeRecurring) {
      console.log('[Invoice Ninja] ✅ Aktive Recurring Invoice gefunden:', activeRecurring.id);
      
      // SCHRITT 2: Prüfe bezahlte Rechnungen
      const paidInvoices = await getClientInvoices(clientId, {
        status: 'paid',
        date_from: thirtyDaysAgo.toISOString().split('T')[0],
      });

      if (paidInvoices.data && paidInvoices.data.length > 0) {
        // Aktives Abo + Bezahlte Rechnung = ACTIVE
        const latestInvoice = paidInvoices.data[0];
        const nextBillingDate = new Date(activeRecurring.next_send_date || today);
        
        console.log('[Invoice Ninja] Status: ACTIVE (bezahlte Rechnung vorhanden)');

        return {
          isActive: true,
          status: 'active',
          currentPeriodEnd: nextBillingDate,
          lastInvoice: latestInvoice,
        };
      }

      // SCHRITT 3: Prüfe unbezahlte Rechnungen
      const unpaidInvoices = await getClientInvoices(clientId, { status: 'unpaid' });
      
      if (unpaidInvoices.data && unpaidInvoices.data.length > 0) {
        const oldestUnpaid = unpaidInvoices.data[unpaidInvoices.data.length - 1];
        const dueDate = new Date(oldestUnpaid.due_date);
        const daysPastDue = Math.floor(
          (today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)
        );

        console.log('[Invoice Ninja] Unbezahlte Rechnung gefunden, Tage überfällig:', daysPastDue);

        // Grace Period: 7 Tage
        if (daysPastDue <= 7) {
          return {
            isActive: true, // Noch in Grace Period
            status: 'past_due',
            currentPeriodEnd: new Date(activeRecurring.next_send_date || today),
            lastInvoice: oldestUnpaid,
          };
        } else {
          // Nach 7 Tagen: Abo als canceled markieren
          return {
            isActive: false,
            status: 'canceled',
            lastInvoice: oldestUnpaid,
          };
        }
      }

      // SCHRITT 4: Aktives Abo, aber noch keine Rechnungen generiert
      // Kann passieren wenn:
      // a) Recurring Invoice gerade erst erstellt wurde
      // b) next_send_date liegt in der Zukunft (Trial/Prepaid)
      const nextSendDate = new Date(activeRecurring.next_send_date || today);
      
      if (nextSendDate > today) {
        // Erste Rechnung kommt erst in der Zukunft → Status = ACTIVE (Trial/Prepaid)
        console.log('[Invoice Ninja] Status: ACTIVE (Trial - erste Rechnung kommt:', nextSendDate);
        return {
          isActive: true,
          status: 'active',
          currentPeriodEnd: nextSendDate,
        };
      } else {
        // Rechnung sollte schon da sein, aber ist nicht da → Status = PENDING
        // Manuell erstellte Recurring Invoice ohne Auto-Bill
        console.log('[Invoice Ninja] Status: PENDING (Abo existiert, aber keine Rechnungen)');
        return {
          isActive: false,
          status: 'pending',
        };
      }
    }

    // SCHRITT 5: Keine aktive Recurring Invoice gefunden
    // Prüfe ob pausierte/gestoppte Recurring Invoice existiert
    const pausedRecurring = recurringInvoices.find(
      (inv: any) => inv.status_id === '3' || inv.status_id === 3 // '3' = Paused
    );

    if (pausedRecurring) {
      console.log('[Invoice Ninja] Status: CANCELED (Recurring Invoice pausiert)');
      return {
        isActive: false,
        status: 'canceled',
      };
    }

    // SCHRITT 6: Keine Recurring Invoice gefunden
    // Fallback: Prüfe ob es bezahlte Rechnungen gibt (Legacy/Manuell)
    const paidInvoices = await getClientInvoices(clientId, {
      status: 'paid',
      date_from: thirtyDaysAgo.toISOString().split('T')[0],
    });

    if (paidInvoices.data && paidInvoices.data.length > 0) {
      // Hat bezahlte Rechnung aber keine Recurring Invoice
      // Wahrscheinlich manuelle Zahlung → ACTIVE (aber kein Auto-Renewal)
      const latestInvoice = paidInvoices.data[0];
      const invoiceDate = new Date(latestInvoice.date);
      const nextBillingDate = new Date(invoiceDate.getTime() + 30 * 24 * 60 * 60 * 1000);
      
      console.log('[Invoice Ninja] Status: ACTIVE (manuelle Zahlung, kein Recurring)');

      return {
        isActive: true,
        status: 'active',
        currentPeriodEnd: nextBillingDate,
        lastInvoice: latestInvoice,
      };
    }

    // Keine Recurring Invoice, keine Zahlungen → Status = PENDING
    console.log('[Invoice Ninja] Status: PENDING (kein Abo, keine Zahlungen)');
    return {
      isActive: false,
      status: 'pending',
    };

  } catch (error) {
    console.error('[Invoice Ninja] Status-Check fehlgeschlagen:', error);
    // Im Fehlerfall: Als pending zurückgeben
    return {
      isActive: false,
      status: 'pending',
    };
  }
}

// =====================================================
// Migration & Linking Helpers
// =====================================================

/**
 * Suche Clients nach Email-Adresse
 * Für automatische Migration existierender Kunden
 */
export async function searchClientsByEmail(email: string) {
  try {
    const response = await client.get('/api/v1/clients', {
      params: {
        email: email,
        per_page: 100, // Mehr Ergebnisse für sichere Suche
      },
    });

    if (!response.data || !response.data.data) {
      return [];
    }

    // Filtere exakte Email-Matches (API gibt manchmal partielle Matches)
    const exactMatches = response.data.data.filter((c: any) => {
      const contactEmails = c.contacts?.map((contact: any) => 
        contact.email?.toLowerCase()
      ) || [];
      return contactEmails.includes(email.toLowerCase());
    });

    console.log('[Invoice Ninja] Email-Suche:', email, '→', exactMatches.length, 'Matches');
    return exactMatches;
  } catch (error) {
    console.error('[Invoice Ninja] Email-Suche fehlgeschlagen:', error);
    return [];
  }
}

/**
 * Hole alle Recurring Invoices für einen Client
 * Für Auto-Linking: Prüfe ob Client aktives Abo hat
 */
export async function getClientRecurringInvoices(clientId: string) {
  try {
    const response = await client.get('/api/v1/recurring_invoices', {
      params: {
        client_id: clientId,
        per_page: 100,
      },
    });

    if (!response.data || !response.data.data) {
      return [];
    }

    console.log('[Invoice Ninja] Recurring Invoices für Client:', clientId, '→', response.data.data.length);
    return response.data.data;
  } catch (error) {
    console.error('[Invoice Ninja] Recurring Invoices laden fehlgeschlagen:', error);
    return [];
  }
}

// =====================================================
// Product Helper
// =====================================================

/**
 * Standard-Produkt für monatliches Abo
 */
export function getMonthlySubscriptionProduct() {
  return {
    product_key: 'monthly_subscription',
    notes: 'Monatliches Premium-Abonnement',
    cost: 29.99, // 29,99€ pro Monat
    quantity: 1,
  };
}

// =====================================================
// Export für einfache Verwendung
// =====================================================

export const InvoiceNinja = {
  // Clients
  createClient,
  getClient,
  updateClient,
  
  // Subscriptions (Recurring Invoices)
  createRecurringInvoice,
  getRecurringInvoice,
  updateRecurringInvoice,
  stopRecurringInvoice,
  pauseRecurringInvoice,
  resumeRecurringInvoice,
  
  // Invoices
  getClientInvoices,
  getInvoice,
  applyDiscountToInvoice,
  
  // Status & Portal
  checkSubscriptionStatus,
  getClientPortalUrl,
  
  // Migration & Linking
  searchClientsByEmail,
  getClientRecurringInvoices,
  
  // Helpers
  getMonthlySubscriptionProduct,
};

export default InvoiceNinja;

