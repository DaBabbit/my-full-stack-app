# Read the file
with open('/Users/david/dev/my-full-stack-app/app/profile/page.tsx', 'r') as f:
    content = f.read()

# Replace the setTimeout reload with a more elegant solution
old_cancel_success = """      if (response.ok) {
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

new_cancel_success = """      if (response.ok) {
        toast.success('Abonnement erfolgreich gekündigt!', {
          position: "top-right",
          autoClose: 3000,
          theme: "dark"
        });
        await fetchSubscription();
        setIsCancelModalOpen(false);
        // Elegant reload after a short delay to show the toast
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {"""

content = content.replace(old_cancel_success, new_cancel_success)

old_reactivate_success = """      if (response.ok) {
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
      } else {"""

new_reactivate_success = """      if (response.ok) {
        toast.success('Abonnement erfolgreich wiederhergestellt!', {
          position: "top-right",
          autoClose: 3000,
          theme: "dark"
        });
        await fetchSubscription();
        setIsReactivateModalOpen(false);
        // Elegant reload after a short delay to show the toast
        setTimeout(() => {
          window.location.reload();
        }, 1500);
      } else {"""

content = content.replace(old_reactivate_success, new_reactivate_success)

# Write the file back
with open('/Users/david/dev/my-full-stack-app/app/profile/page.tsx', 'w') as f:
    f.write(content)

print("Reload system improved!")
