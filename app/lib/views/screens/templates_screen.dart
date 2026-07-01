import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../data/models/template_model.dart';
import '../../data/repositories/settings_repository.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../../viewmodels/base_viewmodel.dart';

class TemplatesViewModel extends BaseViewModel {
  final SettingsRepository _repo;
  TemplatesViewModel(this._repo);

  List<Template> _templates = [];
  List<Template> get templates => _templates;

  Future<void> loadTemplates() async {
    await runAsync(() async {
      final result = await _repo.getTemplates();
      result.when(
        success: (data) => _templates = data,
        error: (message, exception) => throw Exception(message),
      );
    });
  }
}

class TemplatesScreen extends StatelessWidget {
  const TemplatesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => TemplatesViewModel(locator<SettingsRepository>())..loadTemplates(),
      child: const _TemplatesBody(),
    );
  }
}

class _TemplatesBody extends StatelessWidget {
  const _TemplatesBody();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<TemplatesViewModel>();
    final authVm = context.watch<AuthViewModel>();

    if (!authVm.can('settings.read')) {
      return Scaffold(
        appBar: AppBar(title: const Text('Templates')),
        body: _buildNoPermission(),
      );
    }

    return Scaffold(
      appBar: AppBar(
        title: const Text('Templates'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: vm.isBusy ? null : () => vm.loadTemplates(),
          ),
        ],
      ),
      body: vm.isBusy && vm.templates.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : vm.templates.isEmpty
              ? const Center(child: Text('No templates found'))
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: vm.templates.length,
                  itemBuilder: (context, index) {
                    final t = vm.templates[index];
                    return Card(
                      child: ListTile(
                        title: Text(t.templateName),
                        subtitle: Text('${t.category} | ${t.language}'),
                        trailing: Chip(
                          label: Text(t.status),
                          backgroundColor: t.status == 'APPROVED' ? Colors.green.withValues(alpha: 0.2) : Colors.amber.withValues(alpha: 0.2),
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
}
