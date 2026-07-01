import 'dart:async';
import 'dart:math';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart';
import 'package:video_player/video_player.dart';
import 'package:audioplayers/audioplayers.dart';
import '../../core/di.dart';
import '../../core/services/api_service.dart';
import '../../core/utils/api_error.dart';
import '../../core/services/notification_manager.dart';
import '../../core/services/socket_service.dart';
import '../../data/models/message_model.dart' hide QuickReply;
import '../../data/models/contact_model.dart';
import '../../data/models/conversation_model.dart';
import '../../data/models/template_model.dart';
import '../../data/models/flow_model.dart' as flow_model;
import '../../data/models/quick_reply_model.dart';
import '../../data/repositories/conversation_repository.dart';
import '../../data/repositories/contact_repository.dart';
import '../../data/repositories/settings_repository.dart';
import '../../viewmodels/base_viewmodel.dart';
import '../widgets/contact_profile_sheet.dart';
import '../widgets/quick_reply_picker.dart';
import '../widgets/custom/custom_widgets.dart';
import '../widgets/custom/app_shimmer.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

sealed class ChatItem {}

class ChatMessageItem implements ChatItem {
  final Message message;
  ChatMessageItem(this.message);
}

class ChatDateItem implements ChatItem {
  final DateTime date;
  ChatDateItem(this.date);
}

class ChatViewModel extends BaseViewModel {
  final ConversationRepository _convRepo;
  final ContactRepository _contactRepo;
  final SettingsRepository _settingsRepo;
  final ApiService _api;
  final String conversationId;

  ChatViewModel(
    this._convRepo,
    this._contactRepo,
    this._settingsRepo,
    this._api,
    this.conversationId,
  );

  Conversation? _conversation;
  Conversation? get conversation => _conversation;

  Contact? _contact;
  Contact? get contact => _contact;

  List<Message> _messages = [];
  List<Message> get messages => _messages;
  int _offset = 0;

  List<QuickReply> _quickReplies = [];
  List<QuickReply> get quickReplies => _quickReplies;

  List<Template> _templates = [];
  List<Template> get templates => _templates;

  List<flow_model.Flow> _flows = [];
  List<flow_model.Flow> get flows => _flows;

  Future<void> init() async {
    await loadMessages();
    await loadConversation();
    await loadQuickReplies();
    await loadTemplates();
    await loadFlows();
  }

  Future<void> loadConversation() async {
    final result = await _convRepo.getConversation(conversationId);
    result.when(
      success: (conv) {
        _conversation = conv;
        _loadContact(conv.contactId);
      },
      error: (message, exception) {},
    );
  }

  Future<void> _loadContact(String contactId) async {
    final result = await _contactRepo.getContact(contactId);
    result.when(
      success: (c) {
        _contact = c;
        notifyListeners();
      },
      error: (message, exception) {},
    );
  }

  Future<void> loadMessages({bool prepend = false}) async {
    await runAsync(() async {
      final result = await _convRepo.getMessages(conversationId, offset: prepend ? _offset + 50 : 0, direction: 'asc');
      result.when(
        success: (data) {
          if (prepend) {
            _messages.insertAll(0, data);
            _offset += 50;
          } else {
            _messages = data;
            _offset = 0;
          }
        },
        error: (message, exception) => throw Exception(message),
      );
    });
  }

  Future<void> loadQuickReplies() async {
    final result = await _settingsRepo.getQuickReplies();
    result.when(
      success: (data) => _quickReplies = data,
      error: (message, exception) {},
    );
  }

  Future<void> loadTemplates() async {
    final result = await _settingsRepo.getTemplates();
    result.when(
      success: (data) => _templates = data,
      error: (message, exception) {},
    );
  }

  Future<void> loadFlows() async {
    final result = await _settingsRepo.getFlows();
    result.when(
      success: (data) => _flows = data,
      error: (message, exception) {},
    );
  }

  Future<void> sendMessage(String content, {String? mediaUrl}) async {
    if (content.trim().isEmpty && mediaUrl == null) return;
    setBusy();
    final result = await _convRepo.sendMessage(conversationId, content.trim(), mediaUrl: mediaUrl);
    result.when(
      success: (msg) {
        if (_messages.every((m) => m.id != msg.id)) {
          _messages.add(msg);
          notifyListeners();
        }
      },
      error: (message, exception) {},
    );
    setIdle();
  }

  Future<String?> uploadFile(PlatformFile file) async {
    try {
      late final FormData formData;
      if (file.bytes != null) {
        formData = FormData.fromMap({
          'file': MultipartFile.fromBytes(file.bytes!, filename: file.name),
        });
      } else if (file.path != null) {
        formData = FormData.fromMap({
          'file': await MultipartFile.fromFile(file.path!, filename: file.name),
        });
      } else {
        setError('Unable to read file');
        return null;
      }
      final res = await _api.uploadFile('/upload', formData);
      final url = res.data['url'] ?? res.data['fileUrl'] ?? res.data['mediaUrl'];
      return url as String?;
    } catch (e) {
      setError(extractApiError(e, fallback: 'Upload failed. Please try again.'));
      return null;
    }
  }

