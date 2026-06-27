'use client';

import { useState, useEffect, useRef } from 'react';
import { X, Plus, Trash2, Upload } from 'lucide-react';
import { api } from '@/lib/api';

export type QuickMessageType = 'text' | 'image' | 'video' | 'document' | 'audio' | 'button' | 'list';

export interface QuickReplyFormData {
  id?: string;
  shortcut: string;
  content: string;
  messageType: QuickMessageType;
  metadata: {
    mediaUrl?: string;
    filename?: string;
    buttons?: { type: 'reply'; title: string; id?: string }[];
    listOptions?: {
      button: string;
      sections: { title: string; rows: { id: string; title: string; description?: string }[] }[];
    };
  };
}

interface QuickReplyDialogProps {
  open: boolean;
  data: Partial<QuickReplyFormData> | null;
  onClose: () => void;
  onSubmit: (data: QuickReplyFormData) => void;
}

const messageTypeLabels: Record<QuickMessageType, string> = {
  text: 'Text',
  image: 'Image',
  video: 'Video',
  document: 'Document',
  audio: 'Audio',
  button: 'Quick Reply',
  list: 'List Message',
};

const messageTypes: QuickMessageType[] = ['text', 'image', 'video', 'document', 'audio', 'button', 'list'];

const acceptMap: Record<string, string> = {
  image: 'image/*',
  video: 'video/*',
  document: '.pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx,.txt',
  audio: 'audio/*',
};

