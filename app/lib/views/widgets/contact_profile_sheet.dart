import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../data/models/contact_model.dart';
import '../../data/repositories/contact_repository.dart';
import '../../viewmodels/auth_viewmodel.dart';
import 'custom/custom_widgets.dart';
import 'label_switcher.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

class ContactProfileSheet extends StatefulWidget {
  final Contact contact;
  const ContactProfileSheet({super.key, required this.contact});

  @override
  State<ContactProfileSheet> createState() => _ContactProfileSheetState();
}

class _ContactProfileSheetState extends State<ContactProfileSheet> {
  bool _isEditing = false;
  bool _isSaving = false;

  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  late final TextEditingController _emailController;
  late final TextEditingController _companyController;
  late final TextEditingController _jobTitleController;
  late final TextEditingController _notesController;
  late final TextEditingController _remarksController;
  late final TextEditingController _languageController;
  late final TextEditingController _addressController;
  late final TextEditingController _cityController;
  late final TextEditingController _stateController;
  late final TextEditingController _countryController;
  late final TextEditingController _zipCodeController;
  String? _birthday;
  List<String> _selectedTags = [];

  @override
  void initState() {
    super.initState();
    _initControllers(widget.contact);
  }

  void _initControllers(Contact contact) {
    _nameController = TextEditingController(text: contact.name);
    _phoneController = TextEditingController(text: contact.phone);
    _emailController = TextEditingController(text: contact.email ?? '');
    _companyController = TextEditingController(text: contact.company ?? '');
    _jobTitleController = TextEditingController(text: contact.jobTitle ?? '');
    _notesController = TextEditingController(text: contact.notes ?? '');
    _remarksController = TextEditingController(text: contact.remarks ?? '');
    _languageController = TextEditingController(text: contact.language ?? '');
    _selectedTags = List<String>.from(contact.tags ?? []);
    _addressController = TextEditingController(text: contact.address ?? '');
    _cityController = TextEditingController(text: contact.city ?? '');
    _stateController = TextEditingController(text: contact.state ?? '');
    _countryController = TextEditingController(text: contact.country ?? '');
    _zipCodeController = TextEditingController(text: contact.zipCode ?? '');
    _birthday = contact.birthday;
  }

  @override
  void dispose() {
    _nameController.dispose();
    _phoneController.dispose();
    _emailController.dispose();
    _companyController.dispose();
    _jobTitleController.dispose();
    _notesController.dispose();
    _remarksController.dispose();
    _languageController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _countryController.dispose();
    _zipCodeController.dispose();
    super.dispose();
  }

