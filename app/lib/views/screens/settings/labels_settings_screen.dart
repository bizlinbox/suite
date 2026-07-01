import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/di.dart';
import '../../../data/models/label_model.dart';
import '../../../data/repositories/settings_repository.dart';
import '../../../viewmodels/auth_viewmodel.dart';
import '../../../viewmodels/base_viewmodel.dart';
import '../../../core/responsive.dart';
import '../../widgets/custom/custom_widgets.dart';
import '../../widgets/custom/app_shimmer.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

class LabelsSettingsViewModel extends BaseViewModel {
  final SettingsRepository _repo;
  LabelsSettingsViewModel(this._repo);

  List<Label> _labels = [];
  List<Label> get labels => _labels;

  Future<void> loadLabels() async {
    await runAsync(() async {
      final result = await _repo.getLabels();
      result.when(
        success: (data) => _labels = data,
        error: (message, exception) => throw Exception(message),
      );
    });
  }

  Future<void> createLabel(String name, String color) async {
    setBusy();
    final result = await _repo.createLabel(name, color);
    result.when(
      success: (_) => loadLabels(),
      error: (message, exception) => setError(message),
    );
  }

  Future<void> updateLabel(String id, String name, String color) async {
    setBusy();
    final result = await _repo.updateLabel(id, name, color);
    result.when(
      success: (_) => loadLabels(),
      error: (message, exception) => setError(message),
    );
  }

  Future<void> deleteLabel(String id) async {
    final result = await _repo.deleteLabel(id);
    result.when(success: (_) => loadLabels(), error: (message, exception) {});
  }
}

class LabelsSettingsScreen extends StatelessWidget {
  const LabelsSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) =>
          LabelsSettingsViewModel(locator<SettingsRepository>())..loadLabels(),
      child: const _LabelsSettingsBody(),
    );
  }
}

class _LabelsSettingsBody extends StatefulWidget {
  const _LabelsSettingsBody();

  @override
  State<_LabelsSettingsBody> createState() => _LabelsSettingsBodyState();
}

class _LabelsSettingsBodyState extends State<_LabelsSettingsBody> {
  final _nameController = TextEditingController();
  final List<String> _presetColors = [
    '#EF4444',
    '#F97316',
    '#F59E0B',
    '#84CC16',
    '#22C55E',
    '#06B6D4',
    '#128C7E',
    '#6366F1',
    '#A855F7',
    '#EC4899',
    '#6B7280',
    '#1F2937',
  ];
  String _selectedColor = '#128C7E';

  final _hexPattern = RegExp(r'^#[0-9A-Fa-f]{6}$');

