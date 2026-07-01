import '../../core/services/api_service.dart';
import '../../core/utils/result.dart';
import '../models/user_model.dart';
import '../../core/utils/api_error.dart';

class UserRepository {
  final ApiService _api;

  UserRepository(this._api);

  Future<Result<List<User>>> getUsers() async {
    try {
      final res = await _api.get('/agents');
      final list = (res.data['agents'] as List<dynamic>)
          .map((e) => User.fromJson(e as Map<String, dynamic>))
          .toList();
      return Success(list);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to load users'));
    }
  }

  Future<Result<Map<String, dynamic>>> createUser(Map<String, dynamic> payload) async {
    try {
      final res = await _api.post('/agents', data: payload);
      return Success(res.data as Map<String, dynamic>);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to create user'));
    }
  }

  Future<Result<User>> updateUser(String id, Map<String, dynamic> payload) async {
    try {
      final res = await _api.put('/agents/$id', data: payload);
      return Success(User.fromJson(res.data['agent'] as Map<String, dynamic>));
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to update user'));
    }
  }

  Future<Result<void>> deleteUser(String id) async {
    try {
      await _api.delete('/agents/$id');
      return const Success(null);
    } catch (e) {
      return Error(extractApiError(e, fallback: 'Failed to delete user'));
    }
  }
}

