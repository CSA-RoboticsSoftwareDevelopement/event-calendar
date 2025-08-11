import { useEffect, useState } from 'react';
import { CalendarEvent } from '@/src/types/Event';
import { Trash2, Pencil } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import { FilePen } from "lucide-react"; // or PencilLine, SquarePen, etc.

interface User {
  id: string;
  name: string;
}

export const CustomAgendaEvent = ({ event }: { event: CalendarEvent }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);

  const [formData, setFormData] = useState({
    title: event.title,
    start: event.start,
    end: event.end,
    assignedTo: event.assignedTo?.map(a => a.user?.id || '') || [],
  });

  useEffect(() => {
    const fetchUsers = async () => {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
    };
    fetchUsers();
  }, []);

  const handleDelete = async () => {
    try {
      const res = await fetch(`/api/events/${event.id}`, { method: 'DELETE' });
      if (res.ok) {
        alert('Event deleted!');
        setShowDeleteModal(false);
        window.location.reload();
      } else {
        alert('Failed to delete.');
      }
    } catch (err) {
      console.error('Error deleting event:', err);
    }
  };

  const handleEdit = async () => {
    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      if (res.ok) {
        alert('Event updated!');
        setShowEditModal(false);
        window.location.reload();
      } else {
        alert('Failed to update.');
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
          {event.assignedTo?.map(u => u.user?.name || '').join(', ') || '—'}
        </span>
      </div>

      <div className="flex items-center gap-2 ml-4">
<FilePen
  className="w-4 h-4 text-blue-600 cursor-pointer"
  onClick={(e) => {
    e.stopPropagation(); // prevent opening the event details modal 
    setShowEditModal(true);
  }}
  title="Modify"
/>

<Trash2
  className="w-4 h-4 text-red-600 cursor-pointer"
  onClick={(e) => {
    e.stopPropagation(); // prevent opening the event details modal 
    setShowDeleteModal(true);
  }}
  title="Delete"
/>

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
                value={new Date(formData.start).toISOString().slice(0, 16)}
                onChange={e => setFormData({ ...formData, start: e.target.value })}
              />
              <input
                type="datetime-local"
                className="w-full border px-3 py-2 rounded"
                value={new Date(formData.end).toISOString().slice(0, 16)}
                onChange={e => setFormData({ ...formData, end: e.target.value })}
              />

              {/* Assigned To - Multi-select Dropdown */}
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
                  <option key={user.id} value={user.id}>{user.name}</option>
                ))}
              </select>
            </div>

            <div className="flex justify-end mt-4 gap-2">
              <button className="bg-gray-200 px-4 py-2 rounded" onClick={() => setShowEditModal(false)}>Cancel</button>
              <button className="bg-green-600 text-white px-4 py-2 rounded" onClick={handleEdit}>Save</button>
            </div>
          </Dialog.Panel>
        </Dialog>
      )}
    </div>
  );
};
