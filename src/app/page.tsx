'use client';

import { useEffect, useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';

import { useRouter } from 'next/navigation';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'styles/calander.css';
import { CalendarEvent, User } from '@/src/types/Event';
import { CustomAgendaEvent } from '@/src/components/AgendaView';
//import { CustomEvent } from '@/src/components/CustomEvent';
//import { CustomMonthEvent } from '@/src/components/CustomMonthEvent';
import { CustomDateCellWrapper } from '@/src/components/CustomDateCellWrapper';
import toast from 'react-hot-toast';
import { Toaster } from 'react-hot-toast';
import { ChevronRight, ChevronLeft } from 'lucide-react';

const localizer = momentLocalizer(moment);

interface UserAvailability {
  id: number;
  name: string;
  isBusy: boolean;
  nextAvailable: string;
  availableSlots?: { start: string; end: string }[];
}

// Main App component
export default function App() {
  const router = useRouter();
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserAvailability[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  // New state for the event description
  const [description, setDescription] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showDayEventsModal, setShowDayEventsModal] = useState(false);
  const [eventsForSelectedDate, setEventsForSelectedDate] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  const [currentUserPage, setCurrentUserPage] = useState(0);
  const [windowWidth, setWindowWidth] = useState(window.innerWidth)
  const usersPerPage =  windowWidth <  760 ?  9 :   windowWidth >=  760 && windowWidth <  1280 ? 15 : 19

  console.log(windowWidth)


  //Authentication  

  const [showPermissionModal, setShowPermissionModal] = useState(false);
  const [countdown, setCountdown] = useState(5); // 5 seconds
  const [realUname, setRealUname] = useState("");




  //Authentication  
  useEffect(() => {

    const handleResize = () => {
      window.addEventListener('resize', () => {
        setWindowWidth(window.innerWidth)


      })
    }


    handleResize()




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
      } catch (err) {
        console.error("❌ Failed to decode values", err);
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
        } catch (err) {
          console.error("❌ Failed to decode uname from sessionStorage", err);
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
          description, // Include the new description field
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
        setDescription(''); // Clear the description state
        setStart('');
        setEnd('');
        setSelectedUsers([]);
        toast.success('Event created successfully!', { id: toastId });
      } else {
        throw new Error('Failed to create event');
      }
    } catch (error) {
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

  const getAvailabilityStatus = (userId: number) => {
    const match = availableUsers.find(u => u.id === userId);
    if (!match) return null;
    return match.isBusy
      ? `Busy - Free at ${new Date(match.nextAvailable).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      })}`
      : 'Available';
  };

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
              } catch (error) {
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

  return (
    <div
      className="min-h-screen bg-white text-black w-[99vw] md:w-[95vw] lg:w-[84vw] mx-auto"
    >
      <Toaster />
      {/* <h1 className="text-2xl font-bold mb-4">📅 Event Calendar</h1> */}

      <div><h1 className='text-3xl scroll-m-20font-semibold tracking-tight mt-5'>Hello {realUname.split(" ")[0]}!</h1></div>
      <div className="block lg:flex flex-col sm:flex-row justify-between items-start mt-10 mb-6 gap-4  w-full">

        <div className="flex flex-wrap gap-2 sm:w-full  lg:w-[70%] overflow-x-scroll">
          {/* <button
            onClick={() => setSelectedUserId(null)}
            className={`px-4 py-2 rounded ${selectedUserId === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-300 text-black'
              }`}
          >
            All Users (
            {start && end
              ? availableUsers.filter(u => !u.isBusy).length
              : users.length
            })
          </button> */}



          {/* <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 overflow-x-auto max-w-full "> */}

            {/* Left Arrow */}
        

            {/* User Buttons */}
            <div className="flex gap-2 flex-wrap justify-start">

            <button
              // disabled={currentUserPage === 0}
              onClick={() => setCurrentUserPage(prev => Math.max(0, prev - 1))}
              className={`h-8 w-8 flex justify-center items-center bg-gray-300 rounded disabled:opacity-50 ${currentUserPage === 0 ? 'hidden' : 'block'}`}
            >
              {/* &lt; */}
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
              // disabled={(currentUserPage + 1) * usersPerPage >= users.length}
              onClick={() =>
                setCurrentUserPage(prev =>
                  (prev + 1) * usersPerPage < users.length ? prev + 1 : prev
                )
              }
              className={`h-8 w-8 flex justify-center items-center bg-gray-300 rounded disabled:opacity-50 ${(currentUserPage + 1) * usersPerPage >= users.length ? 'hidden' : 'block'}`}
            >
              {/* &gt; */}
               <ChevronRight />
            </button>
            </div>

            {/* Right Arrow */}
          
          {/* </div> */}
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
            className="px-4 py-2 bg-green-600 text-white rounded"
          >
            + Create Event
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
            event: () => null, // hide event bars in month view
            dateCellWrapper: (props) => (
              <CustomDateCellWrapper {...props} events={formattedEvents} />
            ),
            agenda: {
              event: (props) => (
                <CustomAgendaEvent {...props} onEventChanged={refetchEvents} />
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
        <div className="fixed inset-0 flex justify-center items-center z-50 bg-black/50">
          <div
            className="p-6 rounded shadow-md w-[90%] max-w-md sm:w-full bg-white text-black"
          >

            <h2 className="text-lg font-semibold mb-4">Create Event</h2>

            {/* Input field for the event title with a label */}
            <label htmlFor="event-title" className="block text-sm font-medium mb-1">Title</label>
            <input
              id="event-title"
              type="text"
              placeholder="Event Title"
              className="w-full mb-2 p-2 rounded border"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />

            {/* Input field for the event description with a label */}
            <label htmlFor="event-description" className="block text-sm font-medium mb-1">Description</label>
            <textarea
              id="event-description"
              placeholder="Event Description"
              className="w-full mb-2 p-2 rounded border"
              value={description}
              onChange={e => setDescription(e.target.value)}
              rows={3}
            />

            {/* Input field for the start time with a label */}
            <label htmlFor="event-start" className="block text-sm font-medium mb-1">Start Time</label>
            <input
              id="event-start"
              type="datetime-local"
              className="w-full mb-2 p-2 rounded border"
              value={start}
              onChange={e => setStart(e.target.value)}
            />

            {/* Input field for the end time with a label */}
            <label htmlFor="event-end" className="block text-sm font-medium mb-1">End Time</label>
            <input
              id="event-end"
              type="datetime-local"
              className="w-full mb-4 p-2 rounded border"
              value={end}
              onChange={e => setEnd(e.target.value)}
            />

            {/* User assignment section with a label */}
            <label className="block mb-1 font-medium">Assign to (based on availability):</label>
            {availableUsers.length === 0 && (
              <p className="text-sm text-red-500 mb-2">Select start & end time to load users.</p>
            )}

            <select
              multiple
              className="w-full mb-4 p-2 rounded border"
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

            <div className="flex justify-end items-center gap-2">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-400 rounded text-white"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                className="px-4 py-2 bg-blue-600 text-white rounded"
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
            <p><strong>Title:</strong> {selectedEvent.title}</p>
            {/* Display the new description field */}
            <p><strong>Description:</strong> {selectedEvent.description || '—'}</p>
            <p><strong>Start:</strong> {toLocalDateTimeString(selectedEvent.start)}</p>
            <p><strong>End:</strong> {toLocalDateTimeString(selectedEvent.end)}</p>

            <p><strong>Assigned to:</strong> {selectedEvent.assignedTo?.map(u => u.user?.name).join(', ') || '—'}</p>

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setSelectedEvent(null)}
                className="px-4 py-2 bg-gray-500 text-white rounded"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Daily Events Modal */}
      {showDayEventsModal && (
        <div className="fixed inset-0 bg-black/50 flex justify-center items-center z-50">
          <div className="bg-white p-6 rounded shadow-md w-[90%] max-w-md sm:w-full">

            <h2 className="text-lg font-semibold mb-4">
              Events on {selectedDate?.toLocaleDateString()}
            </h2>

            {eventsForSelectedDate.map((event) => (
              <div key={event.id} className="border-b py-2">
                <p className="font-bold">{event.title}</p>
                {/* Display the new description field in the daily events modal */}
                <p className="text-sm">Description: {event.description || '—'}</p>
                <p className="text-sm">
                  {new Date(event.start).toLocaleTimeString()} - {new Date(event.end).toLocaleTimeString()}
                </p>
                <p className="text-sm">
                  Assigned to:  {Array.isArray(event.assignedTo)
                    ? event.assignedTo.map(u => u.user?.name).join(', ')
                    : typeof event.assignedTo === 'object' && event.assignedTo !== null && 'user' in event.assignedTo
                      ? (event.assignedTo as { user?: { name?: string } }).user?.name || '—'
                      : '—'}
                </p>
                <div className="flex gap-2 mt-2">
                  <button
                    className="px-3 py-1 bg-blue-500 text-white rounded text-sm"
                    onClick={() => {
                      setSelectedEvent(event);
                      setShowDayEventsModal(false);
                    }}
                  >
                    View
                  </button>
                  <button
                    className="px-3 py-1 bg-red-500 text-white rounded text-sm"
                    onClick={() => handleDeleteEvent(event.id)}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}

            <div className="flex justify-end mt-4">
              <button
                onClick={() => setShowDayEventsModal(false)}
                className="px-4 py-2 bg-gray-500 text-white rounded"
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
              You don’t have permission to access this page. Redirecting…
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