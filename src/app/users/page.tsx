'use client';

import React, { useEffect, useState } from 'react';
import { ChevronLeft, ChevronRight, ArrowLeft } from 'lucide-react';
import { FilePen } from "lucide-react";
import toast from 'react-hot-toast';
import { useRouter } from 'next/navigation';

type User = {
  id: number;
  name: string | null;
  email: string | null;
  designation: string | null;
};

export default function UsersPage() {
  const router = useRouter();
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '', designation: '' });
  const [editUserId, setEditUserId] = useState<number | null>(null);
  const [currentPage, setCurrentPage] = useState(1);
  const usersPerPage = 15;

  useEffect(() => {
    fetchUsers();
  }, []);

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = users.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(users.length / usersPerPage);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmitUser = async () => {
    const { name, email, designation } = formData;
    if (!name || !email || !designation) {
      toast.error('Please fill in all fields');
      return;
    }

    if (editUserId) {
      const shouldProceed = await new Promise((resolve) => {
        const toastId = toast.custom(
          (t) => (
            <div className="flex flex-col gap-2 p-4 bg-white dark:bg-zinc-800 rounded-lg shadow-xl">
              <p className="text-gray-800 dark:text-gray-200">
                Are you sure you want to update this user?
              </p>
              <div className="flex justify-end gap-2 mt-2">
                <button
                  onClick={() => {
                    resolve(false);
                    toast.dismiss(toastId);
                  }}
                  className="px-3 py-1 bg-gray-200 dark:bg-zinc-700 rounded-md hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => {
                    resolve(true);
                    toast.dismiss(toastId);
                  }}
                  className="px-3 py-1 bg-blue-500 text-white rounded-md hover:bg-blue-600 transition-colors"
                >
                  Confirm
                </button>
              </div>
            </div>
          ),
          {
            duration: Infinity,
            position: 'top-center',
          }
        );
      });

      if (!shouldProceed) {
        toast('Update canceled', { icon: '⚠️' });
        return;
      }
    }

    const method = editUserId ? 'PUT' : 'POST';
    const url = '/api/users';

    const toastId = toast.loading(editUserId ? 'Updating user...' : 'Adding user...');

    try {
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

        setFormData({ name: '', email: '', designation: '' });
        setEditUserId(null);
        setShowModal(false);

        toast.success(editUserId ? 'User updated successfully!' : 'User added successfully!', { id: toastId });
      } else {
        throw new Error(editUserId ? 'Failed to update user' : 'Failed to add user');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message, { id: toastId });
      } else {
        toast.error("An unexpected error occurred", { id: toastId });
      }
    }

  };

  const fetchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/users');
      const data = await res.json();
      setUsers(data);
    } catch (error) {
      toast.error('Failed to fetch users');
    } finally {
      setLoading(false);
    }
  };

  const deleteUser = async (id: number) => {
    const userConfirmed = await new Promise((resolve) => {
      const toastId = toast.custom(
        (t) => (
          <div className="flex flex-col gap-2 p-4 bg-white dark:bg-zinc-800 rounded-lg shadow-xl">
            <p className="text-gray-800 dark:text-gray-200">
              Are you sure you want to delete this user?
            </p>
            <div className="flex justify-end gap-2 mt-2">
              <button
                onClick={() => {
                  resolve(false);
                  toast.dismiss(toastId);
                }}
                className="px-3 py-1 bg-gray-200 dark:bg-zinc-700 rounded-md hover:bg-gray-300 dark:hover:bg-zinc-600 transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => {
                  resolve(true);
                  toast.dismiss(toastId);
                }}
                className="px-3 py-1 bg-red-500 text-white rounded-md hover:bg-red-600 transition-colors"
              >
                Delete
              </button>
            </div>
          </div>
        ),
        {
          duration: Infinity,
          position: 'top-center',
        }
      );
    });

    if (!userConfirmed) {
      toast('Deletion canceled', { icon: '⚠️' });
      return;
    }

    try {
      const toastId = toast.loading('Deleting user...');
      const res = await fetch('/api/users', {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      if (res.ok) {
        setUsers(prev => prev.filter(user => user.id !== id));
        toast.success('User deleted successfully!', { id: toastId });
      } else {
        throw new Error('Failed to delete user.');
      }
    } catch (error: unknown) {
      if (error instanceof Error) {
        toast.error(error.message);
      } else {
        toast.error("An unexpected error occurred");
      }
    }

  };

  return (
    <div
      className="p-6"
      style={{
        background: 'var(--background)',
        color: 'var(--foreground)',
      }}
    >
      <div
        className="rounded-xl shadow-md p-6"
        style={{
          background: 'var(--background)',
          color: 'var(--foreground)',
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-4">
            <button
              onClick={() => router.back()}
              className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-zinc-700 transition-colors"
              title="Go back"
            >
              <ArrowLeft className="w-5 h-5" />
            </button>
            <h2
              className="text-2xl font-bold flex items-center gap-2"
              style={{ color: 'var(--foreground)' }}
            >
              User Table
            </h2>
          </div>
          <button
            className="bg-green-600 hover:bg-green-700 text-white font-semibold px-4 py-2 rounded-md shadow-md transition-colors"
            onClick={() => {
              setShowModal(true);
              toast.success('Ready to add new user!');
            }}
          >
            + Add User
          </button>
        </div>

        {loading ? (
          <p>Loading users...</p>
        ) : (
          <div className="overflow-x-auto w-full">
            <div className="rounded-xl overflow-hidden border border-gray-300 dark:border-zinc-700">
              <table className="w-full text-sm">
                <thead className="bg-gray-400 dark:bg-zinc-700">
                  <tr>
                    <th className="border px-4 py-3 text-left font-bold text-black dark:text-white">ID</th>
                    <th className="border px-4 py-3 text-left font-bold text-black dark:text-white">Name</th>
                    <th className="border px-4 py-3 text-left font-bold text-black dark:text-white">Email</th>
                    <th className="border px-4 py-3 text-left font-bold text-black dark:text-white">Designation</th>
                    <th className="border px-4 py-3 text-left font-bold text-black dark:text-white">Action</th>
                  </tr>
                </thead>
                <tbody>
                  {currentUsers.map(user => (
                    <tr
                      key={user.id}
                      className="hover:bg-gray-50 dark:hover:bg-zinc-900"
                      style={{
                        transition: 'background 0.2s, color 0.2s',
                      }}
                      onMouseEnter={e => {
                        if (document.documentElement.classList.contains('dark')) {
                          (e.currentTarget as HTMLTableRowElement).style.color = 'black';
                        }
                      }}
                      onMouseLeave={e => {
                        if (document.documentElement.classList.contains('dark')) {
                          (e.currentTarget as HTMLTableRowElement).style.color = '';
                        }
                      }}
                    >
                      <td className="border px-4 py-3">{user.id}</td>
                      <td className="border px-4 py-3">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-medium break-words max-w-xs">{user.name}</span>
                        </div>
                      </td>
                      <td className="border px-4 py-3 break-words max-w-xs">{user.email}</td>
                      <td className="border px-4 py-3 break-words max-w-xs">{user.designation}</td>
                      <td className="border px-4 py-3">
                        <div className="flex flex-wrap justify-center items-center gap-3">
                          <button
                            onClick={() => {
                              setEditUserId(user.id);
                              setFormData({
                                name: user.name ?? '',
                                email: user.email ?? '',
                                designation: user.designation ?? '',
                              });
                              setShowModal(true);
                              toast.success('Ready to edit user!');
                            }}
                            className="text-blue-600 hover:text-blue-800 text-sm sm:text-base"
                            title="Edit user"
                          >
                            <FilePen className="w-5 h-5" />
                          </button>
                          <button
                            onClick={() => deleteUser(user.id)}
                            className="text-red-600 hover:text-red-800 text-sm sm:text-base"
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
            </div>
          </div>
        )}

        {users.length > usersPerPage && (
          <div className="flex justify-end mt-6">
            <div className="flex gap-2 items-center">
              <button
                onClick={() => {
                  setCurrentPage(prev => Math.max(prev - 1, 1));
                  toast.success(`Navigated to page ${Math.max(currentPage - 1, 1)}`);
                }}
                disabled={currentPage === 1}
                className="p-2 rounded-md border hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
              <span
                className="px-4 py-2 flex items-center"
                style={{ color: 'var(--foreground)' }}
              >
                Page {currentPage} of {totalPages}
              </span>
              <button
                onClick={() => {
                  setCurrentPage(prev => Math.min(prev + 1, totalPages));
                  toast.success(`Navigated to page ${Math.min(currentPage + 1, totalPages)}`);
                }}
                disabled={currentPage === totalPages}
                className="p-2 rounded-md border hover:bg-gray-100 disabled:opacity-50"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            </div>
          </div>
        )}

        {showModal && (
          <div className="fixed inset-0 backdrop-blur-sm bg-transparent flex items-center justify-center z-50">
            <div className="bg-white dark:bg-zinc-800 p-6 rounded-lg shadow-xl w-full max-w-md mx-4">
              <h3
                className="text-lg font-semibold mb-4"
                style={{ color: 'var(--foreground)' }}
              >
                {editUserId ? 'Edit User' : 'Add New User'}
              </h3>
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
                    toast('Operation canceled', { icon: '⚠️' });
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