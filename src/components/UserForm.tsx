'use client';
import { useState } from 'react';

export default function UserForm({ onUserCreated }: any) {
  const [name, setName] = useState('');

  const handleSubmit = async () => {
    await fetch('/api/users', {
      method: 'POST',
      body: JSON.stringify({ name }),
    });
    setName('');
    onUserCreated();
  };

  return (
    <div>
      <input value={name} onChange={e => setName(e.target.value)} placeholder="User name" />
      <button onClick={handleSubmit}>Add User</button>
    </div>
  );
}
