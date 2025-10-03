# Read the file
with open('/Users/david/dev/my-full-stack-app/app/profile/page.tsx', 'r') as f:
    content = f.read()

# Fix handleCancelSubscription function
old_cancel = """      if (response.ok) {
        await fetchSubscription();
        setIsCancelModalOpen(false);        setIsCancelModalOpen(false);
      } else {"""

new_cancel = """      if (response.ok) {
        toast.success('Abonnement erfolgreich gekündigt!', {
          position: "top-right",
          autoClose: 2000,
          theme: "dark"
        });
        await fetchSubscription();
        setIsCancelModalOpen(false);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {"""

content = content.replace(old_cancel, new_cancel)

# Fix handleReactivateSubscription function
old_reactivate = """  const handleReactivateSubscription = async () => {
    if (!subscription?.stripe_subscription_id) return;

    try {
      const response = await fetch('/api/stripe/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subscription.stripe_subscription_id }),
      });

      if (response.ok) {
        await fetchSubscription();
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to reactivate subscription');
      }
    } catch (err) {
      console.error('Reactivate subscription error:', err);
      setError('Failed to reactivate subscription');
    }
  };"""

new_reactivate = """  const handleReactivateSubscription = async () => {
    if (!subscription?.stripe_subscription_id) return;
    
    setIsReactivating(true);
    setError(null);

    try {
      const response = await fetch('/api/stripe/reactivate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subscriptionId: subscription.stripe_subscription_id }),
      });

      if (response.ok) {
        toast.success('Abonnement erfolgreich wiederhergestellt!', {
          position: "top-right",
          autoClose: 2000,
          theme: "dark"
        });
        await fetchSubscription();
        setIsReactivateModalOpen(false);
        setTimeout(() => {
          window.location.reload();
        }, 2000);
      } else {
        const data = await response.json();
        setError(data.error || 'Failed to reactivate subscription');
        toast.error('Fehler beim Wiederherstellen des Abonnements');
      }
    } catch (err) {
      console.error('Reactivate subscription error:', err);
      setError('Failed to reactivate subscription');
      toast.error('Fehler beim Wiederherstellen des Abonnements');
    } finally {
      setIsReactivating(false);
    }
  };"""

content = content.replace(old_reactivate, new_reactivate)

# Add reactivate modal states if missing
if 'isReactivateModalOpen' not in content:
    old_states = """  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [error, setError] = useState<string | null>(null);"""

    new_states = """  const [isCancelModalOpen, setIsCancelModalOpen] = useState(false);
  const [isCancelling, setIsCancelling] = useState(false);
  const [isReactivateModalOpen, setIsReactivateModalOpen] = useState(false);
  const [isReactivating, setIsReactivating] = useState(false);
  const [error, setError] = useState<string | null>(null);"""

    content = content.replace(old_states, new_states)

# Update reactivate button to open modal
old_button = """                  {currentSubscription.cancel_at_period_end && currentSubscription.status === 'active' && (
                      <button
                        onClick={handleReactivateSubscription}"""

new_button = """                  {currentSubscription.cancel_at_period_end && currentSubscription.status === 'active' && (
                      <button
                        onClick={() => setIsReactivateModalOpen(true)}"""

content = content.replace(old_button, new_button)

# Add reactivate modal before cancel modal
cancel_modal_start = """      {/* Cancel Confirmation Modal */}
      {isCancelModalOpen && ("""

reactivate_modal = """      {/* Reactivate Confirmation Modal */}
      {isReactivateModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            className="bg-neutral-900/50 backdrop-blur-md rounded-3xl p-6 max-w-md w-full border border-neutral-700"
          >
            <h3 className="text-xl font-semibold mb-4 text-white">Abonnement wiederherstellen?</h3>
            <p className="text-neutral-400 mb-6">
              Ihr Abonnement wird sofort wiederhergestellt und die Abrechnung läuft ab dem {new Date().toLocaleDateString('de-DE')} weiter. 
              Die nächste Zahlung erfolgt am {new Date(currentSubscription?.current_period_end || '').toLocaleDateString('de-DE')}.
            </p>
            <div className="flex gap-4 justify-end">
              <button
                onClick={() => setIsReactivateModalOpen(false)}
                className="px-4 py-2 text-neutral-400 hover:bg-neutral-800 rounded-lg transition-colors"
                disabled={isReactivating}
              >
                Abbrechen
              </button>
              <button
                onClick={handleReactivateSubscription}
                disabled={isReactivating}
                className="px-6 py-2 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-lg transition-all duration-300 border border-green-500/20 hover:border-green-500/40 disabled:opacity-50"
              >
                {isReactivating ? 'Wird wiederhergestellt...' : 'Wiederherstellen'}
              </button>
            </div>
          </motion.div>
        </div>
      )}

      {/* Cancel Confirmation Modal */}
      {isCancelModalOpen && ("""

content = content.replace(cancel_modal_start, reactivate_modal)

# Add ToastContainer before closing div
old_closing = """    </div>
  );
}"""

new_closing = """      <ToastContainer
        position="top-right"
        autoClose={2000}
        hideProgressBar={false}
        newestOnTop={true}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="dark"
        toastStyle={{
          background: '#1f2937',
          color: '#f9fafb',
          border: '1px solid #374151'
        }}
      />
    </div>
  );
}"""

content = content.replace(old_closing, new_closing)

# Write the file back
with open('/Users/david/dev/my-full-stack-app/app/profile/page.tsx', 'w') as f:
    f.write(content)

print("Toast implementation fixed!")
