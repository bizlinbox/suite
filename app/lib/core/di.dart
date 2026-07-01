import 'package:get_it/get_it.dart';
import 'services/local_storage_service.dart';
import 'services/api_service.dart';
import 'services/socket_service.dart';
import 'services/notification_manager.dart';
import '../data/repositories/auth_repository.dart';
import '../data/repositories/conversation_repository.dart';
import '../data/repositories/contact_repository.dart';
import '../data/repositories/campaign_repository.dart';
import '../data/repositories/automation_repository.dart';
import '../data/repositories/settings_repository.dart';
import '../data/repositories/waba_account_repository.dart';
import '../data/repositories/user_repository.dart';
import '../data/repositories/analytics_repository.dart';
import '../viewmodels/auth_viewmodel.dart';

final GetIt locator = GetIt.instance;

Future<void> setupDependencies() async {
  final localStorage = LocalStorageService();
  await localStorage.init();
  locator.registerSingleton<LocalStorageService>(localStorage);

  locator.registerLazySingleton<ApiService>(() => ApiService(locator<LocalStorageService>()));
  locator.registerLazySingleton<SocketService>(() => SocketService(locator<LocalStorageService>()));
  locator.registerLazySingleton<NotificationManager>(() => NotificationManager(
        locator<SocketService>(),
        locator<LocalStorageService>(),
      ));

  // Repositories
  locator.registerLazySingleton<AuthRepository>(() => AuthRepository(
        locator<ApiService>(),
        locator<LocalStorageService>(),
      ));
  locator.registerLazySingleton<ConversationRepository>(() => ConversationRepository(locator<ApiService>()));
  locator.registerLazySingleton<ContactRepository>(() => ContactRepository(locator<ApiService>()));
  locator.registerLazySingleton<CampaignRepository>(() => CampaignRepository(locator<ApiService>()));
  locator.registerLazySingleton<AutomationRepository>(() => AutomationRepository(locator<ApiService>()));
  locator.registerLazySingleton<SettingsRepository>(() => SettingsRepository(locator<ApiService>()));
  locator.registerLazySingleton<WabaAccountRepository>(() => WabaAccountRepository(locator<ApiService>()));
  locator.registerLazySingleton<UserRepository>(() => UserRepository(locator<ApiService>()));
  locator.registerLazySingleton<AnalyticsRepository>(() => AnalyticsRepository(locator<ApiService>()));

  // ViewModels
  final authVm = AuthViewModel(locator<AuthRepository>(), locator<LocalStorageService>());
  locator<ApiService>().onAuthFailure = authVm.forceLogout;
  await authVm.init();
  locator.registerSingleton<AuthViewModel>(authVm);
}
