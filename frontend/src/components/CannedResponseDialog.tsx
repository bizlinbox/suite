'use client';

import { useState, useEffect } from 'react';
import { X, Plus, Trash2 } from 'lucide-react';

export type CannedMessageType = 'text' | 'image' | 'video' | 'document' | 'audio' | 'button' | 'list';

export interface CannedResponseFormData {
  id?: string;
  shortcut: string;
  content: string;
  messageType: CannedMessageType;
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

interface CannedResponseDialogProps {
  open: boolean;
  data: Partial<CannedResponseFormData> | null;
  onClose: () => void;
  onSubmit: (data: CannedResponseFormData) => void;
}

const messageTypeLabels: Record<CannedMessageType, string> = {
  text: 'Text',
  image: 'Image',
  video: 'Video',
  document: 'Document',
  audio: 'Audio',
  button: 'Quick Reply',
  list: 'List Message',
};

const messageTypes: CannedMessageType[] = ['text', 'image', 'video', 'document', 'audio', 'button', 'list'];

export default function CannedResponseDialog({ open, data, onClose, onSubmit }: CannedResponseDialogProps) {
  const [form, setForm] = useState<CannedResponseFormData>({
    shortcut: '',
    content: '',
    messageType: 'text',
    metadata: {},
  });

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

  const handleSubmit = () => {
    onSubmit(form);
  };

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
      <div className="mx-4 w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-xl bg-white dark:bg-gray-900 p-6 shadow-xl">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
            {data?.id ? 'Edit Canned Response' : 'Create Canned Response'}
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
              onChange={(e) => setForm((prev) => ({ ...prev, messageType: e.target.value as CannedMessageType, metadata: {} }))}
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

          {/* Media URL */}
          {['image', 'video', 'document', 'audio'].includes(form.messageType) && (
            <div>
              <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Media URL</label>
              <input
                type="url"
                value={form.metadata.mediaUrl || ''}
                onChange={(e) => setMetaField('mediaUrl', e.target.value)}
                required
                placeholder="https://example.com/image.jpg"
                className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
              />
              {form.messageType === 'document' && (
                <div className="mt-2">
                  <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">Filename (optional)</label>
                  <input
                    type="text"
                    value={form.metadata.filename || ''}
                    onChange={(e) => setMetaField('filename', e.target.value)}
                    placeholder="document.pdf"
                    className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
                  />
                </div>
              )}
            </div>
          )}

          {/* Quick Reply Buttons */}
          {form.messageType === 'button' && (
            <div>
              <div className="mb-2 flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Buttons</label>
                <button
                  onClick={addButton}
                  className="flex items-center gap-1 rounded-md bg-[#25D366] px-2 py-1 text-xs font-medium text-white hover:bg-[#128C7E]"
                >
                  <Plus size={14} /> Add
                </button>
              </div>
              <div className="space-y-2">
                {(form.metadata.buttons || []).map((btn, index) => (
                  <div key={index} className="flex items-center gap-2">
                    <input
                      type="text"
                      value={btn.title}
                      onChange={(e) => updateButton(index, e.target.value)}
                      placeholder={`Button ${index + 1} text`}
                      className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                    />
                    <button onClick={() => removeButton(index)} className="rounded-md p-1.5 text-red-500 hover:bg-red-50">
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))}
                {(form.metadata.buttons || []).length === 0 && (
                  <p className="text-sm text-gray-400">No buttons added yet</p>
                )}
              </div>
            </div>
          )}

          {/* List Message */}
          {form.messageType === 'list' && (
            <div className="space-y-4">
              <div>
                <label className="mb-1 block text-sm font-medium text-gray-700 dark:text-gray-300">List Button Text</label>
                <input
                  type="text"
                  value={form.metadata.listOptions?.button || 'Options'}
                  onChange={(e) => setMetaField('listOptions', { ...form.metadata.listOptions, button: e.target.value })}
                  placeholder="Options"
                  className="w-full rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary-600"
                />
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Sections</label>
                  <button
                    onClick={addListSection}
                    className="flex items-center gap-1 rounded-md bg-[#25D366] px-2 py-1 text-xs font-medium text-white hover:bg-[#128C7E]"
                  >
                    <Plus size={14} /> Add Section
                  </button>
                </div>
                <div className="space-y-3">
                  {(form.metadata.listOptions?.sections || []).map((section, sIdx) => (
                    <div key={sIdx} className="rounded-lg border border-gray-200 dark:border-gray-700 p-3">
                      <div className="mb-2 flex items-center gap-2">
                        <input
                          type="text"
                          value={section.title}
                          onChange={(e) => updateListSectionTitle(sIdx, e.target.value)}
                          placeholder="Section title"
                          className="flex-1 rounded-lg border border-gray-300 dark:border-gray-700 px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                        />
                        <button onClick={() => removeListSection(sIdx)} className="rounded-md p-1 text-red-500 hover:bg-red-50">
                          <Trash2 size={14} />
                        </button>
                      </div>
                      <div className="space-y-1.5 pl-2">
                        {section.rows.map((row, rIdx) => (
                          <div key={rIdx} className="flex items-center gap-2">
                            <input
                              type="text"
                              value={row.title}
                              onChange={(e) => updateListRow(sIdx, rIdx, 'title', e.target.value)}
                              placeholder="Row title"
                              className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                            />
                            <input
                              type="text"
                              value={row.description || ''}
                              onChange={(e) => updateListRow(sIdx, rIdx, 'description', e.target.value)}
                              placeholder="Description (optional)"
                              className="flex-1 rounded-md border border-gray-300 dark:border-gray-700 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-primary-600"
                            />
                            <button onClick={() => removeListRow(sIdx, rIdx)} className="rounded-md p-1 text-red-500 hover:bg-red-50">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))}
                        <button
                          onClick={() => addListRow(sIdx)}
                          className="flex items-center gap-1 rounded-md px-2 py-1 text-xs text-[#25D366] hover:bg-[#25D366]/10"
                        >
                          <Plus size={12} /> Add Row
                        </button>
                      </div>
                    </div>
                  ))}
                  {(form.metadata.listOptions?.sections || []).length === 0 && (
                    <p className="text-sm text-gray-400">No sections added yet</p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="rounded-lg border border-gray-300 dark:border-gray-700 bg-white dark:bg-gray-900 px-4 py-2 text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-800"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            className="rounded-lg bg-[#25D366] px-4 py-2 text-white hover:bg-[#128C7E]"
          >
            {data?.id ? 'Update' : 'Create'}
          </button>
        </div>
      </div>
    </div>
  );
}
