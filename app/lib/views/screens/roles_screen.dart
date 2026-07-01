import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../data/models/role_model.dart';
import '../../data/repositories/settings_repository.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../../viewmodels/base_viewmodel.dart';
import '../widgets/custom/custom_widgets.dart';

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

    return Scaffold(
      appBar: AppAppBar(
        title: const Text('Roles'),
        actions: [
          AppIconButton(
            icon: const Icon(Icons.refresh),
            onPressed: vm.isBusy ? null : () => vm.loadRoles(),
          ),
        ],
      ),
      body: vm.isBusy && vm.roles.isEmpty
          ? const Center(child: AppProgressIndicator())
          : vm.roles.isEmpty
              ? const Center(child: Text('No roles found'))
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: vm.roles.length,
                  itemBuilder: (context, index) {
                    final r = vm.roles[index];
                    return AppCard(
                      child: AppListTile(
                        title: Text(r.name),
                        subtitle: Text('${r.permissions.length} permissions'),
                        trailing: r.isSystem
                            ? const Chip(label: Text('System'))
                            : null,
                      ),
                    );
                  },
                ),
    );
  }

  Widget _buildNoPermission() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          Icon(Icons.lock_outline, size: 48, color: Colors.grey),
          SizedBox(height: 16),
          Text('You do not have permission to view this page.', textAlign: TextAlign.center),
        ],
      ),
    );
  }
}