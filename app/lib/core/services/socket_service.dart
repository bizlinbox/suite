import 'dart:async';
import 'dart:convert';
import 'package:socket_io_client/socket_io_client.dart' as io;
import 'local_storage_service.dart';

class SocketService {
  final LocalStorageService _localStorage;
  io.Socket? _socket;

  final _newMessageController = StreamController<Map<String, dynamic>>.broadcast();
  final _conversationUpdatedController = StreamController<Map<String, dynamic>>.broadcast();
  final _automationUpdatedController = StreamController<Map<String, dynamic>>.broadcast();
  final _newApiLogController = StreamController<Map<String, dynamic>>.broadcast();
  final _connectionStateController = StreamController<bool>.broadcast();

  Stream<Map<String, dynamic>> get onNewMessage => _newMessageController.stream;
  Stream<Map<String, dynamic>> get onConversationUpdated => _conversationUpdatedController.stream;
  Stream<Map<String, dynamic>> get onAutomationUpdated => _automationUpdatedController.stream;
  Stream<Map<String, dynamic>> get onNewApiLog => _newApiLogController.stream;
  Stream<bool> get onConnectionState => _connectionStateController.stream;

  bool get isConnected => _socket?.connected ?? false;

  SocketService(this._localStorage);

  void connect() {
    if (_socket != null) {
      disconnect();
    }

    final domain = _localStorage.getDomain();
    if (domain == null || domain.isEmpty) return;

    final baseUrl = domain.endsWith('/api/v1') ? domain.substring(0, domain.length - 7) : domain;

    _socket = io.io(baseUrl, <String, dynamic>{
      'transports': ['websocket'],
      'autoConnect': true,
      'reconnection': true,
      'reconnectionDelay': 2000,
    });

    _socket!.on('connect', (_) {
      _connectionStateController.add(true);
      _emitAuth();
    });

    _socket!.on('disconnect', (_) {
      _connectionStateController.add(false);
    });

    _socket!.on('connect_error', (error) {
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

  void _emitAuth() {
    final user = _localStorage.getUser();
    if (user != null) {
      _socket?.emit('authenticate', jsonEncode(user));
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
    _automationUpdatedController.close();
    _newApiLogController.close();
    _connectionStateController.close();
  }
}
