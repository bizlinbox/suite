'use client';

import { useEffect, useState, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { useAuth } from '@/hooks/useAuth';
import { usePermission } from '@/hooks/usePermission';
import {
  Plus,
  Play,
  Pause,
  Pencil,
  Trash2,
  Loader2,
} from 'lucide-react';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell, TableLoading, TableEmpty } from '@/components/Table';

interface Automation {
  id: string;
  name: string;
  isActive: boolean;
  stepCount: number;
  wabaAccountId: string | null;
  createdAt: string;
  updatedAt: string;
}

export default function AutomationsPage() {
  const { user, loading: authLoading } = useAuth();
  const router = useRouter();
  const [automations, setAutomations] = useState<Automation[]>([]);
  const [loading, setLoading] = useState(true);
  const { can, isAdmin } = usePermission();

  const fetchAutomations = useCallback(async () => {
    try {
      const res = await api.get('/automations');
      setAutomations(res.data.automations || []);
    } catch {
      setAutomations([]);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      router.push('/login');
      return;
    }
    fetchAutomations();
  }, [authLoading, user, router, fetchAutomations]);

  const handleToggle = async (id: string) => {
    try {
      await api.post(`/automations/${id}/toggle`);
      fetchAutomations();
    } catch {
      // ignore
    }
  };

  const handleDelete = async (id: string) => {
    if (!confirm('Delete this automation?')) return;
    try {
      await api.delete(`/automations/${id}`);
      fetchAutomations();
    } catch {
      // ignore
    }
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
          <h1 className="text-xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">Automations</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">Build and manage message workflows</p>
        </div>
        {can('automations.manage') && (
          <Link
            href="/dashboard/automations/new"
            className="btn-primary"
          >
            <Plus size={16} />
            New Automation
          </Link>
        )}
      </div>

      <div className="panel overflow-hidden">
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Name</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Steps</TableHead>
              <TableHead>Created</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {loading && <TableLoading colSpan={5} />}
            {!loading && automations.length === 0 && (
              <TableEmpty colSpan={5}>No automations yet. Create one to get started.</TableEmpty>
            )}
            {automations.map((a) => (
              <TableRow key={a.id}>
                <TableCell>
                  <Link
                    href={`/dashboard/automations/${a.id}`}
                    className="font-medium text-gray-900 dark:text-gray-100 hover:text-primary-700 dark:hover:text-primary-400"
                  >
                    {a.name}
                  </Link>
                </TableCell>
                <TableCell>
                  <span className={a.isActive ? 'badge-green' : 'badge-gray'}>
                    {a.isActive ? 'Active' : 'Inactive'}
                  </span>
                </TableCell>
                <TableCell>{a.stepCount} steps</TableCell>
                <TableCell className="text-gray-500 dark:text-gray-400">
                  {new Date(a.createdAt).toLocaleDateString()}
                </TableCell>
                <TableCell className="text-right">
                  {can('automations.manage') && (
                    <>
                      <button
                        onClick={() => handleToggle(a.id)}
                        className="mr-1 rounded-md p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title={a.isActive ? 'Pause' : 'Activate'}
                      >
                        {a.isActive ? <Pause size={16} /> : <Play size={16} />}
                      </button>
                      <Link
                        href={`/dashboard/automations/${a.id}`}
                        className="mr-1 inline-flex rounded-md p-1 text-gray-500 dark:text-gray-400 hover:bg-gray-100 dark:hover:bg-gray-800"
                        title="Edit"
                      >
                        <Pencil size={16} />
                      </Link>
                      <button
                        onClick={() => handleDelete(a.id)}
                        className="rounded-md p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </>
                  )}
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
