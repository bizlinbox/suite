import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../core/services/notification_manager.dart';
import '../../core/services/socket_service.dart';
import '../../data/models/conversation_model.dart';
import '../../data/models/contact_model.dart';
import '../../data/repositories/conversation_repository.dart';
import '../../data/repositories/contact_repository.dart';
import '../../viewmodels/base_viewmodel.dart';
import '../widgets/contact_profile_sheet.dart';
import '../widgets/new_chat_dialog.dart';
import '../widgets/custom/custom_widgets.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

class InboxViewModel extends BaseViewModel {
  final ConversationRepository _repo;
  final ContactRepository _contactRepo;

  InboxViewModel(this._repo, this._contactRepo);

  List<Conversation> _conversations = [];
  List<Conversation> get conversations => _conversations;
  int _offset = 0;
  String _search = '';
  bool _hasMore = false;

  bool get hasMore => _hasMore;

  bool _isSelectionMode = false;
  bool get isSelectionMode => _isSelectionMode;

  final Set<String> _selectedIds = {};
  Set<String> get selectedIds => _selectedIds;

  bool isSelected(String id) => _selectedIds.contains(id);

  void enterSelectionMode() {
    _isSelectionMode = true;
    notifyListeners();
  }

  void exitSelectionMode() {
    _isSelectionMode = false;
    _selectedIds.clear();
    notifyListeners();
  }

  void toggleSelection(String id) {
    if (_selectedIds.contains(id)) {
      _selectedIds.remove(id);
      if (_selectedIds.isEmpty) _isSelectionMode = false;
    } else {
      _selectedIds.add(id);
    }
    notifyListeners();
  }

  Future<void> deleteSelected() async {
    if (_selectedIds.isEmpty) return;
    setBusy();
    for (final id in _selectedIds.toList()) {
      await _repo.deleteConversation(id);
    }
    _selectedIds.clear();
    _isSelectionMode = false;
    await loadConversations();
  }

  Future<void> loadConversations({bool append = false}) async {
    await runAsync(() async {
      final result = await _repo.getConversations(offset: append ? _offset + 20 : 0, search: _search.isEmpty ? null : _search);
      result.when(
        success: (data) {
          if (append) {
            _conversations.addAll(data);
            _offset += 20;
          } else {
            _conversations = data;
            _offset = 0;
          }
          _hasMore = data.length >= 20;
        },
        error: (message, exception) => throw Exception(message),
      );
    });
  }

  void setSearch(String value) {
    _search = value;
    loadConversations();
  }

  Future<void> deleteConversation(String id) async {
    final result = await _repo.deleteConversation(id);
    result.when(
      success: (_) => loadConversations(),
      error: (message, exception) {},
    );
  }

  Future<void> createConversation(String phone, {String? message}) async {
    if (phone.trim().isEmpty) return;
    setBusy();
    final result = await _repo.createConversation(phone.trim(), message: message);
    result.when(
      success: (conv) {
        _conversations.insert(0, conv);
      },
      error: (message, exception) {},
    );
    setIdle();
  }

  void handleNewMessage(Map<String, dynamic> data) {
    // Try optimistic update if conversation data is present in the payload
    final convData = data['conversation'] as Map<String, dynamic>?;
    if (convData != null) {
      try {
        final updated = Conversation.fromJson(convData);
        final index = _conversations.indexWhere((c) => c.id == updated.id);
        if (index >= 0) {
          _conversations[index] = updated;
          if (updated.unreadCount > 0 || updated.id != _conversations.first.id) {
            final conv = _conversations.removeAt(index);
            _conversations.insert(0, conv);
          }
          notifyListeners();
        } else {
          _conversations.insert(0, updated);
          notifyListeners();
        }
        return;
      } catch (_) {}
    }
    // Fall back to full reload if we can't parse the payload
    loadConversations();
  }

  void handleConversationUpdated(Map<String, dynamic> data) {
    try {
      final updated = Conversation.fromJson(data);
      final index = _conversations.indexWhere((c) => c.id == updated.id);
      if (index >= 0) {
        _conversations[index] = updated;
        // Move to top if unread
        if (updated.unreadCount > 0) {
          final conv = _conversations.removeAt(index);
          _conversations.insert(0, conv);
        }
        notifyListeners();
      } else {
        _conversations.insert(0, updated);
        notifyListeners();
      }
    } catch (_) {}
  }

  Future<Contact?> getContact(String contactId) async {
    final result = await _contactRepo.getContact(contactId);
    return result.when(
      success: (contact) => contact,
      error: (message, exception) => null,
    );
  }
}