  Color _parseColor(String hex) {
    return Color(int.parse(hex.replaceFirst('#', '0xFF')));
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<LabelsSettingsViewModel>();
    final authVm = context.watch<AuthViewModel>();

    if (!authVm.can('settings.read')) {
      return Scaffold(
        appBar: AppAppBar(title: const Text('Labels')),
        body: _buildNoPermission(),
      );
    }

    final canManage = authVm.can('settings.manage');

    return Scaffold(
      appBar: AppAppBar(title: const Text('Labels')),
      body: Column(
        children: [
          if (canManage)
            Padding(
              padding: const EdgeInsets.all(16),
              child: CenteredMaxWidth(
                maxWidth: 640,
                child: AppCard(
                  child: Padding(
                    padding: const EdgeInsets.all(16),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        AppInput(
                          controller: _nameController,
                          label: 'Label Name',
                        ),
                        const SizedBox(height: 12),
                        const Text('Color'),
                        const SizedBox(height: 8),
                        Wrap(
                          spacing: 8,
                          children: _presetColors.map((color) {
                            final isSelected = color == _selectedColor;
                            return GestureDetector(
                              onTap: () =>
                                  setState(() => _selectedColor = color),
                              child: Container(
                                width: 32,
                                height: 32,
                                decoration: BoxDecoration(
                                  color: _parseColor(color),
                                  shape: BoxShape.circle,
                                  border: isSelected
                                      ? Border.all(
                                          color: Colors.black,
                                          width: 2,
                                        )
                                      : null,
                                ),
                              ),
                            );
                          }).toList(),
                        ),
                        const SizedBox(height: 16),
                        Align(
                          alignment: Alignment.centerRight,
                          child: AppButton(
                            variant: AppButtonVariant.primary,
                            onPressed: vm.isBusy
                                ? null
                                : () {
                                    if (_nameController.text
                                        .trim()
                                        .isNotEmpty) {
                                      vm.createLabel(
                                        _nameController.text.trim(),
                                        _selectedColor,
                                      );
                                      _nameController.clear();
                                    }
                                  },
                            child: const Text('Add Label'),
                          ),
                        ),
                      ],
                    ),
                  ),
                ),
              ),
            ),
          Expanded(
            child: vm.isBusy && vm.labels.isEmpty
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
                : vm.labels.isEmpty
                ? const Center(child: Text('No labels yet'))
                : RefreshIndicator(
                    onRefresh: () => vm.loadLabels(),
                    child: ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: vm.labels.length,
                      itemBuilder: (context, index) {
                        final l = vm.labels[index];
                        final bg = _parseColor(l.color);
                        return AppCard(
                          child: AppListTile(
                            leading: Container(
                              width: 24,
                              height: 24,
                              decoration: BoxDecoration(
                                color: bg,
                                shape: BoxShape.circle,
                              ),
                            ),
                            title: Chip(
                              backgroundColor: bg,
                              label: Text(
                                l.name,
                                style: const TextStyle(color: Colors.white),
                              ),
                            ),
                            trailing: canManage
                                ? Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      AppIconButton(
                                        icon: const PhosphorIcon(
                                          PhosphorIconsRegular.pencilSimple,
                                        ),
                                        onPressed: () =>
                                            _showEditDialog(context, vm, l),
                                      ),
                                      AppIconButton(
                                        icon: const PhosphorIcon(
                                          PhosphorIconsRegular.trash,
                                          color: Colors.red,
                                        ),
                                        onPressed: () => vm.deleteLabel(l.id),
                                      ),
                                    ],
                                  )
                                : null,
                            onTap: canManage
                                ? () => _showEditDialog(context, vm, l)
                                : null,
                          ),
                        );
                      },
                    ),
                  ),
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

  Future<void> _showEditDialog(
    BuildContext context,
    LabelsSettingsViewModel vm,
    Label label,
  ) async {
    final nameController = TextEditingController(text: label.name);
    final colorController = TextEditingController(text: label.color);
    await showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            final isValid = _hexPattern.hasMatch(colorController.text);
            return AppAlertDialog(
              title: const Text('Edit Label'),
              content: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AppInput(controller: nameController, label: 'Name'),
                  const SizedBox(height: 12),
                  AppInput(
                    controller: colorController,
                    label: 'Color (hex)',
                    errorText: isValid || colorController.text.isEmpty
                        ? null
                        : 'Invalid hex color',
                    prefix: Container(
                      width: 24,
                      height: 24,
                      margin: const EdgeInsets.all(12),
                      decoration: BoxDecoration(
                        color: isValid
                            ? _parseColor(colorController.text)
                            : Colors.grey,
                        borderRadius: BorderRadius.circular(4),
                      ),
                    ),
                    onChanged: (_) => setDialogState(() {}),
                  ),
                  const SizedBox(height: 12),
                  Wrap(
                    spacing: 8,
                    children: _presetColors.map((color) {
                      return GestureDetector(
                        onTap: () {
                          colorController.text = color;
                          setDialogState(() {});
                        },
                        child: Container(
                          width: 28,
                          height: 28,
                          decoration: BoxDecoration(
                            color: _parseColor(color),
                            shape: BoxShape.circle,
                            border: colorController.text == color
                                ? Border.all(color: Colors.black, width: 2)
                                : null,
                          ),
                        ),
                      );
                    }).toList(),
                  ),
                ],
              ),
              actions: [
                AppButton(
                  variant: AppButtonVariant.ghost,
                  onPressed: () => Navigator.of(ctx).pop(),
                  child: const Text('Cancel'),
                ),
                AppButton(
                  variant: AppButtonVariant.primary,
                  onPressed: isValid && nameController.text.trim().isNotEmpty
                      ? () {
                          vm.updateLabel(
                            label.id,
                            nameController.text.trim(),
                            colorController.text.trim(),
                          );
                          Navigator.of(ctx).pop();
                        }
                      : null,
                  child: const Text('Save'),
                ),
              ],
            );
          },
        );
      },
    );
  }
}
