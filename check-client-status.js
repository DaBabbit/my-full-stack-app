const axios = require('axios');

const client = axios.create({
  baseURL: process.env.INVOICE_NINJA_URL,
  headers: {
    'X-API-TOKEN': process.env.INVOICE_NINJA_API_TOKEN,
    'Content-Type': 'application/json',
  },
  timeout: 10000,
});

async function checkClient() {
  const clientId = 'z3YaOYpdxq';
  
  console.log('🔍 Prüfe Client:', clientId);
  console.log('━'.repeat(60));
  
  try {
    // 1. Client Details
    const clientRes = await client.get(`/api/v1/clients/${clientId}`);
    const clientData = clientRes.data.data;
    console.log('\n📋 CLIENT INFO:');
    console.log('  Name:', clientData.name || '(leer)');
    console.log('  Number:', clientData.number);
    console.log('  Email:', clientData.contacts[0]?.email);
    console.log('  Status:', clientData.is_deleted ? 'GELÖSCHT' : 'AKTIV');
    
    // 2. Recurring Invoices (Subscriptions)
    const recurringRes = await client.get('/api/v1/recurring_invoices', {
      params: { client_id: clientId }
    });
    const recurringInvoices = recurringRes.data.data;
    
    console.log('\n🔄 RECURRING INVOICES (Subscriptions):');
    console.log('  Anzahl:', recurringInvoices.length);
    
    if (recurringInvoices.length > 0) {
      recurringInvoices.forEach((inv, i) => {
        const statusMap = {
          '1': 'Draft',
          '2': 'Active',
          '3': 'Paused',
          '4': 'Completed',
          '-1': 'Deleted'
        };
        console.log(`\n  Recurring Invoice ${i + 1}:`);
        console.log('    ID:', inv.id);
        console.log('    Number:', inv.number);
        console.log('    Status:', statusMap[inv.status_id] || inv.status_id);
        console.log('    Frequency:', inv.frequency_id);
        console.log('    Amount:', inv.amount);
        console.log('    Auto Bill:', inv.auto_bill);
        console.log('    Next Send Date:', inv.next_send_date);
      });
    } else {
      console.log('  ⚠️  KEINE Recurring Invoices gefunden!');
    }
    
    // 3. Regular Invoices
    const invoicesRes = await client.get('/api/v1/invoices', {
      params: { client_id: clientId, per_page: 10 }
    });
    const invoices = invoicesRes.data.data;
    
    console.log('\n📄 INVOICES (Rechnungen):');
    console.log('  Anzahl:', invoices.length);
    
    const statusMap = {
      '1': 'Draft',
      '2': 'Sent',
      '3': 'Viewed',
      '4': 'Paid',
      '5': 'Partial',
      '6': 'Overdue',
      '-1': 'Cancelled'
    };
    
    invoices.forEach((inv, i) => {
      console.log(`\n  Invoice ${i + 1}:`);
      console.log('    Number:', inv.number);
      console.log('    Status:', statusMap[inv.status_id] || inv.status_id);
      console.log('    Amount:', inv.amount);
      console.log('    Balance:', inv.balance);
      console.log('    Date:', inv.date);
      console.log('    Due Date:', inv.due_date);
      console.log('    Is Recurring?:', inv.recurring_id ? 'Ja' : 'Nein');
    });
    
    // 4. Payment Links (Quotes/Links)
    console.log('\n🔗 PAYMENT LINKS:');
    try {
      const quotesRes = await client.get('/api/v1/quotes', {
        params: { client_id: clientId }
      });
      console.log('  Quotes/Links gefunden:', quotesRes.data.data.length);
      
      if (quotesRes.data.data.length > 0) {
        quotesRes.data.data.forEach((q, i) => {
          console.log(`\n  Link ${i + 1}:`);
          console.log('    ID:', q.id);
          console.log('    Number:', q.number);
          console.log('    Status:', q.status_id);
          console.log('    Amount:', q.amount);
        });
      }
    } catch (err) {
      console.log('  (Keine Quotes API oder keine Links gefunden)');
    }
    
    console.log('\n' + '━'.repeat(60));
    console.log('\n🎯 FAZIT:');
    
    if (recurringInvoices.length > 0) {
      const activeRecurring = recurringInvoices.find(inv => inv.status_id === '2');
      if (activeRecurring) {
        console.log('✅ Client hat AKTIVE Recurring Invoice');
        console.log('   → Subscription sollte als "active" in Supabase sein');
      } else {
        console.log('⚠️  Client hat Recurring Invoice, aber NICHT aktiv');
      }
    } else {
      console.log('❌ Client hat KEINE Recurring Invoice');
      console.log('   → Subscription kann nicht synchronisiert werden');
      console.log('   → Payment Link muss erstellt werden für Recurring Billing');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', JSON.stringify(error.response.data, null, 2));
    }
  }
}

checkClient();
