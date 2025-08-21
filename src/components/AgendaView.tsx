import { useEffect, useState } from 'react';
import { Trash2, FilePen, X } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';

interface User {
  id: string | number;
  name: string;
}

// Assumed type definition based on the data structure
interface CalendarEvent {
  id: string | number;
  title: string;
  description?: string;
  start: string | Date;
  end: string | Date;
  assignedTo: { user?: User; userId?: string | number }[]; // <-- adjust type
}

export const CustomAgendaEvent = ({ event, onEventChanged }: { event: CalendarEvent, onEventChanged?: () => void }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);

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

  // State to manage form data for editing, including the new description field.
  const [formData, setFormData] = useState({
    title: event.title,
    description: event.description, // Initializing with the event's description
    start: event.start,
    end: event.end,
    assignedTo: [] as string[], // Explicitly type as string array
  });

  useEffect(() => {
    const assignedIds = event.assignedTo
      ?.map(a => a.user?.id ?? a.userId)
      .filter(Boolean)
      .map(String) || [];

    setFormData(prev => ({
      ...prev,
      assignedTo: assignedIds,
    }));
  }, [event]);

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
    ));
  };
  const handleRemoveAssignedUser = (userId?: string | number) => {
    if (!userId) return;

    const userIdStr = String(userId);

    // Optimistically remove from formData for instant UI reflection
    setFormData(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.filter(id => id !== userIdStr),
    }));

    // Track pending removals for API
    setPendingRemovals(prev => [...prev, userIdStr]);

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
        // Added the description to the payload
        description: formData.description,
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
    <div className="flex flex-col md:flex-row md:justify-between md:items-center">
      <div className="flex-1 min-w-0">
        <strong className="block truncate">{event.title}</strong>
        {/* Display the description on the main event card */}
        {event.description && (
          <p className="text-sm text-gray-700 dark:text-gray-300 mt-1 truncate">
            {event.description}
          </p>
        )}
        <span className="text-sm text-gray-600 dark:text-gray-400 mt-1 block">
          Assigned to:{' '}
          {event.assignedTo?.map(u => u.user?.name).filter(Boolean).join(', ') || '—'}
        </span>
      </div>

      <div className="flex-shrink-0 flex items-center gap-2 mt-2 md:mt-0 md:ml-4">
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
              <label htmlFor="event-title" className="block text-sm font-medium mb-1">Title</label>

              <input
                type="text"
                className="w-full border px-3 py-2 rounded"
                value={formData.title}
                onChange={e => setFormData({ ...formData, title: e.target.value })}
                placeholder="Title"
              />
              {/* Added a textarea for the event description */}
              <label htmlFor="event-description" className="block text-sm font-medium mb-1">Description</label>

              <textarea
                className="w-full border px-3 py-2 rounded resize-y"
                value={formData.description}
                onChange={e => setFormData({ ...formData, description: e.target.value })}
                placeholder="Description"
                rows={3}
              />
              <label htmlFor="event-start" className="block text-sm font-medium mb-1">Start Time</label>

              <input
                type="datetime-local"
                className="w-full border px-3 py-2 rounded"
                value={toLocalDateTimeString(formData.start)}
                onChange={e => setFormData({ ...formData, start: e.target.value })}
              />
              <label htmlFor="event-end" className="block text-sm font-medium mb-1">End Time</label>

              <input
                type="datetime-local"
                className="w-full border px-3 py-2 rounded"
                value={toLocalDateTimeString(formData.end)}
                onChange={e => setFormData({ ...formData, end: e.target.value })}
              />
              <label className="block mb-1 font-medium">Assign to</label>


              {/* Currently Assigned Users */}
              {formData.assignedTo.length > 0 && (
                <div className="mt-2 p-2 bg-gray-100 rounded">
                  <p className="text-sm font-semibold">Currently Assigned:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {formData.assignedTo.map((userId) => {
                      const user = users.find(u => String(u.id) === userId);
                      if (!user) return null; // skip if user is not found
                      return (
                        <li key={user.id} className="flex items-center justify-between">
                          <span>{user.name}</span>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveAssignedUser(user.id);
                            }}
                            className="text-gray-500 hover:text-red-600"
                            title="Remove user"
                          >
                            <X size={14} />
                          </button>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              )}

              <select
                multiple
                className="w-full border px-3 py-2 rounded"
                value={formData.assignedTo}
                onChange={(e) =>
                  setFormData(prev => ({
                    ...prev,
                    assignedTo: [
                      ...prev.assignedTo, // keep existing
                      ...Array.from(e.target.selectedOptions)
                        .map(o => o.value)
                        .filter((v): v is string => v !== undefined)
                        .filter(v => !prev.assignedTo.includes(v)), // avoid duplicates
                    ],
                  }))
                }
              >

                {users.map(user => (
                  <option
                    key={user.id}
                    value={user.id.toString()}
                    className={formData.assignedTo.includes(user.id.toString()) ? "bg-blue-200 font-semibold" : ""}
                  >
                    {user.name}
                  </option>
                ))}
              </select>



            </div>

            <div className="flex justify-end mt-4 gap-2">
              <button className="bg-gray-200 px-4 py-2 rounded" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button
                className="bg-green-600 text-white px-4 py-2 rounded"
                onClick={() => setShowSaveConfirmModal(true)}
              >
                Save
              </button>
              {showSaveConfirmModal && (
                <Dialog
                  open={showSaveConfirmModal}
                  onClose={() => setShowSaveConfirmModal(false)}
                  className="fixed inset-0 flex justify-center items-center z-50 bg-black/50"
                >
                  <Dialog.Panel className="bg-white dark:bg-gray-800 rounded-lg p-6 w-96">
                    <Dialog.Title className="text-lg font-semibold">Confirm Update</Dialog.Title>
                    <p className="mt-2">Are you sure you want to save changes to this event?</p>
                    <div className="flex justify-end mt-4 gap-2">
                      <button
                        className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
                        onClick={() => setShowSaveConfirmModal(false)}
                      >
                        Cancel
                      </button>
                      <button
                        className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white"
                        onClick={async () => {
                          setShowSaveConfirmModal(false);
                          await handleSave();
                        }}
                      >
                        Confirm Save
                      </button>
                    </div>
                  </Dialog.Panel>
                </Dialog>
              )}

            </div>
          </Dialog.Panel>
        </Dialog>
      )}
    </div>
  );
};
