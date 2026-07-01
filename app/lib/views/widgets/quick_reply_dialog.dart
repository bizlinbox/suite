import 'package:flutter/material.dart';
import 'package:file_picker/file_picker.dart';
import 'package:dio/dio.dart';
import '../../core/di.dart';
import '../../core/services/api_service.dart';
import '../../data/models/quick_reply_model.dart';
import 'custom/custom_widgets.dart';

class QuickReplyDialog extends StatefulWidget {
  final QuickReply? quickReply;
  final void Function(Map<String, dynamic> payload, String? id) onSave;

  const QuickReplyDialog({
    super.key,
    this.quickReply,
    required this.onSave,
  });

  @override
  State<QuickReplyDialog> createState() => _QuickReplyDialogState();
}

typedef QuickMessageType = String;

const List<QuickMessageType> _messageTypes = [
  'text',
  'image',
  'video',
  'document',
  'audio',
  'button',
  'list',
];

const Map<String, String> _messageTypeLabels = {
  'text': 'Text',
  'image': 'Image',
  'video': 'Video',
  'document': 'Document',
  'audio': 'Audio',
  'button': 'Quick Reply',
  'list': 'List Message',
};



class _ButtonItem {
  String title;
  String? id;
  _ButtonItem({this.title = '', this.id});
}

class _ListRow {
  String id;
  String title;
  String? description;
  _ListRow({required this.id, this.title = '', this.description});
}

class _ListSection {
  String title;
  final List<_ListRow> rows;
  _ListSection({this.title = '', List<_ListRow>? rows}) : rows = rows ?? [];
}

