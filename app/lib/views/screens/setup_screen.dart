import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../data/repositories/auth_repository.dart';
import '../../viewmodels/base_viewmodel.dart';
import '../../core/theme/app_theme.dart';
import '../widgets/custom/custom_widgets.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

class SetupViewModel extends BaseViewModel {
  final AuthRepository _repo;
  SetupViewModel(this._repo);

  Future<void> setup(String name, String email, String password, String organizationName) async {
    setBusy();
    final result = await _repo.setup(name, email, password, organizationName);
    result.when(
      success: (_) => setSuccess(),
      error: (message, exception) => setError(message),
    );
  }
}

class SetupScreen extends StatelessWidget {
  const SetupScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => SetupViewModel(locator<AuthRepository>()),
      child: const _SetupBody(),
    );
  }
}

class _SetupBody extends StatefulWidget {
  const _SetupBody();

  @override
  State<_SetupBody> createState() => _SetupBodyState();
}

class _SetupBodyState extends State<_SetupBody> {
  final _nameController = TextEditingController();
  final _emailController = TextEditingController();
  final _passwordController = TextEditingController();
  final _orgNameController = TextEditingController();

  @override
  void initState() {
    super.initState();
    _guardIfAlreadySetup();
  }

  Future<void> _guardIfAlreadySetup() async {
    final repo = locator<AuthRepository>();
    final result = await repo.checkSetupRequired();
    final needsSetup = result.when(
      success: (data) => data,
      error: (message, exception) => false,
    );
    if (!mounted) return;
    if (!needsSetup) {
      context.go('/login');
    }
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<SetupViewModel>();

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: AppCard(
              elevation: 2,
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const PhosphorIcon(PhosphorIconsRegular.chatTeardropText, size: 48, color: AppColors.primary),
                    const SizedBox(height: 16),
                    const Text(
                      'Initial Setup',
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Create your super admin account',
                      style: TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(height: 24),
                    if (vm.isError)
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.red.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Text(
                          vm.errorMessage,
                          style: TextStyle(color: Colors.red.shade700),
                        ),
                      ),
                    const SizedBox(height: 16),
                    AutofillGroup(
                      child: Column(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          AppInput(
                            controller: _nameController,
                            label: 'Name',
                            prefix: const PhosphorIcon(PhosphorIconsRegular.user, size: 20),
                            textInputAction: TextInputAction.next,
                            autofillHints: const [AutofillHints.name],
                          ),
                          const SizedBox(height: 16),
                          AppInput.email(
                            controller: _emailController,
                            label: 'Email',
                            prefix: const PhosphorIcon(PhosphorIconsRegular.envelope, size: 20),
                            textInputAction: TextInputAction.next,
                            autofillHints: const [AutofillHints.email],
                          ),
                          const SizedBox(height: 16),
                          AppInput.password(
                            controller: _passwordController,
                            label: 'Password',
                            prefix: const PhosphorIcon(PhosphorIconsRegular.lockKey, size: 20),
                            textInputAction: TextInputAction.next,
                            autofillHints: const [AutofillHints.newPassword],
                          ),
                          const SizedBox(height: 16),
                          AppInput(
                            controller: _orgNameController,
                            label: 'Organization Name',
                            prefix: const PhosphorIcon(PhosphorIconsRegular.buildings, size: 20),
                            textInputAction: TextInputAction.done,
                            onSubmitted: (_) => _setup(context, vm),
                            autofillHints: const [AutofillHints.organizationName],
                          ),
                        ],
                      ),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: AppButton(variant: AppButtonVariant.primary, 
                        onPressed: vm.isBusy
                            ? null
                            : () => _setup(context, vm),
                        child: vm.isBusy
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Complete Setup'),
                      ),
                    ),
                    const SizedBox(height: 12),
                    AppButton(variant: AppButtonVariant.ghost, 
                      onPressed: () => context.go('/login'),
                      child: const Text('Already set up? Sign in'),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _setup(BuildContext context, SetupViewModel vm) async {
    await vm.setup(
      _nameController.text.trim(),
      _emailController.text.trim(),
      _passwordController.text,
      _orgNameController.text.trim(),
    );
    if (vm.isSuccess && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Setup completed. Please sign in.')),
      );
      context.go('/login');
    }
  }
}
