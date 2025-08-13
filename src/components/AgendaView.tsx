import { useEffect, useState } from 'react';
import { CalendarEvent } from '@/src/types/Event';
import { Trash2, FilePen } from 'lucide-react';
import { Dialog } from '@headlessui/react';

interface User {
  id: string | number;
  name: string;
}

export const CustomAgendaEvent = ({ event, onEventChanged }: { event: CalendarEvent, onEventChanged?: () => void }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  //const [assignedUsers, setAssignedUsers] = useState<User[]>([]);

  // const handleAddUsers = (newUsers: User[]) => {
  //   // Merge existing + new users without duplicates
  //   const mergedUsers = [
  //     ...assignedUsers,
  //     ...newUsers.filter(
  //       newUser => !assignedUsers.some(user => user.id === newUser.id)
  //     ),
  //   ];

  //   setAssignedUsers(mergedUsers);
  // };

  function toLocalDateTimeString(date: Date) {
    const pad = (n: number) => n.toString().padStart(2, '0');

    const year = date.getFullYear();
    const month = pad(date.getMonth() + 1); // months are 0-based
    const day = pad(date.getDate());
    const hours = pad(date.getHours());
    const minutes = pad(date.getMinutes());

    return `${year}-${month}-${day}T${hours}:${minutes}`;
  }


  const [formData, setFormData] = useState({
    title: event.title,
    start: event.start,
    end: event.end,
    assignedTo: event.assignedTo?.map(a => a.user?.id?.toString()) || [],
  });

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
      setShowDeleteModal(false); // Close modal first
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

  const handleSave = async () => {
    try {
      const payload = {
        ...formData,
        start: new Date(formData.start).toISOString(),
        end: new Date(formData.end).toISOString(),
        assignedTo: formData.assignedTo.map(id => Number(id)), // convert to numbers
      };

      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setShowEditModal(false); // Close modal first
        alert('Event updated!');
        if (onEventChanged) onEventChanged();
      } else {
        const errorText = await res.text();
        console.error("Backend error:", errorText);
        alert('Failed to update event.');
      }
    } catch (err) {
      console.error('Update error:', err);
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
        <Dialog
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          className="fixed inset-0 flex justify-center items-center z-50 bg-black/50"
        >
          <Dialog.Panel className="bg-[#1e1e1e] text-white rounded p-6 w-[500px] shadow-lg">
            <Dialog.Title className="text-lg font-semibold text-white">Edit Event</Dialog.Title>
            <div className="mt-4 space-y-4">
              <input
                className="w-full border border-gray-600 bg-[#2a2a2a] text-white px-3 py-2 rounded placeholder-gray-400"
                value={formData.title}
                onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                placeholder="Title"
              />
              <input
                type="datetime-local"
                className="w-full border border-gray-600 bg-[#2a2a2a] text-white px-3 py-2 rounded"
                value={toLocalDateTimeString(new Date(formData.start))}
                onChange={(e) => setFormData({ ...formData, start: e.target.value })}
              />
              <input
                type="datetime-local"
                className="w-full border border-gray-600 bg-[#2a2a2a] text-white px-3 py-2 rounded"
                value={toLocalDateTimeString(new Date(formData.end))}
                onChange={(e) => setFormData({ ...formData, end: e.target.value })}
              />

              {/* Already assigned users */}
              {event.assignedTo?.length > 0 && (
                <div className="mt-2 p-2 bg-[#2a2a2a] border border-gray-600 rounded">
                  <p className="text-sm font-semibold text-white">Currently Assigned:</p>
                  <ul className="list-disc list-inside text-sm text-gray-300">
                    {event.assignedTo.map((a, index) => (
                      <li key={`${a.user?.id || 'unknown'}-${index}`}>
                        {a.user?.name || 'Unknown'}
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Assigned To - Multi-select */}
              <select
                multiple
                className="w-full border border-gray-600 bg-[#2a2a2a] text-white px-3 py-2 rounded"
                value={formData.assignedTo}
                onChange={(e) =>
                  setFormData({
                    ...formData,
                    assignedTo: Array.from(e.target.selectedOptions).map((o) => o.value),
                  })
                }
              >
                {users.map((user) => (
                  <option
                    key={user.id}
                    value={user.id}
                    className={`${formData.assignedTo.includes(user.id.toString())
                        ? 'bg-blue-600 text-white font-semibold'
                        : 'bg-[#2a2a2a] text-white'
                      }`}
                  >
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end mt-4 gap-2">
              <button
                className="bg-gray-600 hover:bg-gray-500 text-white px-4 py-2 rounded"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-blue-600 hover:bg-blue-500 text-white px-4 py-2 rounded"
                onClick={handleSave}
              >
                Save
              </button>
            </div>
          </Dialog.Panel>
        </Dialog>
      )}

    </div>
  );
};
