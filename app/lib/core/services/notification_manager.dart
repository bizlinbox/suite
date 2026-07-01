import 'dart:async';
import 'socket_service.dart';
import 'local_storage_service.dart';

class NotificationEvent {
  final String type;
  final String title;
  final String body;
  final Map<String, dynamic> data;

  NotificationEvent({
    required this.type,
    required this.title,
    required this.body,
    required this.data,
  });
}

class NotificationManager {
  final SocketService _socket;
  final LocalStorageService _storage;

  StreamSubscription? _msgSub;
  StreamSubscription? _convSub;
  String? _currentConversationId;

  final _notificationController = StreamController<NotificationEvent>.broadcast();
  Stream<NotificationEvent> get onNotification => _notificationController.stream;

  NotificationManager(this._socket, this._storage);

  void setCurrentConversationId(String? id) {
    _currentConversationId = id;
  }

  void start() {
    _msgSub = _socket.onNewMessage.listen(_handleNewMessage);
    _convSub = _socket.onConversationUpdated.listen(_handleConversationUpdated);
  }

  void stop() {
    _msgSub?.cancel();
    _convSub?.cancel();
    _msgSub = null;
    _convSub = null;
  }

  void dispose() {
    stop();
    _notificationController.close();
  }

  void _handleNewMessage(Map<String, dynamic> data) {
    final senderType = data['senderType'] as String? ?? data['sender_type'] as String?;
    final conversationId = data['conversationId'] as String? ?? data['conversation_id'] as String?;

    if (senderType == 'contact') {
      final enabled = _storage.getNotificationsEnabled();
      if (enabled) {
        // Don't notify if user is currently viewing this conversation
        if (_currentConversationId != null && _currentConversationId == conversationId) {
          return;
        }

        final contactName = data['contactName'] as String? ?? data['contact_name'] as String? ?? 'New message';
        final preview = data['content'] as String? ?? data['preview'] as String? ?? '';

        _notificationController.add(NotificationEvent(
          type: 'new_message',
          title: contactName,
          body: preview,
          data: data,
        ));
      }
    }
  }

  void _handleConversationUpdated(Map<String, dynamic> data) {
    // Conversation updates are handled by the InboxViewModel directly
  }
}

