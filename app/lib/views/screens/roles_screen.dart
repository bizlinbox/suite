import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/di.dart';
import '../../../data/models/role_model.dart';
import '../../../data/repositories/settings_repository.dart';
import '../../../viewmodels/auth_viewmodel.dart';
import '../../../viewmodels/base_viewmodel.dart';
import '../widgets/custom/custom_widgets.dart';
import '../widgets/custom/app_shimmer.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

const _allPermissions = <String>[
  'conversations.read',
  'conversations.manage',
  'contacts.read',
  'contacts.manage',
  'campaigns.read',
  'campaigns.manage',
  'automations.read',
  'automations.manage',
  'analytics.read',
  'users.read',
  'users.manage',
  'roles.read',
  'roles.manage',
  'settings.read',
  'settings.manage',
];

String _permissionLabel(String p) {
  final parts = p.split('.');
  final resource = parts[0][0].toUpperCase() + parts[0].substring(1);
  final action = parts[1][0].toUpperCase() + parts[1].substring(1);
  return '$resource - $action';
}

class RolesViewModel extends BaseViewModel {
  final SettingsRepository _repo;
  RolesViewModel(this._repo);

  List<Role> _roles = [];
  List<Role> get roles => _roles;

  Future<void> loadRoles() async {
    await runAsync(() async {
      final result = await _repo.getRoles();
      result.when(
        success: (data) => _roles = data,
        error: (message, exception) => throw Exception(message),
      );
    });
  }

  Future<void> createRole(String name, List<String> permissions) async {
    setBusy();
    final result = await _repo.createRole(name, permissions);
    result.when(
      success: (_) {
        loadRoles();
        setSuccess();
      },
      error: (message, exception) => setError(message),
    );
  }

  Future<void> updateRole(String id, {String? name, List<String>? permissions}) async {
    setBusy();
    final result = await _repo.updateRole(id, name: name, permissions: permissions);
    result.when(
      success: (_) {
        loadRoles();
        setSuccess();
      },
      error: (message, exception) => setError(message),
    );
  }

  Future<void> deleteRole(String id) async {
    final result = await _repo.deleteRole(id);
    result.when(
      success: (_) => loadRoles(),
      error: (message, exception) {},
    );
  }
}

class RolesScreen extends StatelessWidget {
  const RolesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => RolesViewModel(locator<SettingsRepository>())..loadRoles(),
      child: const _RolesBody(),
    );
  }
}

class _RolesBody extends StatelessWidget {
  const _RolesBody();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<RolesViewModel>();
    final authVm = context.watch<AuthViewModel>();

    if (!authVm.can('roles.read')) {
      return Scaffold(
        appBar: AppAppBar(title: const Text('Roles')),
        body: _buildNoPermission(),
      );
    }

    final canManage = authVm.can('roles.manage');

