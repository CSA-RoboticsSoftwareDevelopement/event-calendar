'use client';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';

export default function CreateEvent() {
  const router = useRouter();
  const [users, setUsers] = useState([]);
  const [form, setForm] = useState({
    title: '',
    description: '',
    start: '',
    end: '',
    userIds: [] as number[],
  });
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(setUsers);
  }, []);

  const handleChange = (e: any) => {
    const { name, value } = e.target;
    setForm(prev => ({ ...prev, [name]: value }));
  };


  const handleUserSelect = (e: any) => {
    const options = e.target.options;
    const selected: number[] = [];
    for (let i = 0; i < options.length; i++) {
      if (options[i].selected) selected.push(Number(options[i].value));
    }
    setForm(prev => ({ ...prev, userIds: selected }));
  };

  const handleSubmit = async (e: any) => {
    e.preventDefault();
    setError(null);
    const res = await fetch('/api/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(form),
    });

    if (res.status === 409) {
      const data = await res.json();
      setError(`Unavailable: ${data.conflicts.map((u: any) => u.name).join(', ')}`);
      return;
    }

    if (res.ok) router.push('/');
  };

  return (
    <div style={{ padding: 40 }}>
      <h1>Create Event</h1>
      {error && <p style={{ color: 'red' }}>{error}</p>}
      <form onSubmit={handleSubmit}>
        <input name="title" placeholder="Title" required onChange={handleChange} /><br />
        <textarea name="description" placeholder="Description" onChange={handleChange}></textarea><br />
        <input type="datetime-local" name="start" required onChange={handleChange} /><br />
        <input type="datetime-local" name="end" required onChange={handleChange} /><br />

        <label>Assign to:</label><br />
        <select multiple onChange={handleUserSelect}>
          {users.map((u: any) => (
            <option key={u.id} value={u.id}>{u.name}</option>
          ))}
        </select><br />

        <button type="submit">Save</button>
      </form>
    </div>
  );
}
