import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/di.dart';
import '../../../data/models/integration_model.dart';
import '../../../data/repositories/settings_repository.dart';
import '../../../viewmodels/auth_viewmodel.dart';
import '../../../viewmodels/base_viewmodel.dart';

class IntegrationsSettingsViewModel extends BaseViewModel {
  final SettingsRepository _repo;
  IntegrationsSettingsViewModel(this._repo);

  List<Integration> _integrations = [];
  List<Integration> get integrations => _integrations;

  Future<void> loadIntegrations() async {
    await runAsync(() async {
      final result = await _repo.getIntegrations();
      result.when(
        success: (data) => _integrations = data,
        error: (message, exception) => throw Exception(message),
      );
    });
  }

  Future<void> createIntegration(String name, String type, List<String> urls, bool isActive) async {
    setBusy();
    final result = await _repo.createIntegration({
      'name': name,
      'type': type,
      'isActive': isActive,
      'config': {'urls': urls},
    });
    result.when(
      success: (_) => loadIntegrations(),
      error: (message, exception) => setError(message),
    );
  }

  Future<void> updateIntegration(String id, String name, String type, List<String> urls, bool isActive) async {
    setBusy();
    final result = await _repo.updateIntegration(id, {
      'name': name,
      'type': type,
      'isActive': isActive,
      'config': {'urls': urls},
    });
    result.when(
      success: (_) => loadIntegrations(),
      error: (message, exception) => setError(message),
    );
  }

  Future<void> deleteIntegration(String id) async {
    final result = await _repo.deleteIntegration(id);
    result.when(
      success: (_) => loadIntegrations(),
      error: (message, exception) {},
    );
  }

  Future<void> toggleIntegration(String id, bool isActive) async {
    final result = await _repo.updateIntegration(id, {'isActive': isActive});
    result.when(
      success: (_) => loadIntegrations(),
      error: (message, exception) {},
    );
  }
}

class IntegrationsSettingsScreen extends StatelessWidget {
  const IntegrationsSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => IntegrationsSettingsViewModel(locator<SettingsRepository>())..loadIntegrations(),
      child: const _IntegrationsBody(),
    );
  }
}

class _IntegrationsBody extends StatelessWidget {
  const _IntegrationsBody();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<IntegrationsSettingsViewModel>();
    final authVm = context.watch<AuthViewModel>();

    if (!authVm.can('settings.read')) {
      return Scaffold(
        appBar: AppBar(title: const Text('Integrations')),
        body: _buildNoPermission(),
      );
    }

