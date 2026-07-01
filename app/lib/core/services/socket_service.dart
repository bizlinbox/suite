import 'dart:async';
import 'package:flutter/foundation.dart';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'local_storage_service.dart';

class SocketService {
  final LocalStorageService _localStorage;
  io.Socket? _socket;

  final _newMessageController = StreamController<Map<String, dynamic>>.broadcast();
  final _conversationUpdatedController = StreamController<Map<String, dynamic>>.broadcast();
  final _messageStatusUpdatedController = StreamController<Map<String, dynamic>>.broadcast();
  final _automationUpdatedController = StreamController<Map<String, dynamic>>.broadcast();
  final _newApiLogController = StreamController<Map<String, dynamic>>.broadcast();
  final _connectionStateController = StreamController<bool>.broadcast();
  final _authErrorController = StreamController<String>.broadcast();

  Stream<Map<String, dynamic>> get onNewMessage => _newMessageController.stream;
  Stream<Map<String, dynamic>> get onConversationUpdated => _conversationUpdatedController.stream;
  Stream<Map<String, dynamic>> get onMessageStatusUpdated => _messageStatusUpdatedController.stream;
  Stream<Map<String, dynamic>> get onAutomationUpdated => _automationUpdatedController.stream;
  Stream<Map<String, dynamic>> get onNewApiLog => _newApiLogController.stream;
  Stream<bool> get onConnectionState => _connectionStateController.stream;
  Stream<String> get onAuthError => _authErrorController.stream;

  bool get isConnected => _socket?.connected ?? false;

  SocketService(this._localStorage);

  void connect() {
    if (_socket != null) {
      disconnect();
    }

    final domain = _localStorage.getDomain();
    if (domain == null || domain.isEmpty) return;

    final baseUrl = domain.endsWith('/api/v1') ? domain.substring(0, domain.length - 7) : domain;

    final options = <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
      'reconnection': true,
      'reconnectionDelay': 2000,
    };

    // On mobile, pass stored cookies so the backend can authenticate the socket
    if (!kIsWeb) {
      final cookies = _localStorage.getCookies();
      if (cookies != null && cookies.isNotEmpty) {
        options['extraHeaders'] = <String, String>{'Cookie': cookies};
      }
    }

    _socket = io.io(baseUrl, options);

    _socket!.on('connect', (_) {
      _connectionStateController.add(true);
    });

    _socket!.on('disconnect', (_) {
      _connectionStateController.add(false);
    });

    _socket!.on('connect_error', (error) {
      _connectionStateController.add(false);
    });

    _socket!.on('auth_error', (data) {
      final message = data is Map<String, dynamic>
          ? (data['message'] as String? ?? 'Socket authentication failed')
          : 'Socket authentication failed';
      _authErrorController.add(message);
      _connectionStateController.add(false);
    });

    _socket!.on('new_message', (data) {
      if (data != null) {
        _newMessageController.add(data is Map<String, dynamic> ? data : {});
      }
    });

    _socket!.on('conversation_updated', (data) {
      if (data != null) {
        _conversationUpdatedController.add(data is Map<String, dynamic> ? data : {});
      }
    });

    _socket!.on('message_status_updated', (data) {
      if (data != null) {
        _messageStatusUpdatedController.add(data is Map<String, dynamic> ? data : {});
      }
    });

    _socket!.on('automation_updated', (data) {
      if (data != null) {
        _automationUpdatedController.add(data is Map<String, dynamic> ? data : {});
      }
    });

    _socket!.on('new_api_log', (data) {
      if (data != null) {
        _newApiLogController.add(data is Map<String, dynamic> ? data : {});
      }
    });
  }

  void joinConversation(String conversationId) {
    if (_socket?.connected == true) {
      _socket!.emit('join_conversation', conversationId);
    }
  }

  void leaveConversation(String conversationId) {
    if (_socket?.connected == true) {
      _socket!.emit('leave_conversation', conversationId);
    }
  }

  void disconnect() {
    _socket?.disconnect();
    _socket?.dispose();
    _socket = null;
    _connectionStateController.add(false);
  }

  void dispose() {
    disconnect();
    _newMessageController.close();
    _conversationUpdatedController.close();
    _messageStatusUpdatedController.close();
    _automationUpdatedController.close();
    _newApiLogController.close();
    _connectionStateController.close();
    _authErrorController.close();
  }
}

