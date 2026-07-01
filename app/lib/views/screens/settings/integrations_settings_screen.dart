import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/di.dart';
import '../../../data/models/integration_model.dart';
import '../../../data/repositories/settings_repository.dart';
import '../../../viewmodels/auth_viewmodel.dart';
import '../../../viewmodels/base_viewmodel.dart';
import '../../widgets/custom/custom_widgets.dart';
import '../../widgets/custom/app_shimmer.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

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

  Future<void> createIntegration(
    String name,
    String type,
    List<String> urls,
    bool isActive,
  ) async {
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

  Future<void> updateIntegration(
    String id,
    String name,
    String type,
    List<String> urls,
    bool isActive,
  ) async {
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
      create: (_) =>
          IntegrationsSettingsViewModel(locator<SettingsRepository>())
            ..loadIntegrations(),
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
        appBar: AppAppBar(title: const Text('Integrations')),
        body: _buildNoPermission(),
      );
    }

    final canManage = authVm.can('settings.manage');

    return Scaffold(
      appBar: AppAppBar(
        title: const Text('Integrations'),
        actions: [
          if (canManage)
            AppIconButton(
              icon: const PhosphorIcon(PhosphorIconsRegular.plus),
              onPressed: () => _showCreateDialog(context, vm),
            ),
        ],
      ),
      body: vm.isBusy && vm.integrations.isEmpty
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
          : vm.integrations.isEmpty
          ? const Center(child: Text('No integrations configured'))
          : RefreshIndicator(
              onRefresh: () => vm.loadIntegrations(),
              child: ListView.builder(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(12),
                itemCount: vm.integrations.length,
                itemBuilder: (context, index) {
                  final i = vm.integrations[index];
                  final urls =
                      (i.config['urls'] as List<dynamic>?)?.cast<String>() ??
                      [];
                  return AppCard(
                    child: AppListTile(
                      leading: const PhosphorIcon(PhosphorIconsRegular.plugs),
                      title: Text(i.name),
                      subtitle: Text('${i.type} \u2022 ${urls.length} URL(s)'),
                      trailing: canManage
                          ? Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                AppInput.switchInput(
                                  value: i.isActive,
                                  onToggled: (v) =>
                                      vm.toggleIntegration(i.id, v),
                                ),
                                AppIconButton(
                                  icon: const PhosphorIcon(
                                    PhosphorIconsRegular.pencilSimple,
                                  ),
                                  onPressed: () =>
                                      _showEditDialog(context, vm, i),
                                ),
                                AppIconButton(
                                  icon: const PhosphorIcon(
                                    PhosphorIconsRegular.trash,
                                    color: Colors.red,
                                  ),
                                  onPressed: () =>
                                      _confirmDelete(context, vm, i),
                                ),
                              ],
                            )
                          : AppInput.switchInput(
                              value: i.isActive,
                              onToggled: null,
                            ),
                    ),
                  );
                },
              ),
            ),
    );
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

  Future<void> _showCreateDialog(
    BuildContext context,
    IntegrationsSettingsViewModel vm,
  ) async {
    await _showIntegrationDialog(context, vm, null);
  }

  Future<void> _showEditDialog(
    BuildContext context,
    IntegrationsSettingsViewModel vm,
    Integration integration,
  ) async {
    await _showIntegrationDialog(context, vm, integration);
  }

  Future<void> _showIntegrationDialog(
    BuildContext context,
    IntegrationsSettingsViewModel vm,
    Integration? existing,
  ) async {
    final nameController = TextEditingController(text: existing?.name ?? '');
    String type = existing?.type ?? 'webhook_forward';
    bool isActive = existing?.isActive ?? true;
    final urlControllers = <TextEditingController>[];
    final existingUrls =
        (existing?.config['urls'] as List<dynamic>?)?.cast<String>() ?? [];
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
            return AppAlertDialog(
              title: Text(
                existing == null ? 'Create Integration' : 'Edit Integration',
              ),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    AppInput(controller: nameController, label: 'Name'),
                    const SizedBox(height: 12),
                    AppInput.dropdown(
                      value: type,
                      label: 'Type',
                      options: const [
                        AppInputOption(
                          value: 'webhook_forward',
                          label: 'Webhook Forward',
                        ),
                      ],
                      onSelected: (v) {
                        if (v != null) setDialogState(() => type = v);
                      },
                    ),
                    const SizedBox(height: 12),
                    AppInput.switchInput(
                      label: 'Active',
                      value: isActive,
                      onToggled: (v) => setDialogState(() => isActive = v),
                    ),
                    const SizedBox(height: 12),
                    const Align(
                      alignment: Alignment.centerLeft,
                      child: Text(
                        'Config URLs',
                        style: TextStyle(fontWeight: FontWeight.bold),
                      ),
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
                              child: AppInput(
                                controller: ctrl,
                                hint: 'URL ${idx + 1}',
                              ),
                            ),
                            AppIconButton(
                              icon: const PhosphorIcon(
                                PhosphorIconsRegular.minusCircle,
                                color: Colors.red,
                              ),
                              onPressed: () {
                                if (urlControllers.length > 1) {
                                  setDialogState(
                                    () => urlControllers.removeAt(idx),
                                  );
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
                        onPressed: () => setDialogState(
                          () => urlControllers.add(TextEditingController()),
                        ),
                        icon: const PhosphorIcon(PhosphorIconsRegular.plus),
                        label: const Text('Add URL'),
                      ),
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
                  onPressed: nameController.text.trim().isNotEmpty
                      ? () {
                          final urls = urlControllers
                              .map((c) => c.text.trim())
                              .where((u) => u.isNotEmpty)
                              .toList();
                          if (existing == null) {
                            vm.createIntegration(
                              nameController.text.trim(),
                              type,
                              urls,
                              isActive,
                            );
                          } else {
                            vm.updateIntegration(
                              existing.id,
                              nameController.text.trim(),
                              type,
                              urls,
                              isActive,
                            );
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

  Future<void> _confirmDelete(
    BuildContext context,
    IntegrationsSettingsViewModel vm,
    Integration integration,
  ) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AppAlertDialog(
        title: const Text('Delete Integration'),
        content: Text('Are you sure you want to delete "${integration.name}"?'),
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
      vm.deleteIntegration(integration.id);
    }
  }
}
