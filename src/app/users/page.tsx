'use client';

import React, { useEffect, useState } from 'react';

type User = {
  id: number;
  name: string | null;
  email: string | null;
  designation: string | null;
};


export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
const [formData, setFormData] = useState({ name: '', email: '', designation: '' });
const [editUserId, setEditUserId] = useState<number | null>(null);

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
  setFormData({ ...formData, [e.target.name]: e.target.value });
};
const handleSubmitUser = async () => {
  const { name, email, designation } = formData;
  if (!name || !email || !designation) {
    alert('Please fill in all fields');
    return;
  }

  const method = editUserId ? 'PUT' : 'POST';
  const url = '/api/users';

  const res = await fetch(url, {
    method,
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ id: editUserId, name, email, designation }),
  });

  if (res.ok) {
    const updatedUser = await res.json();

    setUsers(prev => {
      if (editUserId) {
        return prev.map(user => (user.id === editUserId ? updatedUser : user));
      }
      return [...prev, updatedUser];
    });

    // Reset states
    setFormData({ name: '', email: '', designation: '' });
    setEditUserId(null);
    setShowModal(false);
  } else {
    alert(editUserId ? 'Failed to update user' : 'Failed to add user');
  }
};

// const handleAddUser = async () => {
//   const { name, email, designation } = formData;
//   if (!name || !email || !designation) {
//     alert('Please fill in all fields');
//     return;
//   }

//   const res = await fetch('/api/users', {
//     method: 'POST',
//     headers: { 'Content-Type': 'application/json' },
//     body: JSON.stringify(formData),
//   });

//   if (res.ok) {
//     const newUser = await res.json();
//     setUsers(prev => [...prev, newUser]);
//     setFormData({ name: '', email: '', designation: '' });
//     setShowModal(false);
//   } else {
//     alert('Failed to add user');
//   }
// };



  const fetchUsers = async () => {
    setLoading(true);
    const res = await fetch('/api/users');
    const data = await res.json();
    setUsers(data);
    setLoading(false);
  };

  const deleteUser = async (id: number) => {
    const confirm = window.confirm('Are you sure you want to delete this user?');
    if (!confirm) return;

    const res = await fetch('/api/users', {
      method: 'DELETE',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ id }),
    });

    if (res.ok) {
      setUsers(prev => prev.filter(user => user.id !== id));
    } else {
      alert('Failed to delete user.');
    }
  };

  return (
<div className="p-6">
  <div className="bg-white dark:bg-zinc-800 rounded-xl shadow-md p-6">
<div className="flex items-center justify-between mb-4">
  <h2 className="text-2xl font-bold text-black dark:text-white flex items-center gap-2">
     User Table
  </h2>
  <button
    className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-md shadow-md transition-colors"
    onClick={() => setShowModal(true)}

  >
    + Add User
  </button>
</div>




    {loading ? (
      <p>Loading users...</p>
    ) : (
      <table className="w-full border border-gray-300 dark:border-zinc-700 text-sm table-fixed">
        <thead className="bg-gray-400 dark:bg-zinc-700">
<tr>
  <th className="border border-gray-300 dark:border-zinc-600 px-4 py-3 text-left font-bold text-black dark:text-white">ID</th>
  <th className="border border-gray-300 dark:border-zinc-600 px-4 py-3 text-left font-bold text-black dark:text-white">Name</th>
  <th className="border border-gray-300 dark:border-zinc-600 px-4 py-3 text-left font-bold text-black dark:text-white">Email</th>
  <th className="border border-gray-300 dark:border-zinc-600 px-4 py-3 text-left font-bold text-black dark:text-white">Designation</th>
  <th className="border border-gray-300 dark:border-zinc-600 px-4 py-3 text-left font-bold text-black dark:text-white">Action</th>
</tr>

        </thead>
        <tbody>
          {users.map(user => (
            <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-zinc-700">
              <td className="border border-gray-300 dark:border-zinc-600 px-4 py-3">{user.id}</td>
              <td className="border border-gray-300 dark:border-zinc-600 px-4 py-3">{user.name}</td>
              <td className="border border-gray-300 dark:border-zinc-600 px-4 py-3">{user.email}</td>
              <td className="border border-gray-300 dark:border-zinc-600 px-4 py-3">{user.designation}</td>
<td className="border border-gray-300 dark:border-zinc-600 px-4 py-3">
  <div className="flex justify-center items-center gap-3">
    <button
      onClick={() => {
        setEditUserId(user.id);
        setFormData({
          name: user.name ?? '',
          email: user.email ?? '',
          designation: user.designation ?? '',
        });
        setShowModal(true);
      }}
      className="text-blue-600 hover:text-blue-800"
      title="Edit user"
    >
      ✏️
    </button>
    <button
      onClick={() => deleteUser(user.id)}
      className="text-red-600 hover:text-red-800"
      title="Delete user"
    >
      🗑️
    </button>
  </div>
</td>


            </tr>
          ))}
          {users.length === 0 && (
            <tr>
              <td colSpan={5} className="text-center py-6 text-gray-500">
                No users found.
              </td>
            </tr>
          )}
        </tbody>
      </table>
    )}
{/* Add User Modal */}
    {showModal && (
  <div className="fixed inset-0 backdrop-blur-sm bg-transparent flex items-center justify-center z-50">

    <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-xl w-full max-w-md">
      <h3 className="text-lg font-semibold mb-4 text-black dark:text-white"> User</h3>
      <div className="space-y-4">
        <input
          type="text"
          name="name"
          placeholder="Name"
          value={formData.name}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border rounded-md dark:bg-zinc-700 dark:text-white"
        />
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={formData.email}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border rounded-md dark:bg-zinc-700 dark:text-white"
        />
        <input
          type="text"
          name="designation"
          placeholder="Designation"
          value={formData.designation}
          onChange={handleInputChange}
          className="w-full px-4 py-2 border rounded-md dark:bg-zinc-700 dark:text-white"
        />
      </div>
      <div className="flex justify-end mt-6 gap-2">
        <button
          onClick={() => {
  setShowModal(false);
  setEditUserId(null);
}}

          className="bg-gray-500 hover:bg-gray-600 text-white px-4 py-2 rounded-md"
        >
          Cancel
        </button>
<button
  onClick={handleSubmitUser}
  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
>
  {editUserId ? 'Update' : 'Save'}
</button>

      </div>
    </div>
  </div>
)}

  </div>
</div>

  );
}
