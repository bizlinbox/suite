import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../core/utils/result.dart';
import '../../data/models/user_model.dart';
import '../../data/repositories/auth_repository.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../../viewmodels/base_viewmodel.dart';
import '../../core/responsive.dart';
import '../widgets/custom/custom_widgets.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

class ProfileViewModel extends BaseViewModel {
  final AuthRepository _repo;
  ProfileViewModel(this._repo);

  Future<void> logout() async {
    await _repo.logout();
  }

  Future<Result<User>> updateProfile({
    required String name,
    String? currentPassword,
    String? newPassword,
  }) async {
    setBusy();
    final result = await _repo.updateProfile(
      name,
      currentPassword: currentPassword,
      newPassword: newPassword,
    );
    result.when(
      success: (_) => setSuccess(),
      error: (message, exception) => setError(message),
    );
    return result;
  }
}

class ProfileScreen extends StatelessWidget {
  const ProfileScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => ProfileViewModel(locator<AuthRepository>()),
      child: const _ProfileBody(),
    );
  }
}

class _ProfileBody extends StatefulWidget {
  const _ProfileBody();

  @override
  State<_ProfileBody> createState() => _ProfileBodyState();
}

class _ProfileBodyState extends State<_ProfileBody> {
  final _nameController = TextEditingController();
  final _currentPasswordController = TextEditingController();
  final _newPasswordController = TextEditingController();
  final _confirmPasswordController = TextEditingController();

  bool _obscureCurrent = true;
  bool _obscureNew = true;
  bool _obscureConfirm = true;

  @override
  void didChangeDependencies() {
    super.didChangeDependencies();
    final user = context.read<AuthViewModel>().user;
    if (user != null && _nameController.text.isEmpty) {
      _nameController.text = user.name;
    }
  }

  @override
  void dispose() {
    _nameController.dispose();
    _currentPasswordController.dispose();
    _newPasswordController.dispose();
    _confirmPasswordController.dispose();
    super.dispose();
  }

  void _showSnackBar(String message, {bool isError = false}) {
    final messenger = ScaffoldMessenger.of(context);
    messenger.hideCurrentSnackBar();
    messenger.showSnackBar(
      SnackBar(
        content: Text(message),
        backgroundColor: isError ? Colors.red.shade700 : Colors.green.shade700,
      ),
    );
  }

  Future<void> _saveAccountInfo(ProfileViewModel vm, AuthViewModel authVm) async {
    final name = _nameController.text.trim();
    if (name.isEmpty) {
      _showSnackBar('Name cannot be empty', isError: true);
      return;
    }
    final result = await vm.updateProfile(name: name);
    result.when(
      success: (user) {
        authVm.setUser(user);
        _showSnackBar('Profile updated successfully');
      },
      error: (message, exception) => _showSnackBar(message, isError: true),
    );
  }

  Future<void> _savePassword(ProfileViewModel vm, AuthViewModel authVm) async {
    final current = _currentPasswordController.text;
    final newPass = _newPasswordController.text;
    final confirm = _confirmPasswordController.text;

    if (current.isEmpty || newPass.isEmpty || confirm.isEmpty) {
      _showSnackBar('Please fill in all password fields', isError: true);
      return;
    }
    if (newPass.length < 8) {
      _showSnackBar('New password must be at least 8 characters', isError: true);
      return;
    }
    if (newPass != confirm) {
      _showSnackBar('New password and confirmation do not match', isError: true);
      return;
    }

    final result = await vm.updateProfile(
      name: authVm.user?.name ?? '',
      currentPassword: current,
      newPassword: newPass,
    );
    result.when(
      success: (user) {
        _currentPasswordController.clear();
        _newPasswordController.clear();
        _confirmPasswordController.clear();
        authVm.setUser(user);
        _showSnackBar('Password updated successfully');
      },
      error: (message, exception) => _showSnackBar(message, isError: true),
    );
  }

