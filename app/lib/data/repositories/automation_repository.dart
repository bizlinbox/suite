import '../../core/services/api_service.dart';
import '../../core/utils/result.dart';
import '../models/automation_model.dart';

class AutomationRepository {
  final ApiService _api;

  AutomationRepository(this._api);

  Future<Result<List<Automation>>> getAutomations() async {
    try {
      final res = await _api.get('/automations');
      final list = (res.data['automations'] as List<dynamic>)
          .map((e) => Automation.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(list);
    } catch (e) {
      return Error('Failed to load automations: $e');
    }
  }

  Future<Result<Automation>> createAutomation(Map<String, dynamic> payload) async {
    try {
      final res = await _api.post('/automations', data: payload);
      return Success(Automation.fromJson(res.data['automation'] as Map<String, dynamic>));
    } catch (e) {
      return Error('Failed to create automation: $e');
    }
  }

  Future<Result<Automation>> updateAutomation(String id, Map<String, dynamic> payload) async {
    try {
      final res = await _api.put('/automations/$id', data: payload);
      return Success(Automation.fromJson(res.data['automation'] as Map<String, dynamic>));
    } catch (e) {
      return Error('Failed to update automation: $e');
    }
  }

  Future<Result<void>> deleteAutomation(String id) async {
    try {
      await _api.delete('/automations/$id');
      return const Success(null);
    } catch (e) {
      return Error('Failed to delete automation: $e');
    }
  }

  Future<Result<void>> toggleAutomation(String id) async {
    try {
      await _api.post('/automations/$id/toggle');
      return const Success(null);
    } catch (e) {
      return Error('Failed to toggle automation: $e');
    }
  }
}