  Future<void> sendTemplate(String templateName, {Map<String, dynamic>? variables}) async {
    setBusy();
    final result = await _convRepo.sendTemplate(conversationId, templateName, variables: variables);
    result.when(
      success: (msg) {
        if (_messages.every((m) => m.id != msg.id)) {
          _messages.add(msg);
          notifyListeners();
        }
      },
      error: (message, exception) {},
    );
    setIdle();
  }

  Future<void> sendFlow(String flowId, {Map<String, dynamic>? parameters}) async {
    setBusy();
    final result = await _convRepo.sendFlow(conversationId, flowId, parameters: parameters);
    result.when(
      success: (msg) {
        if (_messages.every((m) => m.id != msg.id)) {
          _messages.add(msg);
          notifyListeners();
        }
      },
      error: (message, exception) {},
    );
    setIdle();
  }

  Future<bool> checkTemplateWindow() async {
    final result = await _convRepo.checkTemplateWindow(conversationId);
    return result.when(
      success: (data) => data['windowOpen'] as bool? ?? false,
      error: (message, exception) => false,
    );
  }

  Future<void> sendInteractiveMessage(String type, Map<String, dynamic> options) async {
    setBusy();
    final result = await _convRepo.sendInteractiveMessage(conversationId, type, options: options);
    result.when(
      success: (msg) {
        if (_messages.every((m) => m.id != msg.id)) {
          _messages.add(msg);
          notifyListeners();
        }
      },
      error: (message, exception) {},
    );
    setIdle();
  }

  Future<void> sendReaction(String messageId, String emoji) async {
    await sendInteractiveMessage('reaction', {
      'reaction_options': {
        'target_message_id': messageId,
        'emoji': emoji,
      },
    });
  }

  void handleNewMessage(Map<String, dynamic> data) {
    try {
      final msg = Message.fromJson(data);
      if (msg.conversationId == conversationId && _messages.every((m) => m.id != msg.id)) {
        _messages.add(msg);
        notifyListeners();
      }
    } catch (_) {}
  }

  void handleConversationUpdated(Map<String, dynamic> data) {
    try {
      final conv = Conversation.fromJson(data);
      if (conv.id == conversationId) {
        _conversation = conv;
        notifyListeners();
      }
    } catch (_) {}
  }

  void handleMessageStatusUpdated(Map<String, dynamic> data) {
    try {
      final messageId = data['messageId'] as String?;
      final status = data['status'] as String?;
      if (messageId == null || status == null) return;
      final index = _messages.indexWhere((m) => m.id == messageId);
      if (index >= 0) {
        final existing = _messages[index];
        // Only update if moving forward in lifecycle: pending < sent < delivered < read
        final order = ['pending', 'sent', 'delivered', 'read', 'failed'];
        final currentIdx = order.indexOf(existing.status ?? 'pending');
        final newIdx = order.indexOf(status);
        if (newIdx >= currentIdx || status == 'failed') {
          _messages[index] = Message(
            id: existing.id,
            conversationId: existing.conversationId,
            senderType: existing.senderType,
            content: existing.content,
            mediaUrl: existing.mediaUrl,
            mediaMimeType: existing.mediaMimeType,
            messageType: existing.messageType,
            status: status,
            createdAt: existing.createdAt,
            voice: existing.voice,
            reactionToMessageId: existing.reactionToMessageId,
          );
          notifyListeners();
        }
      }
    } catch (_) {}
  }

  List<ChatItem> get chatItems {
    final items = <ChatItem>[];
    DateTime? lastDate;
    for (final msg in _messages) {
      final dt = DateTime.tryParse(msg.createdAt);
      if (dt != null) {
        final date = DateTime(dt.year, dt.month, dt.day);
        if (lastDate == null || date.isAfter(lastDate)) {
          items.add(ChatDateItem(date));
          lastDate = date;
        }
      }
      items.add(ChatMessageItem(msg));
    }
    return items;
  }
}

class ChatScreen extends StatelessWidget {
  final String conversationId;
  const ChatScreen({super.key, required this.conversationId});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => ChatViewModel(
        locator<ConversationRepository>(),
        locator<ContactRepository>(),
        locator<SettingsRepository>(),
        locator<ApiService>(),
        conversationId,
      )..init(),
      child: _ChatBody(key: ValueKey(conversationId)),
    );
  }
}

class _ChatBody extends StatefulWidget {
  const _ChatBody({super.key});

  @override
  State<_ChatBody> createState() => _ChatBodyState();
}

class _ChatBodyState extends State<_ChatBody> {
  final _textController = TextEditingController();
  final _scrollController = ScrollController();
  StreamSubscription? _msgSub;
  StreamSubscription? _convSub;
  StreamSubscription? _statusSub;

  @override
  void initState() {
    super.initState();
    final vm = context.read<ChatViewModel>();
    final socket = locator<SocketService>();
    _msgSub = socket.onNewMessage.listen((data) {
      vm.handleNewMessage(data);
      _scrollToBottom();
    });
    _convSub = socket.onConversationUpdated.listen(vm.handleConversationUpdated);
    _statusSub = socket.onMessageStatusUpdated.listen(vm.handleMessageStatusUpdated);
    socket.joinConversation(vm.conversationId);
    _textController.addListener(_onTextChanged);
    locator<NotificationManager>().setCurrentConversationId(vm.conversationId);
    vm.addListener(_onInitialLoad);
  }

