# Read the file
with open('/Users/david/dev/my-full-stack-app/app/dashboard/videos/page.tsx', 'r') as f:
    content = f.read()

# Add realtime subscription after the existing useEffect
old_useEffect_end = """  }, [lastFetchTime]);"""

new_realtime_useEffect = """  }, [lastFetchTime]);

  // Real-time subscriptions for video updates
  useEffect(() => {
    if (!user) return;

    const setupRealtimeSubscription = async () => {
      const { supabase } = await import('@/utils/supabase');
      
      const channel = supabase
        .channel('videos_changes')
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'videos',
            filter: `user_id=eq.${user.id}`
          },
          (payload) => {
            console.log('Real-time video update received:', payload);
            
            if (payload.eventType === 'INSERT') {
              // Add new video
              const newVideo = {
                id: payload.new.id,
                name: payload.new.title,
                status: payload.new.status,
                storage_location: payload.new.storage_location,
                created_at: payload.new.created_at,
                publication_date: payload.new.publication_date,
                responsible_person: payload.new.responsible_person,
                inspiration_source: payload.new.inspiration_source,
                description: payload.new.description,
                last_updated: payload.new.last_updated,
                updated_at: payload.new.updated_at,
                duration: payload.new.duration,
                file_size: payload.new.file_size,
                format: payload.new.format,
                thumbnail_url: payload.new.thumbnail_url
              };
              
              setVideos(prevVideos => [newVideo, ...prevVideos]);
            } else if (payload.eventType === 'UPDATE') {
              // Update existing video
              setVideos(prevVideos =>
                prevVideos.map(video =>
                  video.id === payload.new.id
                    ? {
                        ...video,
                        name: payload.new.title,
                        status: payload.new.status,
                        storage_location: payload.new.storage_location,
                        publication_date: payload.new.publication_date,
                        responsible_person: payload.new.responsible_person,
                        inspiration_source: payload.new.inspiration_source,
                        description: payload.new.description,
                        last_updated: payload.new.last_updated,
                        updated_at: payload.new.updated_at,
                        duration: payload.new.duration,
                        file_size: payload.new.file_size,
                        format: payload.new.format,
                        thumbnail_url: payload.new.thumbnail_url
                      }
                    : video
                )
              );
            } else if (payload.eventType === 'DELETE') {
              // Remove deleted video
              setVideos(prevVideos =>
                prevVideos.filter(video => video.id !== payload.old.id)
              );
            }
          }
        )
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    };

    setupRealtimeSubscription();
  }, [user]);"""

content = content.replace(old_useEffect_end, new_realtime_useEffect)

# Write the file back
with open('/Users/david/dev/my-full-stack-app/app/dashboard/videos/page.tsx', 'w') as f:
    f.write(content)

print("Real-time subscriptions added!")
