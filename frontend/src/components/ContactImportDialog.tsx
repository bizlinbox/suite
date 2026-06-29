'use client';

import { useState, useRef, useCallback } from 'react';
import {
  LuUpload as Upload,
  LuFileText as FileText,
  LuX as X,
  LuLoader as Loader2,
  LuCheck as Check,
  LuCircleAlert as AlertCircle,
} from 'react-icons/lu';
import { parseFile, ParsedData } from '@/lib/fileParser';
import { api } from '@/lib/api';

interface ContactImportDialogProps {
  open: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

const FIELD_OPTIONS = [
  { key: 'phone', label: 'Phone', required: true },
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'company', label: 'Company' },
  { key: 'job_title', label: 'Job Title' },
  { key: 'notes', label: 'Notes' },
  { key: 'birthday', label: 'Birthday' },
  { key: 'language', label: 'Language' },
  { key: 'tags', label: 'Tags' },
  { key: 'address', label: 'Address' },
  { key: 'city', label: 'City' },
  { key: 'state', label: 'State' },
  { key: 'country', label: 'Country' },
  { key: 'zip_code', label: 'ZIP Code' },
];

export default function ContactImportDialog({ open, onClose, onSuccess }: ContactImportDialogProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [parseLoading, setParseLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<{ created: number; updated: number; errors: number } | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, number>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const reset = useCallback(() => {
    setFile(null);
    setParsedData(null);
    setLoading(false);
    setParseLoading(false);
    setError(null);
    setResult(null);
    setColumnMapping({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  }, []);

  const handleClose = useCallback(() => {
    reset();
    onClose();
  }, [reset, onClose]);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setParseLoading(true);
    setError(null);
    setParsedData(null);
    setResult(null);

    const res = await parseFile(selectedFile);

    if (res.success && res.data) {
      setParsedData(res.data);
      // Auto-map columns by header name
      const mapping: Record<string, number> = {};
      res.data.headers.forEach((header, index) => {
        const normalized = header.toLowerCase().trim().replace(/\s+/g, '_');
        const match = FIELD_OPTIONS.find(
          (f) =>
            f.key === normalized ||
            f.key.replace('_', '') === normalized ||
            f.label.toLowerCase() === header.toLowerCase().trim()
        );
        if (match && !Object.values(mapping).includes(index)) {
          mapping[match.key] = index;
        }
      });
      setColumnMapping(mapping);
    } else {
      setError(res.error || 'Failed to parse file');
      setFile(null);
    }

    setParseLoading(false);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const droppedFile = e.dataTransfer.files[0];
    if (droppedFile) {
      handleFileSelect(droppedFile);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) {
      handleFileSelect(selectedFile);
    }
  };

  const handleRemoveFile = () => {
    reset();
  };

  const handleMappingChange = (fieldKey: string, colIndex: number | '') => {
    setColumnMapping((prev) => {
      const next = { ...prev };
      if (colIndex === '') {
        delete next[fieldKey];
      } else {
        next[fieldKey] = colIndex as number;
      }
      return next;
    });
  };

  const buildContacts = (): Array<Record<string, string | string[] | null>> => {
    if (!parsedData) return [];
    const contacts: Array<Record<string, string | string[] | null>> = [];
    for (const row of parsedData.rows) {
      const contact: Record<string, string | string[] | null> = {};
      let hasPhone = false;
      for (const [fieldKey, colIndex] of Object.entries(columnMapping)) {
        const value = row[colIndex]?.trim() || null;
        if (fieldKey === 'tags' && value) {
          contact[fieldKey] = value.split(',').map((t) => t.trim()).filter(Boolean);
        } else {
          contact[fieldKey] = value;
        }
        if (fieldKey === 'phone' && value) {
          hasPhone = true;
        }
      }
      if (hasPhone) {
        contacts.push(contact);
      }
    }
    return contacts;
  };

  const handleImport = async () => {
    const contacts = buildContacts();
    if (contacts.length === 0) {
      setError('No valid contacts to import. Phone is required.');
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const res = await api.post('/contacts/bulk', { contacts });
      const { results } = res.data;
      setResult({
        created: results.created,
        updated: results.updated,
        errors: results.errors,
      });
      onSuccess();
    } catch (err: any) {
      setError(err.response?.data?.error || 'Import failed');
    } finally {
      setLoading(false);
    }
  };

  if (!open) return null;

  const mappedPhone = columnMapping['phone'] !== undefined;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4 backdrop-blur-sm">
      <div className="flex max-h-[90vh] w-full max-w-3xl flex-col rounded-2xl border border-gray-200 bg-white shadow-2xl dark:border-gray-800 dark:bg-gray-900">
        {/* Header */}
        <div className="flex shrink-0 items-center justify-between px-6 py-4">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            Import Contacts
          </h2>
          <button
            onClick={handleClose}
            className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto px-6 pb-2">
          {parseLoading && (
            <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 dark:border-gray-700">
              <Loader2 size={24} className="animate-spin text-gray-400" />
              <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Parsing file...</span>
            </div>
          )}

          {!parseLoading && !file && (
            <div
              onDragOver={handleDragOver}
              onDrop={handleDrop}
              className="flex cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 transition-colors hover:border-gray-400 dark:border-gray-700 dark:hover:border-gray-600"
              onClick={() => fileInputRef.current?.click()}
            >
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xls,.xlsx"
                onChange={handleInputChange}
                className="hidden"
              />
              <Upload size={32} className="mb-3 text-gray-400" />
              <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
                Drop your file here or click to browse
              </p>
              <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                Supports CSV, XLS, and XLSX files
              </p>
            </div>
          )}

          {!parseLoading && file && parsedData && !result && (
            <div className="space-y-4">
              {/* File info */}
              <div className="flex items-center justify-between rounded-lg border border-gray-200 bg-gray-50 p-3 dark:border-gray-700 dark:bg-gray-800">
                <div className="flex items-center gap-2">
                  <FileText size={16} className="text-gray-500" />
                  <span className="text-sm font-medium text-gray-700 dark:text-gray-300">{file.name}</span>
                  <span className="text-xs text-gray-500 dark:text-gray-400">
                    ({parsedData.rows.length} rows)
                  </span>
                </div>
                <button
                  onClick={handleRemoveFile}
                  className="rounded p-1 text-gray-400 hover:bg-gray-200 hover:text-gray-600 dark:hover:bg-gray-700 dark:hover:text-gray-300"
                >
                  <X size={16} />
                </button>
              </div>

              {/* Column Mapping */}
              <div className="space-y-3">
                <h3 className="text-sm font-medium text-gray-700 dark:text-gray-300">
                  Map Columns
                </h3>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                  {FIELD_OPTIONS.map((field) => (
                    <div key={field.key}>
                      <label className="mb-1 block text-xs font-medium text-gray-600 dark:text-gray-400">
                        {field.label}
                        {field.required && <span className="ml-0.5 text-red-500">*</span>}
                      </label>
                      <select
                        value={columnMapping[field.key] ?? ''}
                        onChange={(e) => handleMappingChange(field.key, e.target.value === '' ? '' : parseInt(e.target.value))}
                        className="w-full rounded-lg border border-gray-300 bg-white px-2.5 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                      >
                        <option value="">-- None --</option>
                        {parsedData.headers.map((header, index) => (
                          <option key={index} value={index}>
                            {header}
                          </option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
              </div>

              {/* Preview */}
              <div>
                <h3 className="mb-2 text-sm font-medium text-gray-700 dark:text-gray-300">
                  Preview
                </h3>
                <div className="overflow-x-auto rounded-lg border border-gray-200 dark:border-gray-700">
                  <table className="min-w-full divide-y divide-gray-200 text-sm dark:divide-gray-700">
                    <thead className="bg-gray-50 dark:bg-gray-800">
                      <tr>
                        {FIELD_OPTIONS.filter((f) => columnMapping[f.key] !== undefined).map((field) => (
                          <th
                            key={field.key}
                            className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-gray-500 dark:text-gray-400"
                          >
                            {field.label}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
                      {buildContacts().slice(0, 5).map((row, i) => (
                        <tr key={i}>
                          {FIELD_OPTIONS.filter((f) => columnMapping[f.key] !== undefined).map((field) => (
                            <td
                              key={field.key}
                              className="whitespace-nowrap px-3 py-2 text-gray-700 dark:text-gray-300"
                            >
                              {Array.isArray(row[field.key])
                                ? (row[field.key] as string[]).join(', ')
                                : (row[field.key] as string) || '-'}
                            </td>
                          ))}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                {parsedData.rows.length > 5 && (
                  <p className="mt-1 text-xs text-gray-500 dark:text-gray-400">
                    Showing 5 of {parsedData.rows.length} rows
                  </p>
                )}
              </div>

              {error && (
                <div className="rounded-lg border border-red-200 bg-red-50 p-3 text-sm text-red-700 dark:border-red-900 dark:bg-red-900/20 dark:text-red-400">
                  <div className="flex items-center gap-2">
                    <AlertCircle size={16} />
                    {error}
                  </div>
                </div>
              )}
            </div>
          )}

          {result && (
            <div className="space-y-4 text-center">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-green-100 text-green-600 dark:bg-green-900/30 dark:text-green-400">
                <Check size={24} />
              </div>
              <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
                Import Complete
              </h3>
              <div className="flex justify-center gap-4">
                <div className="rounded-lg bg-green-50 px-4 py-2 dark:bg-green-900/20">
                  <div className="text-lg font-bold text-green-700 dark:text-green-400">{result.created}</div>
                  <div className="text-xs text-green-600 dark:text-green-400">Created</div>
                </div>
                <div className="rounded-lg bg-blue-50 px-4 py-2 dark:bg-blue-900/20">
                  <div className="text-lg font-bold text-blue-700 dark:text-blue-400">{result.updated}</div>
                  <div className="text-xs text-blue-600 dark:text-blue-400">Updated</div>
                </div>
                {result.errors > 0 && (
                  <div className="rounded-lg bg-red-50 px-4 py-2 dark:bg-red-900/20">
                    <div className="text-lg font-bold text-red-700 dark:text-red-400">{result.errors}</div>
                    <div className="text-xs text-red-600 dark:text-red-400">Errors</div>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="flex shrink-0 justify-end gap-2 px-6 py-4">
          {result ? (
            <button onClick={handleClose} className="btn-primary">
              Done
            </button>
          ) : (
            <>
              <button onClick={handleClose} className="btn-secondary">
                Cancel
              </button>
              <button
                onClick={handleImport}
                disabled={loading || !mappedPhone}
                className="btn-primary"
              >
                {loading && <Loader2 size={16} className="animate-spin" />}
                {loading ? 'Importing...' : `Import ${buildContacts().length} Contacts`}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
