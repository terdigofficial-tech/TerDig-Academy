"use client";

import { useState, useEffect } from 'react';
import { Plus, Edit2, Trash2, Shield, ShieldOff, Loader2, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import toast, { Toaster } from 'react-hot-toast';

interface User {
  id: string;
  username: string;
  full_name: string;
  email?: string;
  phone?: string;
  role: 'admin' | 'tutor';
  status: 'active' | 'inactive';
  created_at: string;
  updated_at?: string;
}

function UserFormModal({
  isOpen,
  onClose,
  onSuccess,
  editUser,
}: {
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
  editUser?: User | null;
}) {
  const [form, setForm] = useState({
    username: '',
    password: '',
    full_name: '',
    email: '',
    phone: '',
    role: 'tutor' as 'admin' | 'tutor',
    status: 'active' as 'active' | 'inactive',
  });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    if (editUser) {
      setForm({
        username: editUser.username,
        password: '',
        full_name: editUser.full_name,
        email: editUser.email || '',
        phone: editUser.phone || '',
        role: editUser.role,
        status: editUser.status,
      });
    } else {
      setForm({
        username: '',
        password: '',
        full_name: '',
        email: '',
        phone: '',
        role: 'tutor',
        status: 'active',
      });
    }
    setError('');
    setShowPassword(false);
  }, [editUser, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      const url = editUser ? `/api/admin/users/${editUser.id}` : '/api/admin/users';
      const method = editUser ? 'PUT' : 'POST';

      const body: any = {
        full_name: form.full_name,
        email: form.email || undefined,
        phone: form.phone || undefined,
        role: form.role,
      };

      if (!editUser) {
        body.username = form.username;
        body.password = form.password;
      } else if (form.password) {
        body.password = form.password;
      }

      if (editUser) {
        body.status = form.status;
      }

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!res.ok) {
        throw new Error(result.error || 'Gagal menyimpan user');
      }

      toast.success(editUser ? 'User berhasil diupdate' : 'User berhasil dibuat');
      onSuccess();
      onClose();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
      <div className="bg-white dark:bg-slate-800 rounded-2xl shadow-xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-slate-200 dark:border-slate-700">
          <h3 className="text-lg font-bold text-slate-800 dark:text-white">
            {editUser ? 'Edit User' : 'Tambah User Baru'}
          </h3>
        </div>
        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {!editUser && (
            <>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Username *</label>
                <input
                  type="text"
                  className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                  value={form.username}
                  onChange={e => setForm({ ...form, username: e.target.value })}
                  required
                  disabled={loading}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Password *</label>
                <div className="relative">
                  <input
                    type={showPassword ? 'text' : 'password'}
                    className="w-full border rounded-xl px-4 py-2.5 pr-12 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                    value={form.password}
                    onChange={e => setForm({ ...form, password: e.target.value })}
                    required={!editUser}
                    placeholder={editUser ? 'Kosongkan jika tidak diubah' : ''}
                    minLength={6}
                    disabled={loading}
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 transition-colors"
                    tabIndex={-1}
                  >
                    {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
            </>
          )}
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Nama Lengkap *</label>
            <input
              type="text"
              className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              value={form.full_name}
              onChange={e => setForm({ ...form, full_name: e.target.value })}
              required
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Email</label>
            <input
              type="email"
              className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              value={form.email}
              onChange={e => setForm({ ...form, email: e.target.value })}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">No. Telepon</label>
            <input
              type="text"
              className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              value={form.phone}
              onChange={e => setForm({ ...form, phone: e.target.value })}
              disabled={loading}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Role *</label>
            <select
              className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
              value={form.role}
              onChange={e => setForm({ ...form, role: e.target.value as 'admin' | 'tutor' })}
              disabled={loading}
            >
              <option value="tutor">Tutor</option>
              <option value="admin">Admin</option>
            </select>
          </div>
          {editUser && (
            <div>
              <label className="block text-sm font-medium text-slate-700 dark:text-slate-300 mb-1">Status</label>
              <select
                className="w-full border rounded-xl px-4 py-2.5 focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 outline-none dark:bg-slate-700 dark:border-slate-600 dark:text-white"
                value={form.status}
                onChange={e => setForm({ ...form, status: e.target.value as 'active' | 'inactive' })}
                disabled={loading}
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
          )}

          {error && (
            <div className="flex items-center gap-2 text-red-600 bg-red-50 dark:bg-red-900/20 p-3 rounded-xl text-sm">
              <AlertTriangle className="w-4 h-4 shrink-0" />
              {error}
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-slate-200 dark:border-slate-600 rounded-xl text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 transition font-medium"
              disabled={loading}
            >
              Batal
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-indigo-600 text-white rounded-xl hover:bg-indigo-700 transition font-medium disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              disabled={loading}
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : null}
              {editUser ? 'Simpan' : 'Buat User'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [editUser, setEditUser] = useState<User | null>(null);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchUsers = async () => {
    try {
      const res = await fetch('/api/admin/users');
      const result = await res.json();
      if (result.data) {
        setUsers(result.data);
      }
    } catch (err) {
      console.error('Error fetching users:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleDelete = async (user: User) => {
    if (!confirm(`Yakin ingin menghapus user "${user.full_name}" (${user.username})?`)) return;

    setDeleting(user.id);
    try {
      const res = await fetch(`/api/admin/users/${user.id}`, { method: 'DELETE' });
      const result = await res.json();
      if (!res.ok) throw new Error(result.error);
      toast.success('User berhasil dihapus');
      fetchUsers();
    } catch (err: any) {
      toast.error(err.message);
    } finally {
      setDeleting(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div>
      <Toaster position="top-right" />
      <div className="flex items-center justify-between mb-8">
        <h2 className="text-3xl font-bold text-slate-800 dark:text-white">Manajemen User</h2>
        <button
          onClick={() => { setEditUser(null); setModalOpen(true); }}
          className="inline-flex items-center gap-2 bg-indigo-600 text-white px-5 py-2.5 rounded-xl hover:bg-indigo-700 transition font-medium text-sm shadow-sm"
        >
          <Plus className="w-4 h-4" />
          Tambah User
        </button>
      </div>

      <div className="bg-white dark:bg-slate-800/90 rounded-2xl shadow-sm border border-slate-100 dark:border-slate-700 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-slate-100 dark:border-slate-700 bg-slate-50 dark:bg-slate-800/50">
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Nama</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Username</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Role</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Status</th>
                <th className="text-left px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Email</th>
                <th className="text-right px-6 py-4 text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 dark:divide-slate-700">
              {users.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 dark:text-slate-500">
                    Belum ada user. Klik "Tambah User" untuk membuat user baru.
                  </td>
                </tr>
              ) : (
                users.map((user) => (
                  <tr key={user.id} className="hover:bg-slate-50 dark:hover:bg-slate-700/30 transition-colors">
                    <td className="px-6 py-4">
                      <p className="font-medium text-slate-800 dark:text-slate-100">{user.full_name}</p>
                    </td>
                    <td className="px-6 py-4">
                      <code className="text-sm text-slate-500 dark:text-slate-400">{user.username}</code>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                        user.role === 'admin'
                          ? 'bg-purple-100 dark:bg-purple-900/30 text-purple-700 dark:text-purple-300'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300'
                      }`}>
                        {user.role === 'admin' ? <Shield className="w-3.5 h-3.5" /> : <ShieldOff className="w-3.5 h-3.5" />}
                        {user.role === 'admin' ? 'Admin' : 'Tutor'}
                      </span>
                    </td>
                    <td className="px-6 py-4">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium ${
                        user.status === 'active'
                          ? 'bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300'
                          : 'bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300'
                      }`}>
                        {user.status === 'active' ? 'Aktif' : 'Nonaktif'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500 dark:text-slate-400">
                      {user.email || '-'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        <button
                          onClick={() => { setEditUser(user); setModalOpen(true); }}
                          className="p-2 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 rounded-lg transition"
                          title="Edit user"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(user)}
                          disabled={deleting === user.id}
                          className="p-2 text-slate-500 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition disabled:opacity-50"
                          title="Hapus user"
                        >
                          {deleting === user.id ? (
                            <Loader2 className="w-4 h-4 animate-spin" />
                          ) : (
                            <Trash2 className="w-4 h-4" />
                          )}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      <UserFormModal
        isOpen={modalOpen}
        onClose={() => { setModalOpen(false); setEditUser(null); }}
        onSuccess={fetchUsers}
        editUser={editUser}
      />
    </div>
  );
}
