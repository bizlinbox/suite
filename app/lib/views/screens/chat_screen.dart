import 'dart:async';
import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import 'package:file_picker/file_picker.dart';
import 'package:url_launcher/url_launcher.dart';
import 'package:intl/intl.dart';
import 'package:dio/dio.dart';
import '../../core/di.dart';
import '../../core/services/api_service.dart';
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
        _messages.add(msg);
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
      setError('Upload failed: $e');
      return null;
    }
  }

  Future<void> sendTemplate(String templateName, {Map<String, dynamic>? variables}) async {
    setBusy();
    final result = await _convRepo.sendTemplate(conversationId, templateName, variables: variables);
    result.when(
      success: (msg) => _messages.add(msg),
      error: (message, exception) {},
    );
    setIdle();
  }

  Future<void> sendFlow(String flowId, {Map<String, dynamic>? parameters}) async {
    setBusy();
    final result = await _convRepo.sendFlow(conversationId, flowId, parameters: parameters);
    result.when(
      success: (msg) => _messages.add(msg),
      error: (message, exception) {},
    );
    setIdle();
  }

  void handleNewMessage(Map<String, dynamic> data) {
    try {
      final msg = Message.fromJson(data);
      if (msg.conversationId == conversationId) {
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
      child: const _ChatBody(),
    );
  }
}

class _ChatBody extends StatefulWidget {
  const _ChatBody();

  @override
  State<_ChatBody> createState() => _ChatBodyState();
}

class _ChatBodyState extends State<_ChatBody> {
  final _textController = TextEditingController();
  final _scrollController = ScrollController();
  StreamSubscription? _msgSub;
  StreamSubscription? _convSub;

  @override
  void initState() {
    super.initState();
    final vm = context.read<ChatViewModel>();
    final socket = locator<SocketService>();
    _msgSub = socket.onNewMessage.listen(vm.handleNewMessage);
    _convSub = socket.onConversationUpdated.listen(vm.handleConversationUpdated);
    _textController.addListener(_onTextChanged);
    locator<NotificationManager>().setCurrentConversationId(vm.conversationId);
  }

