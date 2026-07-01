import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../core/utils/result.dart';
import '../../data/models/campaign_model.dart';
import '../../data/models/contact_model.dart';
import '../../data/models/template_model.dart';
import '../../data/repositories/campaign_repository.dart';
import '../../data/repositories/contact_repository.dart';
import '../../data/repositories/settings_repository.dart';
import '../../viewmodels/base_viewmodel.dart';
import '../widgets/custom/custom_widgets.dart';

class CampaignFormViewModel extends BaseViewModel {
  final CampaignRepository _campaignRepo;
  final SettingsRepository _settingsRepo;
  final ContactRepository _contactRepo;

  CampaignFormViewModel(this._campaignRepo, this._settingsRepo, this._contactRepo);

  List<Template> _templates = [];
  List<Template> get templates => _templates;

  List<Contact> _contacts = [];
  List<Contact> get contacts => _contacts;

  Campaign? _campaign;
  Campaign? get campaign => _campaign;

  Future<void> loadData({Campaign? existing}) async {
    _campaign = existing;
    setBusy();
    try {
      final templatesResult = await _settingsRepo.getTemplates();
      templatesResult.when(
        success: (data) => _templates = data.where((t) => t.status == 'APPROVED').toList(),
        error: (message, exception) {},
      );
      final contactsResult = await _contactRepo.getContacts();
      contactsResult.when(
        success: (data) => _contacts = data,
        error: (message, exception) {},
      );
    } catch (e) {
      setError(e.toString());
    }
    setIdle();
  }

  Future<Result<Campaign>> save(Map<String, dynamic> payload, {String? id}) async {
    setBusy();
    final result = id != null
        ? await _campaignRepo.updateCampaign(id, payload)
        : await _campaignRepo.createCampaign(payload);
    result.when(
      success: (_) => setSuccess(),
      error: (message, exception) => setError(message),
    );
    setIdle();
    return result;
  }
}

class CampaignFormScreen extends StatelessWidget {
  final Campaign? campaign;
  const CampaignFormScreen({super.key, this.campaign});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => CampaignFormViewModel(
        locator<CampaignRepository>(),
        locator<SettingsRepository>(),
        locator<ContactRepository>(),
      )..loadData(existing: campaign),
      child: _CampaignFormBody(campaign: campaign),
    );
  }
}

class _CampaignFormBody extends StatefulWidget {
  final Campaign? campaign;
  const _CampaignFormBody({this.campaign});

  @override
  State<_CampaignFormBody> createState() => _CampaignFormBodyState();
}