  @override
  Widget build(BuildContext context) {
    final authVm = context.watch<AuthViewModel>();
    final vm = context.watch<ProfileViewModel>();
    final user = authVm.user;

    return Scaffold(
      appBar: AppAppBar(title: const Text('Profile')),
      body: user == null
          ? const Center(child: Text('Not logged in'))
          : SingleChildScrollView(
              padding: const EdgeInsets.all(16),
              child: CenteredMaxWidth(
                maxWidth: 640,
                child: Column(
                  children: [
                  AppAvatar(
                    radius: 40,
                    child: Text(
                      user.name.isNotEmpty ? user.name[0].toUpperCase() : '?',
                      style: const TextStyle(fontSize: 32),
                    ),
                  ),
                  const SizedBox(height: 16),
                  Text(user.name, style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                  Text(user.email, style: const TextStyle(color: Colors.grey)),
                  const SizedBox(height: 8),
                  Chip(label: Text(user.role)),
                  const SizedBox(height: 24),
                  AppCard(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Account Information',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 16),
                          AppTextField(
                            controller: _nameController,
                            decoration: const InputDecoration(
                              labelText: 'Full Name',
                              prefixIcon: PhosphorIcon(PhosphorIconsRegular.user),
                              border: OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 12),
                          AppTextField(
                            enabled: false,
                            decoration: InputDecoration(
                              labelText: 'Email',
                              prefixIcon: const PhosphorIcon(PhosphorIconsRegular.envelope),
                              border: const OutlineInputBorder(),
                              filled: true,
                              fillColor: Colors.grey.shade100,
                            ),
                            controller: TextEditingController(text: user.email),
                          ),
                          const SizedBox(height: 16),
                          Align(
                            alignment: Alignment.centerRight,
                            child: FilledButton.icon(
                              onPressed: vm.isBusy ? null : () => _saveAccountInfo(vm, authVm),
                              icon: vm.isBusy
                                  ? const SizedBox(
                                      height: 18,
                                      width: 18,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                    )
                                  : const PhosphorIcon(PhosphorIconsRegular.floppyDisk),
                              label: const Text('Save Changes'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  AppCard(
                    child: Padding(
                      padding: const EdgeInsets.all(16),
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          const Text(
                            'Security',
                            style: TextStyle(fontSize: 18, fontWeight: FontWeight.bold),
                          ),
                          const SizedBox(height: 16),
                          AppTextField(
                            controller: _currentPasswordController,
                            obscureText: _obscureCurrent,
                            decoration: InputDecoration(
                              labelText: 'Current Password',
                              prefixIcon: const PhosphorIcon(PhosphorIconsRegular.lockKey),
                              suffixIcon: AppIconButton(
                                icon: Icon(_obscureCurrent ? PhosphorIconsRegular.eyeSlash : PhosphorIconsRegular.eye),
                                onPressed: () => setState(() => _obscureCurrent = !_obscureCurrent),
                              ),
                              border: const OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 12),
                          AppTextField(
                            controller: _newPasswordController,
                            obscureText: _obscureNew,
                            decoration: InputDecoration(
                              labelText: 'New Password',
                              prefixIcon: const PhosphorIcon(PhosphorIconsRegular.lockKey),
                              suffixIcon: AppIconButton(
                                icon: Icon(_obscureNew ? PhosphorIconsRegular.eyeSlash : PhosphorIconsRegular.eye),
                                onPressed: () => setState(() => _obscureNew = !_obscureNew),
                              ),
                              border: const OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 12),
                          AppTextField(
                            controller: _confirmPasswordController,
                            obscureText: _obscureConfirm,
                            decoration: InputDecoration(
                              labelText: 'Confirm New Password',
                              prefixIcon: const PhosphorIcon(PhosphorIconsRegular.lockKey),
                              suffixIcon: AppIconButton(
                                icon: Icon(_obscureConfirm ? PhosphorIconsRegular.eyeSlash : PhosphorIconsRegular.eye),
                                onPressed: () => setState(() => _obscureConfirm = !_obscureConfirm),
                              ),
                              border: const OutlineInputBorder(),
                            ),
                          ),
                          const SizedBox(height: 16),
                          Align(
                            alignment: Alignment.centerRight,
                            child: FilledButton.icon(
                              onPressed: vm.isBusy ? null : () => _savePassword(vm, authVm),
                              icon: vm.isBusy
                                  ? const SizedBox(
                                      height: 18,
                                      width: 18,
                                      child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                    )
                                  : const PhosphorIcon(PhosphorIconsRegular.floppyDisk),
                              label: const Text('Save Changes'),
                            ),
                          ),
                        ],
                      ),
                    ),
                  ),
                  const SizedBox(height: 24),
                  Align(
                    alignment: Alignment.centerRight,
                    child: AppButton(
                      variant: AppButtonVariant.danger,
                      onPressed: () async {
                        await authVm.logout();
                        if (context.mounted) context.go('/login');
                      },
                      child: const Row(
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          PhosphorIcon(PhosphorIconsRegular.signOut),
                          SizedBox(width: 8),
                          Text('Logout'),
                        ],
                      ),
                    ),
                  ),
                ],
              ),
              ),
            ),
    );
  }
}