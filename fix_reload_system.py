# Read the file
with open('/Users/david/dev/my-full-stack-app/app/dashboard/videos/page.tsx', 'r') as f:
    content = f.read()

# Add new state variables for better loading management
old_states = """  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [showPermissionError, setShowPermissionError] = useState(false);
  const [permissionErrorAction, setPermissionErrorAction] = useState('');"""

new_states = """  const [videos, setVideos] = useState<Video[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editingVideo, setEditingVideo] = useState<Video | null>(null);
  const [showPermissionError, setShowPermissionError] = useState(false);
  const [permissionErrorAction, setPermissionErrorAction] = useState('');
  const [updatingVideoIds, setUpdatingVideoIds] = useState<Set<string>>(new Set());
  const [lastFetchTime, setLastFetchTime] = useState<number>(0);"""

content = content.replace(old_states, new_states)

# Add focus event listener for tab switching
old_useEffect = """  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchVideos();
  }, [user, router]);"""

new_useEffect = """  useEffect(() => {
    if (!user) {
      router.push('/login');
      return;
    }
    fetchVideos();
  }, [user, router]);

  // Revalidate data when tab becomes active
  useEffect(() => {
    const handleFocus = () => {
      const now = Date.now();
      // Only refetch if it's been more than 30 seconds since last fetch
      if (now - lastFetchTime > 30000) {
        console.log('Tab focused, revalidating data...');
        fetchVideos();
      }
    };

    const handleVisibilityChange = () => {
      if (!document.hidden) {
        handleFocus();
      }
    };

    window.addEventListener('focus', handleFocus);
    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [lastFetchTime]);"""

content = content.replace(old_useEffect, new_useEffect)

# Update fetchVideos to set lastFetchTime
old_fetchVideos = """      setVideos(transformedVideos);
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setIsLoading(false);
    }"""

new_fetchVideos = """      setVideos(transformedVideos);
      setLastFetchTime(Date.now());
    } catch (error) {
      console.error('Error fetching videos:', error);
    } finally {
      setIsLoading(false);
    }"""

content = content.replace(old_fetchVideos, new_fetchVideos)

# Update handleUpdateStatus with optimistic updates
old_handleUpdateStatus = """  const handleUpdateStatus = async (videoId: string, newStatus: string) => {
    // Check permissions first
    if (!permissions.canEditVideos) {
      setPermissionErrorAction('Status ändern');
      setShowPermissionError(true);
      return;
    }

    try {
      // Import supabase client
      const { supabase } = await import('@/utils/supabase');
      
      // Update video status directly in Supabase
      const { error } = await supabase
        .from('videos')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId);

      if (error) {
        console.error('Error updating video status:', error);
        
        // Better error message for RLS violations
        let errorMessage = 'Fehler beim Aktualisieren des Status';
        if (error.message.includes('row-level security policy')) {
          errorMessage = 'Berechtigung verweigert: Sie haben nicht die erforderlichen Rechte für diese Status-Änderung.';
        } else if (error.message.includes('cutter_assignments')) {
          errorMessage = 'Status-Änderung fehlgeschlagen: Cutter-Zuweisung konnte nicht erstellt werden.';
        } else {
          errorMessage = `Fehler beim Aktualisieren des Status: ${error.message}`;
        }
        
        // Show nice error modal instead of alert
        setErrorDetails({
          title: 'Status-Update fehlgeschlagen',
          message: errorMessage,
          details: error.message
        });
        setShowErrorModal(true);
        return;
      }

      console.log('Status erfolgreich aktualisiert!');
      // Refresh videos to show updated status
      fetchVideos();
    } catch (error) {
      console.error('Error updating status:', error);
      alert('Fehler beim Aktualisieren des Status. Bitte versuche es erneut.');
    }
  };"""

new_handleUpdateStatus = """  const handleUpdateStatus = async (videoId: string, newStatus: string) => {
    // Check permissions first
    if (!permissions.canEditVideos) {
      setPermissionErrorAction('Status ändern');
      setShowPermissionError(true);
      return;
    }

    // Optimistic update - immediately update UI
    setVideos(prevVideos => 
      prevVideos.map(video => 
        video.id === videoId 
          ? { ...video, status: newStatus, updated_at: new Date().toISOString() }
          : video
      )
    );

    // Add to updating set
    setUpdatingVideoIds(prev => new Set(prev).add(videoId));

    try {
      // Import supabase client
      const { supabase } = await import('@/utils/supabase');
      
      // Update video status directly in Supabase
      const { error } = await supabase
        .from('videos')
        .update({ 
          status: newStatus,
          updated_at: new Date().toISOString()
        })
        .eq('id', videoId);

      if (error) {
        console.error('Error updating video status:', error);
        
        // Revert optimistic update on error
        setVideos(prevVideos => 
          prevVideos.map(video => 
            video.id === videoId 
              ? { ...video, status: video.status } // Revert to original status
              : video
          )
        );
        
        // Better error message for RLS violations
        let errorMessage = 'Fehler beim Aktualisieren des Status';
        if (error.message.includes('row-level security policy')) {
          errorMessage = 'Berechtigung verweigert: Sie haben nicht die erforderlichen Rechte für diese Status-Änderung.';
        } else if (error.message.includes('cutter_assignments')) {
          errorMessage = 'Status-Änderung fehlgeschlagen: Cutter-Zuweisung konnte nicht erstellt werden.';
        } else {
          errorMessage = `Fehler beim Aktualisieren des Status: ${error.message}`;
        }
        
        // Show nice error modal instead of alert
        setErrorDetails({
          title: 'Status-Update fehlgeschlagen',
          message: errorMessage,
          details: error.message
        });
        setShowErrorModal(true);
        return;
      }

      console.log('Status erfolgreich aktualisiert!');
      // Refresh videos to ensure consistency
      fetchVideos();
    } catch (error) {
      console.error('Error updating status:', error);
      
      // Revert optimistic update on error
      setVideos(prevVideos => 
        prevVideos.map(video => 
          video.id === videoId 
            ? { ...video, status: video.status } // Revert to original status
            : video
        )
      );
      
      setErrorDetails({
        title: 'Status-Update fehlgeschlagen',
        message: 'Fehler beim Aktualisieren des Status. Bitte versuche es erneut.',
        details: error instanceof Error ? error.message : 'Unknown error'
      });
      setShowErrorModal(true);
    } finally {
      // Remove from updating set
      setUpdatingVideoIds(prev => {
        const newSet = new Set(prev);
        newSet.delete(videoId);
        return newSet;
      });
    }
  };"""

content = content.replace(old_handleUpdateStatus, new_handleUpdateStatus)

# Write the file back
with open('/Users/david/dev/my-full-stack-app/app/dashboard/videos/page.tsx', 'w') as f:
    f.write(content)

print("Reload system improved!")
