import { useEffect, useState } from 'react';
import { CalendarEvent } from '@/src/types/Event';
import { Trash2, FilePen, X } from 'lucide-react';
import { Dialog } from '@headlessui/react';

interface User {
  id: string | number;
  name: string;
}

export const CustomAgendaEvent = ({ event, onEventChanged }: { event: CalendarEvent, onEventChanged?: () => void }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  // Helpers for time conversion
  const toUTCISOString = (localDateTime: string | Date) => {
    const date = typeof localDateTime === 'string' ? new Date(localDateTime) : localDateTime;
//   return new Date(date.getTime() - date.getTimezoneOffset() * 60000).toISOString();
return new Date(localDateTime).toISOString();

  };

  const toLocalDateTimeString = (utcString: string | Date) => {
    const date = new Date(utcString);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const [formData, setFormData] = useState({
    title: event.title,
    start: event.start, // coming from backend as UTC
    end: event.end,
    assignedTo: event.assignedTo?.map(a => a.user?.id?.toString()) || [],
  });

  const [pendingRemovals, setPendingRemovals] = useState<string[]>([]);

  // Fetch all users for the dropdown
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch('/api/users');
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error('Failed to fetch users', err);
      }
    };
    fetchUsers();
  }, []);

  const handleDelete = async () => {
    try {
      setShowDeleteModal(false);
      const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Event deleted!');
        if (onEventChanged) onEventChanged();
      } else {
        alert('Failed to delete.');
      }
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  const handleRemoveAssignedUser = (userId?: string | number) => {
    if (userId === undefined || userId === null) {
      console.error('Invalid user ID:', userId);
      alert('Cannot remove user: Invalid user ID');
      return;
    }

    const userIdStr = String(userId);
    setPendingRemovals(prev => [...prev, userIdStr]);
    setFormData(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.filter(id => id !== userIdStr)
    }));
  };

  const handleSave = async () => {
    try {
      // First process pending removals
      if (pendingRemovals.length > 0) {
        await Promise.all(
          pendingRemovals.map(userId =>
            fetch(`/api/events/${event.id}/assignments`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId }),
            })
          )
        );
      }

      // Then update the event with UTC times
      const payload = {
        ...formData,
        start: toUTCISOString(formData.start),
        end: toUTCISOString(formData.end),
        assignedTo: formData.assignedTo.map(id => Number(id)),
      };

      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setPendingRemovals([]);
        setShowEditModal(false);
        alert('Event updated!');
        if (onEventChanged) onEventChanged();
      } else {
        const errorText = await res.text();
        console.error("Backend error:", errorText);
        alert('Failed to update event.');
      }
    } catch (err) {
      console.error('Update error:', err);
      alert('Error saving changes. Please try again.');
    }
  };

  return (
    <div className="flex justify-between items-center">
      <div>
        <strong>{event.title}</strong>
        <br />
        <span className="text-sm text-gray-600 dark:text-gray-400">
          Assigned to:{' '}
          {event.assignedTo?.map(u => u.user?.name).filter(Boolean).join(', ') || '—'}
        </span>
      </div>

      <div className="flex items-center gap-2 ml-4">
        <span title="Modify">
          <FilePen
            className="w-4 h-4 text-blue-600 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setShowEditModal(true);
            }}
          />
        </span>

        <span title="Delete">
          <Trash2
            className="w-4 h-4 text-red-600 cursor-pointer"
            onClick={(e) => {
              e.stopPropagation();
              setShowDeleteModal(true);
            }}
          />
        </span>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <Dialog open={showDeleteModal} onClose={() => setShowDeleteModal(false)} className="fixed inset-0 flex justify-center items-center z-50 bg-black/50">
          <Dialog.Panel className="bg-white rounded p-6 w-96">
            <Dialog.Title className="text-lg font-semibold">Delete Event</Dialog.Title>
            <p className="mt-2">Are you sure you want to delete this event?</p>
            <div className="flex justify-end mt-4 gap-2">
              <button className="bg-gray-200 px-4 py-2 rounded" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="bg-red-600 text-white px-4 py-2 rounded" onClick={handleDelete}>Delete</button>
            </div>
          </Dialog.Panel>
        </Dialog>
      )}

      {/* Edit Modal */}
      {showEditModal && (
        <Dialog open={showEditModal} onClose={() => setShowEditModal(false)} className="fixed inset-0 flex justify-center items-center z-50 bg-black/50">
          <Dialog.Panel className="bg-white rounded p-6 w-[500px]">
            <Dialog.Title className="text-lg font-semibold">Edit Event</Dialog.Title>

            {pendingRemovals.length > 0 && (
              <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded text-sm">
                You have {pendingRemovals.length} pending user removal(s) that will be saved when you click Save.
              </div>
            )}

            <div className="mt-4 space-y-4">
              <input
                className="w-full border px-3 py-2 rounded"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Title"
              />
              <input
                type="datetime-local"
                className="w-full border px-3 py-2 rounded"
                value={toLocalDateTimeString(formData.start)}
                onChange={e => setFormData({ ...formData, start: e.target.value })}
              />
              <input
                type="datetime-local"
                className="w-full border px-3 py-2 rounded"
                value={toLocalDateTimeString(formData.end)}
                onChange={e => setFormData({ ...formData, end: e.target.value })}
              />

              {event.assignedTo?.length > 0 && (
                <div className="mt-2 p-2 bg-gray-100 rounded">
                  <p className="text-sm font-semibold">Currently Assigned:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {event.assignedTo
                      .filter(assignment => !pendingRemovals.includes(String(assignment.userId)))
                      .map((assignment, index) => (
                        <li key={`${assignment.userId || 'unknown'}-${index}`} className="flex items-center justify-between">
                          <span>{assignment.user?.name || "Unknown"}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAssignedUser(assignment.userId);
                            }}
                            className="text-gray-500 hover:text-red-600"
                            title="Remove user"
                          >
                            <X size={14} />
                          </button>
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <select
                multiple
                className="w-full border px-3 py-2 rounded"
                value={formData.assignedTo}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    assignedTo: Array.from(e.target.selectedOptions).map(o => o.value),
                  })
                }
              >
                {users.map(user => (
                  <option
                    key={user.id}
                    value={user.id}
                    className={formData.assignedTo.includes(user.id.toString()) ? "bg-blue-200 font-semibold" : ""}
                  >
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end mt-4 gap-2">
              <button className="bg-gray-200 px-4 py-2 rounded" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={handleSave}>Save</button>
            </div>
          </Dialog.Panel>
        </Dialog>
      )}
    </div>
  );
};