class InboxScreen extends StatelessWidget {
  final Widget detail;
  const InboxScreen({super.key, required this.detail});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => InboxViewModel(
        locator<ConversationRepository>(),
        locator<ContactRepository>(),
      )..loadConversations(),
      child: _InboxBody(detail: detail),
    );
  }
}

class InboxEmptyDetail extends StatelessWidget {
  const InboxEmptyDetail({super.key});

  @override
  Widget build(BuildContext context) {
    return Center(
      child: Column(
        mainAxisSize: MainAxisSize.min,
        children: [
          PhosphorIcon(PhosphorIconsRegular.chatsTeardrop, size: 64, color: Theme.of(context).colorScheme.outline),
          const SizedBox(height: 16),
          Text(
            'Select a conversation',
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: Theme.of(context).colorScheme.onSurfaceVariant,
                ),
          ),
          const SizedBox(height: 4),
          Text(
            'Choose a chat from the list to start messaging',
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: Theme.of(context).colorScheme.outline,
                ),
          ),
        ],
      ),
    );
  }
}

class _InboxBody extends StatefulWidget {
  final Widget detail;
  const _InboxBody({required this.detail});

  @override
  State<_InboxBody> createState() => _InboxBodyState();
}

class _InboxBodyState extends State<_InboxBody> {
  StreamSubscription? _msgSub;
  StreamSubscription? _convSub;
  StreamSubscription? _notifSub;

