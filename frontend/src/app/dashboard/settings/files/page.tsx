'use client';

import { useEffect, useState, useCallback, useMemo } from 'react';
import {
  LuSearch as Search,
  LuTrash2 as Trash2,
  LuFile as FileIcon,
  LuImage as ImageIcon,
  LuFileVideo as VideoIcon,
  LuFileAudio as AudioIcon,
  LuFileText as TextIcon,
  LuDownload as DownloadIcon,
  LuLoader as Loader2,
} from 'react-icons/lu';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/Table';
import { api } from '@/lib/api';
import { usePermission } from '@/hooks/usePermission';
import ConfirmDialog from '@/components/ConfirmDialog';

interface FileItem {
  id: string;
  name: string;
  path: string;
  size: number;
  mimeType: string;
  source: 'upload' | 'message';
  createdAt: string;
  url: string;
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
}

function getFileIcon(mimeType: string) {
  if (mimeType.startsWith('image/')) return ImageIcon;
  if (mimeType.startsWith('video/')) return VideoIcon;
  if (mimeType.startsWith('audio/')) return AudioIcon;
  if (mimeType.startsWith('text/')) return TextIcon;
  return FileIcon;
}

const PAGE_SIZE = 20;

export default function FilesPage() {
  const { can } = usePermission();
  const canManageSettings = can('settings.manage');

  const [files, setFiles] = useState<FileItem[]>([]);
  const [totalCount, setTotalCount] = useState(0);
  const [totalSize, setTotalSize] = useState(0);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [offset, setOffset] = useState(0);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const fetchFiles = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get('/files', {
        params: { q: search || undefined, limit: PAGE_SIZE, offset },
      });
      setFiles(res.data.files || []);
      setTotalCount(res.data.totalCount || 0);
      setTotalSize(res.data.totalSize || 0);
    } catch {
      setFiles([]);
      setTotalCount(0);
      setTotalSize(0);
    } finally {
      setLoading(false);
    }
  }, [search, offset]);

  useEffect(() => {
    fetchFiles();
  }, [fetchFiles]);

  const handleDelete = async () => {
    if (!deleteId) return;
    setDeleting(true);
    try {
      await api.delete(`/files/${deleteId}`);
      setDeleteId(null);
      fetchFiles();
    } catch {
      // ignore
    } finally {
      setDeleting(false);
    }
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    setOffset(0);
    fetchFiles();
  };

  const totalPages = useMemo(() => Math.max(1, Math.ceil(totalCount / PAGE_SIZE)), [totalCount]);
  const currentPage = useMemo(() => Math.floor(offset / PAGE_SIZE) + 1, [offset]);

  return (
    <div className="flex flex-col gap-5">
      {/* Storage usage summary */}
      <div className="panel flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">File Manager</h2>
          <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
            Manage uploaded and incoming media files for your organization.
          </p>
        </div>
        <div className="flex items-center gap-6 rounded-xl border border-gray-200 bg-gray-50/50 px-5 py-3 dark:border-gray-800 dark:bg-gray-800/30">
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{formatBytes(totalSize)}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Total Storage</div>
          </div>
          <div className="h-8 w-px bg-gray-200 dark:bg-gray-700" />
          <div className="text-center">
            <div className="text-2xl font-semibold text-gray-900 dark:text-gray-100">{totalCount}</div>
            <div className="text-xs text-gray-500 dark:text-gray-400">Files</div>
          </div>
        </div>
      </div>

      {/* Search */}
      <form onSubmit={handleSearch} className="flex gap-2">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files by name..."
            className="w-full rounded-lg border border-gray-300 bg-white py-2 pl-9 pr-3 text-sm text-gray-900 focus:outline-none focus:ring-2 focus:ring-primary-600 dark:border-gray-700 dark:bg-gray-800 dark:text-gray-100"
          />
        </div>
        <button type="submit" className="btn-secondary text-sm">
          Search
        </button>
      </form>

      {/* Files table */}
      <div className="panel overflow-hidden">
        <Table>
          <TableHeader>
            <tr>
              <TableHead>Name</TableHead>
              <TableHead>Size</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Source</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-32 text-right">Actions</TableHead>
            </tr>
          </TableHeader>
          <TableBody>
            {loading && (
              <TableRow>
                <td colSpan={6} className="py-10 text-center text-gray-400 dark:text-gray-500">
                  <div className="flex items-center justify-center gap-2">
                    <Loader2 size={16} className="animate-spin" />
                    Loading files...
                  </div>
                </td>
              </TableRow>
            )}
            {!loading && files.length === 0 && (
              <TableRow>
                <td colSpan={6} className="py-10 text-center text-gray-400 dark:text-gray-500">
                  {search ? 'No files match your search' : 'No files found'}
                </td>
              </TableRow>
            )}
            {!loading &&
              files.map((file) => {
                const Icon = getFileIcon(file.mimeType);
                return (
                  <TableRow key={file.id}>
                    <TableCell className="flex items-center gap-2">
                      <Icon size={18} className="shrink-0 text-gray-400 dark:text-gray-500" />
                      <span className="truncate font-medium text-gray-900 dark:text-gray-100" title={file.name}>
                        {file.name}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">{formatBytes(file.size)}</TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">{file.mimeType}</TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex items-center rounded-xl px-2.5 py-0.5 text-xs font-medium ${
                          file.source === 'message'
                            ? 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400'
                            : 'bg-gray-100 text-gray-700 dark:bg-gray-800 dark:text-gray-400'
                        }`}
                      >
                        {file.source === 'message' ? 'Message' : 'Upload'}
                      </span>
                    </TableCell>
                    <TableCell className="text-sm text-gray-600 dark:text-gray-400">
                      {new Date(file.createdAt).toLocaleDateString()}
                    </TableCell>
                    <TableCell className="text-right">
                      <div className="flex items-center justify-end gap-2">
                        <a
                          href={file.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="rounded-lg p-1.5 text-gray-500 hover:bg-gray-100 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-gray-200"
                          title="Download"
                        >
                          <DownloadIcon size={16} />
                        </a>
                        {canManageSettings && (
                          <button
                            onClick={() => setDeleteId(file.id)}
                            className="rounded-lg p-1.5 text-gray-500 hover:bg-red-100 hover:text-red-600 dark:text-gray-400 dark:hover:bg-red-900/30 dark:hover:text-red-400"
                            title="Delete"
                          >
                            <Trash2 size={16} />
                          </button>
                        )}
                      </div>
                    </TableCell>
                  </TableRow>
                );
              })}
          </TableBody>
        </Table>
      </div>

      {/* Pagination */}
      {totalCount > 0 && (
        <div className="flex items-center justify-between">
          <span className="text-xs text-gray-500 dark:text-gray-400">
            Page {currentPage} of {totalPages} ({totalCount} total)
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => setOffset((o) => Math.max(0, o - PAGE_SIZE))}
              disabled={offset <= 0}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Previous
            </button>
            <button
              onClick={() => setOffset((o) => o + PAGE_SIZE)}
              disabled={offset + PAGE_SIZE >= totalCount}
              className="rounded-lg border border-gray-300 px-3 py-1.5 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Next
            </button>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={!!deleteId}
        title="Delete File"
        message="This will permanently delete the file. This action cannot be undone."
        confirmLabel={deleting ? 'Deleting...' : 'Delete'}
        cancelLabel="Cancel"
        onConfirm={handleDelete}
        onCancel={() => setDeleteId(null)}
      />
    </div>
  );
}