    return Scaffold(
      appBar: AppAppBar(
        title: const Text('Roles'),
        actions: [
          AppIconButton(
            icon: const PhosphorIcon(PhosphorIconsRegular.arrowsClockwise),
            onPressed: vm.isBusy ? null : () => vm.loadRoles(),
          ),
        ],
      ),
      floatingActionButton: canManage
          ? AppFloatingActionButton(
              onPressed: () => _showRoleDialog(context, vm),
              icon: const PhosphorIcon(PhosphorIconsRegular.plus),
              label: const Text('Add Role'),
            )
          : null,
      body: vm.isBusy && vm.roles.isEmpty
          ? AppShimmer(
              child: ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: 6,
                itemBuilder: (_, index) => const Padding(
                  padding: EdgeInsets.only(bottom: 8),
                  child: GenericCardSkeleton(lines: 2),
                ),
              ),
            )
          : vm.roles.isEmpty
              ? const AppEmptyState(
                  icon: PhosphorIconsRegular.shield,
                  title: 'No roles',
                  subtitle: 'Create roles to manage team permissions',
                )
              : RefreshIndicator(
                  onRefresh: () => vm.loadRoles(),
                  child: ListView.builder(
                    physics: const AlwaysScrollableScrollPhysics(),
                    padding: const EdgeInsets.all(12),
                    itemCount: vm.roles.length,
                    itemBuilder: (context, index) {
                      final r = vm.roles[index];
                      return _RoleCard(
                        role: r,
                        canManage: canManage,
                        onEdit: r.isSystem
                            ? null
                            : () => _showRoleDialog(context, vm, role: r),
                        onDelete: r.isSystem
                            ? null
                            : () => _confirmDelete(context, vm, r),
                      );
                    },
                  ),
                ),
    );
  }

  void _showRoleDialog(BuildContext context, RolesViewModel vm, {Role? role}) {
    final isEdit = role != null;
    final nameController = TextEditingController(text: role?.name ?? '');
    final selectedPerms = <String>{...(role?.permissions ?? [])};

    showDialog(
      context: context,
      builder: (ctx) => StatefulBuilder(
        builder: (ctx, setDialogState) {
          return AlertDialog(
            title: Text(isEdit ? 'Edit Role' : 'Create Role'),
            content: SizedBox(
              width: double.maxFinite,
              child: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    AppInput(
                      controller: nameController,
                      label: 'Role Name',
                      autofillHints: null,
                    ),
                    const SizedBox(height: 16),
                    const Text('Permissions', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    ..._allPermissions.map((p) {
                      final isChecked = selectedPerms.contains(p);
                      return CheckboxListTile(
                        dense: true,
                        contentPadding: EdgeInsets.zero,
                        title: Text(_permissionLabel(p)),
                        value: isChecked,
                        onChanged: (v) {
                          setDialogState(() {
                            if (v == true) {
                              selectedPerms.add(p);
                            } else {
                              selectedPerms.remove(p);
                            }
                          });
                        },
                      );
                    }),
                  ],
                ),
              ),
            ),
            actions: [
              TextButton(
                onPressed: () => Navigator.pop(ctx),
                child: const Text('Cancel'),
              ),
              AppButton(
                variant: AppButtonVariant.primary,
                onPressed: vm.isBusy
                    ? null
                    : () {
                        final name = nameController.text.trim();
                        if (name.isEmpty) return;
                        Navigator.pop(ctx);
                        if (isEdit) {
                          vm.updateRole(
                            role.id,
                            name: name,
                            permissions: selectedPerms.toList(),
                          );
                        } else {
                          vm.createRole(name, selectedPerms.toList());
                        }
                      },
                child: vm.isBusy
                    ? const SizedBox(
                        height: 20,
                        width: 20,
                        child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                      )
                    : Text(isEdit ? 'Save' : 'Create'),
              ),
            ],
          );
        },
      ),
    );
  }

  void _confirmDelete(BuildContext context, RolesViewModel vm, Role role) {
    showDialog(
      context: context,
      builder: (_) => AppAlertDialog(
        title: const Text('Delete Role?'),
        content: Text('Are you sure you want to delete "${role.name}"? This action cannot be undone.'),
        actions: [
          AppButton(
            variant: AppButtonVariant.ghost,
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          AppButton(
            variant: AppButtonVariant.primary,
            onPressed: () {
              Navigator.pop(context);
              vm.deleteRole(role.id);
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  Widget _buildNoPermission() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          PhosphorIcon(PhosphorIconsRegular.lockKey, size: 48, color: Colors.grey),
          SizedBox(height: 16),
          Text('You do not have permission to view this page.', textAlign: TextAlign.center),
        ],
      ),
    );
  }
}

class _RoleCard extends StatelessWidget {
  final Role role;
  final bool canManage;
  final VoidCallback? onEdit;
  final VoidCallback? onDelete;

  const _RoleCard({
    required this.role,
    required this.canManage,
    this.onEdit,
    this.onDelete,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Padding(
        padding: const EdgeInsets.all(12),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Row(
              children: [
                Expanded(
                  child: Row(
                    children: [
                      Text(
                        role.name,
                        style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold),
                      ),
                      if (role.isSystem) ...[
                        const SizedBox(width: 8),
                        const Chip(label: Text('System'), padding: EdgeInsets.zero),
                      ],
                    ],
                  ),
                ),
                if (canManage && !role.isSystem) ...[
                  AppIconButton(
                    icon: const PhosphorIcon(PhosphorIconsRegular.pencilSimple),
                    onPressed: onEdit,
                  ),
                  AppIconButton(
                    icon: const PhosphorIcon(PhosphorIconsRegular.trash, color: Colors.red),
                    onPressed: onDelete,
                  ),
                ],
              ],
            ),
            const SizedBox(height: 8),
            if (role.permissions.isEmpty)
              const Text('No permissions', style: TextStyle(color: Colors.grey, fontSize: 12))
            else
              Wrap(
                spacing: 6,
                runSpacing: 6,
                children: role.permissions.map((p) {
                  return Chip(
                    label: Text(
                      _permissionLabel(p),
                      style: const TextStyle(fontSize: 11),
                    ),
                    padding: const EdgeInsets.symmetric(horizontal: 4),
                    visualDensity: VisualDensity.compact,
                  );
                }).toList(),
              ),
            const SizedBox(height: 4),
            Text(
              '${role.permissions.length} permission(s)',
              style: const TextStyle(fontSize: 12, color: Colors.grey),
            ),
          ],
        ),
      ),
    );
  }
}
