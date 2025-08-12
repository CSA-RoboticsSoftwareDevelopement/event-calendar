'use client';
import { useEffect, useState } from 'react';
import { User } from '../types/Event';
// Adjust the import path as necessary

interface EventModalProps {
  onClose: () => void;
  onSubmit: () => void;
}

export default function EventModal({ onClose, onSubmit }: EventModalProps) {
  const [title, setTitle] = useState('');
  const [start, setStart] = useState('');
  const [end, setEnd] = useState('');
  const [users, setUsers] = useState<User[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [availability, setAvailability] = useState<User[]>([]);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then((data: User[]) => setUsers(data));
  }, []);

  useEffect(() => {
    if (start && end) {
      fetch(`/api/users/availability?start=${start}&end=${end}`)
        .then(res => res.json())
        .then((data: User[]) => setAvailability(data));
    }
  }, [start, end]);

  const handleSubmit = async () => {
    await fetch('/api/events', {
      method: 'POST',
      body: JSON.stringify({ title, start, end, userIds: selectedUsers }),
    });
    onSubmit();
  };

  return (
    <div className="modal">
      <h2>Create Event</h2>
      <input value={title} onChange={e => setTitle(e.target.value)} placeholder="Title" />
      <input type="datetime-local" value={start} onChange={e => setStart(e.target.value)} />
      <input type="datetime-local" value={end} onChange={e => setEnd(e.target.value)} />

      <select
        multiple
        onChange={e => setSelectedUsers(Array.from(e.target.selectedOptions).map(o => Number(o.value)))}
      >
        {(availability.length ? availability : users).map(user => (
          <option key={user.id} value={user.id}>
            {user.name}{' '}
            {user.nextAvailable &&
              `(${new Date(user.nextAvailable).toLocaleString('en-IN', {
                hour: 'numeric',
                minute: 'numeric',
                hour12: true,
              })})`}
          </option>
        ))}
      </select>

      <button onClick={handleSubmit}>Create</button>
      <button onClick={onClose}>Cancel</button>
    </div>
  );
}
