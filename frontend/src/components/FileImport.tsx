'use client';

import { useState, useRef } from 'react';
import { LuUpload as Upload, LuFileText as FileText, LuX as X, LuLoader as Loader2 } from 'react-icons/lu';
import { parseFile, ParsedData, convertToRecipients } from '@/lib/fileParser';

interface FileImportProps {
  onRecipientsImported: (recipients: Array<{ phone: string; variables: Record<string, string> }>) => void;
  templateVariables?: string[];
}

export default function FileImport({ onRecipientsImported, templateVariables = [] }: FileImportProps) {
  const [file, setFile] = useState<File | null>(null);
  const [parsedData, setParsedData] = useState<ParsedData | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [phoneColumnIndex, setPhoneColumnIndex] = useState<number>(0);
  const [variableMapping, setVariableMapping] = useState<Record<number, string>>({});
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileSelect = async (selectedFile: File) => {
    setFile(selectedFile);
    setLoading(true);
    setError(null);
    setParsedData(null);

    const result = await parseFile(selectedFile);

    if (result.success && result.data) {
      setParsedData(result.data);
      // Initialize variable mapping
      const mapping: Record<number, string> = {};
      templateVariables.forEach((varName, index) => {
        mapping[index + 1] = varName; // +1 to skip phone column
      });
      setVariableMapping(mapping);
    } else {
      setError(result.error || 'Failed to parse file');
      setFile(null);
    }

    setLoading(false);
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
    setFile(null);
    setParsedData(null);
    setError(null);
    setVariableMapping({});
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const handleImport = () => {
    if (!parsedData) return;

    try {
      const recipients = convertToRecipients(parsedData, phoneColumnIndex, variableMapping);
      onRecipientsImported(recipients);
      handleRemoveFile();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to import recipients');
    }
  };

  const handleVariableMappingChange = (colIndex: number, varName: string) => {
    setVariableMapping((prev) => ({
      ...prev,
      [colIndex]: varName,
    }));
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center rounded-lg border-2 border-dashed border-gray-300 p-8 dark:border-gray-700">
        <Loader2 size={24} className="animate-spin text-gray-400" />
        <span className="ml-2 text-sm text-gray-600 dark:text-gray-400">Parsing file...</span>
      </div>
    );
  }

  if (!file) {
    return (
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
    );
  }

  if (error) {
    return (
      <div className="rounded-lg border border-red-200 bg-red-50 p-4 dark:border-red-900 dark:bg-red-900/20">
        <p className="text-sm text-red-800 dark:text-red-400">{error}</p>
        <button
          onClick={handleRemoveFile}
          className="mt-2 text-sm text-red-700 underline dark:text-red-400"
        >
          Try again
        </button>
      </div>
    );
  }

  if (!parsedData) {
    return null;
  }

  return (
    <div className="space-y-4">
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
      <div className="space-y-2">
        <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
          Phone Number Column
        </label>
        <select
          value={phoneColumnIndex}
          onChange={(e) => setPhoneColumnIndex(parseInt(e.target.value))}
          className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
        >
          {parsedData.headers.map((header, index) => (
            <option key={index} value={index}>
              Column {index + 1}: {header}
            </option>
          ))}
        </select>
      </div>

      {templateVariables.length > 0 && (
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
            Map Template Variables
          </label>
          <div className="space-y-2">
            {templateVariables.map((varName) => (
              <div key={varName} className="flex items-center gap-2">
                <span className="w-24 text-sm text-gray-600 dark:text-gray-400">
                  {varName}
                </span>
                <span className="text-gray-400">→</span>
                <select
                  value={Object.entries(variableMapping).find(([_, v]) => v === varName)?.[0] || ''}
                  onChange={(e) => {
                    const colIndex = parseInt(e.target.value);
                    handleVariableMappingChange(colIndex, varName);
                  }}
                  className="flex-1 rounded-lg border border-gray-300 px-3 py-2 text-sm dark:border-gray-700 dark:bg-gray-900 dark:text-gray-100"
                >
                  <option value="">-- Select Column --</option>
                  {parsedData.headers.map((header, index) => (
                    <option key={index} value={index}>
                      Column {index + 1}: {header}
                    </option>
                  ))}
                </select>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Preview */}
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className="bg-gray-50 dark:bg-gray-800">
            <tr>
              {parsedData.headers.map((header, index) => (
                <th
                  key={index}
                  className={`px-3 py-2 text-left text-xs font-medium uppercase tracking-wider ${
                    index === phoneColumnIndex
                      ? 'bg-primary-100 text-primary-700 dark:bg-primary-900/30 dark:text-primary-400'
                      : 'text-gray-500 dark:text-gray-400'
                  }`}
                >
                  {header}
                  {index === phoneColumnIndex && ' (Phone)'}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200 bg-white dark:divide-gray-700 dark:bg-gray-900">
            {parsedData.rows.slice(0, 5).map((row, rowIndex) => (
              <tr key={rowIndex}>
                {row.map((cell, cellIndex) => (
                  <td
                    key={cellIndex}
                    className={`whitespace-nowrap px-3 py-2 text-sm ${
                      cellIndex === phoneColumnIndex
                        ? 'font-medium text-gray-900 dark:text-gray-100'
                        : 'text-gray-500 dark:text-gray-400'
                    }`}
                  >
                    {cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
        {parsedData.rows.length > 5 && (
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Showing 5 of {parsedData.rows.length} rows
          </p>
        )}
      </div>

      <button
        onClick={handleImport}
        className="w-full rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-primary-700"
      >
        Import {parsedData.rows.length} Recipients
      </button>
    </div>
  );
}
