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
  status: string;
  id: number;
  title: string;
  start: string;
  end: string;
  description: string;
  eventType?: string; // New optional field
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
  const [eventTimeFilter, setEventTimeFilter] = useState("upcoming");
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
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [eventToDelete, setEventToDelete] = useState<Event | null>(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [showCompleteConfirmModal, setShowCompleteConfirmModal] = useState(false);
  const [eventToComplete, setEventToComplete] = useState<Event | null>(null);
  const eventsContainerRef = useRef<HTMLDivElement | null>(null);

  const getEventStatus = (event: Event) => {
    // If eventType is holiday, show "Holiday"
    if (event.eventType?.toLowerCase() === "holiday") return "Holiday";

    // If event is manually marked completed, show that
    if (event.status?.toLowerCase() === "completed") return "Completed";

    const now = new Date();
    const startDate = new Date(event.start);
    const endDate = new Date(event.end);

    if (now < startDate) return "Upcoming";
    if (now >= startDate && now <= endDate) return "Ongoing";

    return "Pending"; // Event time over but not completed
  };


  // Helper function to convert local date-time string to UTC ISO string
  const toUTCISOString = (brisbaneDateTime: string | Date) => {
    // Parse local Brisbane datetime string (like "2025-11-13T19:37")
    const date = typeof brisbaneDateTime === "string"
      ? new Date(brisbaneDateTime)
      : brisbaneDateTime;

    // Get the timezone offset for Brisbane (+10 or +11 depending on DST)
    const offsetMinutes = -new Date().toLocaleString("en-US", {
      timeZone: "Australia/Brisbane",
    });

    // Correct way — subtract the Brisbane offset from local time
    const utcDate = new Date(
      date.getTime() - (date.getTimezoneOffset() + 600) * 60000
    );

    return utcDate.toISOString();
  };



  // Helper function to convert UTC ISO string to local date-time string for form input
  const toLocalDateTimeString = (utcString: string | Date) => {
    const date = new Date(utcString);
    const options: Intl.DateTimeFormatOptions = {
      timeZone: "Australia/Brisbane",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    };

    const parts = new Intl.DateTimeFormat("en-AU", options).formatToParts(date);
    const lookup = Object.fromEntries(parts.map(p => [p.type, p.value]));

    return `${lookup.year}-${lookup.month}-${lookup.day}T${lookup.hour}:${lookup.minute}`;
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
    const eventStatus = getEventStatus(event);

    // ⏳ Filter by time / status
    if (eventTimeFilter === "upcoming" && eventStatus !== "Upcoming" && eventStatus !== "Ongoing") {
      return false;
    }

    if (eventTimeFilter === "completed" && eventStatus !== "Completed") {
      return false;
    }

    // 🔍 Search filter
    const matchesSearch =
      event.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      event.assignedTo?.some((a) =>
        a.user.designation?.toLowerCase().includes(searchTerm.toLowerCase())
      );

    // 🎯 Designation filter
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
    return new Date(dateString).toLocaleDateString("en-AU", {
      timeZone: "Australia/Brisbane",
    });
  };


  const formatTime = (dateString: string) => {
    return new Date(dateString).toLocaleTimeString("en-AU", {
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
      timeZone: "Australia/Brisbane",
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

  // Update handleEditClick
  const handleEditClick = (event: Event) => {
    setCurrentEvent(event);
    setFormData({
      title: event.title,
      start: toLocalDateTimeString(event.start),
      end: toLocalDateTimeString(event.end),
      description: event.description,
      assignedTo: event.assignedTo?.map((a) => String(a.userId)) || [], // Use userId instead of user.id
    });
    setShowEditModal(true);
  };

  // Simplify handleRemoveAssignedUser
  const handleRemoveAssignedUser = (userId: number) => {
    const userIdStr = String(userId);
    setFormData((prev) => ({
      ...prev,
      assignedTo: prev.assignedTo.filter((id) => id !== userIdStr),
    }));
  };

  // Add this inside the Edit Modal section to debug
  useEffect(() => {
    if (showEditModal) {
      console.log('FormData assignedTo:', formData.assignedTo);
      console.log('Available users:', users);
      console.log('Current event assigned users:', currentEvent?.assignedTo);

      // 🕒 Log Brisbane → UTC time conversion only
      const startUTC = new Date(toUTCISOString(formData.start));
      const endUTC = new Date(toUTCISOString(formData.end));

      console.log("🕒 Brisbane → UTC (time only):", {
        startBrisbane: formData.start.split("T")[1],
        startUTC: startUTC.toISOString().split("T")[1].split("Z")[0],
        endBrisbane: formData.end.split("T")[1],
        endUTC: endUTC.toISOString().split("T")[1].split("Z")[0],
      });
    }
  }, [showEditModal, formData.start, formData.end, formData.assignedTo, users, currentEvent]);


  // Handles saving the updated event data
  const handleSave = async (currentEvent: Event) => {
    if (!currentEvent) return;
    const toastId = toast.loading("Saving changes...");

    try {
      // Convert assignedTo strings to numbers
      const finalAssignedTo = formData.assignedTo
        .map(id => Number(id))
        .filter(id => !isNaN(id));

      console.log('Saving with assignedTo:', finalAssignedTo);

      const payload = {
        title: formData.title,
        description: formData.description,
        start: toUTCISOString(formData.start),
        end: toUTCISOString(formData.end),
        assignedTo: finalAssignedTo,
      };

      const res = await fetch(`/api/events/${currentEvent.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      if (res.ok) {
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
        err instanceof Error ? err.message : "Error saving changes.",
        { id: toastId }
      );
    }
  };

  // Handle Mark Completed functionality
  const handleMarkCompleted = async (event: Event) => {
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
      fetchEvents(); // Refresh the events list
    } catch (err) {
      console.error("Mark completed error:", err);
      toast.error(err instanceof Error ? err.message : "Error marking event as completed", { id: toastId });
    }
  };

  // Handle Mark Completed click
  const handleMarkCompletedClick = (event: Event) => {
    setEventToComplete(event);
    setShowCompleteConfirmModal(true);
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
              View Events
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
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault(); // prevent form submit / reload
                    // Optional: trigger filtering manually (if you want)
                    setSearchTerm((prev) => prev.trim());
                  }
                }}
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
            {/* Event Time Filter Dropdown */}
            <select
              value={eventTimeFilter}
              onChange={(e) => setEventTimeFilter(e.target.value)}
              className="px-2 py-2 h-11 w-full lg:w-[300px] md:w-[250px] border border-slate-300 text-xs outline-none hover:border-slate-400 rounded-2xl text-black bg-white"
            >
              <option value="upcoming">Upcoming Events</option>
              <option value="all">All Events</option>
              <option value="completed">Completed Events</option>
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
                    <th className="w-[8%] border border-gray-300">Status</th>
                    <th className="w-[10%] border border-gray-300">Assigned To</th>
                    <th className="w-[12%] border border-gray-300">Designation</th>
                    <th className="w-[12%] border border-gray-300">Actions</th>
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
                      <td className="py-3 text-center border border-gray-300">
                        {(() => {
                          const status = getEventStatus(event);
                          const colorClass =
                            status === "Holiday"
                              ? "bg-red-100 text-red-700"
                              : status === "Completed"
                                ? "bg-green-100 text-green-700"
                                : status === "Ongoing"
                                  ? "bg-yellow-100 text-yellow-700"
                                  : status === "Upcoming"
                                    ? "bg-blue-100 text-blue-700"
                                    : "bg-gray-100 text-gray-700"; // Pending


                          return (
                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
                              {status}
                            </span>
                          );
                        })()}

                      </td>

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
                          {/* Mark Completed Button - Only show for events that are not completed */}
                          {event.status !== 'completed' && (
                            <button
                              onClick={() => handleMarkCompletedClick(event)}
                              className="text-green-600 hover:text-green-800 flex items-center justify-center"
                              title="Mark Completed"
                            >
                              <svg
                                xmlns="http://www.w3.org/2000/svg"
                                height="24px"
                                width="24px"
                                viewBox="0 -960 960 960"
                                fill="#5bb450"
                                className="w-5 h-5"
                              >
                                <path d="M438-226 296-368l58-58 84 84 168-168 58 58-226 226ZM200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z" />
                              </svg>
                            </button>
                          )}

                          {/* Edit Button */}
                          <button
                            onClick={() => handleEditClick(event)}
                            className="text-blue-500 hover:text-blue-800 flex items-center justify-center"
                            title="Edit"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              height="24px"
                              width="24px"
                              viewBox="0 -960 960 960"
                              fill="#3B82F6" // Blue-500
                              className="w-5 h-5"
                            >
                              <path d="M560-80v-123l221-220q9-9 20-13t22-4q12 0 23 4.5t20 13.5l37 37q8 9 12.5 20t4.5 22q0 11-4 22.5T903-300L683-80H560Zm300-263-37-37 37 37ZM620-140h38l121-122-18-19-19-18-122 121v38ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v120h-80v-80H520v-200H240v640h240v80H240Zm280-400Zm241 199-19-18 37 37-18-19Z" />
                            </svg>
                          </button>

                          {/* Delete Button */}
                          <button
                            onClick={() => {
                              setEventToDelete(event);
                              setShowDeleteModal(true);
                            }}
                            className="text-red-500 hover:text-red-800 flex items-center justify-center"
                            title="Delete"
                          >
                            <svg
                              xmlns="http://www.w3.org/2000/svg"
                              height="24px"
                              width="24px"
                              viewBox="0 -960 960 960"
                              fill="#DC2626" // Red-500
                              className="w-5 h-5"
                            >
                              <path d="M280-120q-33 0-56.5-23.5T200-200v-520h-40v-80h200v-40h240v40h200v80h-40v520q0 33-23.5 56.5T680-120H280Zm400-600H280v520h400v-520ZM360-280h80v-360h-80v360Zm160 0h80v-360h-80v360ZM280-720v520-520Z" />
                            </svg>
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
                      {/* Mark Completed Button - Only show for events that are not completed */}
                      {event.status !== 'completed' && (
                        <button
                          onClick={() => handleMarkCompletedClick(event)}
                          className="text-green-600 hover:text-green-700"
                          title="Mark Completed"
                        >
                          <svg
                            xmlns="http://www.w3.org/2000/svg"
                            height="20px"
                            width="20px"
                            viewBox="0 -960 960 960"
                            fill="#5bb450"
                          >
                            <path d="M438-226 296-368l58-58 84 84 168-168 58 58-226 226ZM200-80q-33 0-56.5-23.5T120-160v-560q0-33 23.5-56.5T200-800h40v-80h80v80h320v-80h80v80h40q33 0 56.5 23.5T840-720v560q0 33-23.5 56.5T760-80H200Zm0-80h560v-400H200v400Zm0-480h560v-80H200v80Zm0 0v-80 80Z" />
                          </svg>
                        </button>
                      )}
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
                      <span className="font-semibold">📊 Status:</span>{" "}
                      {(() => {
                        const status = getEventStatus(event);
                        const colorClass =
                          status === "Holiday"
                            ? "bg-purple-100 text-purple-700"
                            : status === "Completed"
                              ? "bg-green-100 text-green-700"
                              : status === "Ongoing"
                                ? "bg-yellow-100 text-yellow-700"
                                : status === "Upcoming"
                                  ? "bg-blue-100 text-blue-700"
                                  : "bg-gray-100 text-gray-700"; // Pending

                        return (
                          <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
                            {status}
                          </span>
                        );
                      })()}


                    </p>

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

      {/* Mark Completed Confirmation Modal */}
      {showCompleteConfirmModal && eventToComplete && (
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
                onClick={() => handleMarkCompleted(eventToComplete)}
              >
                Mark Completed
              </button>
            </div>
          </Dialog.Panel>
        </Dialog>
      )}

      {/* Edit Modal */}
      {showEditModal && currentEvent && (
        <Dialog
          open={showEditModal}
          onClose={() => setShowEditModal(false)}
          className="fixed inset-0 flex justify-center items-center z-50 bg-black/50 px-2 sm:px-0 overflow-y-auto"
        >
          <Dialog.Panel className="bg-white rounded-lg p-4 sm:p-6 w-full max-w-md sm:max-w-lg md:max-w-xl lg:max-w-2xl shadow-lg my-8 sm:my-0">
            <Dialog.Title className="text-lg font-semibold text-center sm:text-left">
              Edit Event
            </Dialog.Title>

            <div className="mt-4 space-y-4">
              {/* Title */}
              <div>
                <label
                  htmlFor="event-title"
                  className="block text-sm font-medium mb-1"
                >
                  Title
                </label>
                <input
                  className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.title}
                  onChange={(e) =>
                    setFormData({ ...formData, title: e.target.value })
                  }
                  placeholder="Title"
                />
              </div>

              {/* Description */}
              <div>
                <label
                  htmlFor="event-description"
                  className="block text-sm font-medium mb-1"
                >
                  Description
                </label>
                <textarea
                  className="w-full border px-3 py-2 rounded min-h-[100px] resize-y focus:outline-none focus:ring-2 focus:ring-blue-500"
                  value={formData.description}
                  onChange={(e) =>
                    setFormData({ ...formData, description: e.target.value })
                  }
                  placeholder="Description"
                />
              </div>

              {/* Start / End Time */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label
                    htmlFor="event-start"
                    className="block text-sm font-medium mb-1"
                  >
                    Start Time
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.start}
                    onChange={(e) =>
                      setFormData({ ...formData, start: e.target.value })
                    }
                  />
                </div>
                <div>
                  <label
                    htmlFor="event-end"
                    className="block text-sm font-medium mb-1"
                  >
                    End Time
                  </label>
                  <input
                    type="datetime-local"
                    className="w-full border px-3 py-2 rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
                    value={formData.end}
                    onChange={(e) =>
                      setFormData({ ...formData, end: e.target.value })
                    }
                  />
                </div>
              </div>

              {/* Assigned Users - Fixed Section */}
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
                    console.log('Selected from dropdown:', selected);
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

            {/* Footer */}
            <div className="flex justify-end mt-6 gap-2">
              <button
                className="bg-gray-200 px-4 py-2 rounded hover:bg-gray-300 transition"
                onClick={() => setShowEditModal(false)}
              >
                Cancel
              </button>
              <button
                type="button"
                className="bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700 transition"
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
              Confirm Delete
            </Dialog.Title>
            <p className="mt-2 text-sm text-gray-600">
              Are you sure you want to delete{" "}
              <span className="font-medium">{eventToDelete.title}</span>? This
              action cannot be undone.
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
                  deleteEvent(eventToDelete.id);
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