  Future<void> _pickBirthday() async {
    final initial = _birthday != null && _birthday!.isNotEmpty
        ? DateTime.tryParse(_birthday!)
        : null;
    final picked = await showDatePicker(
      context: context,
      initialDate: initial ?? DateTime(1990, 1, 1),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() {
        _birthday = picked.toIso8601String().split('T').first;
      });
    }
  }

  Future<void> _save() async {
    setState(() => _isSaving = true);
    final repo = locator<ContactRepository>();
    final payload = <String, dynamic>{
      'name': _nameController.text.trim(),
      'phone': _phoneController.text.trim(),
      'email': _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
      'company': _companyController.text.trim().isEmpty ? null : _companyController.text.trim(),
      'job_title': _jobTitleController.text.trim().isEmpty ? null : _jobTitleController.text.trim(),
      'notes': _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      'remarks': _remarksController.text.trim().isEmpty ? null : _remarksController.text.trim(),
      'language': _languageController.text.trim().isEmpty ? null : _languageController.text.trim(),
      'tags': _selectedTags.isEmpty ? null : _selectedTags,
      'address': _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
      'city': _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
      'state': _stateController.text.trim().isEmpty ? null : _stateController.text.trim(),
      'country': _countryController.text.trim().isEmpty ? null : _countryController.text.trim(),
      'zip_code': _zipCodeController.text.trim().isEmpty ? null : _zipCodeController.text.trim(),
      'birthday': _birthday,
    };

    final result = await repo.updateContact(widget.contact.id, payload);
    if (!mounted) return;

    setState(() => _isSaving = false);

    result.when(
      success: (updated) {
        setState(() => _isEditing = false);
        _initControllers(updated);
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('Contact saved successfully')),
        );
      },
      error: (message, exception) {
        ScaffoldMessenger.of(context).showSnackBar(
          SnackBar(content: Text('Failed to save: $message')),
        );
      },
    );
  }

  @override
  Widget build(BuildContext context) {
    final authVm = context.watch<AuthViewModel>();
    final canEdit = authVm.can('contacts.manage');

    return SafeArea(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Center(
              child: Column(
                children: [
                  AppAvatar(
                    radius: 40,
                    child: Text(
                      widget.contact.name.isNotEmpty ? widget.contact.name[0].toUpperCase() : '?',
                      style: const TextStyle(fontSize: 32),
                    ),
                  ),
                  const SizedBox(height: 12),
                  Text(
                    widget.contact.name,
                    style: Theme.of(context).textTheme.titleLarge?.copyWith(fontWeight: FontWeight.bold),
                  ),
                  const SizedBox(height: 4),
                  Text(
                    widget.contact.phone,
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(color: Colors.grey),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            if (_isEditing) ...[
              Expanded(
                child: SingleChildScrollView(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      _EditField(label: 'Name', controller: _nameController),
                      _EditField(label: 'Phone', controller: _phoneController, keyboardType: TextInputType.phone),
                      _EditField(label: 'Email', controller: _emailController, keyboardType: TextInputType.emailAddress),
                      _EditField(label: 'Company', controller: _companyController),
                      _EditField(label: 'Job Title', controller: _jobTitleController),
                      _EditField(label: 'Notes', controller: _notesController, maxLines: 3),
                      _EditField(label: 'Remarks', controller: _remarksController, maxLines: 3),
                      _EditField(label: 'Language', controller: _languageController),
                      const Padding(
                        padding: EdgeInsets.only(top: 8, bottom: 4),
                        child: Text('Labels', style: TextStyle(fontWeight: FontWeight.bold)),
                      ),
                      LabelSwitcher(
                        selectedTags: _selectedTags,
                        onChanged: (tags) => setState(() => _selectedTags = tags),
                      ),
                      const SizedBox(height: 8),
                      _EditField(label: 'Address', controller: _addressController),
                      _EditField(label: 'City', controller: _cityController),
                      _EditField(label: 'State', controller: _stateController),
                      _EditField(label: 'Country', controller: _countryController),
                      _EditField(label: 'Zip Code', controller: _zipCodeController),
                      const SizedBox(height: 8),
                      const Text('Birthday', style: TextStyle(fontWeight: FontWeight.bold)),
                      const SizedBox(height: 4),
                      AppInput(
                        readOnly: true,
                        label: 'Birthday',
                        hint: _birthday ?? 'Select date',
                        onTap: _pickBirthday,
                        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
                      ),
                      const SizedBox(height: 16),
                      Row(
                        children: [
                          Expanded(
                            child: AppButton(variant: AppButtonVariant.secondary, 
                              onPressed: _isSaving ? null : () => setState(() => _isEditing = false),
                              child: const Text('Cancel'),
                            ),
                          ),
                          const SizedBox(width: 12),
                          Expanded(
                            child: AppButton(variant: AppButtonVariant.primary, 
                              onPressed: _isSaving ? null : _save,
                              child: _isSaving
                                  ? const SizedBox(height: 16, width: 16, child: CircularProgressIndicator(strokeWidth: 2))
                                  : const Text('Save'),
                            ),
                          ),
                        ],
                      ),
                      const SizedBox(height: 16),
                    ],
                  ),
                ),
              ),
            ] else ...[
              if (widget.contact.tags != null && widget.contact.tags!.isNotEmpty) ...[
                const Text('Tags', style: TextStyle(fontWeight: FontWeight.bold)),
                const SizedBox(height: 8),
                Wrap(
                  spacing: 8,
                  children: widget.contact.tags!
                      .map((tag) => Chip(label: Text(tag), padding: EdgeInsets.zero))
                      .toList(),
                ),
                const SizedBox(height: 16),
              ],
              if (widget.contact.notes != null && widget.contact.notes!.isNotEmpty)
                _InfoRow(icon: PhosphorIconsRegular.notebook, label: 'Notes', value: widget.contact.notes!),
              if (widget.contact.remarks != null && widget.contact.remarks!.isNotEmpty)
                _InfoRow(icon: PhosphorIconsRegular.chatCenteredText, label: 'Remarks', value: widget.contact.remarks!),
              if (widget.contact.email != null && widget.contact.email!.isNotEmpty)
                _InfoRow(icon: PhosphorIconsRegular.envelope, label: 'Email', value: widget.contact.email!),
              if (widget.contact.company != null && widget.contact.company!.isNotEmpty)
                _InfoRow(icon: PhosphorIconsRegular.buildings, label: 'Company', value: widget.contact.company!),
              if (widget.contact.jobTitle != null && widget.contact.jobTitle!.isNotEmpty)
                _InfoRow(icon: PhosphorIconsRegular.briefcase, label: 'Job Title', value: widget.contact.jobTitle!),
              if (widget.contact.language != null && widget.contact.language!.isNotEmpty)
                _InfoRow(icon: PhosphorIconsRegular.globe, label: 'Language', value: widget.contact.language!),
              if (widget.contact.birthday != null && widget.contact.birthday!.isNotEmpty)
                _InfoRow(icon: PhosphorIconsRegular.cake, label: 'Birthday', value: widget.contact.birthday!),
              if (widget.contact.address != null && widget.contact.address!.isNotEmpty)
                _InfoRow(icon: PhosphorIconsRegular.mapPin, label: 'Address', value: widget.contact.address!),
              if (widget.contact.city != null && widget.contact.city!.isNotEmpty)
                _InfoRow(icon: PhosphorIconsRegular.buildings, label: 'City', value: widget.contact.city!),
              if (widget.contact.state != null && widget.contact.state!.isNotEmpty)
                _InfoRow(icon: PhosphorIconsRegular.mapTrifold, label: 'State', value: widget.contact.state!),
              if (widget.contact.country != null && widget.contact.country!.isNotEmpty)
                _InfoRow(icon: PhosphorIconsRegular.globe, label: 'Country', value: widget.contact.country!),
              if (widget.contact.zipCode != null && widget.contact.zipCode!.isNotEmpty)
                _InfoRow(icon: PhosphorIconsRegular.mailbox, label: 'Zip Code', value: widget.contact.zipCode!),
              const SizedBox(height: 16),
              Row(
                children: [
                  if (canEdit)
                    Expanded(
                      child: AppButton(variant: AppButtonVariant.primary, 
                        onPressed: () => setState(() => _isEditing = true),
                        child: const Text('Edit'),
                      ),
                    ),
                  if (canEdit) const SizedBox(width: 12),
                  Expanded(
                    child: AppButton(variant: AppButtonVariant.secondary, 
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Close'),
                    ),
                  ),
                ],
              ),
            ],
          ],
        ),
      ),
    );
  }
}

class _InfoRow extends StatelessWidget {
  final IconData icon;
  final String label;
  final String value;

  const _InfoRow({required this.icon, required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 8),
      child: Row(
        children: [
          Icon(icon, size: 18, color: Colors.grey),
          const SizedBox(width: 8),
          Text('$label: ', style: const TextStyle(fontWeight: FontWeight.bold)),
          Expanded(child: Text(value, overflow: TextOverflow.ellipsis)),
        ],
      ),
    );
  }
}

class _EditField extends StatelessWidget {
  final String label;
  final TextEditingController controller;
  final TextInputType? keyboardType;
  final int? maxLines;

  const _EditField({
    required this.label,
    required this.controller,
    this.keyboardType,
    this.maxLines,
  });

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 12),
      child: AppInput(
        controller: controller,
        label: label,
        keyboardType: keyboardType,
        maxLines: maxLines ?? 1,
        contentPadding: const EdgeInsets.symmetric(horizontal: 12, vertical: 12),
      ),
    );
  }
}