  void _onInitialLoad() {
    final vm = context.read<ChatViewModel>();
    if (!vm.isBusy && vm.messages.isNotEmpty) {
      _scrollToBottom();
      vm.removeListener(_onInitialLoad);
    }
  }

  @override
  void dispose() {
    final vm = context.read<ChatViewModel>();
    vm.removeListener(_onInitialLoad);
    locator<SocketService>().leaveConversation(vm.conversationId);
    _msgSub?.cancel();
    _convSub?.cancel();
    _statusSub?.cancel();
    _textController.removeListener(_onTextChanged);
    _textController.dispose();
    _scrollController.dispose();
    locator<NotificationManager>().setCurrentConversationId(null);
    super.dispose();
  }

  void _onTextChanged() {
    final text = _textController.text;
    if (text == '/') {
      final vm = context.read<ChatViewModel>();
      if (vm.quickReplies.isNotEmpty) {
        _showQuickReplyPicker(vm);
      }
    }
  }

  void _showQuickReplyPicker(ChatViewModel vm) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => QuickReplyPicker(
        quickReplies: vm.quickReplies,
        onSelected: (qr) {
          _textController.text = qr.content;
          _textController.selection = TextSelection.fromPosition(
            TextPosition(offset: _textController.text.length),
          );
        },
        onDismiss: () => Navigator.pop(context),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<ChatViewModel>();
    final isMobile = MediaQuery.of(context).size.width < 768;

    return Scaffold(
      appBar: AppAppBar(
        leading: isMobile
            ? AppIconButton(
                icon: const PhosphorIcon(PhosphorIconsRegular.arrowLeft),
                onPressed: () => context.go('/dashboard/inbox'),
              )
            : null,
        title: GestureDetector(
          onTap: vm.contact != null
              ? () => _showContactProfile(context, vm.contact!)
              : null,
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(
                vm.conversation?.contactName ?? 'Chat',
                style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
              ),
              if (vm.conversation?.contactPhone != null)
                Text(
                  vm.conversation!.contactPhone,
                  style: const TextStyle(fontSize: 12, fontWeight: FontWeight.normal),
                ),
            ],
          ),
        ),
        actions: [
          if (vm.templates.isNotEmpty)
            AppIconButton(
              icon: const PhosphorIcon(PhosphorIconsRegular.fileText),
              tooltip: 'Send Template',
              onPressed: () => _showTemplatePicker(context, vm),
            ),
          if (vm.flows.isNotEmpty)
            AppIconButton(
              icon: const PhosphorIcon(PhosphorIconsRegular.textbox),
              tooltip: 'Send Flow',
              onPressed: () => _showFlowPicker(context, vm),
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: vm.isBusy && vm.messages.isEmpty
                ? AppShimmer(
                    child: ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: 12,
                      itemBuilder: (_, index) => MessageSkeletonItem(isMe: index % 3 == 0),
                    ),
                  )
                : RefreshIndicator(
                    onRefresh: () => vm.loadMessages(),
                    child: ListView.builder(
                      controller: _scrollController,
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(12),
                      itemCount: vm.chatItems.length,
                      itemBuilder: (context, index) {
                        final item = vm.chatItems[index];
                        if (item is ChatDateItem) {
                          return _DateSeparator(date: item.date);
                        }
                        final msg = (item as ChatMessageItem).message;
                        return _MessageBubble(
                          message: msg,
                          onReaction: () => _showReactionPicker(context, vm, msg.id),
                        );
                      },
                    ),
                  ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Row(
                children: [
                  AppIconButton(
                    icon: const PhosphorIcon(PhosphorIconsRegular.paperclip),
                    onPressed: vm.isBusy ? null : () => _showAttachmentPicker(context, vm),
                  ),
                  Expanded(
                    child: AppInput(
                      controller: _textController,
                      hint: 'Type a message...',
                      borderRadius: 24,
                      contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(vm),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: vm.isBusy ? null : () => _send(vm),
                    icon: const PhosphorIcon(PhosphorIconsRegular.paperPlaneRight),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }

  void _showContactProfile(BuildContext context, Contact contact) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => ContactProfileSheet(contact: contact),
    );
  }

  void _showTemplatePicker(BuildContext context, ChatViewModel vm) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Send Template', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            const AppDivider(height: 1),
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: vm.templates.length,
                itemBuilder: (context, index) {
                  final t = vm.templates[index];
                  return AppListTile(
                    title: Text(t.templateName),
                    subtitle: Text('${t.category} • ${t.language}'),
                    onTap: () async {
                      Navigator.pop(context);
                      final windowOpen = await vm.checkTemplateWindow();
                      if (!windowOpen) {
                        if (context.mounted) {
                          ScaffoldMessenger.of(context).showSnackBar(
                            const SnackBar(content: Text('24h window closed. Template required.')),
                          );
                        }
                      }
                      vm.sendTemplate(t.templateName);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _showFlowPicker(BuildContext context, ChatViewModel vm) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Send Flow', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            const AppDivider(height: 1),
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: vm.flows.length,
                itemBuilder: (context, index) {
                  final f = vm.flows[index];
                  return AppListTile(
                    title: Text(f.name),
                    subtitle: Text(f.status),
                    onTap: () {
                      Navigator.pop(context);
                      vm.sendFlow(f.id);
                    },
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _showAttachmentPicker(BuildContext context, ChatViewModel vm) async {
    showModalBottomSheet(
      context: context,
      builder: (_) => SafeArea(
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            const Padding(
              padding: EdgeInsets.all(16),
              child: Text('Send Attachment', style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold)),
            ),
            const AppDivider(height: 1),
            ListTile(
              leading: const PhosphorIcon(PhosphorIconsRegular.file),
              title: const Text('File / Media'),
              onTap: () {
                Navigator.pop(context);
                _pickAndUploadFile(vm);
              },
            ),
            ListTile(
              leading: const PhosphorIcon(PhosphorIconsRegular.mapPin),
              title: const Text('Location'),
              onTap: () {
                Navigator.pop(context);
                _showLocationDialog(context, vm);
              },
            ),
            ListTile(
              leading: const PhosphorIcon(PhosphorIconsRegular.squaresFour),
              title: const Text('Button Message'),
              onTap: () {
                Navigator.pop(context);
                _showButtonMessageDialog(context, vm);
              },
            ),
            ListTile(
              leading: const PhosphorIcon(PhosphorIconsRegular.listDashes),
              title: const Text('List Message'),
              onTap: () {
                Navigator.pop(context);
                _showListMessageDialog(context, vm);
              },
            ),
            ListTile(
              leading: const PhosphorIcon(PhosphorIconsRegular.link),
              title: const Text('CTA URL'),
              onTap: () {
                Navigator.pop(context);
                _showCtaUrlDialog(context, vm);
              },
            ),
            ListTile(
              leading: const PhosphorIcon(PhosphorIconsRegular.addressBook),
              title: const Text('Address Message'),
              onTap: () {
                Navigator.pop(context);
                _showAddressDialog(context, vm);
              },
            ),
            ListTile(
              leading: const PhosphorIcon(PhosphorIconsRegular.sticker),
              title: const Text('Sticker'),
              onTap: () {
                Navigator.pop(context);
                _pickSticker(vm);
              },
            ),
            ListTile(
              leading: const PhosphorIcon(PhosphorIconsRegular.users),
              title: const Text('Contacts Card'),
              onTap: () {
                Navigator.pop(context);
                _showContactsDialog(context, vm);
              },
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _pickSticker(ChatViewModel vm) async {
    final result = await FilePicker.platform.pickFiles(withData: true, type: FileType.image);
    if (result == null || result.files.isEmpty) return;
    final file = result.files.first;
    if (file.bytes == null && file.path == null) return;

    final url = await vm.uploadFile(file);
    if (url != null) {
      await vm.sendInteractiveMessage('sticker', {'media_url': url});
      _scrollToBottom();
    }
  }

  Future<void> _pickAndUploadFile(ChatViewModel vm) async {
    final result = await FilePicker.platform.pickFiles(withData: true);
    if (result == null || result.files.isEmpty) return;
    final file = result.files.first;
    if (file.bytes == null && file.path == null) return;

    final url = await vm.uploadFile(file);
    if (url != null) {
      await vm.sendMessage('', mediaUrl: url);
      _scrollToBottom();
    }
  }

  void _send(ChatViewModel vm) async {
    final text = _textController.text.trim();
    if (text.isEmpty) return;
    _textController.clear();
    await vm.sendMessage(text);
    _scrollToBottom();
  }

  void _scrollToBottom() {
    WidgetsBinding.instance.addPostFrameCallback((_) {
      if (_scrollController.hasClients) {
        _scrollController.animateTo(
          _scrollController.position.maxScrollExtent,
          duration: const Duration(milliseconds: 300),
          curve: Curves.easeOut,
        );
      }
    });
  }

  void _showLocationDialog(BuildContext context, ChatViewModel vm) {
    final latController = TextEditingController();
    final lngController = TextEditingController();
    final nameController = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AppAlertDialog(
        title: const Text('Send Location'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppInput(controller: latController, label: 'Latitude'),
            const SizedBox(height: 8),
            AppInput(controller: lngController, label: 'Longitude'),
            const SizedBox(height: 8),
            AppInput(controller: nameController, label: 'Location Name (optional)'),
          ],
        ),
        actions: [
          AppButton(variant: AppButtonVariant.ghost, onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          AppButton(variant: AppButtonVariant.primary, 
            onPressed: () {
              final lat = double.tryParse(latController.text.trim());
              final lng = double.tryParse(lngController.text.trim());
              if (lat != null && lng != null) {
                Navigator.pop(context);
                vm.sendInteractiveMessage('location', {
                  'location_options': {
                    'latitude': lat,
                    'longitude': lng,
                    'name': nameController.text.trim().isEmpty ? null : nameController.text.trim(),
                  },
                });
              }
            },
            child: const Text('Send'),
          ),
        ],
      ),
    );
  }

  void _showButtonMessageDialog(BuildContext context, ChatViewModel vm) {
    final bodyController = TextEditingController();
    final buttonController = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AppAlertDialog(
        title: const Text('Send Button Message'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppInput(controller: bodyController, label: 'Body text'),
            const SizedBox(height: 8),
            AppInput(controller: buttonController, label: 'Button text'),
          ],
        ),
        actions: [
          AppButton(variant: AppButtonVariant.ghost, onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          AppButton(variant: AppButtonVariant.primary, 
            onPressed: () {
              if (bodyController.text.trim().isNotEmpty && buttonController.text.trim().isNotEmpty) {
                Navigator.pop(context);
                vm.sendInteractiveMessage('button', {
                  'content': bodyController.text.trim(),
                  'reply_buttons_options': {
                    'buttons': [
                      {'type': 'reply', 'reply': {'id': 'btn_1', 'title': buttonController.text.trim()}}
                    ],
                  },
                });
              }
            },
            child: const Text('Send'),
          ),
        ],
      ),
    );
  }

  void _showListMessageDialog(BuildContext context, ChatViewModel vm) {
    final bodyController = TextEditingController();
    final buttonController = TextEditingController();
    final itemsController = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AppAlertDialog(
        title: const Text('Send List Message'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppInput(controller: bodyController, label: 'Body text'),
            const SizedBox(height: 8),
            AppInput(controller: buttonController, label: 'Button text'),
            const SizedBox(height: 8),
            AppInput(controller: itemsController, label: 'Items (one per line)'),
          ],
        ),
        actions: [
          AppButton(variant: AppButtonVariant.ghost, onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          AppButton(variant: AppButtonVariant.primary, 
            onPressed: () {
              if (bodyController.text.trim().isNotEmpty && buttonController.text.trim().isNotEmpty && itemsController.text.trim().isNotEmpty) {
                Navigator.pop(context);
                final rows = itemsController.text.trim().split('\n').where((s) => s.isNotEmpty).toList();
                vm.sendInteractiveMessage('list', {
                  'content': bodyController.text.trim(),
                  'list_options': {
                    'button': buttonController.text.trim(),
                    'sections': [
                      {
                        'title': 'Options',
                        'rows': rows.asMap().entries.map((e) => {
                          'id': 'row_${e.key}',
                          'title': e.value,
                        }).toList(),
                      }
                    ],
                  },
                });
              }
            },
            child: const Text('Send'),
          ),
        ],
      ),
    );
  }

  void _showCtaUrlDialog(BuildContext context, ChatViewModel vm) {
    final bodyController = TextEditingController();
    final titleController = TextEditingController();
    final urlController = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AppAlertDialog(
        title: const Text('Send CTA URL'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppInput(controller: bodyController, label: 'Body text'),
            const SizedBox(height: 8),
            AppInput(controller: titleController, label: 'Button title'),
            const SizedBox(height: 8),
            AppInput(controller: urlController, label: 'URL'),
          ],
        ),
        actions: [
          AppButton(variant: AppButtonVariant.ghost, onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          AppButton(variant: AppButtonVariant.primary, 
            onPressed: () {
              if (bodyController.text.trim().isNotEmpty && titleController.text.trim().isNotEmpty && urlController.text.trim().isNotEmpty) {
                Navigator.pop(context);
                vm.sendInteractiveMessage('cta_url', {
                  'content': bodyController.text.trim(),
                  'cta_url_options': {
                    'display_text': titleController.text.trim(),
                    'url': urlController.text.trim(),
                  },
                });
              }
            },
            child: const Text('Send'),
          ),
        ],
      ),
    );
  }

  void _showAddressDialog(BuildContext context, ChatViewModel vm) {
    showDialog(
      context: context,
      builder: (_) => AppAlertDialog(
        title: const Text('Send Address Request'),
        content: const Text('This will request the customer to share their address.'),
        actions: [
          AppButton(variant: AppButtonVariant.ghost, onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          AppButton(variant: AppButtonVariant.primary, 
            onPressed: () {
              Navigator.pop(context);
              vm.sendInteractiveMessage('address_message', {
                'address_options': {'country': 'IN', 'type': 'home'},
              });
            },
            child: const Text('Send'),
          ),
        ],
      ),
    );
  }

  void _showReactionPicker(BuildContext context, ChatViewModel vm, String messageId) {
    final emojis = ['👍', '❤️', '😂', '😮', '😢', '🙏'];
    showModalBottomSheet(
      context: context,
      builder: (_) => SafeArea(
        child: Padding(
          padding: const EdgeInsets.all(16),
          child: Wrap(
            spacing: 16,
            alignment: WrapAlignment.center,
            children: emojis.map((emoji) => GestureDetector(
              onTap: () {
                Navigator.pop(context);
                vm.sendReaction(messageId, emoji);
              },
              child: Text(emoji, style: const TextStyle(fontSize: 32)),
            )).toList(),
          ),
        ),
      ),
    );
  }

  void _showContactsDialog(BuildContext context, ChatViewModel vm) {
    final nameController = TextEditingController();
    final phoneController = TextEditingController();
    showDialog(
      context: context,
      builder: (_) => AppAlertDialog(
        title: const Text('Send Contact Card'),
        content: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            AppInput(controller: nameController, label: 'Name'),
            const SizedBox(height: 8),
            AppInput(controller: phoneController, label: 'Phone'),
          ],
        ),
        actions: [
          AppButton(variant: AppButtonVariant.ghost, onPressed: () => Navigator.pop(context), child: const Text('Cancel')),
          AppButton(variant: AppButtonVariant.primary, 
            onPressed: () {
              if (nameController.text.trim().isNotEmpty && phoneController.text.trim().isNotEmpty) {
                Navigator.pop(context);
                vm.sendInteractiveMessage('contacts', {
                  'contacts': [
                    {
                      'name': {'formatted_name': nameController.text.trim()},
                      'phones': [{'phone': phoneController.text.trim(), 'type': 'MOBILE'}],
                    }
                  ],
                });
              }
            },
            child: const Text('Send'),
          ),
        ],
      ),
    );
  }
}

class _DateSeparator extends StatelessWidget {
  final DateTime date;
  const _DateSeparator({required this.date});

  @override
  Widget build(BuildContext context) {
    final now = DateTime.now();
    final today = DateTime(now.year, now.month, now.day);
    final yesterday = today.subtract(const Duration(days: 1));
    final target = DateTime(date.year, date.month, date.day);

    String label;
    if (target == today) {
      label = 'Today';
    } else if (target == yesterday) {
      label = 'Yesterday';
    } else {
      label = DateFormat('MMMM d, yyyy').format(date);
    }

    return Center(
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 12),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 4),
        decoration: BoxDecoration(
          color: Colors.grey.shade300,
          borderRadius: BorderRadius.circular(12),
        ),
        child: Text(
          label,
          style: const TextStyle(fontSize: 12, color: Colors.black54),
        ),
      ),
    );
  }
}

class _MessageBubble extends StatelessWidget {
  final Message message;
  final VoidCallback? onReaction;
  const _MessageBubble({required this.message, this.onReaction});

  @override
  Widget build(BuildContext context) {
    final isMe = message.senderType == 'agent';
    final hasMedia = message.mediaUrl != null && message.mediaUrl!.isNotEmpty;
    final isMediaMessage = hasMedia || (message.messageType != null && message.messageType != 'text');
    final isDark = Theme.of(context).brightness == Brightness.dark;

    final bubbleColor = isMe
        ? (isDark ? const Color(0xFF14532D) : const Color(0xFFDCF8C6))
        : Theme.of(context).colorScheme.surfaceContainerHighest;
    final textColor = isMe
        ? (isDark ? Colors.white : Colors.black87)
        : Theme.of(context).colorScheme.onSurface;

    final bubble = Container(
      margin: const EdgeInsets.symmetric(vertical: 4),
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
      decoration: BoxDecoration(
        color: bubbleColor,
        borderRadius: BorderRadius.circular(12),
        boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)],
      ),
      constraints: BoxConstraints(maxWidth: (MediaQuery.of(context).size.width * 0.75).clamp(0, 480)),
      child: Column(
        crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
        children: [
          if (isMediaMessage) _MediaContent(message: message),
          if (message.content.isNotEmpty)
            SelectableText(
              message.content,
              style: TextStyle(color: textColor),
            ),
          const SizedBox(height: 4),
          Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Text(
                _formatTime(message.createdAt),
                style: TextStyle(fontSize: 11, color: textColor.withValues(alpha: 0.6)),
              ),
              if (isMe) ...[
                const SizedBox(width: 4),
                _StatusIcon(status: message.status),
              ],
            ],
          ),
        ],
      ),
    );

    if (onReaction == null) {
      return Align(alignment: isMe ? Alignment.centerRight : Alignment.centerLeft, child: bubble);
    }

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: GestureDetector(
        onLongPress: onReaction,
        child: bubble,
      ),
    );
  }

  String _formatTime(String iso) {
    try {
      final dt = DateTime.parse(iso);
      return DateFormat('HH:mm').format(dt);
    } catch (_) {
      return iso;
    }
  }
}

