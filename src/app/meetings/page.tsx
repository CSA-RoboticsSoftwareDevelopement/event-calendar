'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Trash2, ArrowLeft, FilePen, X } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useRouter } from 'next/navigation';
import { Dialog } from '@headlessui/react';

type User = {
  id: number;
  name: string;
  email: string;
  designation: string;
};

type Event = {
  id: number;
  title: string;
  start: string;
  end: string;
  assignedTo: {
    user: User;
    userId: number; // Add this to match the data structure
  }[];
};

export default function EventsPage() {
  const router = useRouter();
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  const [nameFilter, setNameFilter] = useState('');
  const eventsPerPage = 15;
  const [hasFetched, setHasFetched] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: '',
    start: '',
    end: '',
    assignedTo: [] as string[],
  });
  const [users, setUsers] = useState<User[]>([]);
  const [pendingRemovals, setPendingRemovals] = useState<string[]>([]);

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

  // Fetch users for the edit modal dropdown
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

  useEffect(() => {
    if (!hasFetched) {
      fetchEvents();
      setHasFetched(true);
    }
  }, [hasFetched]);

  const getUniqueDesignations = () => {
    const designations = new Set<string>();
    events.forEach(event => {
      event.assignedTo?.forEach(assignment => {
        if (assignment.user.designation) {
          designations.add(assignment.user.designation);
        }
      });
    });
    return Array.from(designations);
  };

  const filteredEvents = events.filter(event => {
    const matchesSearch =
      event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.assignedTo?.some(a =>
        a.user.designation?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesFilter =
      filterValue === 'all' ||
      event.assignedTo?.some(a =>
        a.user.designation?.toLowerCase() === filterValue.toLowerCase()
      );

    return matchesSearch && matchesFilter;
  });

  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;
  const currentEvents = filteredEvents.slice(indexOfFirstEvent, indexOfLastEvent);
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/events');
      const data = await res.json();
      setEvents(data);
      toast.success('Events loaded successfully', { id: 'events-loaded' });
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events', { id: 'events-error' });
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (id: number) => {
    const confirmDelete = await new Promise((resolve) => {
      toast.custom((t) => (
        <div className={`${t.visible ? 'animate-enter' : 'animate-leave'}
          max-w-md w-full bg-white dark:bg-zinc-800 shadow-lg rounded-lg pointer-events-auto flex ring-1 ring-black ring-opacity-5`}>
          <div className="flex-1 p-4">
            <div className="flex items-start">
              <div className="ml-3 flex-1">
                <p className="text-sm font-medium text-gray-900 dark:text-white">
                  Confirm Deletion
                </p>
                <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  Are you sure you want to delete this event? This action cannot be undone.
                </p>
              </div>
            </div>
            <div className="mt-4 flex space-x-2">
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(false);
                }}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-md border border-transparent focus:outline-none"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  toast.dismiss(t.id);
                  resolve(true);
                }}
                className="inline-flex justify-center px-4 py-2 text-sm font-medium text-red-700 bg-red-100 hover:bg-red-200 rounded-md border border-transparent focus:outline-none"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      ), { duration: Infinity });
    });

    if (!confirmDelete) return;

    const deletePromise = new Promise(async (resolve, reject) => {
      try {
        const res = await fetch(`/api/events/${id}`, {
          method: 'DELETE',
        });

        if (res.ok) {
          setEvents(prev => prev.filter(event => event.id !== id));
          resolve('Event deleted successfully');
        } else {
          reject('Failed to delete event');
        }
      } catch (error) {
        console.error('Error deleting event:', error);
        reject('Error deleting event');
      }
    });

    toast.promise(deletePromise, {
      loading: 'Deleting event...',
      success: (message) => message as string,
      error: (err) => err as string,
    }, {
      success: { duration: 2000 },
      error: { duration: 2500 },
    });
  };

  const handleEditClick = (event: Event) => {
    setCurrentEvent(event);
    setFormData({
      title: event.title,
      start: toLocalDateTimeString(event.start),
      end: toLocalDateTimeString(event.end),
      assignedTo: event.assignedTo?.map(a => String(a.user.id)) || [],
    });
    setPendingRemovals([]);
    setShowEditModal(true);
  };

  const handleRemoveAssignedUser = (userId: number) => {
    const userIdStr = String(userId);
    setPendingRemovals(prev => [...prev, userIdStr]);
    setFormData(prev => ({
      ...prev,
      assignedTo: prev.assignedTo.filter(id => id !== userIdStr)
    }));
    toast.success('User marked for removal. Changes will be saved when you click Save.');
  };

  const handleSave = async () => {
    if (!currentEvent) return;
    const toastId = toast.loading('Saving changes...');

    try {
      // First, process pending removals
      if (pendingRemovals.length > 0) {
        await Promise.all(
          pendingRemovals.map(userId =>
            fetch(`/api/events/${currentEvent.id}/assignments`, {
              method: 'DELETE',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ userId: Number(userId) }),
            })
          )
        );
      }

      // Then, update the event with UTC times
      const payload = {
        title: formData.title,
        start: toUTCISOString(formData.start),
        end: toUTCISOString(formData.end),
        assignedTo: formData.assignedTo.map(id => Number(id)),
      };

      const res = await fetch(`/api/events/${currentEvent.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setPendingRemovals([]);
        setShowEditModal(false);
        toast.success('Event updated successfully!', { id: toastId });
        fetchEvents(); // Re-fetch events to update the table
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
    <div className="p-6" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="rounded-xl shadow-md p-6" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
              View All Events
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search events or designations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border rounded-md dark:bg-zinc-700 dark:text-white w-full"
              />
            </div>

            {/* Designation Filter Dropdown */}
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="px-4 py-2 border rounded-md dark:bg-zinc-700 dark:text-white"
            >
              <option value="all">All Designations</option>
              {getUniqueDesignations().map((designation, index) => (
                <option key={index} value={designation}>
                  {designation}
                </option>
              ))}
            </select>
          </div>
        </div>

        {loading ? (
          <p>Loading events...</p>
        ) : (
          <div className="overflow-x-auto w-full">
            <div className="rounded-xl overflow-hidden border border-gray-300 dark:border-zinc-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-400 dark:bg-zinc-700">
                  <tr>
                    <th className="border px-2 py-3 w-16 text-left font-bold text-black dark:text-white">Serial No.</th>
                    <th className="border px-4 py-3 text-left font-bold text-black dark:text-white">Date</th>
                    <th className="border px-4 py-3 text-left font-bold text-black dark:text-white">Time</th>
                    <th className="border px-4 py-3 text-left font-bold text-black dark:text-white">Event</th>
                    <th className="border px-4 py-3 text-left font-bold text-black dark:text-white">Assigned To</th>
                    <th className="border px-4 py-3 text-left font-bold text-black dark:text-white">Designation</th>
                    <th className="border px-4 py-3 text-left font-bold text-black dark:text-white">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentEvents.map((event, index) => (
                    <tr
                      key={event.id}
                      className="hover:bg-gray-50 dark:hover:bg-zinc-900"
                      style={{ transition: 'background 0.2s, color 0.2s' }}
                    >
                      <td className="border px-4 py-3">{indexOfFirstEvent + index + 1}</td>
                      <td className="border px-4 py-3">
                        {formatDate(event.start)}
                      </td>
                      <td className="border px-4 py-3">
                        {formatTime(event.start)} - {formatTime(event.end)}
                      </td>
                      <td className="border px-4 py-3 font-medium">
                        {event.title}
                      </td>
                      <td className="border px-4 py-3 break-words max-w-xs">
                        <div className="flex flex-col gap-1">
                          {event.assignedTo?.map((assignment, i) => (
                            <div key={i} className="flex flex-col">
                              <span className="font-medium">{assignment.user.name}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="border px-4 py-3 break-words max-w-xs">
                        <div className="flex flex-col gap-1">
                          {event.assignedTo?.map((assignment, i) => (
                            <div key={i}>
                              <span>{assignment.user.designation}</span>
                            </div>
                          ))}
                        </div>
                      </td>
                      <td className="border px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleEditClick(event)}
                            className="text-blue-600 hover:text-blue-800 flex items-center gap-1"
                            title="Edit event"
                          >
                            <FilePen className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteEvent(event.id)}
                            className="text-red-600 hover:text-red-800 flex items-center gap-1"
                            title="Delete event"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {filteredEvents.length === 0 && (
                    <tr>
                      <td colSpan={7} className="text-center py-6 text-gray-500">
                        No events found matching your criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Pagination */}
        {filteredEvents.length > eventsPerPage && (
          <div className="flex justify-end mt-6">
            <div className="flex gap-2 items-center">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="p-2 rounded-md border hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span className="px-4 py-2 flex items-center" style={{ color: 'var(--foreground)' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="p-2 rounded-md border hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Edit Modal (Copied from agendaview.tsx) */}
      {showEditModal && currentEvent && (
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
                value={formData.start}
                onChange={e => setFormData({ ...formData, start: e.target.value })}
              />
              <input
                type="datetime-local"
                className="w-full border px-3 py-2 rounded"
                value={formData.end}
                onChange={e => setFormData({ ...formData, end: e.target.value })}
              />

              {currentEvent.assignedTo?.length > 0 && (
                <div className="mt-2 p-2 bg-gray-100 rounded">
                  <p className="text-sm font-semibold">Currently Assigned:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {currentEvent.assignedTo
                      .filter(assignment => !pendingRemovals.includes(String(assignment.userId)))
                      .map((assignment, index) => (
                        <li key={assignment.userId} className="flex items-center justify-between">
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
}