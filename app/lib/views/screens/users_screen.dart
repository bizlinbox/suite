import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../data/models/role_model.dart';
import '../../data/models/user_model.dart';
import '../../data/repositories/settings_repository.dart';
import '../../data/repositories/user_repository.dart';
import '../../data/repositories/waba_account_repository.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../../viewmodels/base_viewmodel.dart';
import '../widgets/custom/custom_widgets.dart';
import '../widgets/custom/app_shimmer.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

class UsersViewModel extends BaseViewModel {
  final UserRepository _userRepo;
  final SettingsRepository _settingsRepo;
  final WabaAccountRepository _wabaRepo;

  UsersViewModel(this._userRepo, this._settingsRepo, this._wabaRepo);

  List<User> _users = [];
  List<User> get users => _users;

  List<Role> _roles = [];
  List<Role> get roles => _roles;

  List<WabaAccount> _wabaAccounts = [];
  List<WabaAccount> get wabaAccounts => _wabaAccounts;

  Future<void> loadUsers() async {
    await runAsync(() async {
      final result = await _userRepo.getUsers();
      result.when(
        success: (data) => _users = data,
        error: (message, exception) => throw Exception(message),
      );
    });
  }

  Future<void> loadRoles() async {
    final result = await _settingsRepo.getRoles();
    result.when(
      success: (data) {
        _roles = data;
        notifyListeners();
      },
      error: (message, exception) {},
    );
  }

  Future<void> loadWabaAccounts() async {
    final result = await _wabaRepo.getWabaAccounts();
    result.when(
      success: (data) {
        _wabaAccounts = data;
        notifyListeners();
      },
      error: (message, exception) {},
    );
  }

  Future<void> createUser({
    required String name,
    required String email,
    required String role,
    required String password,
  }) async {
    setBusy();
    final result = await _userRepo.createUser({
      'name': name,
      'email': email,
      'role': role,
      'password': password,
    });
    result.when(
      success: (_) {
        loadUsers();
        setSuccess();
      },
      error: (message, exception) => setError(message),
    );
  }

  Future<void> updateUser(
    String id, {
    required String name,
    required String email,
    required String role,
  }) async {
    setBusy();
    final result = await _userRepo.updateUser(id, {
      'name': name,
      'email': email,
      'role': role,
    });
    result.when(
      success: (_) {
        loadUsers();
        setSuccess();
      },
      error: (message, exception) => setError(message),
    );
  }

  Future<void> deleteUser(String id) async {
    final result = await _userRepo.deleteUser(id);
    result.when(success: (_) => loadUsers(), error: (message, exception) {});
  }

  Future<void> assignWaba(String wabaId, String agentId) async {
    final result = await _wabaRepo.assignAgent(wabaId, agentId);
    result.when(success: (_) => loadUsers(), error: (message, exception) {});
  }

  Future<void> removeWaba(String wabaId, String agentId) async {
    final result = await _wabaRepo.removeAgent(wabaId, agentId);
    result.when(success: (_) => loadUsers(), error: (message, exception) {});
  }
}

class UsersScreen extends StatelessWidget {
  const UsersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) =>
          UsersViewModel(
              locator<UserRepository>(),
              locator<SettingsRepository>(),
              locator<WabaAccountRepository>(),
            )
            ..loadUsers()
            ..loadRoles()
            ..loadWabaAccounts(),
      child: const _UsersBody(),
    );
  }
}

class _UsersBody extends StatelessWidget {
  const _UsersBody();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<UsersViewModel>();
    final authVm = context.watch<AuthViewModel>();

    if (!authVm.can('users.read')) {
      return Scaffold(
        appBar: AppAppBar(title: const Text('Users')),
        body: _buildNoPermission(),
      );
    }

    final canManage = authVm.can('users.manage');

