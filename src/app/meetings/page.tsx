'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, Search, Trash2 } from 'lucide-react';
import { toast } from 'react-hot-toast';

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
  }[];
};

export default function EventsPage() {
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterValue, setFilterValue] = useState('all');
  const [nameFilter, setNameFilter] = useState('');
  const eventsPerPage = 15;

  useEffect(() => {
    fetchEvents();
  }, []);

  // Extract all unique designations from events
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

  // Extract all unique names from events
  const getUniqueNames = () => {
    const names = new Set<string>();
    events.forEach(event => {
      event.assignedTo?.forEach(assignment => {
        if (assignment.user.name) {
          names.add(assignment.user.name);
        }
      });
    });
    return Array.from(names);
  };

  // Filter events based on search term, filter value, and name filter
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

    const matchesName = 
      nameFilter === '' ||
      event.assignedTo?.some(a => 
        a.user.name?.toLowerCase().includes(nameFilter.toLowerCase())
      );

    return matchesSearch && matchesFilter && matchesName;
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
      toast.success('Events loaded successfully');
    } catch (error) {
      console.error('Error fetching events:', error);
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  const deleteEvent = async (id: number) => {
    // Enhanced confirmation dialog
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
    });
  };

  return (
    <div className="p-6" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
      <div className="rounded-xl shadow-md p-6" style={{ background: 'var(--background)', color: 'var(--foreground)' }}>
        <div className="flex flex-col md:flex-row md:items-center md:justify-between mb-4 gap-4">
          <h2 className="text-2xl font-bold" style={{ color: 'var(--foreground)' }}>
            View All Meeting Events 
          </h2>
          
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
                        <button
                          onClick={() => deleteEvent(event.id)}
                          className="text-red-600 hover:text-red-800 flex items-center gap-1"
                          title="Delete event"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
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
    </div>
  );
}