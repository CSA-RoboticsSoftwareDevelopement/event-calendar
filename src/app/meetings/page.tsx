"use client";
import React, { useEffect, useState, useRef } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Search,
  Trash,
  ArrowLeft,
  Pencil,
  X,
} from "lucide-react";
import { toast } from "react-hot-toast";
import { Dialog } from "@headlessui/react";

// Define the data types for users and events
type User = {
  id: number;
  name: string;
  email: string;
  designation: string;
};

// Added 'description' to the Event type
type Event = {
  id: number;
  title: string;
  start: string;
  end: string;
  description: string; // New field for the event description
  assignedTo: {
    user: User;
    userId: number;
  }[];
};

export default function EventsPage() {
  // Initialize hooks and state variables
  const [events, setEvents] = useState<Event[]>([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [searchTerm, setSearchTerm] = useState("");
  const [filterValue, setFilterValue] = useState("all");
  const eventsPerPage = 15;
  const [hasFetched, setHasFetched] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [currentEvent, setCurrentEvent] = useState<Event | null>(null);
  const [formData, setFormData] = useState({
    title: "",
    start: "",
    end: "",
    description: "", // New state for the description field
    assignedTo: [] as string[],
  });
  const [users, setUsers] = useState<User[]>([]);
  const [pendingRemovals, setPendingRemovals] = useState<string[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const eventsContainerRef = useRef<HTMLDivElement | null>(null);
  // Helper function to convert local date-time string to UTC ISO string
  const toUTCISOString = (localDateTime: string | Date) => {
    const date =
      typeof localDateTime === "string"
        ? new Date(localDateTime)
        : localDateTime;
    return new Date(localDateTime).toISOString();
  };

  // Helper function to convert UTC ISO string to local date-time string for form input
  const toLocalDateTimeString = (utcString: string | Date) => {
    const date = new Date(utcString);
    const pad = (n: number) => n.toString().padStart(2, "0");
    return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(
      date.getDate()
    )}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
  };
  // Fetch users for the edit modal dropdown on component mount
  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users");
        const data = await res.json();
        setUsers(data);
      } catch (err) {
        console.error("Failed to fetch users", err);
      }
    };
    fetchUsers();
  }, []);

  // Fetch events when the component first mounts
  useEffect(() => {
    if (!hasFetched) {
      fetchEvents();
      setHasFetched(true);
    }
  }, [hasFetched]);

  // Fetches event data from the API
  const fetchEvents = async () => {
    setLoading(true);
    try {
      const res = await fetch("/api/events");
      const data = await res.json();
      setEvents(data);
    } catch (error) {
      console.error("Error fetching events:", error);
      toast.error("Failed to load events", { id: "events-error" });
    } finally {
      setLoading(false);
    }
  };

  // Gets a list of unique designations for the filter dropdown
  const getUniqueDesignations = () => {
    const designations = new Set<string>();
    events.forEach((event) => {
      event.assignedTo?.forEach((assignment) => {
        if (assignment.user.designation) {
          designations.add(assignment.user.designation);
        }
      });
    });
    return Array.from(designations);
  };

  // Filters events based on search term and designation filter
  const filteredEvents = events.filter((event) => {
    const matchesSearch =
      event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase()) || // Added description to search
      event.assignedTo?.some((a) =>
        a.user.designation?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    const matchesFilter =
      filterValue === "all" ||
      event.assignedTo?.some(
        (a) => a.user.designation?.toLowerCase() === filterValue.toLowerCase()
      );

    return matchesSearch && matchesFilter;
  });

  // Pagination logic
  const indexOfLastEvent = currentPage * eventsPerPage;
  const indexOfFirstEvent = indexOfLastEvent - eventsPerPage;

  // Sort events by start date ascending (earliest first)
  const sortedEvents = [...filteredEvents].sort(
    (a, b) => new Date(a.start).getTime() - new Date(b.start).getTime()
  );

  // Slice after sorting
  const currentEvents = sortedEvents.slice(indexOfFirstEvent, indexOfLastEvent);
  const totalPages = Math.ceil(filteredEvents.length / eventsPerPage);

  // Formatting helpers for date and time display
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString();
  };

  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  // Handles event deletion with a confirmation toast
  const deleteEvent = async (id: number) => {
    try {
      const res = await fetch(`/api/events/${id}`, { method: "DELETE" });

      if (res.ok) {
        setEvents((prev) => prev.filter((event) => event.id !== id));
        toast.success("Event deleted successfully", { duration: 2000 });
      } else {
        toast.error("Failed to delete event", { duration: 2500 });
      }
    } catch (error) {
      console.error("Error deleting event:", error);
      toast.error("Error deleting event", { duration: 2500 });
    }
  };

  // Prepares the edit modal with the selected event's data
  const handleEditClick = (event: Event) => {
    setCurrentEvent(event);
    setFormData({
      title: event.title,
      start: toLocalDateTimeString(event.start),
      end: toLocalDateTimeString(event.end),
      description: event.description, // Set the description in the form data
      assignedTo: event.assignedTo?.map((a) => String(a.user.id)) || [],
    });
    setPendingRemovals([]);
    setShowEditModal(true);
  };

  // Handles marking a user for removal, which is finalized on save
  const handleRemoveAssignedUser = (userId: number) => {
    const userIdStr = String(userId);
    setPendingRemovals((prev) => [...prev, userIdStr]);
    setFormData((prev) => ({
      ...prev,
      assignedTo: prev.assignedTo.filter((id) => id !== userIdStr),
    }));
  };

  // Handles saving the updated event daa
  const handleSave = async (currentEvent: Event) => {
    if (!currentEvent) return;
    const toastId = toast.loading("Saving changes...");

    try {
      // Rest of your existing code remains the same...
      // First, process pending removals
      if (pendingRemovals.length > 0) {
        await Promise.all(
          pendingRemovals.map((userId) =>
            fetch(`/api/events/${currentEvent.id}/assignments`, {
              method: "DELETE",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ userId: Number(userId) }),
            })
          )
        );
      }

      // Then, update the event with UTC times and the new description
      const payload = {
        title: formData.title,
        description: formData.description,
        start: toUTCISOString(formData.start),
        end: toUTCISOString(formData.end),
        assignedTo: formData.assignedTo.map((id) => Number(id)),
      };

      const res = await fetch(`/api/events/${currentEvent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
        setPendingRemovals([]);
        setShowEditModal(false);
        toast.success("Event updated successfully!", { id: toastId });
        fetchEvents();
      } else {
        const errorText = await res.text();
        throw new Error(errorText || "Failed to update event");
      }
    } catch (err) {
      console.error("Update error:", err);
      toast.error(
        err instanceof Error
          ? err.message
          : "Error saving changes. Please try again.",
        { id: toastId }
      );
    }
  };
  useEffect(() => {
    if (eventsContainerRef.current) {
      eventsContainerRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [currentPage]);
  return (
    <div className="text-black w-full px-2 sm:px-4 lg:px-6 mx-auto mt-4 border-zinc-900">
      <div className="rounded-3xl shadow-md p-3 sm:p-4 lg:p-6 w-full mx-auto">
        <div className="lg:flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => {
                if (document.referrer) {
                  // Go back to the previous page if there is one
                  window.location.href = document.referrer;
                } else {
                  // Fallback: go to homepage
                  window.location.href = "/";
                }
              }}
              className="p-2 rounded-full hover:bg-gray-200 transition-colors mb-4"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>

            <h2 className="text-2xl text-black mb-6 mt-2 font-semibold">
              View All Events
            </h2>
          </div>

          <div className="flex flex-col sm:flex-row gap-3 justify-center md:justify-end">
            {/* Search Input */}
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search events or designations..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 h-11 w-full md:w-[250px] bg-white lg:w-[300px] border border-slate-300 text-xs outline-none hover:border-slate-400  rounded-2xl text-black"
              />
            </div>

            {/* Designation Filter Dropdown */}
            <select
              value={filterValue}
              onChange={(e) => setFilterValue(e.target.value)}
              className="px-2 py-2 h-11 w-full lg:w-[300px] md:w-[250px]   border border-slate-300 text-xs outline-none hover:border-slate-400  rounded-2xl text-black bg-white"
            >
              <option value="all" className="pr-2">All Designations</option>
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
          <div ref={eventsContainerRef} className="mt-7">
            {/* Desktop / Tablet View */}
            <div className="hidden md:block overflow-x-auto rounded-lg">
              <table className="w-full table-fixed border-collapse border border-gray-300 rounded-2xl">
                <thead className="h-14 bg-zinc-500 text-white">
                  <tr>
                    <th className="w-[4%] border border-gray-300">S No.</th>
                    <th className="w-[10%] border border-gray-300">Date</th>
                    <th className="w-[10%] border border-gray-300">Time</th>
                    <th className="w-[15%] border border-gray-300">Event</th>
                    <th className="w-[30%] border border-gray-300">Description</th>
                    <th className="w-[10%] border border-gray-300">Assigned To</th>
                    <th className="w-[12%] border border-gray-300">Designation</th>
                    <th className="w-[8%] border border-gray-300">Actions</th>
                  </tr>
                </thead>
                <tbody className="text-sm">
                  {currentEvents.map((event, index) => (
                    <tr key={event.id} className="hover:bg-gray-50">
                      <td className="py-3 text-center border border-gray-300">{indexOfFirstEvent + index + 1}</td>
                      <td className="py-3 px-3 border border-gray-300">{formatDate(event.start)}</td>
                      <td className="py-3 px-3 border border-gray-300">
                        {formatTime(event.start)} - {formatTime(event.end)}
                      </td>
                      <td className="py-3 px-3 font-medium border border-gray-300">{event.title}</td>
                      <td className="py-3 px-3 break-words border border-gray-300">{event.description}</td>
                      <td className="py-3 px-3 border border-gray-300">
                        {event.assignedTo?.map((a, i) => (
                          <div key={i} className="font-medium">{a.user.name}</div>
                        ))}
                      </td>
                      <td className="py-3 px-3 border border-gray-300">
                        {event.assignedTo?.map((a, i) => (
                          <div key={i}>{a.user.designation}</div>
                        ))}
                      </td>
                      <td className="py-3 text-center border border-gray-300">
                        <div className="flex justify-center gap-3">
                          <button
                            onClick={() => handleEditClick(event)}
                            className="text-blue-500 hover:text-blue-800"
                            title="Edit"
                          >
                            <Pencil className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => {
                              setEventToDelete(event);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-500 hover:text-red-800"
                            title="Delete"
                          >
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Mobile View (Card Layout) */}
            <div className="block md:hidden space-y-4">
              {currentEvents.map((event, index) => (
                <div
                  key={event.id}
                  className="border rounded-lg p-4 shadow-md bg-white"
                >
                  {/* Event Title + Action Buttons */}
                  <div className="flex justify-between items-start">
                    <h3 className="text-base font-semibold text-gray-900">
                      {event.title}
                    </h3>
                    <div className="flex gap-3 shrink-0">
                      <button
                        onClick={() => handleEditClick(event)}
                        className="text-blue-500 hover:text-blue-700"
                        title="Edit"
                      >
                        <Pencil className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setEventToDelete(event);
                          setShowDeleteModal(true);
                        }}
                        className="text-red-500 hover:text-red-700"
                        title="Delete"
                      >
                        <Trash className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* Event Meta Info */}
                  <div className="mt-3 text-sm text-gray-700 space-y-1">

                    <p><span className="font-semibold">📅 Date:</span> {formatDate(event.start)}</p>
                    <p><span className="font-semibold">⏰ Time:</span> {formatTime(event.start)} - {formatTime(event.end)}</p>
                    <p><span className="font-semibold">📝 Description:</span> {event.description}</p>
                    <p>
                      <span className="font-semibold">👤 Assigned To:</span>{" "}
                      {event.assignedTo?.map(a => a.user.name).join(", ")}
                    </p>
                    <p>
                      <span className="font-semibold">💼 Designation:</span>{" "}
                      {event.assignedTo?.map(a => a.user.designation).join(", ")}
                    </p>
                  </div>
                </div>
              ))}
            </div>

          </div>

        )}

        {/* Pagination */}
        {filteredEvents.length > eventsPerPage && (
          <div className="flex justify-end mt-6">
            <div className="flex gap-2 items-center">
              <button
                onClick={() => {
                  setCurrentPage((prev) => Math.max(prev - 1, 1));
                  window.scrollTo({ top: 0, behavior: "smooth" }); // scroll to top
                }}
                disabled={currentPage === 1}
                className="p-2 rounded-md border hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>

              <span className="px-4 py-2 flex items-center text-black">
                Page {currentPage} of {totalPages}
              </span>

              <button
                onClick={() => {
                  setCurrentPage((prev) => Math.min(prev + 1, totalPages));
                  window.scrollTo({ top: 0, behavior: "smooth" }); // scroll to top
                }}
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
        <Dialog
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          className="fixed inset-0 flex justify-center items-center z-50 bg-black/50"
        >
          <Dialog.Panel className="bg-white rounded p-6 w-[500px]">
            <Dialog.Title className="text-lg font-semibold">
              Edit Event
            </Dialog.Title>

            {pendingRemovals.length > 0 && (
              <div className="mb-4 p-2 bg-yellow-100 text-yellow-800 rounded text-sm">
                You have {pendingRemovals.length} pending user removal(s) that
                will be saved when you click Save.
              </div>
            )}

            <div className="mt-4 space-y-4">
              <label
                htmlFor="event-title"
                className="block text-sm font-medium mb-1"
              >
                Title
              </label>

              <input
                className="w-full border px-3 py-2 rounded"
                value={formData.title}
                onChange={(e) =>
                  setFormData({ ...formData, title: e.target.value })
                }
                placeholder="Title"
              />
              <label
                htmlFor="event-description"
                className="block text-sm font-medium mb-1"
              >
                Description
              </label>
              <textarea
                className="w-full border px-3 py-2 rounded min-h-[100px]" // Added textarea for a larger input area
                value={formData.description}
                onChange={(e) =>
                  setFormData({ ...formData, description: e.target.value })
                }
                placeholder="Description"
              />
              <label
                htmlFor="event-start"
                className="block text-sm font-medium mb-1"
              >
                Start Time
              </label>

              <input
                type="datetime-local"
                className="w-full border px-3 py-2 rounded"
                value={formData.start}
                onChange={(e) =>
                  setFormData({ ...formData, start: e.target.value })
                }
              />
              <label
                htmlFor="event-end"
                className="block text-sm font-medium mb-1"
              >
                End Time
              </label>

              <input
                type="datetime-local"
                className="w-full border px-3 py-2 rounded"
                value={formData.end}
                onChange={(e) =>
                  setFormData({ ...formData, end: e.target.value })
                }
              />
              <label className="block mb-1 font-medium">Assign to </label>

              {currentEvent.assignedTo?.length > 0 && (
                <div className="mt-2 p-2 bg-gray-100 rounded">
                  <p className="text-sm font-semibold">Currently Assigned:</p>
                  <ul className="list-disc list-inside text-sm space-y-1">
                    {currentEvent.assignedTo
                      .filter(
                        (assignment) =>
                          !pendingRemovals.includes(String(assignment.userId))
                      )
                      .map((assignment, index) => (
                        <li
                          key={assignment.userId}
                          className="flex items-center justify-between"
                        >
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
                onChange={(e) => {
                  const newSelected = Array.from(e.target.selectedOptions).map(
                    (o) => o.value
                  );
                  // Append new selections without removing existing ones
                  setFormData({
                    ...formData,
                    assignedTo: Array.from(
                      new Set([...formData.assignedTo, ...newSelected])
                    ),
                  });
                }}
              >
                {users.map((user) => (
                  <option
                    key={user.id}
                    value={user.id}
                    className={
                      formData.assignedTo.includes(user.id.toString())
                        ? "bg-blue-200 font-semibold"
                        : ""
                    }
                  >
                    {user.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex justify-end mt-4 gap-2">
              <button
                className="bg-gray-200 px-4 py-2 rounded"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={() => setShowSaveModal(true)}
              >
                Save
              </button>
            </div>
          </Dialog.Panel>
        </Dialog>
      )}
      {showSaveModal && currentEvent && (
        <Dialog
          open={showSaveModal}
          onClose={() => setShowSaveModal(false)}
          className="fixed inset-0 flex justify-center items-center z-50 bg-black/50"
        >
          <Dialog.Panel className="bg-white rounded p-6 w-[400px]">
            <Dialog.Title className="text-lg font-semibold">
              Confirm Save
            </Dialog.Title>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to save changes to{" "}
              <span className="font-medium">{currentEvent.title}</span>?
            </p>

            <div className="flex justify-end mt-4 gap-2">
              <button
                className="bg-gray-200 px-4 py-2 rounded"
                onClick={() => setShowSaveModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-blue-600 text-white px-4 py-2 rounded"
                onClick={() => {
                  handleSave(currentEvent);
                  setShowSaveModal(false);
                }}
              >
                Save
              </button>
            </div>
          </Dialog.Panel>
        </Dialog>
      )}

      {showDeleteModal && eventToDelete && (
        <Dialog
          open={showDeleteModal}
          onClose={() => setShowDeleteModal(false)}
          className="fixed inset-0 flex justify-center items-center z-50 bg-black/50"
        >
          <Dialog.Panel className="bg-white rounded p-6 w-[400px]">
            <Dialog.Title className="text-lg font-semibold">
              Confirm Deletion
            </Dialog.Title>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-medium">{eventToDelete.title}</span>?
            </p>

            <div className="flex justify-end mt-4 gap-2">
              <button
                className="bg-gray-200 px-4 py-2 rounded"
                onClick={() => setShowDeleteModal(false)}
              >
                Cancel
              </button>
              <button
                className="bg-red-600 text-white px-4 py-2 rounded"
                onClick={() => {
                  if (eventToDelete) deleteEvent(eventToDelete.id);
                  setShowDeleteModal(false);
                }}
              >
                Delete
              </button>
            </div>
          </Dialog.Panel>
        </Dialog>
      )}
    </div>
  );
}
