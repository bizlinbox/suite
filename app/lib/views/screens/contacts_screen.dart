import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import '../../core/di.dart';
import '../../core/utils/result.dart';
import '../../data/models/contact_model.dart';
import '../../data/repositories/contact_repository.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../../viewmodels/base_viewmodel.dart';

class ContactsViewModel extends BaseViewModel {
  final ContactRepository _repo;
  ContactsViewModel(this._repo);

  List<Contact> _contacts = [];
  List<Contact> get contacts => _contacts;
  String _search = '';

  Future<void> loadContacts() async {
    await runAsync(() async {
      final result = await _repo.getContacts();
      result.when(
        success: (data) => _contacts = data,
        error: (message, exception) => throw Exception(message),
      );
    });
  }

  List<Contact> get filteredContacts {
    if (_search.isEmpty) return _contacts;
    final q = _search.toLowerCase();
    return _contacts.where((c) =>
      c.name.toLowerCase().contains(q) ||
      c.phone.contains(q) ||
      (c.email?.toLowerCase().contains(q) ?? false) ||
      (c.company?.toLowerCase().contains(q) ?? false)
    ).toList();
  }

  void setSearch(String value) {
    _search = value;
    notifyListeners();
  }

  Future<bool> createContact(Map<String, dynamic> payload) async {
    setBusy();
    final result = await _repo.createContact(payload);
    result.when(
      success: (_) {
        loadContacts();
        setSuccess();
      },
      error: (message, exception) => setError(message),
    );
    setIdle();
    return result is Success;
  }

  Future<bool> updateContact(String id, Map<String, dynamic> payload) async {
    setBusy();
    final result = await _repo.updateContact(id, payload);
    result.when(
      success: (_) {
        loadContacts();
        setSuccess();
      },
      error: (message, exception) => setError(message),
    );
    setIdle();
    return result is Success;
  }

  Future<void> deleteContact(String id) async {
    final result = await _repo.deleteContact(id);
    result.when(
      success: (_) => loadContacts(),
      error: (message, exception) {},
    );
  }

  Future<String?> importContacts() async {
    try {
      final picked = await FilePicker.platform.pickFiles(
        type: FileType.custom,
        allowedExtensions: ['csv', 'xlsx', 'xls'],
        withData: true,
      );
      if (picked == null || picked.files.isEmpty) return null;
      final file = picked.files.single;
      if (file.bytes == null && file.path == null) return null;
      setBusy();
      final result = file.bytes != null
          ? await _repo.importContacts(file.bytes!, file.name)
          : await _repo.importContactsFromPath(file.path!);
      setIdle();
      String? message;
      result.when(
        success: (data) {
          loadContacts();
          message = 'Imported ${data['imported'] ?? 'contacts'}';
        },
        error: (msg, exception) => message = msg,
      );
      return message;
    } catch (e) {
      setIdle();
      return 'Import failed: $e';
    }
  }
}

class ContactsScreen extends StatelessWidget {
  const ContactsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => ContactsViewModel(locator<ContactRepository>())..loadContacts(),
      child: const _ContactsBody(),
    );
  }
}

class _ContactsBody extends StatelessWidget {
  const _ContactsBody();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<ContactsViewModel>();
    final authVm = context.watch<AuthViewModel>();

    if (!authVm.can('contacts.read')) {
      return Scaffold(
        appBar: AppBar(title: const Text('Contacts')),
        body: _buildNoPermission(),
      );
    }

