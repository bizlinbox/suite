import '../../core/services/api_service.dart';
import '../../core/utils/result.dart';
import '../models/campaign_model.dart';
import '../../core/utils/api_error.dart';

class CampaignRepository {
  final ApiService _api;

  CampaignRepository(this._api);

  Future<Result<List<Campaign>>> getCampaigns() async {
    try {
      final res = await _api.get('/campaigns');
      final list = (res.data['campaigns'] as List<dynamic>)
          .map((e) => Campaign.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(list);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load campaigns'));
    }
  }

  Future<Result<Campaign>> getCampaign(String id) async {
    try {
      final res = await _api.get('/campaigns/$id');
      return Success(Campaign.fromJson(res.data['campaign'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load campaign'));
    }
  }

  Future<Result<Campaign>> createCampaign(Map<String, dynamic> payload) async {
    try {
      final res = await _api.post('/campaigns', data: payload);
      return Success(Campaign.fromJson(res.data['campaign'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to create campaign'));
    }
  }

  Future<Result<Campaign>> updateCampaign(String id, Map<String, dynamic> payload) async {
    try {
      final res = await _api.put('/campaigns/$id', data: payload);
      return Success(Campaign.fromJson(res.data['campaign'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to update campaign'));
    }
  }

  Future<Result<void>> deleteCampaign(String id) async {
    try {
      await _api.delete('/campaigns/$id');
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to delete campaign'));
    }
  }

  Future<Result<void>> action(String id, String action) async {
    try {
      await _api.post('/campaigns/$id/$action');
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to $action campaign'));
    }
  }
}

