'use client';

import { useEffect, useState, useRef } from 'react';
import { LuPenLine as Edit, LuTrash2 as Trash2, LuCopy as Copy, LuCheck as Check, LuChevronDown as ChevronDown, LuLoader as Loader2 } from 'react-icons/lu';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import { useRouter } from 'next/navigation';
import PasswordInput from '@/components/PasswordInput';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableEmpty } from '@/components/Table';

interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: string;
}

interface Invitation {
  token: string;
  email: string;
  role: string;
  expiresAt: string;
  inviteUrl: string;
}

interface WabaAccount {
  id: string;
  name: string;
  phoneNumberId: string;
  businessAccountId: string;
  isActive: boolean;
}

interface Role {
  id: string;
  name: string;
  permissions: string[];
  isSystem: boolean;
}

const ROLE_BADGE_MAP: Record<string, string> = {
  admin: 'badge-purple',
  agent: 'badge-gray',
};

const FALLBACK_BADGES = ['badge-blue', 'badge-green', 'badge-amber', 'badge-red'];

function roleBadgeClass(roleName: string): string {
  if (ROLE_BADGE_MAP[roleName]) return ROLE_BADGE_MAP[roleName];
  let hash = 0;
  for (let i = 0; i < roleName.length; i++) hash = roleName.charCodeAt(i) + ((hash << 5) - hash);
  return FALLBACK_BADGES[Math.abs(hash) % FALLBACK_BADGES.length];
}