export default function QuickReplyDialog({ open, data, onClose, onSubmit }: QuickReplyDialogProps) {
  const [form, setForm] = useState<QuickReplyFormData>({
    shortcut: '',
    content: '',
    messageType: 'text',
    metadata: {},
  });
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState('');
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (data) {
      setForm({
        shortcut: data.shortcut || '',
        content: data.content || '',
        messageType: data.messageType || 'text',
        metadata: data.metadata || {},
      });
    } else {
      setForm({ shortcut: '', content: '', messageType: 'text', metadata: {} });
    }
    setUploading(false);
    setUploadError('');
  }, [data, open]);

  const setMetaField = (key: string, value: unknown) => {
    setForm((prev) => ({
      ...prev,
      metadata: { ...prev.metadata, [key]: value },
    }));
  };

  const addButton = () => {
    const buttons = form.metadata.buttons || [];
    setMetaField('buttons', [...buttons, { type: 'reply', title: '' }]);
  };

  const updateButton = (index: number, title: string) => {
    const buttons = [...(form.metadata.buttons || [])];
    buttons[index] = { ...buttons[index], title };
    setMetaField('buttons', buttons);
  };

  const removeButton = (index: number) => {
    const buttons = [...(form.metadata.buttons || [])];
    buttons.splice(index, 1);
    setMetaField('buttons', buttons);
  };

  const addListSection = () => {
    const sections = form.metadata.listOptions?.sections || [];
    setMetaField('listOptions', {
      ...form.metadata.listOptions,
      button: form.metadata.listOptions?.button || 'Options',
      sections: [...sections, { title: '', rows: [{ id: `row-${Date.now()}`, title: '' }] }],
    });
  };

  const updateListSectionTitle = (sectionIndex: number, title: string) => {
    const sections = [...(form.metadata.listOptions?.sections || [])];
    sections[sectionIndex] = { ...sections[sectionIndex], title };
    setMetaField('listOptions', { ...form.metadata.listOptions, sections });
  };

  const removeListSection = (sectionIndex: number) => {
    const sections = [...(form.metadata.listOptions?.sections || [])];
    sections.splice(sectionIndex, 1);
    setMetaField('listOptions', { ...form.metadata.listOptions, sections });
  };

  const addListRow = (sectionIndex: number) => {
    const sections = [...(form.metadata.listOptions?.sections || [])];
    sections[sectionIndex].rows = [...sections[sectionIndex].rows, { id: `row-${Date.now()}`, title: '' }];
    setMetaField('listOptions', { ...form.metadata.listOptions, sections });
  };

  const updateListRow = (sectionIndex: number, rowIndex: number, field: 'title' | 'description', value: string) => {
    const sections = [...(form.metadata.listOptions?.sections || [])];
    sections[sectionIndex].rows[rowIndex] = { ...sections[sectionIndex].rows[rowIndex], [field]: value };
    setMetaField('listOptions', { ...form.metadata.listOptions, sections });
  };

  const removeListRow = (sectionIndex: number, rowIndex: number) => {
    const sections = [...(form.metadata.listOptions?.sections || [])];
    sections[sectionIndex].rows.splice(rowIndex, 1);
    setMetaField('listOptions', { ...form.metadata.listOptions, sections });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setUploadError('');

    try {
      const formData = new FormData();
      formData.append('file', file);

      const res = await api.post('/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setMetaField('mediaUrl', res.data.url);
      if (form.messageType === 'document') {
        setMetaField('filename', file.name);
      }
    } catch {
      setUploadError('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const clearMedia = () => {
    setMetaField('mediaUrl', undefined);
    setMetaField('filename', undefined);
    setUploadError('');
  };

  const handleSubmit = () => {
    onSubmit(form);
  };

  const mediaRequired = ['image', 'video', 'document', 'audio'].includes(form.messageType);
  const hasMedia = !!form.metadata.mediaUrl;

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {data?.id ? 'Edit Quick Reply' : 'Create Quick Reply'}
          </h2>
          <button onClick={onClose} className="rounded-lg p-1 text-gray-400 hover:bg-gray-100 hover:text-gray-600">
            <X size={20} />
          </button>
        </div>

        <div className="flex flex-col gap-4">
          {/* Shortcut */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Shortcut</label>
            <input
              type="text"
              value={form.shortcut}
              onChange={(e) => setForm((prev) => ({ ...prev, shortcut: e.target.value }))}
              required
              placeholder="/welcome"
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>

          {/* Message Type */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Message Type</label>
            <select
              value={form.messageType}
              onChange={(e) => setForm((prev) => ({ ...prev, messageType: e.target.value as QuickMessageType, metadata: {} }))}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
            >
              {messageTypes.map((t) => (
                <option key={t} value={t}>{messageTypeLabels[t]}</option>
              ))}
            </select>
          </div>

          {/* Content / Caption */}
          <div>
            <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
              {['image', 'video', 'document', 'audio'].includes(form.messageType) ? 'Caption (optional)' :
               form.messageType === 'button' ? 'Body Text' :
               form.messageType === 'list' ? 'Body Text' : 'Content'}
            </label>
            <textarea
              value={form.content}
              onChange={(e) => setForm((prev) => ({ ...prev, content: e.target.value }))}
              required
              rows={3}
              className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
            />
          </div>

          {/* Media Upload */}
          {mediaRequired && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">
                {messageTypeLabels[form.messageType]} File
              </label>
              <input
                ref={fileInputRef}
                type="file"
                accept={acceptMap[form.messageType] || '*/*'}
                className="hidden"
                onChange={handleFileSelect}
              />

              {!hasMedia && (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="flex w-full items-center justify-center gap-2 rounded-lg border border-dashed border-gray-300 px-4 py-6 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800 disabled:opacity-50"
                >
                  <Upload size={18} />
                  {uploading ? 'Uploading...' : `Upload ${messageTypeLabels[form.messageType]}`}
                </button>
              )}

              {hasMedia && (
                <div className="flex items-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 dark:border-gray-700 dark:bg-gray-800">
                  <span className="flex-1 truncate text-sm text-gray-700 dark:text-gray-300">
                    {form.metadata.filename || form.metadata.mediaUrl}
                  </span>
                  <button
                    type="button"
                    onClick={clearMedia}
                    className="rounded-md p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    title="Remove file"
                  >
                    <Trash2 size={14} />
                  </button>
                </div>
              )}

              {uploadError && (
                <p className="mt-1 text-xs text-red-500">{uploadError}</p>
              )}
            </div>
          )}

          {/* Quick Reply Buttons */}
          {form.messageType === 'button' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Buttons</label>
              <div className="space-y-2">
                {(form.metadata.buttons || []).map((btn, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={btn.title}
                      onChange={(e) => updateButton(idx, e.target.value)}
                      placeholder={`Button ${idx + 1}`}
                      className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
                    />
                    <button
                      onClick={() => removeButton(idx)}
                      className="rounded-lg p-2 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
                <button
                  onClick={addButton}
                  className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <Plus size={16} />
                  Add Button
                </button>
              </div>
            </div>
          )}

          {/* List Message */}
          {form.messageType === 'list' && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">List Options</label>
              <div className="space-y-4">
                <div>
                  <label className="mb-1 block text-xs text-gray-500 dark:text-gray-400">Button Label</label>
                  <input
                    type="text"
                    value={form.metadata.listOptions?.button || ''}
                    onChange={(e) => setMetaField('listOptions', { ...form.metadata.listOptions, button: e.target.value })}
                    placeholder="Options"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
                  />
                </div>
                {(form.metadata.listOptions?.sections || []).map((section, sIdx) => (
                  <div key={sIdx} className="rounded-lg border border-gray-200 p-3 dark:border-gray-700">
                    <div className="mb-2 flex items-center justify-between">
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) => updateListSectionTitle(sIdx, e.target.value)}
                        placeholder="Section Title"
                        className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                      />
                      <button
                        onClick={() => removeListSection(sIdx)}
                        className="ml-2 rounded-lg p-1.5 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                    <div className="space-y-2 pl-2">
                      {section.rows.map((row, rIdx) => (
                        <div key={row.id} className="flex items-center gap-2">
                          <input
                            type="text"
                            value={row.title}
                            onChange={(e) => updateListRow(sIdx, rIdx, 'title', e.target.value)}
                            placeholder="Row Title"
                            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                          />
                          <input
                            type="text"
                            value={row.description || ''}
                            onChange={(e) => updateListRow(sIdx, rIdx, 'description', e.target.value)}
                            placeholder="Description"
                            className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                          />
                          <button
                            onClick={() => removeListRow(sIdx, rIdx)}
                            className="rounded-lg p-1 text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20"
                          >
                            <Trash2 size={14} />
                          </button>
                        </div>
                      ))}
                      <button
                        onClick={() => addListRow(sIdx)}
                        className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-1.5 text-xs text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                      >
                        <Plus size={14} />
                        Add Row
                      </button>
                    </div>
                  </div>
                ))}
                <button
                  onClick={addListSection}
                  className="flex items-center gap-1 rounded-lg border border-dashed border-gray-300 px-3 py-2 text-sm text-gray-600 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-400 dark:hover:bg-gray-800"
                >
                  <Plus size={16} />
                  Add Section
                </button>
              </div>
            </div>
          )}

          <div className="mt-2 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-lg border border-gray-300 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 dark:border-gray-700 dark:text-gray-300 dark:hover:bg-gray-800"
            >
              Cancel
            </button>
            <button
              onClick={handleSubmit}
              disabled={mediaRequired && !hasMedia}
              className="rounded-lg bg-primary-600 px-4 py-2 text-sm font-medium text-white hover:bg-primary-700 disabled:opacity-50"
            >
              Save
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
