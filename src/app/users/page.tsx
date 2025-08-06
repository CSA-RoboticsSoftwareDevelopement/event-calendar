'use client';
import { useEffect, useState } from 'react';

type User = {
  id: number;
  name: string;
};

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [name, setName] = useState('');

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data));
  }, []);

  const addUser = async () => {
    const res = await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({ name }),
      headers: { 'Content-Type': 'application/json' },
    });
    const newUser = await res.json();
    setUsers(prev => [...prev, newUser]);
    setName('');
  };

  return (
    <div className="p-10 dark:bg-zinc-900 dark:text-white min-h-screen">
      <h1 className="text-2xl font-bold mb-4">👥 Users</h1>

      <div className="flex gap-4 mb-6">
        <input
          className="px-4 py-2 rounded bg-white dark:bg-zinc-700"
          placeholder="Enter user name"
          value={name}
          onChange={e => setName(e.target.value)}
        />
        <button
          onClick={addUser}
          className="px-4 py-2 bg-blue-600 text-white rounded"
        >
          + Add User
        </button>
      </div>

      <ul className="space-y-2">
        {users.map(user => (
          <li
            key={user.id}
            className="bg-white dark:bg-zinc-800 p-3 rounded shadow"
          >
            {user.name}
          </li>
        ))}
      </ul>
    </div>
  );
}
