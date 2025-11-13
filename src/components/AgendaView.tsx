import { useEffect, useState } from 'react';
import { Trash2, FilePen, X } from 'lucide-react';
import { Dialog } from '@headlessui/react';
import toast from 'react-hot-toast';

interface User {
  id: string | number;
  name: string;
}

interface CalendarEvent {
  id: string | number;
  title: string;
  description?: string;
  start: string | Date;
  end: string | Date;
  status?: string;
  eventType?: 'regular' | 'holiday'; // ✅ Added eventType
  assignedTo?: { user?: User; userId?: string | number }[];
}

export const CustomAgendaEvent = ({ event, onEventChanged }: { event: CalendarEvent, onEventChanged?: () => void }) => {
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [users, setUsers] = useState<User[]>([]);
  const [showSaveConfirmModal, setShowSaveConfirmModal] = useState(false);
  const [showCompleteConfirmModal, setShowCompleteConfirmModal] = useState(false);
  const toUTCISOString = (brisbaneDateTime: string | Date) => {
    // Always convert input to "YYYY-MM-DDTHH:mm" string (ignore local timezone)
    const input =
      typeof brisbaneDateTime === "string"
        ? brisbaneDateTime
        : `${brisbaneDateTime.getFullYear()}-${String(brisbaneDateTime.getMonth() + 1).padStart(2, "0")}-${String(brisbaneDateTime.getDate()).padStart(2, "0")}T${String(brisbaneDateTime.getHours()).padStart(2, "0")}:${String(brisbaneDateTime.getMinutes()).padStart(2, "0")}`;


    // Manually parse components (no Date() parsing!)
    const [datePart, timePart] = input.split("T");
    const [year, month, day] = datePart.split("-").map(Number);
    const [hour, minute] = timePart.split(":").map(Number);

    // Brisbane is UTC+10 → subtract 10 hours to get UTC
    // Construct UTC date directly in milliseconds
    const utcMillis = Date.UTC(year, month - 1, day, hour - 10, minute);

    // Return ISO string
    return new Date(utcMillis).toISOString();
  };




  const toLocalDateTimeString = (utcString: string | Date) => {
    const date = new Date(utcString);
    const pad = (n: number) => n.toString().padStart(2, '0');
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };

  const [formData, setFormData] = useState({
    title: event.title,
    description: event.description || '',
    start: event.start,
    end: event.end,
    assignedTo: [] as string[],
  });

  // Initialize form data when event changes
  useEffect(() => {
    const assignedIds = event.assignedTo
      ?.map(a => a.user?.id ?? a.userId)
      .filter(Boolean)
      .map(String) || [];
    const convertUTCToBrisbane = (utcString: string | Date) => {
      const date = new Date(utcString);
      // Convert to Brisbane timezone (UTC+10 or UTC+11 depending on DST)
      return new Date(date.toLocaleString("en-US", { timeZone: "Australia/Brisbane" }));
    };
    setFormData({
      title: event.title || "Untitled Event",
      description: event.description || '',
      start: convertUTCToBrisbane(event.start),
      end: convertUTCToBrisbane(event.end),
      assignedTo: assignedIds,
    });
  }, [event]);

  // Fetch users
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
        bg-white p-4 rounded-lg shadow-lg border border-gray-200`}
      >
        <div className="flex flex-col space-y-3">
          <h3 className="font-semibold text-lg">Confirm Deletion</h3>
          <p>Are you sure you want to delete this event?</p>
          <div className="flex justify-end space-x-2">
            <button
              onClick={() => toast.dismiss(t.id)}
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

  const handleMarkCompleted = async () => {
    setShowCompleteConfirmModal(false);
    const toastId = toast.loading("Marking event as completed...");

    try {
      const res = await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markCompleted" }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to mark event as completed");
      }

      toast.success("Event marked as completed!", { id: toastId });

      if (onEventChanged) {
        onEventChanged();
      }
    } catch (err) {
      console.error("Mark completed error:", err);
      toast.error(err instanceof Error ? err.message : "Error marking event as completed", { id: toastId });
    }
  };

  const handleRemoveAssignedUser = (userId?: string | number) => {
    if (!userId) return;
    const userIdStr = String(userId);

    setFormData(prev => {
      const newAssignedTo = prev.assignedTo.filter(id => id !== userIdStr);
      return {
        ...prev,
        assignedTo: newAssignedTo,
      };
    });
  };

  const handleSave = async () => {
    const toastId = toast.loading("Saving changes...");
    try {
      const finalAssignedTo = formData.assignedTo
        .map(id => Number(id))
        .filter(id => !isNaN(id));

      const payload = {
        title: formData.title,
        description: formData.description || null,
        start: toUTCISOString(formData.start),
        end: toUTCISOString(formData.end),
        assignedTo: finalAssignedTo,
      };
      console.log("🕒 Form Data (Brisbane local):", formData.start, formData.end);
      console.log("🌏 Converted to UTC ISO:", payload.start, payload.end);

      const res = await fetch(`/api/events/${event.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to update event");
      }

      setShowEditModal(false);
      toast.success("Event updated successfully!", { id: toastId });

      if (onEventChanged) {
        onEventChanged();
      }
    } catch (err) {
      console.error("Update error:", err);
      toast.error(err instanceof Error ? err.message : "Error saving changes.", { id: toastId });
    }
  };

  const resetForm = () => {
    const assignedIds = event.assignedTo
      ?.map(a => a.user?.id ?? a.userId)
      .filter(Boolean)
      .map(String) || [];

    setFormData({
      title: event.title,
      description: event.description || '',
      start: event.start,
      end: event.end,
      assignedTo: assignedIds,
    });
  };

  const getEventStatus = (start: string | Date, end: string | Date, manualStatus?: string) => {
    if (manualStatus?.toLowerCase() === "completed") return "Completed";

    const now = new Date();
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (now < startDate) return "Upcoming";
    if (now >= startDate && now <= endDate) return "Ongoing";
    return "Pending";
  };

  // Get status badge
  const getStatusBadge = () => {
    const computedStatus = getEventStatus(event.start, event.end, event.status);

    const colors = {
      Upcoming: "bg-blue-100 text-blue-800",
      Ongoing: "bg-yellow-100 text-yellow-800",
      Completed: "bg-green-100 text-green-800",
      Pending: "bg-gray-100 text-gray-800",
    };

    return (
      <span
        className={`text-xs px-2 py-1 rounded-full font-semibold ${colors[computedStatus as keyof typeof colors]}`}
      >
        {computedStatus}
      </span>
    );
  };

  return (
    <div className="flex flex-col md:flex-row md:justify-between md:items-center">
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <strong className="block truncate">{event.title}</strong>
          {/* ✅ Only show status badge for regular events */}
          {event.eventType === "holiday" ? (
            <span className="text-xs px-2 py-1 rounded-full font-semibold bg-red-100 text-red-700">
              Holiday
            </span>
          ) : (
            getStatusBadge()
          )}
        </div>
        {event.description && (
          <p className="text-sm text-gray-700 mt-1 truncate">
            {event.description}
          </p>
        )}
        <span className="text-sm text-gray-600 mt-1 block">
          Assigned to:{' '}
          {event.assignedTo?.map(u => u.user?.name).filter(Boolean).join(', ') || '—'}
        </span>
      </div>

      <div className="flex flex-col md:flex-row md:justify-between md:items-center gap-2">
        <div className="flex-shrink-0 flex items-center gap-2 mt-2 md:mt-0 md:ml-4">
          {/* ✅ Mark Completed Icon - Only show for regular events that are not completed */}
          {event.eventType !== "holiday" && event.status !== 'completed' && (
            <span
              title="Mark Completed"
              className="w-5 h-5 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setShowCompleteConfirmModal(true);
              }}
            >
              <svg
                xmlns="http://www.w3.org/2000/svg"
                height="100%"
                width="100%"
                viewBox="0 -960 960 960"
                fill="#5bb450"
              >
                <path d="M438-226 296-368l58-58 84 84 168-168 58 58-226 226ZM200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z" />
              </svg>
            </span>
          )}

          {/* Modify Icon */}
          <span title="Modify">
            <FilePen
              className="w-5 h-5 text-blue-600 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                setShowEditModal(true);
              }}
            />
          </span>

          {/* Delete Icon */}
          <span title="Delete">
            <Trash2
              className="w-4 h-4 text-red-600 cursor-pointer"
              onClick={(e) => {
                e.stopPropagation();
                handleDeleteConfirmation();
              }}
            />
          </span>
        </div>
      </div>

      {/* Mark Completed Confirmation Modal */}
      {showCompleteConfirmModal && (
        <Dialog
          open={showCompleteConfirmModal}
          onClose={() => setShowCompleteConfirmModal(false)}
          className="fixed inset-0 flex justify-center items-center z-50 bg-black/50"
        >
          <Dialog.Panel className="bg-white rounded-lg p-6 w-96">
            <Dialog.Title className="text-lg font-semibold">Mark as Completed</Dialog.Title>
            <p className="mt-2">Are you sure you want to mark this event as completed?</p>
            <div className="flex justify-end mt-4 gap-2">
              <button
                className="px-4 py-2 rounded-md bg-gray-200 hover:bg-gray-300"
                onClick={() => setShowCompleteConfirmModal(false)}
              >
                Cancel
              </button>
              <button
                className="px-4 py-2 rounded-md bg-green-600 hover:bg-green-700 text-white"
                onClick={handleMarkCompleted}
              >
                Mark Completed
              </button>
            </div>
          </Dialog.Panel>
        </Dialog>
      )}

      {/* Delete Modal */}
      {showDeleteModal && (
        <Dialog
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          className="fixed inset-0 flex justify-center items-center z-50 bg-black/50"
        >
          <Dialog.Panel className="bg-white rounded-lg p-6 w-96">
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
        <Dialog
          open={showEditModal}
          onClose={() => {
            resetForm();
            setShowEditModal(false);
          }}
          className="fixed inset-0 flex justify-center items-center z-50 bg-black/50 p-2 sm:p-4"
        >
          <Dialog.Panel className="rounded-lg bg-white text-black w-full sm:w-[500px] p-6 shadow-lg">
            <Dialog.Title className="text-lg font-semibold">Edit Event</Dialog.Title>

            <div className="mt-4 space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1">Title</label>
                <input
                  type="text"
                  className="w-full border px-3 py-2 rounded"
                  value={formData.title}
                  onChange={e => setFormData(prev => ({ ...prev, title: e.target.value }))}
                  placeholder="Title"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-1">Description</label>
                <textarea
                  className="w-full border px-3 py-2 rounded resize-y"
                  value={formData.description}
                  onChange={e => setFormData(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Description"
                  rows={3}
                />
              </div>

              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-1">Start Time</label>
                  <input
                    type="datetime-local"
                    className="w-full border px-3 py-2 rounded"
                    value={toLocalDateTimeString(formData.start)}
                    onChange={e => setFormData(prev => ({ ...prev, start: e.target.value }))}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-1">End Time</label>
                  <input
                    type="datetime-local"
                    className="w-full border px-3 py-2 rounded"
                    value={toLocalDateTimeString(formData.end)}
                    onChange={e => setFormData(prev => ({ ...prev, end: e.target.value }))}
                  />
                </div>
              </div>

              <div>
                <label className="block mb-1 font-medium">Assign to</label>

                {formData.assignedTo.length > 0 && (
                  <div className="mt-2 p-2 bg-gray-100 rounded max-h-32 overflow-y-auto mb-2">
                    <p className="text-sm font-semibold mb-1">Currently Assigned ({formData.assignedTo.length}):</p>
                    <ul className="list-none text-sm space-y-1">
                      {formData.assignedTo.map((userId) => {
                        const user = users.find(u => String(u.id) === userId);
                        if (!user) return null;
                        return (
                          <li key={user.id} className="flex items-center justify-between py-1">
                            <span>{user.name}</span>
                            <button
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                handleRemoveAssignedUser(user.id);
                              }}
                              className="text-gray-500 hover:text-red-600 p-1"
                              title="Remove user"
                              type="button"
                            >
                              <X size={16} />
                            </button>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                )}

                {formData.assignedTo.length === 0 && (
                  <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-sm text-yellow-800">
                    No users assigned. Select users from the list below.
                  </div>
                )}

                <select
                  multiple
                  className="w-full border px-3 py-2 rounded h-32"
                  value={formData.assignedTo}
                  onChange={(e) => {
                    const selected = Array.from(e.target.selectedOptions).map(o => o.value);
                    setFormData(prev => ({
                      ...prev,
                      assignedTo: selected,
                    }));
                  }}
                >
                  {users.map(user => (
                    <option
                      key={user.id}
                      value={String(user.id)}
                      className={formData.assignedTo.includes(String(user.id)) ? "bg-blue-100" : ""}
                    >
                      {user.name}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-gray-500 mt-1">Hold Ctrl/Cmd to select multiple users</p>
              </div>
            </div>

            <div className="flex justify-between mt-6 flex-wrap gap-2">
              <div className="flex gap-2">
                <button
                  className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition"
                  onClick={() => {
                    resetForm();
                    setShowEditModal(false);
                  }}
                  type="button"
                >
                  Cancel
                </button>

                <button
                  className="bg-green-600 text-white px-4 py-2 rounded hover:bg-green-700 transition"
                  onClick={() => setShowSaveConfirmModal(true)}
                  type="button"
                >
                  Save
                </button>
              </div>
            </div>

            {/* Save Confirmation Modal */}
            {showSaveConfirmModal && (
              <Dialog
                open={showSaveConfirmModal}
                onClose={() => setShowSaveConfirmModal(false)}
                className="fixed inset-0 flex justify-center items-center z-50 bg-black/50 p-2"
              >
                <Dialog.Panel className="bg-white rounded-lg p-6 w-full sm:w-96">
                  <Dialog.Title className="text-lg font-semibold">Confirm Update</Dialog.Title>
                  <p className="mt-2">Are you sure you want to save changes to this event?</p>

                  <div className="mt-3 p-2 bg-gray-50 rounded text-sm">
                    <p className="font-medium">Assigned Users: {formData.assignedTo.length}</p>
                    {formData.assignedTo.length === 0 && (
                      <p className="text-yellow-600 text-xs mt-1">⚠️ This will remove all user assignments</p>
                    )}
                  </div>

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
          </Dialog.Panel>
        </Dialog>
      )}
    </div>
  );
};