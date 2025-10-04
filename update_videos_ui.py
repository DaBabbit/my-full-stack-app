# Read the file
with open('/Users/david/dev/my-full-stack-app/app/dashboard/videos/page.tsx', 'r') as f:
    content = f.read()

# Update the CustomDropdown usage to include loading states
old_dropdown_usage = """                              <CustomDropdown
                                options={statusOptions}
                                value={video.status}
                                onChange={(newStatus) => handleUpdateStatus(video.id, newStatus)}
                                className="min-w-[200px]"
                              />"""

new_dropdown_usage = """                              <CustomDropdown
                                options={statusOptions}
                                value={video.status}
                                onChange={(newStatus) => handleUpdateStatus(video.id, newStatus)}
                                className="min-w-[200px]"
                                isLoading={updatingVideoIds.has(video.id)}
                                disabled={updatingVideoIds.has(video.id)}
                              />"""

content = content.replace(old_dropdown_usage, new_dropdown_usage)

# Also update the edit modal dropdown
old_edit_dropdown = """                    <CustomDropdown
                      options={statusOptions}
                      value={editingVideo.status}
                      onChange={(status) => setEditingVideo({ ...editingVideo, status })}
                      className="w-full"
                    />"""

new_edit_dropdown = """                    <CustomDropdown
                      options={statusOptions}
                      value={editingVideo.status}
                      onChange={(status) => setEditingVideo({ ...editingVideo, status })}
                      className="w-full"
                    />"""

content = content.replace(old_edit_dropdown, new_edit_dropdown)

# Write the file back
with open('/Users/david/dev/my-full-stack-app/app/dashboard/videos/page.tsx', 'w') as f:
    f.write(content)

print("Videos UI updated with loading states!")