class _CampaignFormBodyState extends State<_CampaignFormBody> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _contentController;
  late final TextEditingController _scheduledDateController;
  String? _messageType;
  String? _selectedTemplateName;
  String? _status;
  DateTime? _scheduledAt;
  final List<String> _templateVariables = [];
  final List<TextEditingController> _variableControllers = [];
  final List<String> _selectedContactIds = [];

  final List<String> _messageTypes = ['utility', 'marketing'];
  final List<String> _statuses = ['draft', 'scheduled', 'running', 'paused', 'completed', 'cancelled'];

  @override
  void initState() {
    super.initState();
    final c = widget.campaign;
    _nameController = TextEditingController(text: c?.name ?? '');
    _contentController = TextEditingController(text: c?.content ?? '');
    _messageType = c?.messageType ?? 'utility';
    _selectedTemplateName = c?.templateName;
    _status = c?.status ?? 'draft';
    if (c?.scheduledAt != null) {
      _scheduledAt = DateTime.tryParse(c!.scheduledAt!);
      _scheduledDateController = TextEditingController(
        text: _scheduledAt != null
            ? '${_scheduledAt!.year}-${_scheduledAt!.month.toString().padLeft(2, '0')}-${_scheduledAt!.day.toString().padLeft(2, '0')} ${_scheduledAt!.hour.toString().padLeft(2, '0')}:${_scheduledAt!.minute.toString().padLeft(2, '0')}'
            : '',
      );
    } else {
      _scheduledDateController = TextEditingController();
    }
    if (c != null && c.templateVariables.isNotEmpty) {
      for (final v in c.templateVariables) {
        _templateVariables.add(v);
        _variableControllers.add(TextEditingController(text: v));
      }
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _contentController.dispose();
    _scheduledDateController.dispose();
    for (final ctrl in _variableControllers) {
      ctrl.dispose();
    }
    super.dispose();
  }

  void _onTemplateChanged(String? templateName, CampaignFormViewModel vm) {
    setState(() {
      _selectedTemplateName = templateName;
      _templateVariables.clear();
      for (final ctrl in _variableControllers) {
        ctrl.dispose();
      }
      _variableControllers.clear();
      if (templateName != null) {
        final template = vm.templates.firstWhere((t) => t.templateName == templateName);
        final vars = _extractVariables(template);
        for (final _ in vars) {
          _templateVariables.add('');
          _variableControllers.add(TextEditingController());
        }
      }
    });
  }

  List<String> _extractVariables(Template template) {
    final placeholders = <String>[];
    final regex = RegExp(r'\{\{(\d+)\}\}');
    for (final component in template.components) {
      if (component.text != null) {
        final matches = regex.allMatches(component.text!);
        for (final match in matches) {
          final idx = match.group(1);
          if (idx != null && !placeholders.contains(idx)) {
            placeholders.add(idx);
          }
        }
      }
    }
    placeholders.sort((a, b) => int.parse(a).compareTo(int.parse(b)));
    return placeholders;
  }

  Future<void> _pickScheduledAt() async {
    final now = DateTime.now();
    final date = await showDatePicker(
      context: context,
      initialDate: _scheduledAt ?? now,
      firstDate: now,
      lastDate: DateTime(now.year + 2),
    );
    if (date == null || !mounted) return;
    final time = await showTimePicker(
      context: context,
      initialTime: TimeOfDay.fromDateTime(_scheduledAt ?? now),
    );
    if (time == null || !mounted) return;
    setState(() {
      _scheduledAt = DateTime(date.year, date.month, date.day, time.hour, time.minute);
      _scheduledDateController.text =
          '${_scheduledAt!.year}-${_scheduledAt!.month.toString().padLeft(2, '0')}-${_scheduledAt!.day.toString().padLeft(2, '0')} ${_scheduledAt!.hour.toString().padLeft(2, '0')}:${_scheduledAt!.minute.toString().padLeft(2, '0')}';
    });
  }

  Future<void> _selectRecipients(CampaignFormViewModel vm) async {
    final selected = await showDialog<List<String>>(
      context: context,
      builder: (context) {
        final tempSelection = List<String>.from(_selectedContactIds);
        return StatefulBuilder(
          builder: (context, setDialogState) {
            return AppAlertDialog(
              title: const Text('Select Recipients'),
              content: SizedBox(
                width: double.maxFinite,
                height: 400,
                child: ListView.builder(
                  itemCount: vm.contacts.length,
                  itemBuilder: (context, index) {
                    final contact = vm.contacts[index];
                    return CheckboxListTile(
                      title: Text(contact.name),
                      subtitle: Text(contact.phone),
                      value: tempSelection.contains(contact.id),
                      onChanged: (checked) {
                        setDialogState(() {
                          if (checked == true) {
                            tempSelection.add(contact.id);
                          } else {
                            tempSelection.remove(contact.id);
                          }
                        });
                      },
                    );
                  },
                ),
              ),
              actions: [
                AppButton(variant: AppButtonVariant.ghost, 
                  onPressed: () => Navigator.pop(context),
                  child: const Text('Cancel'),
                ),
                AppButton(variant: AppButtonVariant.primary, 
                  onPressed: () => Navigator.pop(context, tempSelection),
                  child: const Text('Done'),
                ),
              ],
            );
          },
        );
      },
    );
    if (selected != null) {
      setState(() {
        _selectedContactIds.clear();
        _selectedContactIds.addAll(selected);
      });
    }
  }

  Future<void> _submit(CampaignFormViewModel vm) async {
    if (!_formKey.currentState!.validate()) return;

    final payload = <String, dynamic>{
      'name': _nameController.text.trim(),
      'messageType': _messageType,
      'content': _contentController.text.trim(),
      'status': _status,
      'templateName': _selectedTemplateName,
      'templateVariables': _variableControllers.map((c) => c.text.trim()).toList(),
      if (_scheduledAt != null) 'scheduledAt': _scheduledAt!.toUtc().toIso8601String(),
      'recipientIds': _selectedContactIds,
    };

    final result = await vm.save(payload, id: widget.campaign?.id);
    if (!mounted) return;
    result.when(
      success: (_) {
        Navigator.pop(context, true);
      },
      error: (message, exception) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text(message), backgroundColor: Colors.red),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<CampaignFormViewModel>();

    return Scaffold(
      appBar: AppAppBar(
        title: Text(widget.campaign == null ? 'New Campaign' : 'Edit Campaign'),
      ),
      body: vm.isBusy && vm.templates.isEmpty && vm.contacts.isEmpty
          ? const Center(child: AppProgressIndicator())
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: Form(
                key: _formKey,
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    TextFormField(
                      controller: _nameController,
                      decoration: const InputDecoration(labelText: 'Name'),
                      validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                    ),
                    const SizedBox(height: 12),
                    AppDropdown<String>(
                      initialValue: _messageType,
                      decoration: const InputDecoration(labelText: 'Message Type'),
                      items: _messageTypes
                          .map((t) => DropdownMenuItem(value: t, child: Text(t[0].toUpperCase() + t.substring(1))))
                          .toList(),
                      onChanged: (v) => setState(() => _messageType = v),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _contentController,
                      decoration: const InputDecoration(labelText: 'Content'),
                      maxLines: 4,
                      validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                    ),
                    const SizedBox(height: 12),
                    Builder(
                      builder: (context) {
                        final validTemplate = _selectedTemplateName != null &&
                            vm.templates.any((t) => t.templateName == _selectedTemplateName);
                        final templateValue = validTemplate ? _selectedTemplateName : null;
                        return AppDropdown<String>(
                          initialValue: templateValue,
                          decoration: const InputDecoration(labelText: 'Template (optional)'),
                          items: [
                            const DropdownMenuItem(value: null, child: Text('None')),
                            ...vm.templates.map((t) => DropdownMenuItem(
                                  value: t.templateName,
                                  child: Text(t.templateName),
                                )),
                          ],
                          onChanged: (v) => _onTemplateChanged(v, vm),
                        );
                      },
                    ),
                    if (_variableControllers.isNotEmpty) ...[
                      const SizedBox(height: 12),
                      const Text('Template Variables', style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 8),
                      ..._variableControllers.asMap().entries.map((entry) {
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 8),
                          child: TextFormField(
                            controller: entry.value,
                            decoration: InputDecoration(labelText: 'Variable {{${entry.key + 1}}}'),
                          ),
                        );
                      }),
                    ],
                    const SizedBox(height: 12),
                    AppDropdown<String>(
                      initialValue: _status,
                      decoration: const InputDecoration(labelText: 'Status'),
                      items: _statuses
                          .map((s) => DropdownMenuItem(value: s, child: Text(s[0].toUpperCase() + s.substring(1))))
                          .toList(),
                      onChanged: (v) => setState(() => _status = v),
                    ),
                    const SizedBox(height: 12),
                    TextFormField(
                      controller: _scheduledDateController,
                      decoration: const InputDecoration(
                        labelText: 'Scheduled At (optional)',
                        suffixIcon: Icon(Icons.calendar_today),
                      ),
                      readOnly: true,
                      onTap: _pickScheduledAt,
                    ),
                    const SizedBox(height: 12),
                    AppCard(
                      child: AppListTile(
                        title: const Text('Recipients'),
                        subtitle: Text('${_selectedContactIds.length} selected'),
                        trailing: const Icon(Icons.chevron_right),
                        onTap: () => _selectRecipients(vm),
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: AppButton(variant: AppButtonVariant.primary, 
                        onPressed: vm.isBusy ? null : () => _submit(vm),
                        child: vm.isBusy ? const SizedBox(height: 20, width: 20, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Save Campaign'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
    );
  }
}