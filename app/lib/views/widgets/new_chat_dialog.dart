import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../core/services/local_storage_service.dart';
import '../../data/models/contact_model.dart';
import '../../data/models/conversation_model.dart';
import '../../data/repositories/contact_repository.dart';
import '../../data/repositories/conversation_repository.dart';
import '../../viewmodels/base_viewmodel.dart';
import 'custom/custom_widgets.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

class NewChatViewModel extends BaseViewModel {
  final ContactRepository _contactRepo;
  final ConversationRepository _convRepo;
  final LocalStorageService _storage;

  NewChatViewModel(this._contactRepo, this._convRepo, this._storage);

  List<Contact> _contacts = [];
  List<Contact> get contacts => _contacts;

  List<Contact> _filteredContacts = [];
  List<Contact> get filteredContacts => _filteredContacts;

  String _search = '';

  List<Conversation> _conversations = [];

  Future<void> loadContacts() async {
    await runAsync(() async {
      final result = await _contactRepo.getContacts();
      result.when(
        success: (data) {
          _contacts = data;
          _filterContacts();
        },
        error: (message, exception) => throw Exception(message),
      );
    });
  }

  Future<void> loadConversations() async {
    final result = await _convRepo.getConversations();
    result.when(
      success: (data) {
        _conversations = data;
        notifyListeners();
      },
      error: (message, exception) {},
    );
  }

  void setSearch(String value) {
    _search = value;
    _filterContacts();
    notifyListeners();
  }

  void _filterContacts() {
    if (_search.isEmpty) {
      _filteredContacts = _contacts;
      return;
    }
    final q = _search.toLowerCase();
    _filteredContacts = _contacts.where((c) {
      return c.name.toLowerCase().contains(q) || c.phone.contains(q);
    }).toList();
  }

  String? _existingConversationId(String contactId) {
    try {
      final conv = _conversations.firstWhere((c) => c.contactId == contactId);
      return conv.id;
    } catch (_) {
      return null;
    }
  }

  Future<String?> onContactSelected(Contact contact) async {
    final existingId = _existingConversationId(contact.id);
    if (existingId != null) {
      return existingId;
    }

    setBusy();
    final wabaId = _storage.getWabaId();
    final result = await _convRepo.createConversationByContactId(contact.id, wabaId: wabaId);
    setIdle();

    return result.when(
      success: (conv) => conv.id,
      error: (message, exception) {
        setError(message);
        return null;
      },
    );
  }
}

class NewChatDialog extends StatelessWidget {
  const NewChatDialog({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => NewChatViewModel(
        locator<ContactRepository>(),
        locator<ConversationRepository>(),
        locator<LocalStorageService>(),
      )..loadContacts()
       ..loadConversations(),
      child: const _NewChatDialogBody(),
    );
  }
}

class _NewChatDialogBody extends StatelessWidget {
  const _NewChatDialogBody();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<NewChatViewModel>();

    return AppAlertDialog(
      title: const Text('New Chat'),
      contentPadding: const EdgeInsets.fromLTRB(16, 12, 16, 16),
      content: SizedBox(
        width: 400,
        height: 500,
        child: Column(
          children: [
            AppInput.search(
              hint: 'Search by name or phone...',
              prefix: const PhosphorIcon(PhosphorIconsRegular.magnifyingGlass, size: 20),
              onChanged: vm.setSearch,
            ),
            const SizedBox(height: 12),
            Expanded(
              child: vm.isBusy && vm.filteredContacts.isEmpty
                  ? const Center(child: AppProgressIndicator())
                  : vm.filteredContacts.isEmpty
                      ? Center(
                          child: Text(
                            vm.contacts.isEmpty
                                ? 'No contacts found'
                                : 'No matching contacts',
                          ),
                        )
                      : ListView.builder(
                          itemCount: vm.filteredContacts.length,
                          itemBuilder: (context, index) {
                            final contact = vm.filteredContacts[index];
                            return AppListTile(
                              leading: AppAvatar(
                                child: Text(
                                  contact.name.isNotEmpty
                                      ? contact.name[0].toUpperCase()
                                      : '?',
                                ),
                              ),
                              title: Text(contact.name),
                              subtitle: Text(contact.phone),
                              onTap: () async {
                                if (vm.isBusy) return;
                                final convId = await vm.onContactSelected(contact);
                                if (convId != null && context.mounted) {
                                  Navigator.pop(context);
                                  context.go('/dashboard/inbox/$convId');
                                }
                              },
                            );
                          },
                        ),
            ),
            if (vm.isError)
              Padding(
                padding: const EdgeInsets.only(top: 8),
                child: Text(
                  vm.errorMessage,
                  style: const TextStyle(color: Colors.red),
                  textAlign: TextAlign.center,
                ),
              ),
          ],
        ),
      ),
      actions: [
        AppButton(variant: AppButtonVariant.ghost, 
          onPressed: () => Navigator.pop(context),
          child: const Text('Cancel'),
        ),
      ],
    );
  }
}