class _MediaContent extends StatelessWidget {
  final Message message;
  const _MediaContent({required this.message});

  @override
  Widget build(BuildContext context) {
    final type = message.messageType?.toLowerCase() ?? '';
    final url = message.mediaUrl;
    final filename = message.filename ?? 'File';

    if (url == null || url.isEmpty) return const SizedBox.shrink();

    if (type == 'image' || type == 'sticker') {
      return Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: GestureDetector(
          onTap: () => _showImagePreview(context, url),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              url,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => _FallbackFile(filename: filename, icon: PhosphorIconsRegular.image),
            ),
          ),
        ),
      );
    }

    if (type == 'video') {
      return Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: _VideoPlayerWidget(url: url),
      );
    }

    if (type == 'audio' || message.voice == true) {
      return Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: _AudioPlayerWidget(url: url, isVoice: message.voice == true),
      );
    }

    IconData icon;
    Color color;
    if (type == 'document') {
      icon = PhosphorIconsRegular.file;
      color = Colors.blue;
    } else {
      icon = PhosphorIconsRegular.paperclip;
      color = Colors.grey;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: GestureDetector(
        onTap: () => _openUrl(url),
        child: Container(
          padding: const EdgeInsets.all(10),
          decoration: BoxDecoration(
            color: Colors.black.withValues(alpha: 0.05),
            borderRadius: BorderRadius.circular(8),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(icon, color: color),
              const SizedBox(width: 8),
              Flexible(
                child: Text(
                  filename,
                  style: const TextStyle(decoration: TextDecoration.underline),
                  overflow: TextOverflow.ellipsis,
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _showImagePreview(BuildContext context, String url) {
    showDialog(
      context: context,
      builder: (_) => Dialog.fullscreen(
        backgroundColor: Colors.black,
        child: Stack(
          children: [
            InteractiveViewer(
              minScale: 0.5,
              maxScale: 4,
              child: Center(
                child: Image.network(
                  url,
                  fit: BoxFit.contain,
                  errorBuilder: (_, _, _) => const Icon(Icons.broken_image, color: Colors.white, size: 64),
                ),
              ),
            ),
            Positioned(
              top: 16,
              right: 16,
              child: SafeArea(
                child: IconButton(
                  icon: const Icon(Icons.close, color: Colors.white, size: 28),
                  onPressed: () => Navigator.pop(context),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  Future<void> _openUrl(String url) async {
    final uri = Uri.parse(url);
    if (await canLaunchUrl(uri)) {
      await launchUrl(uri, mode: LaunchMode.externalApplication);
    }
  }
}

class _FallbackFile extends StatelessWidget {
  final String filename;
  final IconData icon;
  const _FallbackFile({required this.filename, required this.icon});

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.all(16),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Icon(icon),
          const SizedBox(width: 8),
          Flexible(child: Text(filename)),
        ],
      ),
    );
  }
}

class _AudioPlayerWidget extends StatefulWidget {
  final String url;
  final bool isVoice;
  const _AudioPlayerWidget({required this.url, this.isVoice = false});

  @override
  State<_AudioPlayerWidget> createState() => _AudioPlayerWidgetState();
}

class _AudioPlayerWidgetState extends State<_AudioPlayerWidget> {
  final AudioPlayer _player = AudioPlayer();
  PlayerState _state = PlayerState.stopped;
  Duration _position = Duration.zero;
  Duration _duration = Duration.zero;
  double _speed = 1.0;
  final List<double> _speeds = [1.0, 1.5, 2.0, 3.0];

  @override
  void initState() {
    super.initState();
    _player.onPlayerStateChanged.listen((s) {
      if (mounted) setState(() => _state = s);
    });
    _player.onPositionChanged.listen((p) {
      if (mounted) setState(() => _position = p);
    });
    _player.onDurationChanged.listen((d) {
      if (mounted) setState(() => _duration = d);
    });
  }

  @override
  void dispose() {
    _player.dispose();
    super.dispose();
  }

  Future<void> _togglePlay() async {
    if (_state == PlayerState.playing) {
      await _player.pause();
    } else {
      await _player.setPlaybackRate(_speed);
      await _player.play(UrlSource(widget.url));
    }
  }

  void _cycleSpeed() {
    final idx = _speeds.indexOf(_speed);
    final next = _speeds[(idx + 1) % _speeds.length];
    setState(() => _speed = next);
    _player.setPlaybackRate(next);
  }

  String _formatDuration(Duration d) {
    final m = d.inMinutes.remainder(60).toString().padLeft(2, '0');
    final s = d.inSeconds.remainder(60).toString().padLeft(2, '0');
    return '$m:$s';
  }

  @override
  Widget build(BuildContext context) {
    final isPlaying = _state == PlayerState.playing;
    final progress = _duration.inMilliseconds > 0
        ? _position.inMilliseconds / _duration.inMilliseconds
        : 0.0;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: Colors.black.withValues(alpha: 0.05),
        borderRadius: BorderRadius.circular(8),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            icon: Icon(isPlaying ? Icons.pause : Icons.play_arrow, size: 20),
            onPressed: _togglePlay,
            padding: EdgeInsets.zero,
            constraints: const BoxConstraints(minWidth: 32, minHeight: 32),
          ),
          SizedBox(
            width: 120,
            child: Column(
              mainAxisSize: MainAxisSize.min,
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                LinearProgressIndicator(
                  value: progress.clamp(0.0, 1.0),
                  minHeight: 3,
                  backgroundColor: Colors.grey.shade300,
                  valueColor: AlwaysStoppedAnimation(Theme.of(context).colorScheme.primary),
                ),
                const SizedBox(height: 2),
                Text(
                  '${_formatDuration(_position)} / ${_formatDuration(_duration)}',
                  style: TextStyle(fontSize: 10, color: Colors.grey.shade600),
                ),
              ],
            ),
          ),
          const SizedBox(width: 4),
          GestureDetector(
            onTap: _cycleSpeed,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 6, vertical: 2),
              decoration: BoxDecoration(
                color: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
                borderRadius: BorderRadius.circular(4),
              ),
              child: Text(
                '${_speed.toStringAsFixed(_speed == 1 || _speed == 2 || _speed == 3 ? 0 : 1)}x',
                style: TextStyle(
                  fontSize: 11,
                  fontWeight: FontWeight.bold,
                  color: Theme.of(context).colorScheme.primary,
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _VideoPlayerWidget extends StatefulWidget {
  final String url;
  const _VideoPlayerWidget({required this.url});

  @override
  State<_VideoPlayerWidget> createState() => _VideoPlayerWidgetState();
}

class _VideoPlayerWidgetState extends State<_VideoPlayerWidget> {
  VideoPlayerController? _controller;
  bool _isInitialized = false;
  bool _hasError = false;

  @override
  void initState() {
    super.initState();
    _initVideo();
  }

  Future<void> _initVideo() async {
    try {
      _controller = VideoPlayerController.networkUrl(Uri.parse(widget.url));
      await _controller!.initialize();
      if (mounted) setState(() => _isInitialized = true);
    } catch (_) {
      if (mounted) setState(() => _hasError = true);
    }
  }

  @override
  void dispose() {
    _controller?.dispose();
    super.dispose();
  }

  void _togglePlay() {
    if (_controller == null) return;
    if (_controller!.value.isPlaying) {
      _controller!.pause();
    } else {
      _controller!.play();
    }
    setState(() {});
  }

  void _toggleFullScreen() {
    if (_controller == null) return;
    showDialog(
      context: context,
      builder: (_) => Dialog.fullscreen(
        backgroundColor: Colors.black,
        child: Stack(
          children: [
            Center(
              child: AspectRatio(
                aspectRatio: _controller!.value.aspectRatio,
                child: VideoPlayer(_controller!),
              ),
            ),
            Positioned(
              top: 16,
              right: 16,
              child: SafeArea(
                child: IconButton(
                  icon: const Icon(Icons.close, color: Colors.white, size: 28),
                  onPressed: () => Navigator.pop(context),
                ),
              ),
            ),
            Positioned(
              bottom: 40,
              left: 0,
              right: 0,
              child: Center(
                child: FloatingActionButton(
                  onPressed: _togglePlay,
                  backgroundColor: Colors.white.withValues(alpha: 0.8),
                  child: Icon(
                    _controller!.value.isPlaying ? Icons.pause : Icons.play_arrow,
                    color: Colors.black,
                  ),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    if (_hasError) {
      return const _FallbackFile(filename: 'Video', icon: PhosphorIconsRegular.videoCamera);
    }
    if (!_isInitialized || _controller == null) {
      return Container(
        width: 200,
        height: 120,
        decoration: BoxDecoration(
          color: Colors.black.withValues(alpha: 0.05),
          borderRadius: BorderRadius.circular(8),
        ),
        child: const Center(child: SizedBox(width: 24, height: 24, child: CircularProgressIndicator(strokeWidth: 2))),
      );
    }

    return GestureDetector(
      onTap: _toggleFullScreen,
      child: ClipRRect(
        borderRadius: BorderRadius.circular(8),
        child: Stack(
          alignment: Alignment.center,
          children: [
            AspectRatio(
              aspectRatio: max(_controller!.value.aspectRatio, 0.5),
              child: VideoPlayer(_controller!),
            ),
            if (!_controller!.value.isPlaying)
              Container(
                decoration: BoxDecoration(
                  color: Colors.black.withValues(alpha: 0.3),
                  shape: BoxShape.circle,
                ),
                child: const Icon(Icons.play_arrow, color: Colors.white, size: 40),
              ),
            Positioned(
              bottom: 4,
              right: 4,
              child: GestureDetector(
                onTap: () {
                  _togglePlay();
                  _toggleFullScreen();
                },
                child: Container(
                  padding: const EdgeInsets.all(4),
                  decoration: BoxDecoration(
                    color: Colors.black.withValues(alpha: 0.5),
                    borderRadius: BorderRadius.circular(4),
                  ),
                  child: const Icon(Icons.fullscreen, color: Colors.white, size: 18),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class _StatusIcon extends StatelessWidget {
  final String? status;
  const _StatusIcon({this.status});

  @override
  Widget build(BuildContext context) {
    switch (status?.toLowerCase()) {
      case 'read':
        return const PhosphorIcon(PhosphorIconsRegular.checks, size: 14, color: Colors.blue);
      case 'delivered':
        return const PhosphorIcon(PhosphorIconsRegular.checks, size: 14, color: Colors.grey);
      case 'sent':
        return const PhosphorIcon(PhosphorIconsRegular.check, size: 14, color: Colors.grey);
      case 'failed':
        return const PhosphorIcon(PhosphorIconsRegular.warningCircle, size: 14, color: Colors.red);
      default:
        return const PhosphorIcon(PhosphorIconsRegular.clock, size: 14, color: Colors.grey);
    }
  }
}
