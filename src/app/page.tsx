'use client';

import { useEffect, useState } from 'react';
import { Calendar, momentLocalizer } from 'react-big-calendar';
import moment from 'moment';
import 'react-big-calendar/lib/css/react-big-calendar.css';
import 'styles/calander.css';
import { CalendarEvent, User } from '@/src/types/Event';
import { CustomAgendaEvent } from '@/src/components/AgendaView';
//import { CustomEvent } from '@/src/components/CustomEvent';
//import { CustomMonthEvent } from '@/src/components/CustomMonthEvent';
import { CustomDateCellWrapper } from '@/src/components/CustomDateCellWrapper';
//import type { NextRequest } from 'next/server';

const localizer = momentLocalizer(moment);

interface UserAvailability {
  id: number;
  name: string;
  isBusy: boolean;
  nextAvailable: string;
  availableSlots?: { start: string; end: string }[];
}

export default function HomePage() {
  const [events, setEvents] = useState<CalendarEvent[]>([]);
  const [users, setUsers] = useState<User[]>([]);
  const [availableUsers, setAvailableUsers] = useState<UserAvailability[]>([]);
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [showDayEventsModal, setShowDayEventsModal] = useState(false);
  const [eventsForSelectedDate, setEventsForSelectedDate] = useState<CalendarEvent[]>([]);
  const [selectedDate, setSelectedDate] = useState<Date | null>(null);
  //const [newUserName, setNewUserName] = useState('');
  const [currentUserPage, setCurrentUserPage] = useState(0);
  const usersPerPage = 10;


  // Refetch events function
  const refetchEvents = () => {
    fetch('/api/events')
      .then(res => res.json())
      .then((data: CalendarEvent[]) => setEvents([...data])); // always new array reference
  };

  useEffect(() => {
    refetchEvents();
    fetch('/api/users')
      .then(res => res.json())
      .then((data: User[]) => setUsers(data));
  }, []);

  useEffect(() => {
    if (!start || !end) return;

    fetch(`/api/users/availability?start=${start}&end=${end}`)
      .then(res => res.json())
      .then((data: UserAvailability[]) => setAvailableUsers(data));
  }, [start, end]);

  const handleSubmit = async () => {
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ title, start, end, userIds: selectedUsers }),
    });

    if (res.ok) {
      const newEvent = await res.json();
      setEvents([...events, newEvent]);
      setShowModal(false);
      setTitle('');
      setStart('');
      setEnd('');
      setSelectedUsers([]);
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
    console.log('Trying to delete event', eventId);
    const proceed = window.confirm('Are you sure you want to delete this event?');
    console.log('Confirmed:', proceed);
    if (!proceed) return;

    const res = await fetch(`/api/events/${eventId}`, { method: 'DELETE' });

    if (res.ok) {
      setEvents(events.filter(e => e.id !== eventId));
      setEventsForSelectedDate(eventsForSelectedDate.filter(e => e.id !== eventId));
    }
  };

  return (
    <div className="p-10 dark:bg-zinc-900 dark:text-white min-h-screen bg-gray-100 text-black">
      {/* <h1 className="text-2xl font-bold mb-4">📅 Event Calendar</h1> */}

      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-4 gap-4">

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => setSelectedUserId(null)}
            className={`px-4 py-2 rounded ${selectedUserId === null
              ? 'bg-blue-600 text-white'
              : 'bg-gray-300 dark:bg-zinc-700 dark:text-white'
              }`}
          >
            All Users (
            {start && end
              ? availableUsers.filter(u => !u.isBusy).length
              : users.length
            } )
          </button>


          <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-4 overflow-x-auto max-w-full">

            {/* Left Arrow */}
            <button
              disabled={currentUserPage === 0}
              onClick={() => setCurrentUserPage(prev => Math.max(0, prev - 1))}
              className="px-3 py-1 bg-gray-300 dark:bg-zinc-700 rounded disabled:opacity-50"
            >
              &lt;
            </button>

            {/* User Buttons */}
            <div className="flex gap-2 flex-wrap justify-start">

              {users
                .slice(currentUserPage * usersPerPage, (currentUserPage + 1) * usersPerPage)
                .map(user => {
                 // const availability = getAvailabilityStatus(user.id);
                  return (
                    <button
                      key={user.id}
                      onClick={() => setSelectedUserId(user.id)}
                      className={`px-4 py-2 rounded flex flex-col items-start ${selectedUserId === user.id
                          ? 'bg-blue-600 text-white'
                          : 'bg-gray-300 dark:bg-zinc-700 dark:text-white'
                        }`}
                    >
                      <span>{user.name}</span>
                      {/* Optional: show availability below name */}
                      {/* {availability && (
              <span className="text-xs text-gray-800 dark:text-gray-300">
                {availability}
              </span>
            )} */}
                    </button>
                  );
                })}
            </div>

            {/* Right Arrow */}
            <button
              disabled={(currentUserPage + 1) * usersPerPage >= users.length}
              onClick={() =>
                setCurrentUserPage(prev =>
                  (prev + 1) * usersPerPage < users.length ? prev + 1 : prev
                )
              }
              className="px-3 py-1 bg-gray-300 dark:bg-zinc-700 rounded disabled:opacity-50"
            >
              &gt;
            </button>
          </div>

        </div>

        <button
          onClick={() => setShowModal(true)}
          className="px-4 py-2 bg-green-600 text-white rounded"
        >
          + Create Event
        </button>

      </div>

      <div className="bg-white dark:bg-zinc-800 p-4 rounded shadow w-full overflow-x-auto">

        <Calendar
          localizer={localizer}
          events={formattedEvents}
          startAccessor="start"
          endAccessor="end"
          views={['month', 'week', 'day', 'agenda']}
          defaultView="month"
          selectable
          popup
          style={{ minWidth: '700px', height: 600 }}

          components={{
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
          <div className="bg-white dark:bg-zinc-800 p-6 rounded shadow-md w-[90%] max-w-md sm:w-full">

            <h2 className="text-lg font-semibold mb-4">Add User</h2>
            <input
              type="text"
              placeholder="Title"
              className="w-full mb-2 p-2 rounded border dark:bg-zinc-700"
              value={title}
              onChange={e => setTitle(e.target.value)}
            />
            <input
              type="datetime-local"
              className="w-full mb-2 p-2 rounded border dark:bg-zinc-700"
              value={start}
              onChange={e => setStart(e.target.value)}
            />
            <input
              type="datetime-local"
              className="w-full mb-4 p-2 rounded border dark:bg-zinc-700"
              value={end}
              onChange={e => setEnd(e.target.value)}
            />

            <label className="block mb-1 font-medium">Assign to (based on availability):</label>
            {availableUsers.length === 0 && (
              <p className="text-sm text-red-500 mb-2">Select start & end time to load users.</p>
            )}

            <select
              multiple
              className="w-full mb-4 p-2 rounded border dark:bg-zinc-700"
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
                        ? `(Busy during this slot )`
                        : '(Available)'
                      : ''}
                  </option>
                );
              })}
            </select>
            {/* Show Available Slots for Selected Users */}
            {selectedUsers.length > 0 && (
              <div className="mb-4">
                <label className="block mb-1 font-medium">Available Slots:</label>
                {availableUsers
                  .filter(u => selectedUsers.includes(u.id))
                  .map(user => (
                    <div key={user.id} className="mb-2">
                      <p className="font-semibold">{user.name}</p>
                      <div className="flex flex-wrap gap-2">
                        {Array.isArray(user.availableSlots) && user.availableSlots.length > 0 ? (
                          user.availableSlots.map(slot => (
                            <button
                              key={slot.start}
                              className="px-3 py-1 bg-green-200 hover:bg-green-300 text-sm rounded"
                              onClick={() => {
                                setStart(slot.start.slice(0, 16));
                                setEnd(slot.end.slice(0, 16));
                              }}
                            >
                              {new Date(slot.start).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}{' '}
                              -{' '}
                              {new Date(slot.end).toLocaleTimeString([], {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                            </button>
                          ))
                        ) : (
                          <p className="text-sm text-gray-500">No available slots</p>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            )}

            <div className="flex justify-between items-center gap-2">


              <div className="flex gap-2">
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
        </div>
      )}

      {/* Event Details Modal */}
      {selectedEvent && (
        <div className="fixed inset-0 flex justify-center items-center z-50 bg-black/50">
          <div className="bg-white dark:bg-zinc-800 p-6 rounded shadow-md w-[90%] max-w-md sm:w-full">

            <h2 className="text-lg font-semibold mb-4">Event Details</h2>
            <p><strong>Title:</strong> {selectedEvent.title}</p>
            <p><strong>Start:</strong> {new Date(selectedEvent.start).toLocaleString()}</p>
            <p><strong>End:</strong> {new Date(selectedEvent.end).toLocaleString()}</p>
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
          <div className="bg-white dark:bg-zinc-800 p-6 rounded shadow-md w-[90%] max-w-md sm:w-full">

            <h2 className="text-lg font-semibold mb-4">
              Events on {selectedDate?.toLocaleDateString()}
            </h2>

            {eventsForSelectedDate.map((event) => (
              <div key={event.id} className="border-b py-2">
                <p className="font-bold">{event.title}</p>
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

                    onClick={() => {
                      console.log('Delete clicked for event:', event.id);
                      handleDeleteEvent(event.id)
                    }}
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
    </div>
  );
}
