'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { LuLoader as Loader2, LuPlus as Plus, LuPencil as Pencil, LuTrash2 as Trash2, LuShield as Shield } from 'react-icons/lu';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/Table';

interface Role {
  id: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
}

const ALL_PERMISSIONS = [
  'conversations.read',
  'conversations.manage',
  'contacts.read',
  'contacts.manage',
  'campaigns.read',
  'campaigns.manage',
  'automations.read',
  'automations.manage',
  'analytics.read',
  'users.read',
  'users.manage',
  'roles.read',
  'roles.manage',
  'settings.read',
  'settings.manage',
];

const PERMISSION_GROUPS: Record<string, string[]> = {
  Conversations: ['conversations.read', 'conversations.manage'],
  Contacts: ['contacts.read', 'contacts.manage'],
  Campaigns: ['campaigns.read', 'campaigns.manage'],
  Automations: ['automations.read', 'automations.manage'],
  Analytics: ['analytics.read'],
  Users: ['users.read', 'users.manage'],
  Roles: ['roles.read', 'roles.manage'],
  Settings: ['settings.read', 'settings.manage'],
};

export default function RolesPage() {
  const { user, loading: authLoading } = useAuth();
  const { can } = usePermission();
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Role | null>(null);
  const [name, setName] = useState('');
  const [selectedPermissions, setSelectedPermissions] = useState<Set<string>>(new Set());
  const [submitting, setSubmitting] = useState(false);

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles');
      setRoles(res.data.roles || []);
    } catch {
      setRoles([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) return;
    fetchRoles();
  }, [authLoading, user]);

  const openAdd = () => {
    setEditing(null);
    setName('');
    setSelectedPermissions(new Set());
    setDialogOpen(true);
  };

  const openEdit = (role: Role) => {
    if (role.isSystem) return;
    setEditing(role);
    setName(role.name);
    setSelectedPermissions(new Set(role.permissions));
    setDialogOpen(true);
  };

  const togglePermission = (perm: string) => {
    setSelectedPermissions((prev) => {
      const next = new Set(prev);
      if (next.has(perm)) {
        next.delete(perm);
      } else {
        next.add(perm);
      }
      return next;
    });
  };

  const handleSubmit = async () => {
    if (!name.trim()) return;
    setSubmitting(true);
    try {
      const payload = {
        name: name.trim(),
        permissions: Array.from(selectedPermissions),
      };
      if (editing) {
        await api.put(`/roles/${editing.id}`, payload);
      } else {
        await api.post('/roles', payload);
      }
      setDialogOpen(false);
      fetchRoles();
    } catch {
      // ignore
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this role?')) return;
    try {
      await api.delete(`/roles/${id}`);
      fetchRoles();
    } catch {
      // ignore
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 size={32} className="animate-spin text-gray-400 dark:text-gray-500" />
      </div>
    );
  }

  return (
    <div>
      <div className="page-header">
        <div>
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Roles</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Manage team roles and permissions</p>
        </div>
        {can('roles.manage') && (
          <button
            onClick={openAdd}
            className="btn-primary"
          >
            <Plus size={16} />
            Add Role
          </button>
        )}
      </div>

      <div className="panel overflow-hidden">
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Name</TableHead>
              <TableHead>Permissions</TableHead>
              <TableHead>System</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {roles.map((role) => (
              <TableRow key={role.id}>
                <TableCell className="font-medium text-gray-900 dark:text-gray-100">{role.name}</TableCell>
                <TableCell>{role.permissions.length} permissions</TableCell>
                <TableCell>
                  {role.isSystem ? (
                    <span className="inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium bg-primary-100 text-primary-800 dark:bg-primary-900/30 dark:text-primary-400">
                      Yes
                    </span>
                  ) : (
                    <span className="badge-gray">
                      No
                    </span>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex flex-wrap items-center justify-end gap-1">
                    {!role.isSystem && can('roles.manage') && (
                      <>
                        <button
                          onClick={() => openEdit(role)}
                          className="inline-flex items-center justify-center rounded-md p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                          title="Edit"
                        >
                          <Pencil size={16} />
                        </button>
                        <button
                          onClick={() => handleDelete(role.id)}
                          className="inline-flex items-center justify-center rounded-md p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                          title="Delete"
                        >
                          <Trash2 size={16} />
                        </button>
                      </>
                    )}
                    {role.isSystem && (
                      <span className="text-xs text-gray-400 dark:text-gray-500">Read-only</span>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            ))}
            {roles.length === 0 && <TableEmpty colSpan={4}>No roles found</TableEmpty>}
          </TableBody>
        </Table>
      </div>

      {/* Dialog */}
      {dialogOpen && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm"
          onClick={() => setDialogOpen(false)}
        >
          <div
            className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()}
          >
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">
              {editing ? 'Edit Role' : 'Add Role'}
            </h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Name <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g. Manager"
                  className="input"
                />
              </div>

              <div>
                <label className="mb-2 block text-sm font-medium text-gray-700 dark:text-gray-300">
                  Permissions
                </label>
                <div className="panel max-h-72 overflow-y-auto p-3">
                  {Object.entries(PERMISSION_GROUPS).map(([group, perms]) => (
                    <div key={group} className="mb-3">
                      <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400">
                        {group}
                      </div>
                      <div className="flex flex-col gap-1">
                        {perms.map((perm) => (
                          <label
                            key={perm}
                            className="flex cursor-pointer items-center gap-2 rounded-md px-2 py-1.5 hover:bg-gray-50 dark:hover:bg-gray-700"
                          >
                            <input
                              type="checkbox"
                              checked={selectedPermissions.has(perm)}
                              onChange={() => togglePermission(perm)}
                              className="h-4 w-4 rounded border-gray-300 dark:border-gray-600 text-primary-700 focus:ring-primary-500/20"
                            />
                            <span className="text-sm text-gray-700 dark:text-gray-300">{perm}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setDialogOpen(false)}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={submitting || !name.trim()}
                className="btn-primary disabled:opacity-50"
              >
                {submitting && <Loader2 size={14} className="animate-spin" />}
                {editing ? 'Save Changes' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
