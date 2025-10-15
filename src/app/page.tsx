'use client';
import { useEffect, useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'tippy.js/dist/tippy.css';
import { useRouter } from 'next/navigation';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'styles/calander.css';
import { CalendarEvent, User } from '@/src/types/Event';
import { CustomAgendaEvent } from '@/src/components/AgendaView';
//import { CustomEvent } from '@/src/components/CustomEvent';
//import { CustomMonthEvent } from '@/src/components/CustomMonthEvent';
//import { CustomDateCellWrapper } from '@/src/components/CustomDateCellWrapper';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { ChevronRight, ChevronLeft } from 'lucide-react';
import Tippy from '@tippyjs/react';

const getEventStatus = (start: string | Date, end: string | Date, manualStatus?: string) => {
  if (manualStatus?.toLowerCase() === "completed") return "Completed";

  const now = new Date();
  const startDate = new Date(start);
  const endDate = new Date(end);

  if (now < startDate) return "Upcoming";
  if (now >= startDate && now <= endDate) return "Ongoing";

  // ✅ If event time has ended but not completed
  return "Pending";
};

const localizer = momentLocalizer(moment);

interface UserAvailability {
  id: number;
  name: string;
  isBusy: boolean;
  nextAvailable: string;
  availableSlots?: { start: string; end: string }[];
}

export default function App() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserAvailability[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [eventType, setEventType] = useState<'regular' | 'holiday'>('regular');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showDayEventsModal, setShowDayEventsModal] = useState(false);
  const [eventsForSelectedDate, setEventsForSelectedDate] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentUserPage, setCurrentUserPage] = useState(0);
  const [windowWidth, setWindowWidth] = useState<number>(typeof window !== "undefined" ? window.innerWidth : 1024); // default width for SSR
  const usersPerPage = windowWidth < 760 ? 9 : windowWidth >= 760 && windowWidth < 1280 ? 15 : 19;
  console.log(windowWidth);
  
  //Authentication  
  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [countdown, setCountdown] = useState(5); // 5 seconds
  const [realUname, setRealUname] = useState("");
  
  //Authentication  
  useEffect(() => {
    if (typeof window === "undefined") return;
    
    const handleResize = () => {
      window.addEventListener('resize', () => {
        setWindowWidth(window.innerWidth);
      });
    };
    
    handleResize();
    const params = new URLSearchParams(window.location.search);
    const uidParam = params.get("uid");
    const unameParam = params.get("uname");
    const roleParam = params.get("role"); // <-- added user_role
    
    if (uidParam && unameParam && roleParam) {
      // ✅ Save from URL into sessionStorage
      sessionStorage.setItem("uid", uidParam);
      sessionStorage.setItem("uname", unameParam);
      sessionStorage.setItem("role", roleParam); // <-- store role
      console.log("📦 Encoded session stored:", { uidParam, unameParam, roleParam });
      
      try {
        const decodedUid = atob(uidParam);
        const decodedUname = atob(unameParam);
        const decodedRole = atob(roleParam); // <-- decode role
        const [, realUid] = decodedUid.split("|");
        const [, realUnameDecoded] = decodedUname.split("|");
        const [, realRole] = decodedRole.split("|");
        setRealUname(realUnameDecoded); // <-- store decoded name in state
        console.log("🔓 Decoded values (without salt):", {
          realUid,
          realUname: realUnameDecoded,
          realRole, // <-- log role
        });
      } catch {
        console.error("❌ Failed to decode values");
      }

      // Clean URL (remove query params)
      window.history.replaceState({}, document.title, "/");
    } else {
      // 🚨 No URL values → check sessionStorage
      const uidStored = sessionStorage.getItem("uid");
      const unameStored = sessionStorage.getItem("uname");
      const roleStored = sessionStorage.getItem("role"); // <-- check role

      if (!uidStored || !unameStored || !roleStored) {
        console.warn("⚠️ No session values found anywhere.");
        setShowPermissionModal(true);

        // Countdown interval
        const interval = setInterval(() => {
          setCountdown(prev => {
            if (prev <= 1) {
              clearInterval(interval);
              window.location.href = "https://csaappstore.com/";
              return 0;
            }
            return prev - 1;
          });
        }, 1000);

        return () => clearInterval(interval); // cleanup
      } else {
        try {
          const decodedUnameStored = atob(unameStored);
          const [, realUnameDecoded] = decodedUnameStored.split("|");
          setRealUname(realUnameDecoded); // <-- use session value
        } catch {
          console.error("❌ Failed to decode uname from sessionStorage");
        }

        console.log("✅ Using existing sessionStorage values:", {
          uidStored,
          unameStored,
          roleStored, // <-- log existing role
        });
      }
    }
  }, []);

  // Refetch events function to refresh the calendar data
  const refetchEvents = () => {
    fetch('/api/events')
      .then(res => res.json())
      .then((data: CalendarEvent[]) => setEvents([...data]));
  };

  // Fetch initial events and users on component mount
  useEffect(() => {
    refetchEvents();
    fetch('/api/users')
      .then(res => res.json())
      .then((data: User[]) => setUsers(data));
  }, []);

  // Fetch user availability whenever start or end times change
  useEffect(() => {
    if (!start || !end) return;

    fetch(`/api/users/availability?start=${new Date(start).toISOString()}&end=${new Date(end).toISOString()}`)
      .then(res => res.json())
      .then((data: UserAvailability[]) => setAvailableUsers(data));
  }, [start, end]);

  // Handle event creation submission
  const handleSubmit = async () => {
    const toastId = toast.loading('Creating event...');

    try {
      // Convert local time to UTC ISO string
      const startUTC = new Date(start).toISOString();
      const endUTC = new Date(end).toISOString();

      const res = await fetch('/api/events', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title,
          description,
          eventType,
          start: startUTC,
          end: endUTC,
          userIds: selectedUsers,
        }),
      });

      if (res.ok) {
        const newEvent = await res.json();
        setEvents([...events, newEvent]);
        setShowModal(false);
        setTitle('');
        setDescription('');
        setEventType('regular');
        setStart('');
        setEnd('');
        setSelectedUsers([]);
        toast.success('Event created successfully!', { id: toastId });
      } else {
        throw new Error('Failed to create event');
      }
    } catch {
      toast.error('Failed to create event', { id: toastId });
    }
  };

  const filteredEvents = selectedUserId
    ? events.filter(event =>
      event.assignedTo?.some(assignee => assignee.userId === selectedUserId)
    )
    : events;

  const formattedEvents = filteredEvents.map(e => ({
    ...e,
    start: new Date(e.start),
    end: new Date(e.end),
  }));

  const handleDeleteEvent = async (eventId: number) => {
    // Show confirmation toast
    toast((t) => (
      <div className="flex flex-col gap-2">
        <p>Are you sure you want to delete this event?</p>
        <div className="flex gap-2 justify-end">
          <button
            onClick={() => {
              toast.dismiss(t.id);
              toast.error('Deletion cancelled');
            }}
            className="px-3 py-1 bg-gray-300 rounded"
          >
            Cancel
          </button>
          <button
            onClick={async () => {
              toast.dismiss(t.id);
              const deleteToastId = toast.loading('Deleting event...');

              try {
                const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' });

                if (res.ok) {
                  setEvents(events.filter(e => e.id !== eventId));
                  setEventsForSelectedDate(eventsForSelectedDate.filter(e => e.id !== eventId));
                  toast.success('Event deleted successfully!', { id: deleteToastId });
                } else {
                  throw new Error('Failed to delete event');
                }
              } catch {
                toast.error('Failed to delete event', { id: deleteToastId });
              }
            }}
            className="px-3 py-1 bg-red-500 text-white rounded"
          >
            Delete
          </button>
        </div>
      </div>
    ), {
      duration: 10000, // Give user enough time to decide
    });
  };

  const toLocalDateTimeString = (utcString: string | Date) => {
    const date = new Date(utcString);
    return date.toLocaleString([], {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const handleMarkCompleted = async (eventId: number) => {
    try {
      const res = await fetch(`/api/events/${eventId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "markCompleted" }),
      });

      const data = await res.json();
      if (res.ok) {
        // ✅ instantly update local state
        setSelectedEvent((prev) =>
          prev ? { ...prev, status: "completed" } : prev
        );
        toast.success("Event marked as completed!");
      } else {
        toast.error(data.error || "Failed to update event");
      }
    } catch {
      toast.error("Something went wrong");
    }
  };

  return (
    <div
      className="min-h-screen bg-white text-black w-[99vw] md:w-[95vw] lg:w-[84vw] mx-auto"
    >
      <Toaster />
      {/* <h1 className="text-2xl font-bold mb-4">🗓️ Event Calendar</h1> */}

      <h1 className="text-3xl font-bold tracking-tight mt-5 font-sans">
        Hello {realUname.split(" ")[0]}!
      </h1>
      <div className="block lg:flex flex-col sm:flex-row justify-between items-start mt-10 mb-6 gap-4  w-full">

        <div className="flex flex-wrap gap-2 sm:w-full  lg:w-[70%] overflow-hidden">
          {/* User Buttons */}
          <div className="flex gap-2 flex-wrap justify-start">

            <button
              onClick={() => setCurrentUserPage(prev => Math.max(0, prev - 1))}
              className={`h-8 w-8 flex justify-center items-center bg-gray-300 rounded disabled:opacity-50 ${currentUserPage === 0 ? 'hidden' : 'block'}`}
            >
              <ChevronLeft />
            </button>

            <button
              onClick={() => setSelectedUserId(null)}
              className={`px-3 h-8 text-[11px] lg:text-[13px] rounded flex flex-col justify-center items-center transition-colors duration-200 ${selectedUserId === null
                ? 'bg-blue-600 text-white'
                : 'bg-gray-300 text-black'
                }`}
            >
              All Users (
              {start && end
                ? availableUsers.filter(u => !u.isBusy).length
                : users.length
              })
            </button>

            {users
              .slice(currentUserPage * usersPerPage, (currentUserPage + 1) * usersPerPage)
              .map(user => {
                return (
                  <button
                    key={user.id}
                    onClick={() => setSelectedUserId(user.id)}
                    className={`px-3 h-8 text-[11px] lg:text-[13px] rounded flex flex-col justify-center items-center transition-colors duration-200 ${selectedUserId === user.id
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-300 text-black'
                      }`}
                  >
                    {user.name.split(" ")[0]}
                  </button>

                );
              })}

            <button
              onClick={() =>
                setCurrentUserPage(prev =>
                  (prev + 1) * usersPerPage < users.length ? prev + 1 : prev
                )
              }
              className={`h-8 w-8 flex justify-center items-center bg-gray-300 rounded disabled:opacity-50 ${(currentUserPage + 1) * usersPerPage >= users.length ? 'hidden' : 'block'}`}
            >
              <ChevronRight />
            </button>
          </div>
        </div>

        <div className="flex justify-end mr-3 lg:mr-0  space-x-2 mt-7 lg:mt-0">
          <button
            onClick={() => (window.location.href = '/meetings')}
            className="px-4 py-2 bg-green-600 text-white rounded"
            title="View All Meetings"
          >
            View Meetings
          </button>

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2 bg-green-600 text-white rounded flex items-center gap-2"
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              height="24px"
              width="24px"
              viewBox="0 -960 960 960"
              fill="#FFFFFF"
              className="w-5 h-5"
            >
              <path d="M680-80v-120H560v-80h120v-120h80v120h120v80H760v120h-80Zm-480-80q-33 0-56.5-23.5T120-240v-480q0-33 23.5-56.5T200-800h40v-80h80v80h240v-80h80v80h40q33 0 56.5 23.5T760-720v244q-20-3-40-3t-40 3v-84H200v320h280q0 20 3 40t11 40H200Zm0-480h480v-80H200v80Zm0 0v-80 80Z" />
            </svg>
            Create Event
          </button>

        </div>
      </div>

      <div
        className="p-5 rounded-3xl mt-4 shadow-md w-full overflow-x-auto   text-black"
      >
        <Calendar
          localizer={localizer}
          events={formattedEvents}
          startAccessor="start"
          endAccessor="end"
          views={['month', 'week', 'day', 'agenda']}
          defaultView="month"
          selectable
          popup
          style={{ width: '100%', height: 600 }}
          eventPropGetter={() => {
            return {
              style: {},      // keep any styles you want
              className: '',  // keep any classes you want
              // Do NOT include title
            };
          }}
          components={{
            toolbar: (props) => (
              <div className="rbc-toolbar flex justify-between items-center">
                <span className="rbc-btn-group flex gap-2">
                  {(['TODAY', 'PREV', 'NEXT'] as const).map((nav) => {
                    const label = nav === 'TODAY' ? 'Today' : nav === 'PREV' ? 'Prev Month' : 'Next Month';
                    return (
                      <button
                        key={nav}
                        type="button"
                        onClick={() => props.onNavigate(nav)} // TS now knows nav is a NavigateAction
                        style={{
                          backgroundColor: '#e5e7eb',
                          color: '#000',
                          padding: '',
                          borderRadius: '0.375rem',
                          fontWeight: 500,
                          cursor: 'pointer',
                        }}
                        onMouseOver={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                            '#d1d5db';
                        }}
                        onMouseOut={(e) => {
                          (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                            '#e5e7eb';
                        }}
                        className='text-sm'
                      >
                        {label}
                      </button>
                    );
                  })}

                </span>
                <span className="rbc-toolbar-label text-lg font-semibold">{props.label}</span>
                <span className="rbc-btn-group flex gap-2">
                  {(['month', 'week', 'day', 'agenda'] as const).map((view) => (
                    <button
                      key={view}
                      type="button"
                      onClick={() => props.onView(view)} // TS now knows view is a literal View type
                      style={{
                        backgroundColor: '#e5e7eb',
                        color: '#000',
                        padding: '',
                        borderRadius: '0.375rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                      }}
                      onMouseOver={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                          '#d1d5db';
                      }}
                      onMouseOut={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.backgroundColor =
                          '#e5e7eb';
                      }}
                      className='text-sm'
                    >
                      {view.charAt(0).toUpperCase() + view.slice(1)}
                    </button>
                  ))}

                </span>
              </div>

            ),

            event: ({ event }) => {
              const truncatedTitle = event.title.length > 20 ? event.title.slice(0, 20) + "…" : event.title;
              const backgroundColor = event.eventType === 'holiday' ? "#ef4444" : "#4f46e5";
  // ✅ Set grey background only for completed events
  const backgroundColorr =
    event.status?.toLowerCase() === "completed"
      ? "#9ca3af" // Tailwind gray-400
      : event.eventType === "holiday"
      ? "#ef4444"
      : "#4f46e5";
              return (
                <Tippy
                  content={
                    <div className="p-2 text-sm">
                      <p className="font-semibold mb-1">{event.title}</p>
                      {event.assignedTo && event.assignedTo.length > 0 && (
                        <p className="text-xs">
                          <strong>Assigned to:</strong>{' '}
                          {event.assignedTo.map(u => u.user?.name).join(', ')}
                        </p>
                      )}
                    </div>
                  }
                  theme="light-border"
                  placement="top"
                >
      <div
        className={`text-white text-xs rounded px-2 py-1 truncate cursor-pointer shadow-sm transition ${
          event.status?.toLowerCase() === "completed"
            ? "line-through opacity-75"
            : ""
        }`}
        style={{  backgroundColor: backgroundColorr }} // Use the determined background color
      >
        {truncatedTitle}
        {event.status?.toLowerCase() === "completed" && (
          <span className="ml-1 text-white/80">()</span>
        )}
      </div>

                </Tippy>
              );
            },
            dateCellWrapper: (props) => (
              <div
                {...props}
                className="rbc-date-cell border border-gray-200 min-h-[100px] p-1 align-top"
              >
                {props.children}
              </div>
            ),
            agenda: {
              event: (props) => (
                <CustomAgendaEvent
                  {...props}
                  onEventChanged={refetchEvents}
                  event={{
                    ...props.event,
                    assignedTo: props.event.assignedTo?.map(a => ({
                      user: a.user,
                      userId: a.userId ?? undefined,
                    })),
                  }}
                />
              ),
            },
          }}
          onSelectEvent={(event) => setSelectedEvent(event)}
          onSelectSlot={(slotInfo) => {
            setStart(slotInfo.start.toISOString().slice(0, 16));
            setEnd((slotInfo.end ?? slotInfo.start).toISOString().slice(0, 16));
            setShowModal(true);
          }}
          onShowMore={(events, date) => {
            setSelectedDate(date);
            setEventsForSelectedDate(events);
            setShowDayEventsModal(true);
          }}

        />

      </div>

      {/* Create Modal */}
      {showModal && (
        <div className="fixed inset-0 flex justify-center items-center z-50 bg-black/50 p-2 sm:p-4">
          <div
            className="
        bg-white text-black rounded-lg shadow-lg 
        w-full sm:w-[500px] max-w-md 
        p-6
      "
          >
            <h2 className="text-lg font-semibold mb-4">Create Event</h2>

            {/* Event Type */}
            <div className="mb-4">
              <label className="block text-sm font-medium mb-2">Event Type</label>
              <select
                value={eventType}
                onChange={(e) => setEventType(e.target.value as 'regular' | 'holiday')}
                className="w-full rounded-md border border-gray-300 bg-white px-3 py-2 text-sm focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
              >
                <option value="regular">Regular Event</option>
                <option value="holiday">Public Holiday</option>
              </select>
            </div>

            {/* Title */}
            <label htmlFor="event-title" className="block text-sm font-medium mb-1">Title</label>
            <input
              id="event-title"
              type="text"
              placeholder="Event Title"
              className="w-full mb-2 p-2 rounded-md border border-slate-400 text-sm outline-none focus:border-blue-500"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            {/* Description */}
            <label htmlFor="event-description" className="block text-sm font-medium mb-1 mt-2">Description</label>
            <textarea
              id="event-description"
              placeholder="Event Description"
              className="w-full mb-2 p-2 rounded-md border border-slate-400 text-sm outline-none focus:border-blue-500 resize-y"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />

            {/* Start & End Time */}
            <div className="grid sm:grid-cols-2 gap-4">
              <div>
                <label htmlFor="event-start" className="block text-sm font-medium mb-1">Start Time</label>
                <input
                  id="event-start"
                  type="datetime-local"
                  className="w-full mb-2 p-2 rounded-md border border-slate-400 text-sm outline-none focus:border-blue-500"
                  value={start}
                  onChange={e => setStart(e.target.value)}
                />
              </div>
              <div>
                <label htmlFor="event-end" className="block text-sm font-medium mb-1">End Time</label>
                <input
                  id="event-end"
                  type="datetime-local"
                  className="w-full mb-2 p-2 rounded-md border border-slate-400 text-sm outline-none focus:border-blue-500"
                  value={end}
                  onChange={e => setEnd(e.target.value)}
                />
              </div>
            </div>

            {/* Assigned Users */}
            <label className="block font-medium text-sm mt-2">Assign to (based on availability)</label>
            {availableUsers.length === 0 && (
              <p className="text-[11px] my-1 text-red-500">
                Select start & end time to load users.
              </p>
            )}

            <div className="border border-slate-400 rounded-md mb-4 mt-1 max-h-40 overflow-y-auto">
              <select
                multiple
                className="w-full p-2 text-sm outline-none rounded-md"
                value={selectedUsers.map(String)}
                onChange={e =>
                  setSelectedUsers(Array.from(e.target.selectedOptions, option => Number(option.value)))
                }
              >
                {(availableUsers.length > 0 ? availableUsers : users).map(user => {
                  const isAvailableUser = (u: typeof user): u is UserAvailability =>
                    'isBusy' in u && 'nextAvailable' in u;

                  return (
                    <option
                      key={user.id}
                      value={user.id}
                      disabled={isAvailableUser(user) && user.isBusy}
                    >
                      {user.name}{' '}
                      {isAvailableUser(user)
                        ? user.isBusy
                          ? `(Busy - Free at ${new Date(user.nextAvailable).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})`
                          : '(Available)'
                        : ''}
                    </option>
                  );
                })}
              </select>
            </div>

            {/* Buttons */}
            <div className="flex justify-end items-center gap-2 mt-4">
              <button
                onClick={() => {
                  setShowModal(false);
                  setEventType('regular');
                }}
                className="px-4 py-2 bg-gray-400 text-white rounded hover:bg-gray-500 transition"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                Create
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 flex justify-center items-center z-50 bg-black/50">
          <div className="bg-white p-6 rounded shadow-md w-[90%] max-w-md sm:w-full">
            <h2 className="text-lg font-semibold mb-4">Event Details</h2>

            <p>
              <strong>Title:</strong> {selectedEvent.title}
            </p>

            {/* ✅ Only show status for regular events */}
            {selectedEvent.eventType !== "holiday" && (
              <p>
                <strong>Status:</strong>{" "}
                {(() => {
                  const status = getEventStatus(selectedEvent.start, selectedEvent.end, selectedEvent.status);
                  const colorClass =
                    status === "Completed"
                      ? "bg-green-100 text-green-700"
                      : status === "Ongoing"
                        ? "bg-yellow-100 text-yellow-700"
                        : status === "Upcoming"
                          ? "bg-blue-100 text-blue-700"
                          : "bg-gray-100 text-gray-700"; // ✅ Pending

                  return (
                    <span className={`px-2 py-1 rounded-full text-xs font-semibold ${colorClass}`}>
                      {status}
                    </span>
                  );
                })()}
              </p>
            )}

            <p><strong>Description:</strong> {selectedEvent.description || "—"}</p>
            <p>
              <strong>Type:</strong>{" "}
              {selectedEvent.eventType === "holiday" ? "Holiday" : "Regular Event"}
            </p>
            <p><strong>Start:</strong> {toLocalDateTimeString(selectedEvent.start)}</p>
            <p><strong>End:</strong> {toLocalDateTimeString(selectedEvent.end)}</p>

            <p>
              <strong>Assigned to:</strong>{" "}
              {selectedEvent.assignedTo?.map((u) => u.user?.name).join(", ") || "—"}
            </p>

            <div className="flex justify-end gap-3 mt-6">
              {/* ✅ Mark Completed Button (only for regular events that are not completed) */}
              {selectedEvent.eventType !== "holiday" && selectedEvent.status !== "completed" && (
                <button
                  onClick={() => handleMarkCompleted(selectedEvent.id)}
                  className="px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition"
                >
                  Mark Completed
                </button>
              )}

              {/* Close Button */}
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Events Modal */}
{showDayEventsModal && (
  <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50 p-2 sm:p-4">
    {/* Scrollable container */}
    <div className="bg-white rounded-lg shadow-md w-full max-w-md sm:max-w-lg md:max-w-xl max-h-[90vh] overflow-y-auto p-6">
      <h2 className="text-lg font-semibold mb-4 text-center">
        Events on {selectedDate?.toLocaleDateString()}
      </h2>

      {/* Scrollable event list */}
      <div className="space-y-4">
        {eventsForSelectedDate.length > 0 ? (
          eventsForSelectedDate.map((event) => (
            <div
              key={event.id}
              className="border rounded-md p-3 bg-gray-50 hover:bg-gray-100 transition"
            >
              <p className="font-bold text-gray-800">{event.title}</p>
              <p className="text-sm text-gray-600">
                Type:{" "}
                {event.eventType === "holiday" ? "🏖️ Holiday" : "📅 Regular"}
              </p>
              <p className="text-sm text-gray-600">
                Description: {event.description || "—"}
              </p>
              <p className="text-sm text-gray-600">
                {new Date(event.start).toLocaleTimeString()} -{" "}
                {new Date(event.end).toLocaleTimeString()}
              </p>
              <p className="text-sm text-gray-600">
                Assigned to:{" "}
                {Array.isArray(event.assignedTo)
                  ? event.assignedTo.map((u) => u.user?.name).join(", ")
                  : typeof event.assignedTo === "object" &&
                    event.assignedTo !== null &&
                    "user" in event.assignedTo
                  ? (event.assignedTo as { user?: { name?: string } }).user
                      ?.name || "—"
                  : "—"}
              </p>
              <div className="flex flex-wrap gap-2 mt-3">
                <button
                  className="px-3 py-1 bg-blue-500 hover:bg-blue-600 text-white rounded text-sm"
                  onClick={() => {
                    setSelectedEvent(event);
                    setShowDayEventsModal(false);
                  }}
                >
                  View
                </button>
                <button
                  className="px-3 py-1 bg-red-500 hover:bg-red-600 text-white rounded text-sm"
                  onClick={() => handleDeleteEvent(event.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        ) : (
          <p className="text-center text-gray-500">No events found.</p>
        )}
      </div>

      {/* Footer */}
      <div className="flex justify-end mt-6">
        <button
          onClick={() => setShowDayEventsModal(false)}
          className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded"
        >
          Close
        </button>
      </div>
    </div>
  </div>
)}

      {showPermissionModal && (
        <div className="fixed inset-0 flex items-center justify-center bg-black bg-opacity-50 backdrop-blur-sm z-50">
          <div className="bg-white rounded-xl shadow-lg p-6 text-center max-w-sm z-50">
            <h2 className="text-lg font-semibold text-red-600 mb-2">
              Access Denied
            </h2>
            <p className="text-gray-700">
              You don&apos;t have permission to access this page. Redirecting…
            </p>
            <p className="mt-3 text-sm text-gray-500">
              You will be redirected in {countdown} second{countdown > 1 ? "s" : ""}.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}