class _QuickReplyDialogState extends State<QuickReplyDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _shortcutController;
  late final TextEditingController _contentController;
  late String _messageType;

  // Media
  String? _mediaUrl;
  String? _filename;
  bool _uploading = false;
  String? _uploadError;

  // Buttons
  final List<_ButtonItem> _buttons = [];

  // List
  final TextEditingController _listButtonController = TextEditingController();
  final List<_ListSection> _listSections = [];

  bool get _mediaRequired =>
      ['image', 'video', 'document', 'audio'].contains(_messageType);

  @override
  void initState() {
    super.initState();
    final qr = widget.quickReply;
    _shortcutController = TextEditingController(text: qr?.shortcut ?? '');
    _contentController = TextEditingController(text: qr?.content ?? '');
    _messageType = qr?.messageType ?? 'text';

    final meta = qr?.metadata ?? {};
    _mediaUrl = meta['mediaUrl'] as String?;
    _filename = meta['filename'] as String?;

    final buttons = meta['buttons'] as List<dynamic>?;
    if (buttons != null) {
      for (final b in buttons) {
        final map = b as Map<String, dynamic>;
        _buttons.add(_ButtonItem(
          title: map['title'] as String? ?? '',
          id: map['id'] as String?,
        ));
      }
    }

    final listOptions = meta['listOptions'] as Map<String, dynamic>?;
    if (listOptions != null) {
      _listButtonController.text = listOptions['button'] as String? ?? '';
      final sections = listOptions['sections'] as List<dynamic>?;
      if (sections != null) {
        for (final s in sections) {
          final sMap = s as Map<String, dynamic>;
          final section = _ListSection(title: sMap['title'] as String? ?? '');
          final rows = sMap['rows'] as List<dynamic>?;
          if (rows != null) {
            for (final r in rows) {
              final rMap = r as Map<String, dynamic>;
              section.rows.add(_ListRow(
                id: rMap['id'] as String? ?? '',
                title: rMap['title'] as String? ?? '',
                description: rMap['description'] as String?,
              ));
            }
          }
          _listSections.add(section);
        }
      }
    }
  }

  @override
  void dispose() {
    _shortcutController.dispose();
    _contentController.dispose();
    _listButtonController.dispose();
    super.dispose();
  }

  void _clearMedia() {
    setState(() {
      _mediaUrl = null;
      _filename = null;
      _uploadError = null;
    });
  }

  Future<void> _pickAndUploadFile() async {
    FileType type;
    List<String>? extensions;
    switch (_messageType) {
      case 'image':
        type = FileType.image;
        break;
      case 'video':
        type = FileType.video;
        break;
      case 'audio':
        type = FileType.audio;
        break;
      case 'document':
        type = FileType.custom;
        extensions = ['pdf', 'doc', 'docx', 'xls', 'xlsx', 'ppt', 'pptx', 'txt'];
        break;
      default:
        type = FileType.any;
    }

    final result = await FilePicker.platform.pickFiles(
      type: type,
      allowedExtensions: extensions,
      withData: true,
    );
    if (result == null || result.files.isEmpty) return;
    final file = result.files.first;
    if (file.bytes == null && file.path == null) return;

    setState(() {
      _uploading = true;
      _uploadError = null;
    });

    try {
      final api = locator<ApiService>();
      late FormData formData;
      if (file.bytes != null) {
        formData = FormData.fromMap({
          'file': MultipartFile.fromBytes(file.bytes!, filename: file.name),
        });
      } else if (file.path != null) {
        formData = FormData.fromMap({
          'file': await MultipartFile.fromFile(file.path!, filename: file.name),
        });
      } else {
        throw Exception('Unable to read file');
      }

      final res = await api.client.post('/upload', data: formData);
      final url = res.data['url'] ?? res.data['fileUrl'] ?? res.data['mediaUrl'];
      if (url == null) throw Exception('Upload response missing url');

      setState(() {
        _mediaUrl = url as String;
        if (_messageType == 'document') {
          _filename = file.name;
        }
      });
    } catch (e) {
      setState(() => _uploadError = 'Upload failed. Please try again.');
    } finally {
      setState(() => _uploading = false);
    }
  }

  void _addButton() {
    setState(() => _buttons.add(_ButtonItem()));
  }

  void _removeButton(int index) {
    setState(() => _buttons.removeAt(index));
  }

  void _addListSection() {
    setState(() => _listSections.add(_ListSection(
      rows: [_ListRow(id: 'row-${DateTime.now().millisecondsSinceEpoch}')],
    )));
  }

  void _removeListSection(int index) {
    setState(() => _listSections.removeAt(index));
  }

  void _addListRow(int sectionIndex) {
    setState(() => _listSections[sectionIndex].rows.add(
      _ListRow(id: 'row-${DateTime.now().millisecondsSinceEpoch}'),
    ));
  }

  void _removeListRow(int sectionIndex, int rowIndex) {
    setState(() => _listSections[sectionIndex].rows.removeAt(rowIndex));
  }

  String _getContentLabel() {
    if (['image', 'video', 'document', 'audio'].contains(_messageType)) {
      return 'Caption (optional)';
    }
    if (_messageType == 'button' || _messageType == 'list') {
      return 'Body Text';
    }
    return 'Content';
  }

  void _submit() {
    if (!_formKey.currentState!.validate()) return;
    if (_mediaRequired && (_mediaUrl == null || _mediaUrl!.isEmpty)) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Please upload a media file')),
      );
      return;
    }

    final metadata = <String, dynamic>{};
    if (_mediaUrl != null && _mediaUrl!.isNotEmpty) {
      metadata['mediaUrl'] = _mediaUrl;
      if (_filename != null && _filename!.isNotEmpty) {
        metadata['filename'] = _filename;
      }
    }

    if (_messageType == 'button') {
      metadata['buttons'] = _buttons
          .where((b) => b.title.isNotEmpty)
          .map((b) => {
                'type': 'reply',
                'title': b.title,
                if (b.id != null && b.id!.isNotEmpty) 'id': b.id,
              })
          .toList();
    }

    if (_messageType == 'list') {
      metadata['listOptions'] = {
        'button': _listButtonController.text.trim().isEmpty
            ? 'Options'
            : _listButtonController.text.trim(),
        'sections': _listSections.map((s) => {
          'title': s.title,
          'rows': s.rows.map((r) => {
            'id': r.id,
            'title': r.title,
            if (r.description != null && r.description!.isNotEmpty)
              'description': r.description,
          }).toList(),
        }).toList(),
      };
    }

    final payload = <String, dynamic>{
      'shortcut': _shortcutController.text.trim(),
      'content': _contentController.text.trim(),
      'messageType': _messageType,
      'metadata': metadata,
    };

    widget.onSave(payload, widget.quickReply?.id);
    Navigator.of(context).pop();
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.quickReply != null;

    return AppAlertDialog(
      title: Text(isEdit ? 'Edit Quick Reply' : 'Create Quick Reply'),
      content: SizedBox(
        width: 600,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                TextFormField(
                  controller: _shortcutController,
                  decoration: const InputDecoration(
                    labelText: 'Shortcut',
                    hintText: '/welcome',
                    border: OutlineInputBorder(),
                  ),
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                AppDropdown<String>(
                  initialValue: _messageType,
                  decoration: const InputDecoration(
                    labelText: 'Message Type',
                    border: OutlineInputBorder(),
                  ),
                  items: _messageTypes
                      .map((t) => DropdownMenuItem(
                            value: t,
                            child: Text(_messageTypeLabels[t] ?? t),
                          ))
                      .toList(),
                  onChanged: (v) {
                    if (v != null && v != _messageType) {
                      setState(() {
                        _messageType = v;
                        _mediaUrl = null;
                        _filename = null;
                        _uploadError = null;
                        _buttons.clear();
                        _listSections.clear();
                        _listButtonController.clear();
                      });
                    }
                  },
                ),
                const SizedBox(height: 12),
                TextFormField(
                  controller: _contentController,
                  decoration: InputDecoration(
                    labelText: _getContentLabel(),
                    border: const OutlineInputBorder(),
                  ),
                  maxLines: 3,
                  validator: (v) =>
                      v == null || v.trim().isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 12),
                if (_mediaRequired) _buildMediaUpload(),
                if (_messageType == 'button') _buildButtonsSection(),
                if (_messageType == 'list') _buildListSection(),
              ],
            ),
          ),
        ),
      ),
      actions: [
        AppButton(variant: AppButtonVariant.ghost, 
          onPressed: () => Navigator.of(context).pop(),
          child: const Text('Cancel'),
        ),
        AppButton(variant: AppButtonVariant.primary, 
          onPressed: _uploading ? null : _submit,
          child: const Text('Save'),
        ),
      ],
    );
  }

  Widget _buildMediaUpload() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          '${_messageTypeLabels[_messageType]} File',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 8),
        if (_mediaUrl == null || _mediaUrl!.isEmpty)
          GestureDetector(
            onTap: _uploading ? null : _pickAndUploadFile,
            child: Container(
              width: double.infinity,
              padding: const EdgeInsets.symmetric(vertical: 16),
              decoration: BoxDecoration(
                border: Border.all(
                  color: Theme.of(context).colorScheme.outline,
                  style: BorderStyle.solid,
                ),
                borderRadius: BorderRadius.circular(8),
              ),
              child: Column(
                children: [
                  Icon(
                    Icons.upload_file,
                    color: Theme.of(context).colorScheme.primary,
                  ),
                  const SizedBox(height: 4),
                  Text(
                    _uploading
                        ? 'Uploading...'
                        : 'Upload ${_messageTypeLabels[_messageType]}',
                    style: Theme.of(context).textTheme.bodyMedium,
                  ),
                  if (_uploading)
                    const Padding(
                      padding: EdgeInsets.only(top: 8, left: 24, right: 24),
                      child: LinearProgressIndicator(),
                    ),
                ],
              ),
            ),
          )
        else
          Container(
            padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
            decoration: BoxDecoration(
              border: Border.all(
                color: Theme.of(context).colorScheme.outlineVariant,
              ),
              borderRadius: BorderRadius.circular(8),
            ),
            child: Row(
              children: [
                Expanded(
                  child: Text(
                    _filename ?? _mediaUrl!,
                    style: Theme.of(context).textTheme.bodyMedium,
                    overflow: TextOverflow.ellipsis,
                  ),
                ),
                AppIconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.red),
                  onPressed: _clearMedia,
                  tooltip: 'Remove file',
                ),
              ],
            ),
          ),
        if (_uploadError != null)
          Padding(
            padding: const EdgeInsets.only(top: 4),
            child: Text(
              _uploadError!,
              style: TextStyle(
                color: Theme.of(context).colorScheme.error,
                fontSize: 12,
              ),
            ),
          ),
        const SizedBox(height: 12),
      ],
    );
  }

  Widget _buildButtonsSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'Buttons',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 8),
        ..._buttons.asMap().entries.map((entry) {
          final index = entry.key;
          final btn = entry.value;
          return Padding(
            padding: const EdgeInsets.only(bottom: 8),
            child: Row(
              children: [
                Expanded(
                  child: TextFormField(
                    initialValue: btn.title,
                    decoration: InputDecoration(
                      hintText: 'Button ${index + 1}',
                      border: const OutlineInputBorder(),
                      contentPadding: const EdgeInsets.symmetric(
                        horizontal: 12,
                        vertical: 12,
                      ),
                    ),
                    onChanged: (v) => btn.title = v,
                  ),
                ),
                const SizedBox(width: 8),
                AppIconButton(
                  icon: const Icon(Icons.delete_outline, color: Colors.red),
                  onPressed: () => _removeButton(index),
                ),
              ],
            ),
          );
        }),
        OutlinedButton.icon(
          onPressed: _addButton,
          icon: const Icon(Icons.add),
          label: const Text('Add Button'),
        ),
        const SizedBox(height: 12),
      ],
    );
  }

  Widget _buildListSection() {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          'List Options',
          style: Theme.of(context).textTheme.titleSmall,
        ),
        const SizedBox(height: 8),
        TextFormField(
          controller: _listButtonController,
          decoration: const InputDecoration(
            labelText: 'Button Label',
            hintText: 'Options',
            border: OutlineInputBorder(),
          ),
        ),
        const SizedBox(height: 12),
        ..._listSections.asMap().entries.map((sEntry) {
          final sIndex = sEntry.key;
          final section = sEntry.value;
          return AppCard(
            margin: const EdgeInsets.only(bottom: 12),
            child: Padding(
              padding: const EdgeInsets.all(12),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Row(
                    children: [
                      Expanded(
                        child: TextFormField(
                          initialValue: section.title,
                          decoration: const InputDecoration(
                            hintText: 'Section Title',
                            border: OutlineInputBorder(),
                            contentPadding: EdgeInsets.symmetric(
                              horizontal: 12,
                              vertical: 12,
                            ),
                          ),
                          onChanged: (v) => section.title = v,
                        ),
                      ),
                      const SizedBox(width: 8),
                      AppIconButton(
                        icon: const Icon(Icons.delete_outline,
                            color: Colors.red),
                        onPressed: () => _removeListSection(sIndex),
                      ),
                    ],
                  ),
                  const SizedBox(height: 8),
                  ...section.rows.asMap().entries.map((rEntry) {
                    final rIndex = rEntry.key;
                    final row = rEntry.value;
                    return Padding(
                      padding: const EdgeInsets.only(bottom: 8, left: 8),
                      child: Row(
                        children: [
                          Expanded(
                            child: TextFormField(
                              initialValue: row.title,
                              decoration: const InputDecoration(
                                hintText: 'Row Title',
                                border: OutlineInputBorder(),
                                contentPadding: EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 12,
                                ),
                              ),
                              onChanged: (v) => row.title = v,
                            ),
                          ),
                          const SizedBox(width: 8),
                          Expanded(
                            child: TextFormField(
                              initialValue: row.description,
                              decoration: const InputDecoration(
                                hintText: 'Description',
                                border: OutlineInputBorder(),
                                contentPadding: EdgeInsets.symmetric(
                                  horizontal: 12,
                                  vertical: 12,
                                ),
                              ),
                              onChanged: (v) => row.description = v,
                            ),
                          ),
                          const SizedBox(width: 8),
                          AppIconButton(
                            icon: const Icon(Icons.delete_outline,
                                color: Colors.red),
                            onPressed: () => _removeListRow(sIndex, rIndex),
                          ),
                        ],
                      ),
                    );
                  }),
                  Padding(
                    padding: const EdgeInsets.only(left: 8),
                    child: OutlinedButton.icon(
                      onPressed: () => _addListRow(sIndex),
                      icon: const Icon(Icons.add),
                      label: const Text('Add Row'),
                    ),
                  ),
                ],
              ),
            ),
          );
        }),
        OutlinedButton.icon(
          onPressed: _addListSection,
          icon: const Icon(Icons.add),
          label: const Text('Add Section'),
        ),
        const SizedBox(height: 12),
      ],
    );
  }
}