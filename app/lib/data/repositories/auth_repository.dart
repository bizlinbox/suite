import '../../core/services/api_service.dart';
import '../../core/services/local_storage_service.dart';
import '../../core/utils/result.dart';
import '../models/user_model.dart';

class AuthRepository {
  final ApiService _api;
  final LocalStorageService _storage;

  AuthRepository(this._api, this._storage);

  Future<Result<bool>> checkSetupRequired() async {
    try {
      final res = await _api.get('/auth/setup-required');
      return Success(res.data['needsSetup'] as bool? ?? false);
    } catch (e) {
      return Error('Failed to check setup: $e');
    }
  }

  Future<Result<Map<String, dynamic>>> getPublicSettings() async {
    try {
      final res = await _api.get('/auth/public-settings');
      return Success(res.data as Map<String, dynamic>);
    } catch (e) {
      return Error('Failed to load settings: $e');
    }
  }

  Future<Result<User>> login(String email, String password) async {
    try {
      final res = await _api.post('/auth/login', data: {'email': email, 'password': password});
      final user = User.fromJson(res.data['user'] as Map<String, dynamic>);
      await _storage.setUser(user.toJson());
      return Success(user);
    } catch (e) {
      return Error('Login failed: $e');
    }
  }

  Future<Result<User>> getMe() async {
    try {
      final res = await _api.get('/auth/me');
      final user = User.fromJson(res.data['user'] as Map<String, dynamic>);
      await _storage.setUser(user.toJson());
      return Success(user);
    } catch (e) {
      return Error('Failed to fetch user: $e');
    }
  }

  Future<Result<User>> updateProfile(String name, {String? currentPassword, String? newPassword}) async {
    try {
      final payload = <String, dynamic>{'name': name};
      if (currentPassword != null && newPassword != null) {
        payload['currentPassword'] = currentPassword;
        payload['newPassword'] = newPassword;
      }
      final res = await _api.patch('/auth/me', data: payload);
      final user = User.fromJson(res.data['user'] as Map<String, dynamic>);
      await _storage.setUser(user.toJson());
      return Success(user);
    } catch (e) {
      return Error('Failed to update profile: $e');
    }
  }

  Future<Result<void>> register(String name, String email, String password, String organizationName) async {
    try {
      await _api.post('/auth/register', data: {
        'name': name,
        'email': email,
        'password': password,
        'organizationName': organizationName,
      });
      return const Success(null);
    } catch (e) {
      return Error('Registration failed: $e');
    }
  }

  Future<Result<void>> setup(String name, String email, String password, String organizationName) async {
    try {
      await _api.post('/auth/setup', data: {
        'name': name,
        'email': email,
        'password': password,
        'organizationName': organizationName,
      });
      return const Success(null);
    } catch (e) {
      return Error('Setup failed: $e');
    }
  }

  Future<Result<void>> acceptInvite(String token, String name, String password) async {
    try {
      await _api.post('/agents/accept-invite', data: {
        'token': token,
        'name': name,
        'password': password,
      });
      return const Success(null);
    } catch (e) {
      return Error('Failed to accept invite: $e');
    }
  }

  Future<Result<void>> logout() async {
    try {
      await _api.post('/auth/logout');
    } catch (_) {
      // ignore
    } finally {
      await _storage.clearAll();
    }
    return const Success(null);
  }
}
