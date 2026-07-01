import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../data/repositories/auth_repository.dart';
import '../../viewmodels/base_viewmodel.dart';
import '../widgets/custom/custom_widgets.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

class AcceptInviteViewModel extends BaseViewModel {
  final AuthRepository _repo;
  AcceptInviteViewModel(this._repo);

  Future<void> acceptInvite(String token, String name, String password) async {
    setBusy();
    final result = await _repo.acceptInvite(token, name, password);
    result.when(
      success: (_) => setSuccess(),
      error: (message, exception) => setError(message),
    );
  }
}

class AcceptInviteScreen extends StatelessWidget {
  final String? token;
  const AcceptInviteScreen({super.key, this.token});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AcceptInviteViewModel(locator<AuthRepository>()),
      child: _AcceptInviteBody(initialToken: token),
    );
  }
}

class _AcceptInviteBody extends StatefulWidget {
  final String? initialToken;
  const _AcceptInviteBody({this.initialToken});

  @override
  State<_AcceptInviteBody> createState() => _AcceptInviteBodyState();
}

class _AcceptInviteBodyState extends State<_AcceptInviteBody> {
  late final _tokenController = TextEditingController(text: widget.initialToken ?? '');
  final _nameController = TextEditingController();
  final _passwordController = TextEditingController();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<AcceptInviteViewModel>();

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
                    const PhosphorIcon(PhosphorIconsRegular.chatTeardropText, size: 48, color: Color(0xFF2563EB)),
                    const SizedBox(height: 16),
                    const Text(
                      'Accept Invitation',
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Set your password to join',
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
                    AppInput(
                      controller: _tokenController,
                      label: 'Invitation Token',
                      prefix: const PhosphorIcon(PhosphorIconsRegular.key, size: 20),
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 16),
                    AppInput(
                      controller: _nameController,
                      label: 'Name',
                      prefix: const PhosphorIcon(PhosphorIconsRegular.user, size: 20),
                      textInputAction: TextInputAction.next,
                    ),
                    const SizedBox(height: 16),
                    AppInput.password(
                      controller: _passwordController,
                      label: 'Password',
                      prefix: const PhosphorIcon(PhosphorIconsRegular.lockKey, size: 20),
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _accept(context, vm),
                    ),
                    const SizedBox(height: 24),
                    SizedBox(
                      width: double.infinity,
                      child: AppButton(variant: AppButtonVariant.primary, 
                        onPressed: vm.isBusy
                            ? null
                            : () => _accept(context, vm),
                        child: vm.isBusy
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Accept Invite'),
                      ),
                    ),
                    const SizedBox(height: 12),
                    AppButton(variant: AppButtonVariant.ghost, 
                      onPressed: () => context.go('/login'),
                      child: const Text('Back to Sign In'),
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

  Future<void> _accept(BuildContext context, AcceptInviteViewModel vm) async {
    await vm.acceptInvite(
      _tokenController.text.trim(),
      _nameController.text.trim(),
      _passwordController.text,
    );
    if (vm.isSuccess && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        const SnackBar(content: Text('Invitation accepted. Please sign in.')),
      );
      context.go('/login');
    }
  }
}