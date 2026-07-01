import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../core/theme/app_theme.dart';
import '../../data/repositories/auth_repository.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../../viewmodels/login_viewmodel.dart';
import 'register_screen.dart';
import 'setup_screen.dart';
import 'accept_invite_screen.dart';
import '../widgets/custom/custom_widgets.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

class LoginScreen extends StatelessWidget {
  const LoginScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return MultiProvider(
      providers: [
        ChangeNotifierProvider(create: (_) => LoginViewModel(locator<AuthRepository>())..loadPublicSettings()),
      ],
      child: const _LoginBody(),
    );
  }
}

class _LoginBody extends StatefulWidget {
  const _LoginBody();

  @override
  State<_LoginBody> createState() => _LoginBodyState();
}

class _LoginBodyState extends State<_LoginBody> {
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final loginVm = context.watch<LoginViewModel>();
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    return Scaffold(
      backgroundColor: isDark ? AppColors.darkBackground : AppColors.lightBackground,
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: AppCard(
              elevation: 3,
              padding: const EdgeInsets.all(32),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  Container(
                    width: 56,
                    height: 56,
                    decoration: BoxDecoration(
                      color: AppColors.primary,
                      borderRadius: BorderRadius.circular(14),
                    ),
                    child: const PhosphorIcon(PhosphorIconsRegular.chatTeardrop, size: 28, color: Colors.white),
                  ),
                  const SizedBox(height: 20),
                  Text(
                    loginVm.platformName,
                    style: theme.textTheme.headlineSmall,
                  ),
                  const SizedBox(height: 6),
                  Text(
                    'Sign in to your account',
                    style: theme.textTheme.bodyMedium?.copyWith(
                      color: isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary,
                    ),
                  ),
                  const SizedBox(height: 28),
                  if (loginVm.isError)
                    Container(
                      width: double.infinity,
                      margin: const EdgeInsets.only(bottom: 16),
                      padding: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: AppColors.danger.withValues(alpha: isDark ? 0.15 : 0.08),
                        borderRadius: BorderRadius.circular(AppRadius.sm),
                        border: Border.all(color: AppColors.danger.withValues(alpha: 0.3)),
                      ),
                      child: Row(
                        children: [
                          const PhosphorIcon(PhosphorIconsRegular.warningCircle, color: AppColors.danger, size: 18),
                          const SizedBox(width: 8),
                          Expanded(
                            child: Text(
                              loginVm.errorMessage,
                              style: const TextStyle(color: AppColors.danger, fontSize: 13),
                            ),
                          ),
                        ],
                      ),
                    ),
                  AppInput.email(
                    controller: _emailController,
                    label: 'Email',
                    prefix: const PhosphorIcon(PhosphorIconsRegular.envelope, size: 20),
                    textInputAction: TextInputAction.next,
                  ),
                  const SizedBox(height: 16),
                  AppInput.password(
                    controller: _passwordController,
                    label: 'Password',
                    prefix: const PhosphorIcon(PhosphorIconsRegular.lockKey, size: 20),
                    textInputAction: TextInputAction.done,
                    onSubmitted: (_) => _login(context, loginVm),
                  ),
                  const SizedBox(height: 24),
                  SizedBox(
                    width: double.infinity,
                    child: AppButton(
                      variant: AppButtonVariant.primary,
                      isLoading: loginVm.isBusy,
                      onPressed: loginVm.isBusy ? null : () => _login(context, loginVm),
                      child: const Text('Sign In'),
                    ),
                  ),
                  const SizedBox(height: 8),
                  AppButton(
                    variant: AppButtonVariant.ghost,
                    onPressed: () => context.go('/domain'),
                    child: const Text('Change domain'),
                  ),
                  if (loginVm.enableRegistration)
                    AppButton(
                      variant: AppButtonVariant.ghost,
                      onPressed: () => Navigator.of(context).push(
                        MaterialPageRoute(builder: (_) => const RegisterScreen()),
                      ),
                      child: const Text('Create an account'),
                    ),
                  AppButton(
                    variant: AppButtonVariant.ghost,
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const SetupScreen()),
                    ),
                    child: const Text('Initial setup'),
                  ),
                  AppButton(
                    variant: AppButtonVariant.ghost,
                    onPressed: () => Navigator.of(context).push(
                      MaterialPageRoute(builder: (_) => const AcceptInviteScreen()),
                    ),
                    child: const Text('Have an invite?'),
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _login(BuildContext context, LoginViewModel vm) async {
    final result = await vm.login(_emailController.text.trim(), _passwordController.text);
    result.when(
      success: (user) {
        final authVm = locator<AuthViewModel>();
        authVm.setUser(user);
        if (context.mounted) context.go('/dashboard/inbox');
      },
      error: (message, exception) {
        if (context.mounted) {
          ScaffoldMessenger.of(context).showSnackBar(
            SnackBar(content: Text(message), backgroundColor: Colors.red),
          );
        }
      },
    );
  }
}