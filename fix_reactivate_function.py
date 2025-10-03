# Read the file
with open('/Users/david/dev/my-full-stack-app/app/profile/page.tsx', 'r') as f:
    content = f.read()

# Find and replace the handleReactivateSubscription function
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
        setIsCancelModalOpen(false);      } else {
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

# Also fix the cancel function to use the correct modal close
old_cancel_modal_close = """        setIsCancelModalOpen(false);        setIsCancelModalOpen(false);"""
new_cancel_modal_close = """        setIsCancelModalOpen(false);"""

content = content.replace(old_cancel_modal_close, new_cancel_modal_close)

# Write the file back
with open('/Users/david/dev/my-full-stack-app/app/profile/page.tsx', 'w') as f:
    f.write(content)

print("Reactivate function fixed!")