  @override
  void dispose() {
    _msgSub?.cancel();
    _convSub?.cancel();
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
      appBar: AppBar(
        leading: isMobile
            ? IconButton(
                icon: const Icon(Icons.arrow_back),
                onPressed: () => context.go('/dashboard/inbox'),
              )
            : null,
        title: InkWell(
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
            IconButton(
              icon: const Icon(Icons.description),
              tooltip: 'Send Template',
              onPressed: () => _showTemplatePicker(context, vm),
            ),
          if (vm.flows.isNotEmpty)
            IconButton(
              icon: const Icon(Icons.input),
              tooltip: 'Send Flow',
              onPressed: () => _showFlowPicker(context, vm),
            ),
        ],
      ),
      body: Column(
        children: [
          Expanded(
            child: vm.isBusy && vm.messages.isEmpty
                ? const Center(child: CircularProgressIndicator())
                : ListView.builder(
                    controller: _scrollController,
                    padding: const EdgeInsets.all(12),
                    itemCount: vm.chatItems.length,
                    itemBuilder: (context, index) {
                      final item = vm.chatItems[index];
                      if (item is ChatDateItem) {
                        return _DateSeparator(date: item.date);
                      }
                      final msg = (item as ChatMessageItem).message;
                      return _MessageBubble(message: msg);
                    },
                  ),
          ),
          SafeArea(
            child: Padding(
              padding: const EdgeInsets.all(8),
              child: Row(
                children: [
                  IconButton(
                    icon: const Icon(Icons.attach_file),
                    onPressed: vm.isBusy ? null : () => _pickAndUploadFile(vm),
                  ),
                  Expanded(
                    child: TextField(
                      controller: _textController,
                      decoration: InputDecoration(
                        hintText: 'Type a message...',
                        border: OutlineInputBorder(borderRadius: BorderRadius.circular(24)),
                        contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                      ),
                      textInputAction: TextInputAction.send,
                      onSubmitted: (_) => _send(vm),
                    ),
                  ),
                  const SizedBox(width: 8),
                  IconButton.filled(
                    onPressed: vm.isBusy ? null : () => _send(vm),
                    icon: const Icon(Icons.send),
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
            const Divider(height: 1),
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: vm.templates.length,
                itemBuilder: (context, index) {
                  final t = vm.templates[index];
                  return ListTile(
                    title: Text(t.templateName),
                    subtitle: Text('${t.category} • ${t.language}'),
                    onTap: () {
                      Navigator.pop(context);
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
            const Divider(height: 1),
            Flexible(
              child: ListView.builder(
                shrinkWrap: true,
                itemCount: vm.flows.length,
                itemBuilder: (context, index) {
                  final f = vm.flows[index];
                  return ListTile(
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
  const _MessageBubble({required this.message});

  @override
  Widget build(BuildContext context) {
    final isMe = message.senderType == 'agent';
    final hasMedia = message.mediaUrl != null && message.mediaUrl!.isNotEmpty;
    final isMediaMessage = hasMedia || (message.messageType != null && message.messageType != 'text');

    return Align(
      alignment: isMe ? Alignment.centerRight : Alignment.centerLeft,
      child: Container(
        margin: const EdgeInsets.symmetric(vertical: 4),
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
        decoration: BoxDecoration(
          color: isMe ? const Color(0xFFDCF8C6) : Theme.of(context).colorScheme.surfaceContainerHighest,
          borderRadius: BorderRadius.circular(12),
          boxShadow: [BoxShadow(color: Colors.black.withValues(alpha: 0.05), blurRadius: 4)],
        ),
        constraints: BoxConstraints(maxWidth: MediaQuery.of(context).size.width * 0.75),
        child: Column(
          crossAxisAlignment: isMe ? CrossAxisAlignment.end : CrossAxisAlignment.start,
          children: [
            if (isMediaMessage) _MediaContent(message: message),
            if (message.content.isNotEmpty)
              SelectableText(
                message.content,
                style: TextStyle(color: isMe ? Colors.black87 : Theme.of(context).colorScheme.onSurface),
              ),
            const SizedBox(height: 4),
            Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                Text(
                  _formatTime(message.createdAt),
                  style: const TextStyle(fontSize: 11, color: Colors.grey),
                ),
                if (isMe) ...[
                  const SizedBox(width: 4),
                  _StatusIcon(status: message.status),
                ],
              ],
            ),
          ],
        ),
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

    if (type == 'image') {
      return Padding(
        padding: const EdgeInsets.only(bottom: 4),
        child: GestureDetector(
          onTap: () => _openUrl(url),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(8),
            child: Image.network(
              url,
              fit: BoxFit.cover,
              errorBuilder: (_, _, _) => _FallbackFile(filename: filename, icon: Icons.image),
            ),
          ),
        ),
      );
    }

    IconData icon;
    Color color;
    if (type == 'video') {
      icon = Icons.videocam;
      color = Colors.red;
    } else if (type == 'audio' || message.voice == true) {
      icon = Icons.audiotrack;
      color = Colors.orange;
    } else if (type == 'document') {
      icon = Icons.insert_drive_file;
      color = Colors.blue;
    } else {
      icon = Icons.attach_file;
      color = Colors.grey;
    }

    return Padding(
      padding: const EdgeInsets.only(bottom: 4),
      child: InkWell(
        onTap: () => _openUrl(url),
        borderRadius: BorderRadius.circular(8),
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

class _StatusIcon extends StatelessWidget {
  final String? status;
  const _StatusIcon({this.status});

  @override
  Widget build(BuildContext context) {
    switch (status?.toLowerCase()) {
      case 'read':
        return const Icon(Icons.done_all, size: 14, color: Colors.blue);
      case 'delivered':
        return const Icon(Icons.done_all, size: 14, color: Colors.grey);
      case 'sent':
        return const Icon(Icons.done, size: 14, color: Colors.grey);
      case 'failed':
        return const Icon(Icons.error_outline, size: 14, color: Colors.red);
      default:
        return const Icon(Icons.schedule, size: 14, color: Colors.grey);
    }
  }
}
