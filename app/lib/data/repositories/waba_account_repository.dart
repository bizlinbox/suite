import '../../core/services/api_service.dart';
import '../../core/utils/result.dart';
import '../models/user_model.dart';
import '../../core/utils/api_error.dart';

class WabaAccountRepository {
  final ApiService _api;

  WabaAccountRepository(this._api);

  Future<Result<List<WabaAccount>>> getWabaAccounts() async {
    try {
      final res = await _api.get('/waba-accounts');
      final list = (res.data['wabaAccounts'] as List<dynamic>)
          .map((e) => WabaAccount.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(list);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load WABA accounts'));
    }
  }

  Future<Result<WabaAccount>> createWabaAccount(Map<String, dynamic> payload) async {
    try {
      final res = await _api.post('/waba-accounts', data: payload);
      return Success(WabaAccount.fromJson(res.data['wabaAccount'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to create WABA account'));
    }
  }

  Future<Result<WabaAccount>> updateWabaAccount(String id, Map<String, dynamic> payload) async {
    try {
      final res = await _api.put('/waba-accounts/$id', data: payload);
      return Success(WabaAccount.fromJson(res.data['wabaAccount'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to update WABA account'));
    }
  }

  Future<Result<void>> deleteWabaAccount(String id) async {
    try {
      await _api.delete('/waba-accounts/$id');
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to delete WABA account'));
    }
  }

  Future<Result<Map<String, dynamic>>> testWabaAccount(String id) async {
    try {
      final res = await _api.post('/waba-accounts/$id/test');
      return Success(res.data as Map<String, dynamic>);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Connection test failed'));
    }
  }

  Future<Result<Map<String, dynamic>>> subscribeWabaAccount(String id) async {
    try {
      final res = await _api.post('/waba-accounts/$id/subscribe');
      return Success(res.data as Map<String, dynamic>);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Subscription failed'));
    }
  }

  Future<Result<Map<String, dynamic>>> getWebhookConfig(String id) async {
    try {
      final res = await _api.get('/waba-accounts/$id/webhook-config');
      return Success(res.data as Map<String, dynamic>);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load webhook config'));
    }
  }

  Future<Result<void>> assignAgent(String wabaId, String agentId) async {
    try {
      await _api.post('/waba-accounts/$wabaId/agents', data: {'agent_ids': [agentId]});
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to assign agent'));
    }
  }

  Future<Result<void>> removeAgent(String wabaId, String agentId) async {
    try {
      await _api.delete('/waba-accounts/$wabaId/agents/$agentId');
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to remove agent'));
    }
  }
}
