'use client';
import { useState } from 'react';

interface UserFormProps {
  onUserCreated: () => void;
}

export default function UserForm({ onUserCreated }: UserFormProps) {
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