export default function UsersPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [members, setMembers] = useState<TeamMember[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'agent' });
  const [mode, setMode] = useState<'password' | 'invite'>('password');
  const [editing, setEditing] = useState<TeamMember | null>(null);
  const [invitation, setInvitation] = useState<Invitation | null>(null);
  const [copied, setCopied] = useState(false);

  const [wabaAccounts, setWabaAccounts] = useState<WabaAccount[]>([]);
  const [agentWabaMap, setAgentWabaMap] = useState<Record<string, string[]>>({});
  const [openWabaDropdownId, setOpenWabaDropdownId] = useState<string | null>(null);
  const wabaDropdownRefs = useRef<Record<string, HTMLDivElement | null>>({});

  const { can, isAdmin } = usePermission();

  const defaultRole = () => {
    const nonAdmin = roles.find((r) => r.name !== 'admin');
    return nonAdmin?.name || 'agent';
  };

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchMembers();
    fetchRoles();
    fetchWabaAccounts();
  }, [authLoading, user, router]);

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (openWabaDropdownId && wabaDropdownRefs.current[openWabaDropdownId]) {
        const el = wabaDropdownRefs.current[openWabaDropdownId];
        if (el && !el.contains(event.target as Node)) {
          setOpenWabaDropdownId(null);
        }
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [openWabaDropdownId]);

  const fetchMembers = async () => {
    try {
      const res = await api.get('/agents');
      setMembers(res.data.agents || []);
    } catch {
      // ignore
    }
  };

  const fetchRoles = async () => {
    try {
      const res = await api.get('/roles');
      const fetched = res.data.roles || [];
      setRoles(fetched);
    } catch {
      setRoles([]);
    }
  };

  const fetchWabaAccounts = async () => {
    try {
      const res = await api.get('/waba-accounts');
      const accounts: WabaAccount[] = res.data.wabaAccounts || [];
      setWabaAccounts(accounts);

      const map: Record<string, string[]> = {};
      for (const account of accounts) {
        try {
          const agentsRes = await api.get(`/waba-accounts/${account.id}/agents`);
          (agentsRes.data.agents || []).forEach((agent: any) => {
            if (!map[agent.id]) map[agent.id] = [];
            map[agent.id].push(account.id);
          });
        } catch {
          // ignore
        }
      }
      setAgentWabaMap(map);
    } catch {
      // ignore
    }
  };

  const handleWabaToggle = async (agentId: string, wabaId: string, assign: boolean) => {
    try {
      if (assign) {
        await api.post(`/waba-accounts/${wabaId}/agents`, { agentId });
      } else {
        await api.delete(`/waba-accounts/${wabaId}/agents/${agentId}`);
      }
      await fetchWabaAccounts();
    } catch {
      // ignore
    }
  };

  const handleSubmit = async () => {
    if (!form.name || !form.email) return;
    try {
      const payload = editing
        ? { name: form.name, email: form.email, role: form.role }
        : mode === 'password'
          ? { name: form.name, email: form.email, password: form.password, role: form.role }
          : { name: form.name, email: form.email, role: form.role };

      if (editing) {
        await api.put(`/agents/${editing.id}`, payload);
        fetchMembers();
        setDialogOpen(false);
        setEditing(null);
        setForm({ name: '', email: '', password: '', role: defaultRole() });
      } else {
        const res = await api.post('/agents', payload);
        if (res.data.invitation) {
          setInvitation(res.data.invitation);
        } else {
          fetchMembers();
          setDialogOpen(false);
          setForm({ name: '', email: '', password: '', role: defaultRole() });
        }
      }
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this user?')) return;
    try {
      await api.delete(`/agents/${id}`);
      fetchMembers();
    } catch {
      // ignore
    }
  };

  const handleEdit = (member: TeamMember) => {
    setEditing(member);
    setForm({ name: member.name, email: member.email, password: '', role: member.role });
    setMode('password');
    setInvitation(null);
    setDialogOpen(true);
  };

  const handleAdd = () => {
    setEditing(null);
    setForm({ name: '', email: '', password: '', role: defaultRole() });
    setMode('password');
    setInvitation(null);
    setDialogOpen(true);
  };

  const handleCopyLink = () => {
    if (!invitation) return;
    const fullUrl = `${typeof window !== 'undefined' ? window.location.origin : ''}${invitation.inviteUrl}`;
    navigator.clipboard.writeText(fullUrl).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  const handleCloseInvitation = () => {
    setInvitation(null);
    setDialogOpen(false);
    setForm({ name: '', email: '', password: '', role: defaultRole() });
    fetchMembers();
  };

  if (authLoading) {
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
          <h1>Users</h1>
          <p>Manage team members, roles, and WABA account access.</p>
        </div>
        {isAdmin && (
          <button onClick={handleAdd} className="btn-primary">
            Add User
          </button>
        )}
      </div>

      <div className="panel overflow-hidden">
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Name</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Role</TableHead>
              <TableHead>WABA Access</TableHead>
              {isAdmin && <TableHead className="text-right">Actions</TableHead>}
            </tr>
          </TableHeader>
          <TableBody>
            {members.map((m) => (
              <TableRow key={m.id}>
                <TableCell className="font-medium text-gray-900 dark:text-gray-100">{m.name}</TableCell>
                <TableCell>{m.email}</TableCell>
                <TableCell>
                  <span className={roleBadgeClass(m.role)}>
                    {m.role}
                  </span>
                </TableCell>
                <TableCell>
                  <div
                    className="relative inline-block"
                    ref={(el) => { wabaDropdownRefs.current[m.id] = el; }}
                  >
                    <button
                      onClick={() => isAdmin && setOpenWabaDropdownId((prev) => (prev === m.id ? null : m.id))}
                      className={`flex items-center gap-1 rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 px-2 py-1 text-xs text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800 ${
                        isAdmin ? 'hover:bg-gray-50 dark:hover:bg-gray-700 cursor-pointer' : 'cursor-default'
                      }`}
                    >
                      <span>
                        {(agentWabaMap[m.id] || []).length === 0
                          ? 'None'
                          : `${(agentWabaMap[m.id] || []).length} WABA${(agentWabaMap[m.id] || []).length > 1 ? 's' : ''}`}
                      </span>
                      {isAdmin && <ChevronDown size={14} />}
                    </button>
                    {isAdmin && openWabaDropdownId === m.id && (
                      <div className="absolute left-0 top-8 z-50 w-56 rounded-xl border border-gray-200 dark:border-gray-800 bg-white dark:bg-gray-900 shadow-sm py-2">
                        {wabaAccounts.length === 0 && (
                          <div className="px-4 py-2 text-xs text-gray-500 dark:text-gray-400">
                            No WABA accounts
                          </div>
                        )}
                        {wabaAccounts.map((waba) => {
                          const assigned = (agentWabaMap[m.id] || []).includes(waba.id);
                          return (
                            <label
                              key={waba.id}
                              className="flex cursor-pointer items-center gap-2 px-4 py-2 text-sm hover:bg-gray-50 dark:hover:bg-gray-800"
                            >
                              <input
                                type="checkbox"
                                checked={assigned}
                                onChange={(e) => handleWabaToggle(m.id, waba.id, e.target.checked)}
                                className="h-4 w-4 rounded border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-800 text-primary-700 focus:ring-primary-500"
                              />
                              <span className="text-gray-700 dark:text-gray-300">{waba.name}</span>
                            </label>
                          );
                        })}
                      </div>
                    )}
                  </div>
                </TableCell>
                {isAdmin && (
                  <TableCell className="text-right">
                    <div className="flex flex-wrap items-center justify-end gap-1">
                      <button
                        onClick={() => handleEdit(m)}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                        aria-label="Edit"
                      >
                        <Edit size={16} />
                      </button>
                      <button
                        onClick={() => handleDelete(m.id)}
                        className="inline-flex items-center justify-center rounded-md p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 min-h-[44px] min-w-[44px] sm:min-h-0 sm:min-w-0"
                        aria-label="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </TableCell>
                )}
              </TableRow>
            ))}
            {members.length === 0 && <TableEmpty colSpan={isAdmin ? 5 : 4}>No users</TableEmpty>}
          </TableBody>
        </Table>
      </div>

      {/* User Dialog */}
      {dialogOpen && !invitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm" onClick={() => setDialogOpen(false)}>
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900" onClick={(e) => e.stopPropagation()}>
            <h2 className="mb-4 text-lg font-semibold text-gray-900 dark:text-gray-100">{editing ? 'Edit User' : 'Add User'}</h2>

            <div className="flex flex-col gap-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Name <span className="text-red-500">*</span></label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  required
                  className="input"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Email <span className="text-red-500">*</span></label>
                <input
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  required
                  disabled={!!editing}
                  className="input disabled:bg-gray-100 dark:disabled:bg-gray-800"
                />
              </div>

              {!editing && (
                <div className="flex items-center gap-2">
                  <input
                    id="invite-toggle"
                    type="checkbox"
                    checked={mode === 'invite'}
                    onChange={(e) => setMode(e.target.checked ? 'invite' : 'password')}
                    className="h-4 w-4 rounded border-gray-300 text-primary-700 focus:ring-primary-500"
                  />
                  <label htmlFor="invite-toggle" className="text-sm text-gray-700 dark:text-gray-300 cursor-pointer">
                    Generate invite link instead of setting password
                  </label>
                </div>
              )}

              {!editing && mode === 'password' && (
                <div>
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Password <span className="text-red-500">*</span></label>
                  <PasswordInput
                    value={form.password}
                    onChange={(val) => setForm({ ...form, password: val })}
                    placeholder="Min 8 characters"
                    required
                    minLength={8}
                  />
                </div>
              )}

              {!editing && mode === 'invite' && (
                <div className="rounded-lg border border-blue-100 bg-blue-50 dark:bg-blue-900/20 p-3 text-sm text-blue-700 dark:text-blue-300">
                  An invitation link will be generated. Share it with the user so they can set their own password.
                  The link expires in 7 days.
                </div>
              )}

              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Role</label>
                <select
                  value={form.role}
                  onChange={(e) => setForm({ ...form, role: e.target.value })}
                  className="input"
                >
                  {roles.map((r) => (
                    <option key={r.id} value={r.name}>
                      {r.name.charAt(0).toUpperCase() + r.name.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
            <div className="mt-6 flex justify-end gap-2">
              <button
                onClick={() => { setDialogOpen(false); setEditing(null); }}
                className="btn-secondary"
              >
                Cancel
              </button>
              <button
                onClick={handleSubmit}
                disabled={!form.name || !form.email || (!editing && mode === 'password' && form.password.length < 8)}
                className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {editing ? 'Update' : mode === 'invite' ? 'Generate Invite' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Invitation Result Dialog */}
      {invitation && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
          <div className="max-h-[90vh] w-full max-w-md overflow-y-auto rounded-2xl border border-gray-200 bg-white p-6 shadow-2xl dark:border-gray-800 dark:bg-gray-900">
            <h2 className="mb-2 text-lg font-semibold text-gray-900 dark:text-gray-100">Invitation Generated</h2>
            <p className="mb-4 text-sm text-gray-600 dark:text-gray-400">
              Share this one-time link with <span className="font-medium text-gray-900 dark:text-gray-100">{invitation.email}</span>. It expires in 7 days.
            </p>

            <div className="mb-4 flex items-center gap-2 rounded-lg border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-gray-800/50 p-3">
              <code className="flex-1 break-all text-xs text-gray-700 dark:text-gray-300">
                {typeof window !== 'undefined' ? window.location.origin : ''}{invitation.inviteUrl}
              </code>
              <button
                onClick={handleCopyLink}
                className="btn-secondary px-2 py-1 text-xs"
              >
                {copied ? <Check size={14} className="text-green-600" /> : <Copy size={14} />}
                {copied ? 'Copied' : 'Copy'}
              </button>
            </div>

            <div className="flex justify-end gap-2">
              <button
                onClick={handleCloseInvitation}
                className="btn-primary"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
