import '../../core/services/api_service.dart';
import '../../core/utils/api_error.dart';
import '../../core/utils/result.dart';
import '../models/conversation_model.dart';
import '../models/message_model.dart';
import '../models/label_model.dart';

class ConversationRepository {
  final ApiService _api;

  ConversationRepository(this._api);

  Future<Result<List<Conversation>>> getConversations({int offset = 0, String? search}) async {
    try {
      final params = <String, dynamic>{'limit': 20, 'offset': offset};
      if (search != null && search.isNotEmpty) params['q'] = search;
      final res = await _api.get('/conversations', queryParameters: params);
      final list = (res.data['conversations'] as List<dynamic>)
          .map((e) => Conversation.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(list);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load conversations'));
    }
  }

  Future<Result<Conversation>> getConversation(String id) async {
    try {
      final res = await _api.get('/conversations/$id');
      return Success(Conversation.fromJson(res.data['conversation'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load conversation'));
    }
  }

  Future<Result<List<Message>>> getMessages(String conversationId, {int offset = 0, String direction = 'asc'}) async {
    try {
      final res = await _api.get(
        '/messages',
        queryParameters: {'conversation_id': conversationId, 'limit': 50, 'offset': offset, 'direction': direction},
      );
      final list = (res.data['messages'] as List<dynamic>)
          .map((e) => Message.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(list);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load messages'));
    }
  }

  Future<Result<Message>> sendMessage(String conversationId, String content, {String? messageType, String? mediaUrl}) async {
    try {
      final payload = <String, dynamic>{
        'conversation_id': conversationId,
        'content': content,
        'message_type': messageType ?? 'text',
        'media_url': mediaUrl,
      };
      final res = await _api.post('/messages', data: payload);
      return Success(Message.fromJson(res.data['message'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to send message'));
    }
  }

  Future<Result<void>> deleteConversation(String id) async {
    try {
      await _api.delete('/conversations/$id');
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to delete conversation'));
    }
  }

  Future<Result<void>> updateStatus(String conversationId, String status) async {
    try {
      await _api.patch('/conversations/$conversationId/status', data: {'status': status});
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to update status'));
    }
  }

  Future<Result<void>> closeConversation(String conversationId) async {
    try {
      await _api.post('/conversations/$conversationId/close');
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to close conversation'));
    }
  }

  Future<Result<void>> assignAgent(String conversationId, String? agentId) async {
    try {
      await _api.patch('/conversations/$conversationId/assign', data: {'agent_id': agentId});
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to assign agent'));
    }
  }

  Future<Result<void>> togglePrivacy(String conversationId, bool isPrivate) async {
    try {
      await _api.patch('/conversations/$conversationId/private', data: {'is_private': isPrivate});
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to toggle privacy'));
    }
  }

  Future<Result<List<Label>>> getConversationLabels(String conversationId) async {
    try {
      final res = await _api.get('/conversations/$conversationId/labels');
      final list = (res.data['labels'] as List<dynamic>)
          .map((e) => Label.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(list);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load labels'));
    }
  }

  Future<Result<void>> addConversationLabel(String conversationId, String labelId) async {
    try {
      await _api.post('/conversations/$conversationId/labels', data: {'label_ids': [labelId]});
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to add label'));
    }
  }

  Future<Result<void>> removeConversationLabel(String conversationId, String labelId) async {
    try {
      await _api.delete('/conversations/$conversationId/labels/$labelId');
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to remove label'));
    }
  }

  Future<Result<Map<String, dynamic>>> checkTemplateWindow(String conversationId) async {
    try {
      final res = await _api.get('/messages/template-window/$conversationId');
      return Success(res.data as Map<String, dynamic>);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to check template window'));
    }
  }

  Future<Result<Conversation>> createConversation(String phone, {String? message}) async {
    try {
      final res = await _api.post('/conversations', data: {'phone': phone, 'message': message});
      return Success(Conversation.fromJson(res.data['conversation'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to create conversation'));
    }
  }

  Future<Result<Conversation>> createConversationByContactId(String contactId, {String? wabaId}) async {
    try {
      final payload = <String, dynamic>{
        'contact_id': contactId,
      };
      if (wabaId != null) {
        payload['waba_account_id'] = wabaId;
      }
      final res = await _api.post('/conversations', data: payload);
      return Success(Conversation.fromJson(res.data['conversation'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to create conversation'));
    }
  }

  Future<Result<Message>> sendTemplate(String conversationId, String templateName, {Map<String, dynamic>? variables}) async {
    try {
      final res = await _api.post('/messages', data: {
        'conversation_id': conversationId,
        'message_type': 'template',
        'template_name': templateName,
        'template_variables': variables,
      });
      return Success(Message.fromJson(res.data['message'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to send template'));
    }
  }

  Future<Result<Message>> sendFlow(String conversationId, String flowId, {Map<String, dynamic>? parameters}) async {
    try {
      final res = await _api.post('/flows/$flowId/send', data: {
        'conversation_id': conversationId,
        if (parameters != null) ...parameters,
      });
      return Success(Message.fromJson(res.data['message'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to send flow'));
    }
  }

  Future<Result<Message>> sendInteractiveMessage(
    String conversationId,
    String messageType, {
    Map<String, dynamic>? options,
  }) async {
    try {
      final payload = <String, dynamic>{
        'conversation_id': conversationId,
        'message_type': messageType,
        'content': options?['content'] ?? '',
        if (options != null) ...options,
      };
      final res = await _api.post('/messages', data: payload);
      return Success(Message.fromJson(res.data['message'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to send message'));
    }
  }
}

