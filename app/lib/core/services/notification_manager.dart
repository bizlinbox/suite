import 'dart:async';
import 'package:audioplayers/audioplayers.dart';
import 'package:flutter/foundation.dart';
import 'socket_service.dart';
import 'local_storage_service.dart';
import 'local_notification_service.dart';

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
  final LocalNotificationService _localNotifications;

  StreamSubscription? _msgSub;
  StreamSubscription? _convSub;
  String? _currentConversationId;

  final _notificationController = StreamController<NotificationEvent>.broadcast();
  Stream<NotificationEvent> get onNotification => _notificationController.stream;

  final _audioPlayer = AudioPlayer();
  int _notificationId = 0;

  NotificationManager(this._socket, this._storage, this._localNotifications);

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
    _audioPlayer.dispose();
  }

  Future<void> _playNotificationSound() async {
    try {
      await _audioPlayer.play(AssetSource('assets/sounds/notification.mp3'));
    } catch (_) {}
  }

  Future<void> _showLocalNotification({
    required String conversationId,
    required String contactName,
    String? content,
  }) async {
    if (kIsWeb) return;
    _notificationId++;
    await _localNotifications.showMessageNotification(
      id: _notificationId,
      conversationId: conversationId,
      contactName: contactName,
      content: content,
    );
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

        _playNotificationSound();

        _showLocalNotification(
          conversationId: conversationId ?? '',
          contactName: contactName,
          content: preview,
        );

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

