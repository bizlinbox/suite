import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import '../../core/di.dart';
import '../../core/services/local_storage_service.dart';
import '../../data/repositories/auth_repository.dart';
import '../../core/theme/app_theme.dart';
import '../widgets/custom/custom_widgets.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

class SplashScreen extends StatefulWidget {
  const SplashScreen({super.key});

  @override
  State<SplashScreen> createState() => _SplashScreenState();
}

class _SplashScreenState extends State<SplashScreen> {
  @override
  void initState() {
    super.initState();
    _checkAndRedirect();
  }

  Future<void> _checkAndRedirect() async {
    final authRepo = locator<AuthRepository>();
    final storage = locator<LocalStorageService>();

    final setupResult = await authRepo.checkSetupRequired();
    final needsSetup = setupResult.when(
      success: (data) => data,
      error: (message, exception) => false,
    );

    if (!mounted) return;

    if (needsSetup) {
      context.go('/setup');
      return;
    }

    final hasDomain = storage.getDomain() != null && storage.getDomain()!.isNotEmpty;
    if (!hasDomain) {
      context.go('/domain');
      return;
    }

    // Check if user is already logged in
    final storedUser = storage.getUser();
    if (storedUser != null) {
      final result = await authRepo.getMe();
      final isValid = result.when(
        success: (_) => true,
        error: (message, exception) => false,
      );
      if (!mounted) return;
      if (isValid) {
        context.go('/dashboard/inbox');
        return;
      }
      // Token expired — clear stale state
      await storage.clearAll();
      if (!mounted) return;
    }

    context.go('/login');
  }

  @override
  Widget build(BuildContext context) {
    return const Scaffold(
      body: Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            PhosphorIcon(PhosphorIconsRegular.chatTeardropText, size: 64, color: AppColors.primary),
            SizedBox(height: 24),
            Text(
              'BizlInbox',
              style: TextStyle(fontSize: 28, fontWeight: FontWeight.bold),
            ),
            SizedBox(height: 24),
            AppProgressIndicator(),
          ],
        ),
      ),
    );
  }
}
