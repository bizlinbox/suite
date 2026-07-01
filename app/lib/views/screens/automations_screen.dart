import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../data/models/automation_model.dart';
import '../../data/repositories/automation_repository.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../../viewmodels/base_viewmodel.dart';
import 'automation_form_screen.dart';

class AutomationsViewModel extends BaseViewModel {
  final AutomationRepository _repo;
  AutomationsViewModel(this._repo);

  List<Automation> _automations = [];
  List<Automation> get automations => _automations;

  Future<void> loadAutomations() async {
    await runAsync(() async {
      final result = await _repo.getAutomations();
      result.when(
        success: (data) => _automations = data,
        error: (message, exception) => throw Exception(message),
      );
    });
  }

  Future<void> toggle(String id) async {
    final result = await _repo.toggleAutomation(id);
    result.when(
      success: (_) => loadAutomations(),
      error: (message, exception) {},
    );
  }

  Future<void> deleteAutomation(String id) async {
    final result = await _repo.deleteAutomation(id);
    result.when(
      success: (_) => loadAutomations(),
      error: (message, exception) {},
    );
  }
}

class AutomationsScreen extends StatelessWidget {
  const AutomationsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AutomationsViewModel(locator<AutomationRepository>())..loadAutomations(),
      child: const _AutomationsBody(),
    );
  }
}

class _AutomationsBody extends StatelessWidget {
  const _AutomationsBody();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<AutomationsViewModel>();
    final authVm = context.watch<AuthViewModel>();

    if (!authVm.can('automations.read')) {
      return Scaffold(
        appBar: AppBar(title: const Text('Automations')),
        body: _buildNoPermission(),
      );
    }

    final canManage = authVm.can('automations.manage');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Automations'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: vm.isBusy ? null : () => vm.loadAutomations(),
          ),
        ],
      ),
      floatingActionButton: canManage
          ? FloatingActionButton.extended(
              onPressed: () async {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const AutomationFormScreen()),
                );
                if (result == true) {
                  vm.loadAutomations();
                }
              },
              icon: const Icon(Icons.add),
              label: const Text('New Automation'),
            )
          : null,
      body: vm.isBusy && vm.automations.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : vm.automations.isEmpty
              ? const Center(child: Text('No automations found'))
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: vm.automations.length,
                  itemBuilder: (context, index) {
                    final a = vm.automations[index];
                    return Card(
                      child: InkWell(
                        borderRadius: BorderRadius.circular(12),
                        onTap: () async {
                          final result = await Navigator.push(
                            context,
                            MaterialPageRoute(builder: (_) => AutomationFormScreen(automation: a)),
                          );
                          if (result == true) {
                            vm.loadAutomations();
                          }
                        },
                        child: ListTile(
                          title: Text(a.name),
                          subtitle: Text('${a.stepCount} steps | ${a.executionCount} runs'),
                          trailing: Row(
                            mainAxisSize: MainAxisSize.min,
                            children: [
                              Switch(
                                value: a.isActive,
                                onChanged: (_) => vm.toggle(a.id),
                              ),
                              IconButton(
                                icon: const Icon(Icons.delete_outline, color: Colors.red),
                                onPressed: () => _confirmDelete(context, vm, a.id),
                              ),
                            ],
                          ),
                        ),
                      ),
                    );
                  },
                ),
    );
  }

  void _confirmDelete(BuildContext context, AutomationsViewModel vm, String id) {
    showDialog(
      context: context,
      builder: (context) => AlertDialog(
        title: const Text('Delete Automation?'),
        content: const Text('This action cannot be undone.'),
        actions: [
          TextButton(
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          FilledButton(
            onPressed: () {
              Navigator.pop(context);
              vm.deleteAutomation(id);
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
          Icon(Icons.lock_outline, size: 48, color: Colors.grey),
          SizedBox(height: 16),
          Text('You do not have permission to view this page.', textAlign: TextAlign.center),
        ],
      ),
    );
  }
}
