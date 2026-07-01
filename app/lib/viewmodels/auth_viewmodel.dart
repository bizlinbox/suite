import '../core/services/local_storage_service.dart';
import '../core/utils/result.dart';
import '../data/models/user_model.dart';
import '../data/repositories/auth_repository.dart';
import 'base_viewmodel.dart';

class AuthViewModel extends BaseViewModel {
  final AuthRepository _authRepo;
  final LocalStorageService _storage;

  AuthViewModel(this._authRepo, this._storage);

  User? _user;
  User? get user => _user;
  bool get isLoggedIn => _user != null;
  bool get isAdmin => _user?.permissions.contains('users.manage') ?? false;

  List<String> get permissions => _user?.permissions ?? [];

  bool can(String permission) => permissions.contains(permission);
  bool canAll(List<String> perms) => perms.every((p) => permissions.contains(p));

  Future<void> init() async {
    setBusy();
    final stored = _storage.getUser();
    if (stored != null) {
      try {
        _user = User.fromJson(stored);
        final result = await _authRepo.getMe();
        result.when(
          success: (u) => _user = u,
          error: (message, exception) {
            _user = null;
            _storage.clearUser();
          },
        );
      } catch (_) {
        _user = null;
      }
    }
    setIdle();
  }

  Future<Result<User>> login(String email, String password) async {
    setBusy();
    final result = await _authRepo.login(email, password);
    result.when(
      success: (u) => _user = u,
      error: (message, exception) {},
    );
    setIdle();
    return result;
  }

  Future<void> logout() async {
    await _authRepo.logout();
    _user = null;
    notifyListeners();
  }

  void setUser(User? user) {
    _user = user;
    if (user != null) {
      _storage.setUser(user.toJson());
    }
    notifyListeners();
  }
}