    final canManage = authVm.can('settings.manage');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Integrations'),
        actions: [
          if (canManage)
            IconButton(
              icon: const Icon(Icons.add),
              onPressed: () => _showCreateDialog(context, vm),
            ),
        ],
      ),
      body: vm.isBusy && vm.integrations.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : vm.integrations.isEmpty
              ? const Center(child: Text('No integrations configured'))
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: vm.integrations.length,
                  itemBuilder: (context, index) {
                    final i = vm.integrations[index];
                    final urls = (i.config['urls'] as List<dynamic>?)?.cast<String>() ?? [];
                    return Card(
                      child: ListTile(
                        leading: const Icon(Icons.webhook),
                        title: Text(i.name),
                        subtitle: Text('${i.type} \u2022 ${urls.length} URL(s)'),
                        trailing: canManage
                            ? Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Switch(
                                    value: i.isActive,
                                    onChanged: (v) => vm.toggleIntegration(i.id, v),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.edit_outlined),
                                    onPressed: () => _showEditDialog(context, vm, i),
                                  ),
                                  IconButton(
                                    icon: const Icon(Icons.delete_outline, color: Colors.red),
                                    onPressed: () => _confirmDelete(context, vm, i),
                                  ),
                                ],
                              )
                            : Switch(
                                value: i.isActive,
                                onChanged: null,
                              ),
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

  Future<void> _showCreateDialog(BuildContext context, IntegrationsSettingsViewModel vm) async {
    await _showIntegrationDialog(context, vm, null);
  }

  Future<void> _showEditDialog(BuildContext context, IntegrationsSettingsViewModel vm, Integration integration) async {
    await _showIntegrationDialog(context, vm, integration);
  }

  Future<void> _showIntegrationDialog(BuildContext context, IntegrationsSettingsViewModel vm, Integration? existing) async {
    final nameController = TextEditingController(text: existing?.name ?? '');
    String type = existing?.type ?? 'webhook_forward';
    bool isActive = existing?.isActive ?? true;
    final urlControllers = <TextEditingController>[];
    final existingUrls = (existing?.config['urls'] as List<dynamic>?)?.cast<String>() ?? [];
    for (final url in existingUrls) {
      urlControllers.add(TextEditingController(text: url));
    }
    if (urlControllers.isEmpty) {
      urlControllers.add(TextEditingController());
    }

    await showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            final vm = ctx.watch<IntegrationsSettingsViewModel>();
            return AlertDialog(
              title: Text(existing == null ? 'Create Integration' : 'Edit Integration'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: nameController,
                      decoration: const InputDecoration(labelText: 'Name', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 12),
                    DropdownButtonFormField<String>(
                      initialValue: type,
                      decoration: const InputDecoration(labelText: 'Type', border: OutlineInputBorder()),
                      items: const [
                        DropdownMenuItem(value: 'webhook_forward', child: Text('Webhook Forward')),
                      ],
                      onChanged: (v) {
                        if (v != null) setDialogState(() => type = v);
                      },
                    ),
                    const SizedBox(height: 12),
                    SwitchListTile(
                      title: const Text('Active'),
                      value: isActive,
                      onChanged: (v) => setDialogState(() => isActive = v),
                    ),
                    const SizedBox(height: 12),
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text('Config URLs', style: TextStyle(fontWeight: FontWeight.bold)),
                    ),
                    const SizedBox(height: 8),
                    ...urlControllers.asMap().entries.map((entry) {
                      final idx = entry.key;
                      final ctrl = entry.value;
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            Expanded(
                              child: TextField(
                                controller: ctrl,
                                decoration: InputDecoration(
                                  hintText: 'URL ${idx + 1}',
                                  border: const OutlineInputBorder(),
                                ),
                              ),
                            ),
                            IconButton(
                              icon: const Icon(Icons.remove_circle_outline, color: Colors.red),
                              onPressed: () {
                                if (urlControllers.length > 1) {
                                  setDialogState(() => urlControllers.removeAt(idx));
                                }
                              },
                            ),
                          ],
                        ),
                      );
                    }),
                    Align(
                      alignment: Alignment.centerLeft,
                      child: TextButton.icon(
                        onPressed: () => setDialogState(() => urlControllers.add(TextEditingController())),
                        icon: const Icon(Icons.add),
                        label: const Text('Add URL'),
                      ),
                    ),
                  ],
                ),
              ),
              actions: [
                TextButton(
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Cancel'),
                ),
                FilledButton(
                  onPressed: nameController.text.trim().isNotEmpty
                      ? () {
                          final urls = urlControllers
                              .map((c) => c.text.trim())
                              .where((u) => u.isNotEmpty)
                              .toList();
                          if (existing == null) {
                            vm.createIntegration(nameController.text.trim(), type, urls, isActive);
                          } else {
                            vm.updateIntegration(existing.id, nameController.text.trim(), type, urls, isActive);
                          }
                          Navigator.of(ctx).pop();
                        }
                      : null,
                  child: Text(existing == null ? 'Create' : 'Save'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _confirmDelete(BuildContext context, IntegrationsSettingsViewModel vm, Integration integration) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Integration'),
        content: Text('Are you sure you want to delete "${integration.name}"?'),
        actions: [
          TextButton(onPressed: () => Navigator.of(ctx).pop(false), child: const Text('Cancel')),
          FilledButton(
            onPressed: () => Navigator.of(ctx).pop(true),
            style: FilledButton.styleFrom(backgroundColor: Colors.red),
            child: const Text('Delete'),
          ),
        ],
      ),
    );
    if (confirmed == true) {
      vm.deleteIntegration(integration.id);
    }
  }
}
