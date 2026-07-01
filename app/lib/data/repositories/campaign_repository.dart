import '../../core/services/api_service.dart';
import '../../core/utils/result.dart';
import '../models/campaign_model.dart';

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
      return Error('Failed to load campaigns: $e');
    }
  }

  Future<Result<Campaign>> getCampaign(String id) async {
    try {
      final res = await _api.get('/campaigns/$id');
      return Success(Campaign.fromJson(res.data['campaign'] as Map<String, dynamic>));
    } catch (e) {
      return Error('Failed to load campaign: $e');
    }
  }

  Future<Result<Campaign>> createCampaign(Map<String, dynamic> payload) async {
    try {
      final res = await _api.post('/campaigns', data: payload);
      return Success(Campaign.fromJson(res.data['campaign'] as Map<String, dynamic>));
    } catch (e) {
      return Error('Failed to create campaign: $e');
    }
  }

  Future<Result<Campaign>> updateCampaign(String id, Map<String, dynamic> payload) async {
    try {
      final res = await _api.put('/campaigns/$id', data: payload);
      return Success(Campaign.fromJson(res.data['campaign'] as Map<String, dynamic>));
    } catch (e) {
      return Error('Failed to update campaign: $e');
    }
  }

  Future<Result<void>> deleteCampaign(String id) async {
    try {
      await _api.delete('/campaigns/$id');
      return const Success(null);
    } catch (e) {
      return Error('Failed to delete campaign: $e');
    }
  }

  Future<Result<void>> action(String id, String action) async {
    try {
      await _api.post('/campaigns/$id/$action');
      return const Success(null);
    } catch (e) {
      return Error('Failed to $action campaign: $e');
    }
  }
}