    final canManage = authVm.can('contacts.manage');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Contacts'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: vm.isBusy ? null : () => vm.loadContacts(),
          ),
          if (canManage)
            IconButton(
              icon: const Icon(Icons.upload_file),
              tooltip: 'Import Contacts',
              onPressed: vm.isBusy ? null : () async {
                final message = await vm.importContacts();
                if (!context.mounted || message == null) return;
                ScaffoldMessenger.of(context).showSnackBar(
                  SnackBar(content: Text(message)),
                );
              },
            ),
        ],
      ),
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              onPressed: () async {
                final result = await showDialog<bool>(
                  context: context,
                  builder: (_) => ContactFormDialog(viewModel: vm),
                );
                if (result == true) {
                  vm.loadContacts();
                }
              },
              icon: const Icon(Icons.add),
              label: const Text('Add Contact'),
            )
          : null,
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: TextField(
              decoration: InputDecoration(
                hintText: 'Search contacts...',
                prefixIcon: const Icon(Icons.search),
                border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
              ),
              onChanged: vm.setSearch,
            ),
          ),
          Expanded(
            child: vm.isBusy && vm.contacts.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : vm.filteredContacts.isEmpty
                    ? const Center(child: Text('No contacts found'))
                    : ListView.builder(
                        padding: const EdgeInsets.all(12),
                        itemCount: vm.filteredContacts.length,
                        itemBuilder: (context, index) {
                          final c = vm.filteredContacts[index];
                          return Card(
                            child: InkWell(
                              borderRadius: BorderRadius.circular(12),
                              onTap: canManage
                                  ? () async {
                                      final result = await showDialog<bool>(
                                        context: context,
                                        builder: (_) => ContactFormDialog(contact: c, viewModel: vm),
                                      );
                                      if (result == true) {
                                        vm.loadContacts();
                                      }
                                    }
                                  : null,
                              child: Padding(
                                padding: const EdgeInsets.all(12),
                                child: Row(
                                  children: [
                                    CircleAvatar(
                                      child: Text(c.name.isNotEmpty ? c.name[0].toUpperCase() : '?'),
                                    ),
                                    const SizedBox(width: 12),
                                    Expanded(
                                      child: Column(
                                        crossAxisAlignment: CrossAxisAlignment.start,
                                        children: [
                                          Text(c.name, style: const TextStyle(fontWeight: FontWeight.w600)),
                                          Text(c.phone, style: TextStyle(fontSize: 13, color: Colors.grey[700])),
                                          if (c.company != null && c.company!.isNotEmpty)
                                            Text(c.company!, style: TextStyle(fontSize: 12, color: Colors.grey[600])),
                                          if (c.tags != null && c.tags!.isNotEmpty)
                                            Wrap(
                                              spacing: 4,
                                              children: c.tags!.map((t) => Chip(
                                                label: Text(t, style: const TextStyle(fontSize: 11)),
                                                padding: EdgeInsets.zero,
                                                materialTapTargetSize: MaterialTapTargetSize.shrinkWrap,
                                              )).toList(),
                                            ),
                                        ],
                                      ),
                                    ),
                                    if (canManage)
                                      IconButton(
                                        icon: const Icon(Icons.delete_outline, color: Colors.red),
                                        onPressed: () => _confirmDelete(context, vm, c.id),
                                      ),
                                  ],
                                ),
                              ),
                            ),
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  void _confirmDelete(BuildContext context, ContactsViewModel vm, String id) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Contact?'),
        content: const Text('This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              vm.deleteContact(id);
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  Widget _buildNoPermission() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.lock_outline, size: 48, color: Colors.grey),
          SizedBox(height: 16),
          Text('You do not have permission to view this page.', textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

class ContactFormDialog extends StatefulWidget {
  final Contact? contact;
  final ContactsViewModel viewModel;
  const ContactFormDialog({super.key, this.contact, required this.viewModel});

  @override
  State<ContactFormDialog> createState() => _ContactFormDialogState();
}

class _ContactFormDialogState extends State<ContactFormDialog> {
  final _formKey = GlobalKey<FormState>();
  late final TextEditingController _nameController;
  late final TextEditingController _phoneController;
  late final TextEditingController _emailController;
  late final TextEditingController _companyController;
  late final TextEditingController _jobTitleController;
  late final TextEditingController _notesController;
  late final TextEditingController _remarksController;
  late final TextEditingController _languageController;
  late final TextEditingController _tagsController;
  late final TextEditingController _addressController;
  late final TextEditingController _cityController;
  late final TextEditingController _stateController;
  late final TextEditingController _countryController;
  late final TextEditingController _zipCodeController;
  DateTime? _birthday;
  final TextEditingController _birthdayController = TextEditingController();

  @override
  void initState() {
    super.initState();
    final c = widget.contact;
    _nameController = TextEditingController(text: c?.name ?? '');
    _phoneController = TextEditingController(text: c?.phone ?? '');
    _emailController = TextEditingController(text: c?.email ?? '');
    _companyController = TextEditingController(text: c?.company ?? '');
    _jobTitleController = TextEditingController(text: c?.jobTitle ?? '');
    _notesController = TextEditingController(text: c?.notes ?? '');
    _remarksController = TextEditingController(text: c?.remarks ?? '');
    _languageController = TextEditingController(text: c?.language ?? '');
    _tagsController = TextEditingController(text: c?.tags?.join(', ') ?? '');
    _addressController = TextEditingController(text: c?.address ?? '');
    _cityController = TextEditingController(text: c?.city ?? '');
    _stateController = TextEditingController(text: c?.state ?? '');
    _countryController = TextEditingController(text: c?.country ?? '');
    _zipCodeController = TextEditingController(text: c?.zipCode ?? '');
    if (c?.birthday != null) {
      _birthday = DateTime.tryParse(c!.birthday!);
      if (_birthday != null) {
        _birthdayController.text = '${_birthday!.year}-${_birthday!.month.toString().padLeft(2, '0')}-${_birthday!.day.toString().padLeft(2, '0')}';
      }
    }
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
    _tagsController.dispose();
    _addressController.dispose();
    _cityController.dispose();
    _stateController.dispose();
    _countryController.dispose();
    _zipCodeController.dispose();
    _birthdayController.dispose();
    super.dispose();
  }

  Future<void> _pickBirthday() async {
    final picked = await showDatePicker(
      context: context,
      initialDate: _birthday ?? DateTime(2000, 1, 1),
      firstDate: DateTime(1900),
      lastDate: DateTime.now(),
    );
    if (picked != null) {
      setState(() {
        _birthday = picked;
        _birthdayController.text = '${picked.year}-${picked.month.toString().padLeft(2, '0')}-${picked.day.toString().padLeft(2, '0')}';
      });
    }
  }

  Future<void> _submit() async {
    if (!_formKey.currentState!.validate()) return;

    final tags = _tagsController.text
        .split(',')
        .map((t) => t.trim())
        .where((t) => t.isNotEmpty)
        .toList();

    final payload = <String, dynamic>{
      'name': _nameController.text.trim(),
      'phone': _phoneController.text.trim(),
      'email': _emailController.text.trim().isEmpty ? null : _emailController.text.trim(),
      'company': _companyController.text.trim().isEmpty ? null : _companyController.text.trim(),
      'job_title': _jobTitleController.text.trim().isEmpty ? null : _jobTitleController.text.trim(),
      'notes': _notesController.text.trim().isEmpty ? null : _notesController.text.trim(),
      'remarks': _remarksController.text.trim().isEmpty ? null : _remarksController.text.trim(),
      'birthday': _birthday != null ? _birthdayController.text : null,
      'language': _languageController.text.trim().isEmpty ? null : _languageController.text.trim(),
      'tags': tags.isEmpty ? null : tags,
      'address': _addressController.text.trim().isEmpty ? null : _addressController.text.trim(),
      'city': _cityController.text.trim().isEmpty ? null : _cityController.text.trim(),
      'state': _stateController.text.trim().isEmpty ? null : _stateController.text.trim(),
      'country': _countryController.text.trim().isEmpty ? null : _countryController.text.trim(),
      'zip_code': _zipCodeController.text.trim().isEmpty ? null : _zipCodeController.text.trim(),
    };

    final vm = widget.viewModel;
    final success = widget.contact != null
        ? await vm.updateContact(widget.contact!.id, payload)
        : await vm.createContact(payload);

    if (!mounted) return;
    if (success) {
      Navigator.pop(context, true);
    } else {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(content: Text(vm.errorMessage), backgroundColor: Colors.red),
      );
    }
  }

  @override
  Widget build(BuildContext context) {
    final isEdit = widget.contact != null;
    return AlertDialog(
      title: Text(isEdit ? 'Edit Contact' : 'Add Contact'),
      content: SizedBox(
        width: double.maxFinite,
        child: Form(
          key: _formKey,
          child: SingleChildScrollView(
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                TextFormField(
                  controller: _nameController,
                  decoration: const InputDecoration(labelText: 'Name *'),
                  validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _phoneController,
                  decoration: const InputDecoration(labelText: 'Phone *'),
                  keyboardType: TextInputType.phone,
                  validator: (v) => v == null || v.isEmpty ? 'Required' : null,
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _emailController,
                  decoration: const InputDecoration(labelText: 'Email'),
                  keyboardType: TextInputType.emailAddress,
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _companyController,
                  decoration: const InputDecoration(labelText: 'Company'),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _jobTitleController,
                  decoration: const InputDecoration(labelText: 'Job Title'),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _notesController,
                  decoration: const InputDecoration(labelText: 'Notes'),
                  maxLines: 2,
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _remarksController,
                  decoration: const InputDecoration(labelText: 'Remarks'),
                  maxLines: 2,
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _birthdayController,
                  decoration: const InputDecoration(
                    labelText: 'Birthday',
                    suffixIcon: Icon(Icons.calendar_today),
                  ),
                  readOnly: true,
                  onTap: _pickBirthday,
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _languageController,
                  decoration: const InputDecoration(labelText: 'Language'),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _tagsController,
                  decoration: const InputDecoration(labelText: 'Tags (comma-separated)'),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _addressController,
                  decoration: const InputDecoration(labelText: 'Address'),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _cityController,
                  decoration: const InputDecoration(labelText: 'City'),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _stateController,
                  decoration: const InputDecoration(labelText: 'State'),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _countryController,
                  decoration: const InputDecoration(labelText: 'Country'),
                ),
                const SizedBox(height: 8),
                TextFormField(
                  controller: _zipCodeController,
                  decoration: const InputDecoration(labelText: 'Zip Code'),
                ),
              ],
            ),
          ),
        ),
      ),
      actions: [
        TextButton(
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
        FilledButton(
          onPressed: _submit,
          child: Text(isEdit ? 'Update' : 'Save'),
        ),
      ],
    );
  }
}
