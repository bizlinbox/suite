import '../../core/services/api_service.dart';
import '../../core/utils/result.dart';
import '../models/analytics_model.dart';

class AnalyticsRepository {
  final ApiService _api;

  AnalyticsRepository(this._api);

  Future<Result<AnalyticsData>> getAnalytics() async {
    try {
      final res = await _api.get('/analytics');
      return Success(AnalyticsData.fromJson(res.data as Map<String, dynamic>));
    } catch (e) {
      return Error('Failed to load analytics: $e');
    }
  }
}
