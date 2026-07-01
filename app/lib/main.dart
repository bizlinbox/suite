import 'package:flutter/material.dart';
import 'core/di.dart';
import 'core/services/api_service.dart';
import 'core/services/theme_service.dart';
import 'core/theme/app_theme.dart';
import 'viewmodels/auth_viewmodel.dart';
import 'router.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  await setupDependencies();

  // Wire up auth failure from API interceptor to force logout
  locator<ApiService>().onAuthFailure = () {
    locator<AuthViewModel>().forceLogout();
  };

  runApp(const MyApp());
}

class MyApp extends StatelessWidget {
  const MyApp({super.key});

  @override
  Widget build(BuildContext context) {
    final themeService = locator<ThemeService>();
    return ListenableBuilder(
      listenable: themeService,
      builder: (context, child) {
        return MaterialApp.router(
          title: 'BizlInbox',
          debugShowCheckedModeBanner: false,
          theme: AppTheme.lightTheme,
          darkTheme: AppTheme.darkTheme,
          themeMode: themeService.themeMode,
          routerConfig: createRouter(),
        );
      },
    );
  }
}
