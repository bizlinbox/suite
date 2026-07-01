import '../core/utils/result.dart';
import '../data/repositories/auth_repository.dart';
import '../data/models/user_model.dart';
import 'base_viewmodel.dart';

class LoginViewModel extends BaseViewModel {
  final AuthRepository _authRepo;

  LoginViewModel(this._authRepo);

  String _platformName = 'BizlInbox';
  String get platformName => _platformName;
  bool _enableRegistration = true;
  bool get enableRegistration => _enableRegistration;

  Future<void> loadPublicSettings() async {
    final result = await _authRepo.getPublicSettings();
    result.when(
      success: (data) {
        _platformName = data['platformName'] as String? ?? 'BizlInbox';
        _enableRegistration = data['enablePublicRegistration'] as bool? ?? true;
      },
      error: (message, exception) {},
    );
    notifyListeners();
  }

  Future<Result<User>> login(String email, String password) async {
    setBusy();
    final result = await _authRepo.login(email, password);
    setIdle();
    return result;
  }
}

