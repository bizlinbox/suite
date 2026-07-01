import 'dart:async';
import 'dart:io';
import 'package:flutter/foundation.dart';
import 'package:flutter_local_notifications/flutter_local_notifications.dart';

class NotificationPayload {
  final String conversationId;
  final String contactName;
  final String? content;

  NotificationPayload({
    required this.conversationId,
    required this.contactName,
    this.content,
  });

  Map<String, String> toMap() {
    final map = <String, String>{
      'conversationId': conversationId,
      'contactName': contactName,
    };
    final c = content;
    if (c != null) map['content'] = c;
    return map;
  }

  factory NotificationPayload.fromMap(Map<String, String> map) {
    return NotificationPayload(
      conversationId: map['conversationId'] ?? '',
      contactName: map['contactName'] ?? '',
      content: map['content'],
    );
  }
}

class LocalNotificationService {
  static final LocalNotificationService _instance = LocalNotificationService._internal();
  factory LocalNotificationService() => _instance;
  LocalNotificationService._internal();

  final FlutterLocalNotificationsPlugin _plugin = FlutterLocalNotificationsPlugin();

  final _tapController = StreamController<NotificationPayload>.broadcast();
  Stream<NotificationPayload> get onTap => _tapController.stream;

  final _replyController = StreamController<Map<String, String>>.broadcast();
  Stream<Map<String, String>> get onReply => _replyController.stream;

  bool _initialized = false;

  Future<void> init() async {
    if (_initialized || kIsWeb) return;

    const androidSettings = AndroidInitializationSettings('@mipmap/ic_launcher');
    final darwinSettings = DarwinInitializationSettings(
      requestAlertPermission: true,
      requestBadgePermission: true,
      requestSoundPermission: true,
      notificationCategories: [
        DarwinNotificationCategory(
          'message_category',
          actions: [
            DarwinNotificationAction.text(
              'reply_action',
              'Reply',
              buttonTitle: 'Send',
              placeholder: 'Type a reply...',
              options: <DarwinNotificationActionOption>{
                DarwinNotificationActionOption.authenticationRequired,
              },
            ),
          ],
          options: <DarwinNotificationCategoryOption>{
            DarwinNotificationCategoryOption.allowAnnouncement,
          },
        ),
      ],
    );

    final initSettings = InitializationSettings(
      android: androidSettings,
      iOS: darwinSettings,
      macOS: darwinSettings,
    );

    await _plugin.initialize(
      initSettings,
      onDidReceiveNotificationResponse: _onNotificationResponse,
    );

    _initialized = true;
  }

  void _onNotificationResponse(NotificationResponse response) {
    final payload = response.payload;
    if (payload == null || payload.isEmpty) return;

    final map = _decodePayload(payload);

    if (response.notificationResponseType ==
        NotificationResponseType.selectedNotification) {
      // User tapped the notification body
      _tapController.add(NotificationPayload.fromMap(map));
    } else if (response.actionId == 'reply_action') {
      // User submitted a quick reply
      final replyText = response.input;
      if (replyText != null && replyText.isNotEmpty) {
        _replyController.add({
          ...map,
          'reply': replyText,
        });
      }
    }
  }

  Future<bool> requestPermissions() async {
    if (kIsWeb || !Platform.isIOS && !Platform.isAndroid) return false;

    if (Platform.isIOS) {
      final result = await _plugin
          .resolvePlatformSpecificImplementation<IOSFlutterLocalNotificationsPlugin>()
          ?.requestPermissions(
            alert: true,
            badge: true,
            sound: true,
          );
      return result ?? false;
    }

    if (Platform.isAndroid) {
      final androidPlugin = _plugin
          .resolvePlatformSpecificImplementation<AndroidFlutterLocalNotificationsPlugin>();
      final result = await androidPlugin?.requestNotificationsPermission();
      return result ?? false;
    }

    return false;
  }

  Future<void> showMessageNotification({
    required int id,
    required String conversationId,
    required String contactName,
    String? content,
  }) async {
    if (kIsWeb || !_initialized) return;

    final payload = NotificationPayload(
      conversationId: conversationId,
      contactName: contactName,
      content: content,
    ).toMap();

    final androidDetails = AndroidNotificationDetails(
      'bizlinbox_messages',
      'Messages',
      channelDescription: 'New message notifications',
      importance: Importance.high,
      priority: Priority.high,
      showWhen: true,
      enableVibration: true,
      category: AndroidNotificationCategory.message,
      actions: [
        const AndroidNotificationAction(
          'reply_action',
          'Reply',
          showsUserInterface: true,
          allowGeneratedReplies: true,
          inputs: [
            AndroidNotificationActionInput(
              label: 'Type a reply...',
            ),
          ],
        ),
      ],
    );

    const darwinDetails = DarwinNotificationDetails(
      categoryIdentifier: 'message_category',
      presentAlert: true,
      presentBadge: true,
      presentSound: true,
    );

    final details = NotificationDetails(
      android: androidDetails,
      iOS: darwinDetails,
      macOS: darwinDetails,
    );

    await _plugin.show(
      id,
      contactName,
      content ?? 'New message',
      details,
      payload: _encodePayload(payload),
    );
  }

  String _encodePayload(Map<String, String> map) {
    return map.entries.map((e) => '${Uri.encodeComponent(e.key)}=${Uri.encodeComponent(e.value)}').join('&');
  }

  Map<String, String> _decodePayload(String payload) {
    final result = <String, String>{};
    for (final part in payload.split('&')) {
      final idx = part.indexOf('=');
      if (idx > 0) {
        result[Uri.decodeComponent(part.substring(0, idx))] =
            Uri.decodeComponent(part.substring(idx + 1));
      }
    }
    return result;
  }

  void dispose() {
    _tapController.close();
    _replyController.close();
  }
}
