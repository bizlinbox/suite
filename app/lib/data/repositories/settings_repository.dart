import '../../core/services/api_service.dart';
import '../../core/utils/api_error.dart';
import '../../core/utils/result.dart';
import '../models/label_model.dart';
import '../models/organization_model.dart';
import '../models/file_item_model.dart';
import '../models/integration_model.dart';
import '../models/role_model.dart';
import '../models/template_model.dart';
import '../models/quick_reply_model.dart';
import '../models/flow_model.dart';
import '../models/api_log_model.dart';
import '../models/flow_submission_model.dart';

class SettingsRepository {
  final ApiService _api;

  SettingsRepository(this._api);

  // Organizations
  Future<Result<List<Organization>>> getOrganizations() async {
    try {
      final res = await _api.get('/organizations');
      final list = (res.data['organizations'] as List<dynamic>)
          .map((e) => Organization.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(list);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load organizations'));
    }
  }

  Future<Result<Organization>> updateOrganization(String id, Map<String, dynamic> payload) async {
    try {
      final res = await _api.put('/organizations/$id', data: payload);
      return Success(Organization.fromJson(res.data['organization'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to update organization'));
    }
  }

  // Labels
  Future<Result<List<Label>>> getLabels() async {
    try {
      final res = await _api.get('/labels');
      final list = (res.data['labels'] as List<dynamic>)
          .map((e) => Label.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(list);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load labels'));
    }
  }

  Future<Result<Label>> createLabel(String name, String color) async {
    try {
      final res = await _api.post('/labels', data: {'name': name, 'color': color});
      return Success(Label.fromJson(res.data['label'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to create label'));
    }
  }

  Future<Result<Label>> updateLabel(String id, String name, String color) async {
    try {
      final res = await _api.put('/labels/$id', data: {'name': name, 'color': color});
      return Success(Label.fromJson(res.data['label'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to update label'));
    }
  }

  Future<Result<void>> deleteLabel(String id) async {
    try {
      await _api.delete('/labels/$id');
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to delete label'));
    }
  }

  // Files
  Future<Result<Map<String, dynamic>>> getFiles({String? search, int offset = 0, int limit = 20}) async {
    try {
      final params = <String, dynamic>{'limit': limit, 'offset': offset};
      if (search != null && search.isNotEmpty) params['q'] = search;
      final res = await _api.get('/files', queryParameters: params);
      return Success({
        'files': (res.data['files'] as List<dynamic>)
            .map((e) => FileItem.fromJson(e as Map<String, dynamic>))
            .toList(),
        'totalCount': res.data['totalCount'] as int? ?? 0,
        'totalSize': res.data['totalSize'] as int? ?? 0,
      });
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load files'));
    }
  }

  Future<Result<void>> deleteFile(String id) async {
    try {
      await _api.delete('/files/$id');
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to delete file'));
    }
  }

  // Integrations
  Future<Result<List<Integration>>> getIntegrations() async {
    try {
      final res = await _api.get('/integrations');
      final list = (res.data['integrations'] as List<dynamic>)
          .map((e) => Integration.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(list);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load integrations'));
    }
  }

  Future<Result<Integration>> createIntegration(Map<String, dynamic> payload) async {
    try {
      final res = await _api.post('/integrations', data: payload);
      return Success(Integration.fromJson(res.data['integration'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to create integration'));
    }
  }

  Future<Result<Integration>> updateIntegration(String id, Map<String, dynamic> payload) async {
    try {
      final res = await _api.put('/integrations/$id', data: payload);
      return Success(Integration.fromJson(res.data['integration'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to update integration'));
    }
  }

  Future<Result<void>> deleteIntegration(String id) async {
    try {
      await _api.delete('/integrations/$id');
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to delete integration'));
    }
  }

  // Templates
  Future<Result<List<Template>>> getTemplates() async {
    try {
      final res = await _api.get('/templates');
      final list = (res.data['templates'] as List<dynamic>)
          .map((e) => Template.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(list);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load templates'));
    }
  }

  Future<Result<int>> refreshTemplates(String wabaAccountId) async {
    try {
      final res = await _api.post('/templates/refresh', data: {'waba_account_id': wabaAccountId});
      return Success(res.data['count'] as int? ?? 0);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to refresh templates'));
    }
  }

  // Quick Replies
  Future<Result<List<QuickReply>>> getQuickReplies() async {
    try {
      final res = await _api.get('/quick-replies');
      final list = (res.data['quickReplies'] as List<dynamic>)
          .map((e) => QuickReply.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(list);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load quick replies'));
    }
  }

  Future<Result<QuickReply>> createQuickReply(Map<String, dynamic> payload) async {
    try {
      final res = await _api.post('/quick-replies', data: payload);
      return Success(QuickReply.fromJson(res.data['quickReply'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to create quick reply'));
    }
  }

  Future<Result<QuickReply>> updateQuickReply(String id, Map<String, dynamic> payload) async {
    try {
      final res = await _api.put('/quick-replies/$id', data: payload);
      return Success(QuickReply.fromJson(res.data['quickReply'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to update quick reply'));
    }
  }

  Future<Result<void>> deleteQuickReply(String id) async {
    try {
      await _api.delete('/quick-replies/$id');
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to delete quick reply'));
    }
  }

  // Flows
  Future<Result<List<Flow>>> getFlows() async {
    try {
      final res = await _api.get('/flows');
      final list = (res.data['flows'] as List<dynamic>)
          .map((e) => Flow.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(list);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load flows'));
    }
  }

  Future<Result<int>> syncFlows(String wabaAccountId) async {
    try {
      final res = await _api.post('/flows/sync', data: {'waba_account_id': wabaAccountId});
      return Success(res.data['count'] as int? ?? 0);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to sync flows'));
    }
  }

  Future<Result<Flow>> createFlow(String name, String category, Map<String, dynamic> flowJson, String wabaAccountId) async {
    try {
      final res = await _api.post('/flows', data: {
        'name': name,
        'category': category,
        'flowJson': flowJson,
        'waba_account_id': wabaAccountId,
      });
      return Success(Flow.fromJson(res.data['flow'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to create flow'));
    }
  }

  Future<Result<Flow>> updateFlow(String id, {String? name, String? category, Map<String, dynamic>? flowJson}) async {
    try {
      final payload = <String, dynamic>{};
      if (name != null) payload['name'] = name;
      if (category != null) payload['category'] = category;
      if (flowJson != null) payload['flowJson'] = flowJson;
      final res = await _api.put('/flows/$id', data: payload);
      return Success(Flow.fromJson(res.data['flow'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to update flow'));
    }
  }

  Future<Result<void>> deleteFlow(String id) async {
    try {
      await _api.delete('/flows/$id');
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to delete flow'));
    }
  }

  Future<Result<void>> publishFlow(String id) async {
    try {
      await _api.post('/flows/$id/publish');
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to publish flow'));
    }
  }

  Future<Result<void>> sendFlow(String flowId, String conversationId, String body, {
    String? header,
    String? footer,
    String? flowToken,
    String? screen,
    Map<String, dynamic>? data,
  }) async {
    try {
      final payload = <String, dynamic>{
        'conversation_id': conversationId,
        'body': body,
      };
      if (header != null && header.isNotEmpty) payload['header'] = header;
      if (footer != null && footer.isNotEmpty) payload['footer'] = footer;
      if (flowToken != null && flowToken.isNotEmpty) payload['flow_token'] = flowToken;
      if (screen != null && screen.isNotEmpty) payload['screen'] = screen;
      if (data != null) payload['data'] = data;
      await _api.post('/flows/$flowId/send', data: payload);
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to send flow'));
    }
  }

  Future<Result<List<FlowSubmission>>> getSubmissions() async {
    try {
      final res = await _api.get('/flows/submissions/all');
      final list = (res.data['submissions'] as List<dynamic>)
          .map((e) => FlowSubmission.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(list);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load submissions'));
    }
  }

  Future<Result<void>> deleteSubmission(String id) async {
    try {
      await _api.delete('/flows/submissions/$id');
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to delete submission'));
    }
  }

  // Roles
  Future<Result<List<Role>>> getRoles() async {
    try {
      final res = await _api.get('/roles');
      final list = (res.data['roles'] as List<dynamic>)
          .map((e) => Role.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(list);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load roles'));
    }
  }

  // API Logs
  Future<Result<Map<String, dynamic>>> getApiLogs({
    int offset = 0,
    int limit = 50,
    String? direction,
    String? provider,
  }) async {
    try {
      final params = <String, dynamic>{'limit': limit, 'offset': offset};
      if (direction != null && direction.isNotEmpty) params['direction'] = direction;
      if (provider != null && provider.isNotEmpty) params['provider'] = provider;
      final res = await _api.get('/api-logs', queryParameters: params);
      return Success({
        'logs': (res.data['logs'] as List<dynamic>)
            .map((e) => ApiLog.fromJson(e as Map<String, dynamic>))
            .toList(),
        'total': res.data['total'] as int? ?? 0,
      });
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load API logs'));
    }
  }

  Future<Result<void>> clearApiLogs() async {
    try {
      await _api.delete('/api-logs');
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to clear API logs'));
    }
  }
}