  @override
  void initState() {
    super.initState();
    final vm = context.read<InboxViewModel>();
    final socket = locator<SocketService>();
    _msgSub = socket.onNewMessage.listen(vm.handleNewMessage);
    _convSub = socket.onConversationUpdated.listen(vm.handleConversationUpdated);

    final notificationManager = locator<NotificationManager>();
    _notifSub = notificationManager.onNotification.listen((event) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(event.title, style: const TextStyle(fontWeight: FontWeight.bold)),
              Text(event.body, maxLines: 2, overflow: TextOverflow.ellipsis),
            ],
          ),
          duration: const Duration(seconds: 4),
          behavior: SnackBarBehavior.floating,
          action: SnackBarAction(
            label: 'Dismiss',
            onPressed: () {
              ScaffoldMessenger.of(context).hideCurrentSnackBar();
            },
          ),
        ),
      );
    });
  }

  @override
  void dispose() {
    _msgSub?.cancel();
    _convSub?.cancel();
    _notifSub?.cancel();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<InboxViewModel>();
    final isMobile = MediaQuery.of(context).size.width < 768;
    final currentPath = GoRouterState.of(context).uri.path;
    final hasSelectedChat = currentPath != '/dashboard/inbox' && !currentPath.endsWith('/inbox');

    final listPanel = _buildListPanel(vm);

    // Mobile: show either the list or the active chat, never both at once.
    if (isMobile) {
      return Scaffold(
        body: hasSelectedChat ? widget.detail : listPanel,
        floatingActionButton: (hasSelectedChat || vm.isSelectionMode)
            ? null
            : AppFloatingActionButton(
                onPressed: () => _showNewChatDialog(context, vm),
                child: const PhosphorIcon(PhosphorIconsRegular.chatTeardropText),
              ),
      );
    }

    // Desktop / tablet: master-detail side by side.
    return Scaffold(
      body: Row(
        children: [
          SizedBox(width: 360, child: listPanel),
          const VerticalDivider(width: 1),
          Expanded(child: widget.detail),
        ],
      ),
    );
  }

  Widget _buildListPanel(InboxViewModel vm) {
    return Scaffold(
      appBar: AppAppBar(
        title: vm.isSelectionMode
            ? Text('${vm.selectedIds.length} selected')
            : const Text('Inbox'),
        leading: vm.isSelectionMode
            ? AppIconButton(
                icon: const PhosphorIcon(PhosphorIconsRegular.x),
                onPressed: () => vm.exitSelectionMode(),
              )
            : null,
        actions: [
          if (vm.isSelectionMode) ...[
            AppIconButton(
              icon: const PhosphorIcon(PhosphorIconsRegular.trash, color: Colors.red),
              onPressed: vm.isBusy ? null : () => _confirmBulkDelete(context, vm),
            ),
          ] else ...[
            AppIconButton(
              icon: const PhosphorIcon(PhosphorIconsRegular.arrowsClockwise),
              onPressed: vm.isBusy ? null : () => vm.loadConversations(),
            ),
          ],
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(12),
            child: AppInput.search(
              hint: 'Search conversations...',
              prefix: const PhosphorIcon(PhosphorIconsRegular.magnifyingGlass, size: 20),
              onChanged: vm.setSearch,
            ),
          ),
          Expanded(
            child: vm.isBusy && vm.conversations.isEmpty
                ? const Center(child: AppProgressIndicator())
                : vm.conversations.isEmpty
                    ? const Center(child: Text('No conversations found'))
                    : ListView.builder(
                        itemCount: vm.conversations.length + (vm.hasMore ? 1 : 0),
                        itemBuilder: (context, index) {
                          if (index == vm.conversations.length) {
                            return Center(
                              child: AppButton(
                                variant: AppButtonVariant.ghost,
                                onPressed: () => vm.loadConversations(append: true),
                                child: const Text('Load more'),
                              ),
                            );
                          }
                          final conv = vm.conversations[index];
                          final selectedPath = '/dashboard/inbox/${conv.id}';
                          final isSelected = GoRouterState.of(context).uri.path == selectedPath;
                          return _ConversationTile(
                            conversation: conv,
                            vm: vm,
                            selected: isSelected,
                            onTap: () {
                              if (vm.isSelectionMode) {
                                vm.toggleSelection(conv.id);
                              } else {
                                context.go(selectedPath);
                              }
                            },
                            onLongPress: () {
                              if (!vm.isSelectionMode) {
                                vm.enterSelectionMode();
                                vm.toggleSelection(conv.id);
                              }
                            },
                          );
                        },
                      ),
          ),
        ],
      ),
    );
  }

  void _confirmBulkDelete(BuildContext context, InboxViewModel vm) {
    showDialog(
      context: context,
      builder: (_) => AppAlertDialog(
        title: const Text('Delete Conversations'),
        content: Text('Delete ${vm.selectedIds.length} selected conversations?'),
        actions: [
          AppButton(variant: AppButtonVariant.ghost, onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          AppButton(variant: AppButtonVariant.primary, 
            onPressed: () {
              Navigator.pop(context);
              vm.deleteSelected();
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _showNewChatDialog(BuildContext context, InboxViewModel vm) {
    showDialog(
      context: context,
      builder: (_) => const NewChatDialog(),
    );
  }
}

class _ConversationTile extends StatelessWidget {
  final Conversation conversation;
  final InboxViewModel vm;
  final bool selected;
  final VoidCallback onTap;
  final VoidCallback onLongPress;

  const _ConversationTile({
    required this.conversation,
    required this.vm,
    this.selected = false,
    required this.onTap,
    required this.onLongPress,
  });

  @override
  Widget build(BuildContext context) {
    final hasUnread = conversation.unreadCount > 0;

    return AppListTile(
      selected: selected,
      leading: vm.isSelectionMode
          ? AppInput.checkbox(
              value: vm.isSelected(conversation.id),
              onToggled: (_) => vm.toggleSelection(conversation.id),
            )
          : GestureDetector(
              onTap: () => _showContactProfile(context),
              child: AppAvatar(
                child: Text(
                  conversation.contactName.isNotEmpty ? conversation.contactName[0].toUpperCase() : '?',
                ),
              ),
            ),
      title: Text(
        conversation.contactName,
        style: TextStyle(
          fontWeight: hasUnread ? FontWeight.bold : FontWeight.normal,
        ),
      ),
      subtitle: Text(
        conversation.lastMessagePreview,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: TextStyle(
          fontWeight: hasUnread ? FontWeight.bold : FontWeight.normal,
          color: hasUnread ? Theme.of(context).colorScheme.onSurface : Colors.grey,
        ),
      ),
      trailing: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        crossAxisAlignment: CrossAxisAlignment.end,
        children: [
          if (hasUnread)
            Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 4),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary,
                borderRadius: BorderRadius.circular(12),
              ),
              child: Text(
                '${conversation.unreadCount}',
                style: const TextStyle(color: Colors.white, fontSize: 12, fontWeight: FontWeight.bold),
              ),
            )
          else
            const SizedBox(height: 24),
          if (conversation.assignedAgentName != null)
            Text(
              conversation.assignedAgentName!,
              style: const TextStyle(fontSize: 11, color: Colors.grey),
            ),
        ],
      ),
      onTap: onTap,
      onLongPress: onLongPress,
    );
  }

  void _showContactProfile(BuildContext context) async {
    final contact = await vm.getContact(conversation.contactId);
    if (contact != null && context.mounted) {
      showModalBottomSheet(
        context: context,
        isScrollControlled: true,
        builder: (_) => ContactProfileSheet(contact: contact),
      );
    }
  }
}