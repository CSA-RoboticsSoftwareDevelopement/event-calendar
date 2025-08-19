import { useEffect, useState } from 'react';
import { CalendarEvent } from '@/src/types/Event';
import { Trash2, FilePen, X } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';

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
    return new Date(localDateTime).toISOString();
  };

  const toLocalDateTimeString = (utcString: string | Date) => {
    const date = new Date(utcString);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const [formData, setFormData] = useState({
    title: event.title,
    start: event.start,
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

  const handleDeleteConfirmation = async () => {
    setShowDeleteModal(false);

    toast.custom((t) => (
      <div className={`${t.visible ? 'animate-enter' : 'animate-leave'} 
        bg-white dark:bg-gray-800 p-4 rounded-lg shadow-lg border border-gray-200 dark:border-gray-700`}
      >
        <div className="flex flex-col space-y-3">
          <h3 className="font-semibold text-lg">Confirm Deletion</h3>
          <p>Are you sure you want to delete this event?</p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => {
                toast.dismiss(t.id);
                toast.error('Deletion cancelled');
              }}
              className="px-3 py-1.5 text-sm rounded-md bg-gray-200 hover:bg-gray-300"
            >
              Cancel
            </button>
            <button
              onClick={async () => {
                toast.dismiss(t.id);
                const deleteToastId = toast.loading('Deleting event...');

                try {
                  const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' });

                  if (res.ok) {
                    toast.success('Event deleted successfully!', { id: deleteToastId });
                    if (onEventChanged) onEventChanged();
                  } else {
                    throw new Error('Failed to delete event');
                  }
                } catch (err) {
                  toast.error(err instanceof Error ? err.message : 'Failed to delete event', { id: deleteToastId });
                  console.error('Error deleting event:', err);
                }
              }}
              className="px-3 py-1.5 text-sm rounded-md bg-red-600 hover:bg-red-700 text-white"
            >
              Confirm Delete
            </button>
          </div>
        </div>
      </div>
    ), {
      duration: 10000,
      position: 'bottom-right',
    });
  };

  const handleRemoveAssignedUser = (userId?: string | number) => {
    if (userId === undefined || userId === null) {
      console.error('Invalid user ID:', userId);
      toast.error('Cannot remove user: Invalid user ID');
      return;
    }

    const userIdStr = String(userId);
    setPendingRemovals(prev => [...prev, userIdStr]);
    setFormData(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.filter(id => id !== userIdStr)
    }));

    toast.success('User marked for removal. Changes will be saved when you click Save.');
  };

  const handleSave = async () => {
    const toastId = toast.loading('Saving changes...');

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
        toast.success('Event updated successfully!', { id: toastId });
        if (onEventChanged) onEventChanged();
      } else {
        const errorText = await res.text();
        throw new Error(errorText || 'Failed to update event');
      }
    } catch (err) {
      console.error('Update error:', err);
      toast.error(err instanceof Error ? err.message : 'Error saving changes. Please try again.', { id: toastId });
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
              handleDeleteConfirmation(); // Directly show toast confirmation
            }}
          />


        </span>
      </div>

      {/* Delete Modal */}
      {showDeleteModal && (
        <Dialog
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          className="fixed inset-0 flex justify-center items-center z-50 bg-black/50"
        >
          <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
            <Dialog.Title className="text-lg font-semibold">Delete Event</Dialog.Title>
            <p className="mt-2">This action will require confirmation</p>
            <div className="flex justify-end mt-4 gap-2">
              <button
                className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white"
                onClick={handleDeleteConfirmation}
              >
                Continue
              </button>
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