    return Scaffold(
      appBar: AppAppBar(
        title: const Text('Users'),
        actions: [
          AppIconButton(
            icon: const PhosphorIcon(PhosphorIconsRegular.arrowsClockwise),
            onPressed: vm.isBusy ? null : () => vm.loadUsers(),
          ),
        ],
      ),
      floatingActionButton: canManage
          ? AppFloatingActionButton(
              onPressed: () => _showAddDialog(context, vm),
              child: const PhosphorIcon(PhosphorIconsRegular.plus),
            )
          : null,
      body: vm.isBusy && vm.users.isEmpty
          ? AppShimmer(
              child: ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: 6,
                itemBuilder: (context, index) => const Padding(
                  padding: EdgeInsets.only(bottom: 8),
                  child: GenericCardSkeleton(lines: 2),
                ),
              ),
            )
          : vm.users.isEmpty
          ? const AppEmptyState(
              icon: PhosphorIconsRegular.users,
              title: 'No users',
              subtitle: 'Invite team members to your workspace',
            )
          : RefreshIndicator(
              onRefresh: () => vm.loadUsers(),
              child: ListView.builder(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(12),
                itemCount: vm.users.length,
                itemBuilder: (context, index) {
                  final u = vm.users[index];
                  return AppCard(
                    child: Padding(
                      padding: const EdgeInsets.symmetric(vertical: 8),
                      child: Column(
                        children: [
                          AppListTile(
                            leading: AppAvatar(
                              child: Text(
                                u.name.isNotEmpty
                                    ? u.name[0].toUpperCase()
                                    : '?',
                              ),
                            ),
                            title: Text(u.name),
                            subtitle: Text(u.email),
                            trailing: canManage
                                ? Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      Chip(label: Text(u.role)),
                                      AppIconButton(
                                        icon: const PhosphorIcon(
                                          PhosphorIconsRegular.pencilSimple,
                                        ),
                                        onPressed: () =>
                                            _showEditDialog(context, vm, u),
                                      ),
                                      AppIconButton(
                                        icon: const PhosphorIcon(
                                          PhosphorIconsRegular.trash,
                                          color: Colors.red,
                                        ),
                                        onPressed: () =>
                                            _confirmDelete(context, vm, u),
                                      ),
                                    ],
                                  )
                                : Chip(label: Text(u.role)),
                          ),
                          const AppDivider(height: 1),
                          Padding(
                            padding: const EdgeInsets.symmetric(
                              horizontal: 16,
                              vertical: 8,
                            ),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                const Text(
                                  'WABA Access',
                                  style: TextStyle(
                                    fontSize: 12,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                const SizedBox(height: 6),
                                Wrap(
                                  spacing: 8,
                                  children: vm.wabaAccounts.map((waba) {
                                    final hasAccess = u.wabaAccounts.any(
                                      (w) => w.id == waba.id,
                                    );
                                    return FilterChip(
                                      label: Text(waba.name),
                                      selected: hasAccess,
                                      onSelected: canManage
                                          ? (_) {
                                              if (hasAccess) {
                                                vm.removeWaba(waba.id, u.id);
                                              } else {
                                                vm.assignWaba(waba.id, u.id);
                                              }
                                            }
                                          : null,
                                    );
                                  }).toList(),
                                ),
                              ],
                            ),
                          ),
                        ],
                      ),
                    ),
                  );
                },
              ),
            ),
    );
  }

  Future<void> _showAddDialog(BuildContext context, UsersViewModel vm) async {
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    final passwordController = TextEditingController();
    String selectedRole = vm.roles.isNotEmpty ? vm.roles.first.name : '';

    await showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            final vm = ctx.watch<UsersViewModel>();
            return AppAlertDialog(
              title: const Text('Add User'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    AppInput(controller: nameController, label: 'Name'),
                    const SizedBox(height: 12),
                    AppInput.email(controller: emailController, label: 'Email'),
                    const SizedBox(height: 12),
                    if (vm.roles.isNotEmpty)
                      AppInput.dropdown(
                        value: selectedRole,
                        label: 'Role',
                        options: vm.roles.map((r) {
                          return AppInputOption(value: r.name, label: r.name);
                        }).toList(),
                        onSelected: (v) {
                          if (v != null) setDialogState(() => selectedRole = v);
                        },
                      ),
                    const SizedBox(height: 12),
                    AppInput.password(
                      controller: passwordController,
                      label: 'Password',
                    ),
                  ],
                ),
              ),
              actions: [
                AppButton(
                  variant: AppButtonVariant.ghost,
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Cancel'),
                ),
                AppButton(
                  variant: AppButtonVariant.primary,
                  onPressed: vm.isBusy
                      ? null
                      : () {
                          vm.createUser(
                            name: nameController.text.trim(),
                            email: emailController.text.trim(),
                            role: selectedRole,
                            password: passwordController.text,
                          );
                        },
                  child: vm.isBusy
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Create'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _showEditDialog(
    BuildContext context,
    UsersViewModel vm,
    User user,
  ) async {
    final nameController = TextEditingController(text: user.name);
    final emailController = TextEditingController(text: user.email);
    String selectedRole = user.role;

    await showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            final vm = ctx.watch<UsersViewModel>();
            return AppAlertDialog(
              title: const Text('Edit User'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    AppInput(controller: nameController, label: 'Name'),
                    const SizedBox(height: 12),
                    AppInput.email(controller: emailController, label: 'Email'),
                    const SizedBox(height: 12),
                    if (vm.roles.isNotEmpty)
                      AppInput.dropdown(
                        value: selectedRole,
                        label: 'Role',
                        options: vm.roles.map((r) {
                          return AppInputOption(value: r.name, label: r.name);
                        }).toList(),
                        onSelected: (v) {
                          if (v != null) setDialogState(() => selectedRole = v);
                        },
                      ),
                  ],
                ),
              ),
              actions: [
                AppButton(
                  variant: AppButtonVariant.ghost,
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Cancel'),
                ),
                AppButton(
                  variant: AppButtonVariant.primary,
                  onPressed: vm.isBusy
                      ? null
                      : () {
                          vm.updateUser(
                            user.id,
                            name: nameController.text.trim(),
                            email: emailController.text.trim(),
                            role: selectedRole,
                          );
                          Navigator.of(ctx).pop();
                        },
                  child: vm.isBusy
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(
                            strokeWidth: 2,
                            color: Colors.white,
                          ),
                        )
                      : const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _confirmDelete(
    BuildContext context,
    UsersViewModel vm,
    User user,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AppAlertDialog(
        title: const Text('Delete User'),
        content: Text('Are you sure you want to delete ${user.name}?'),
        actions: [
          AppButton(
            variant: AppButtonVariant.ghost,
            onPressed: () => Navigator.of(ctx).pop(false),
            child: const Text('Cancel'),
          ),
          AppButton(
            variant: AppButtonVariant.danger,
            onPressed: () => Navigator.of(ctx).pop(true),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      vm.deleteUser(user.id);
    }
  }

  Widget _buildNoPermission() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          PhosphorIcon(
            PhosphorIconsRegular.lockKey,
            size: 48,
            color: Colors.grey,
          ),
          SizedBox(height: 16),
          Text(
            'You do not have permission to view this page.',
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
