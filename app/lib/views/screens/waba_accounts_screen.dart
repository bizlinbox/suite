import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../data/models/user_model.dart';
import '../../data/repositories/waba_account_repository.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../../viewmodels/base_viewmodel.dart';

class WabaAccountsViewModel extends BaseViewModel {
  final WabaAccountRepository _repo;
  WabaAccountsViewModel(this._repo);

  List<WabaAccount> _accounts = [];
  List<WabaAccount> get accounts => _accounts;

  final Map<String, Map<String, dynamic>> _webhookConfigs = {};
  Map<String, Map<String, dynamic>> get webhookConfigs => _webhookConfigs;

  Future<void> loadAccounts() async {
    await runAsync(() async {
      final result = await _repo.getWabaAccounts();
      result.when(
        success: (data) => _accounts = data,
        error: (message, exception) => throw Exception(message),
      );
    });
  }

  Future<void> createAccount(String name, String phoneNumberId, String businessAccountId, String accessToken, bool isActive) async {
    setBusy();
    final result = await _repo.createWabaAccount({
      'name': name,
      'phoneNumberId': phoneNumberId,
      'businessAccountId': businessAccountId,
      'accessToken': accessToken,
      'isActive': isActive,
    });
    result.when(
      success: (_) => loadAccounts(),
      error: (message, exception) => setError(message),
    );
  }

  Future<void> updateAccount(String id, String name, String phoneNumberId, String businessAccountId, String accessToken, bool isActive) async {
    setBusy();
    final result = await _repo.updateWabaAccount(id, {
      'name': name,
      'phoneNumberId': phoneNumberId,
      'businessAccountId': businessAccountId,
      'accessToken': accessToken,
      'isActive': isActive,
    });
    result.when(
      success: (_) => loadAccounts(),
      error: (message, exception) => setError(message),
    );
  }

  Future<void> deleteAccount(String id) async {
    final result = await _repo.deleteWabaAccount(id);
    result.when(
      success: (_) => loadAccounts(),
      error: (message, exception) {},
    );
  }

  Future<String?> testAccount(String id) async {
    final result = await _repo.testWabaAccount(id);
    String? message;
    result.when(
      success: (data) => message = data['message'] as String? ?? 'Connection successful',
      error: (msg, exception) => message = msg,
    );
    return message;
  }

  Future<String?> subscribeAccount(String id) async {
    final result = await _repo.subscribeWabaAccount(id);
    String? message;
    result.when(
      success: (data) => message = data['message'] as String? ?? 'Subscribed successfully',
      error: (msg, exception) => message = msg,
    );
    return message;
  }

  Future<void> loadWebhookConfig(String id) async {
    final result = await _repo.getWebhookConfig(id);
    result.when(
      success: (data) {
        _webhookConfigs[id] = data;
        notifyListeners();
      },
      error: (message, exception) {},
    );
  }
}

class WabaAccountsScreen extends StatelessWidget {
  const WabaAccountsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => WabaAccountsViewModel(locator<WabaAccountRepository>())..loadAccounts(),
      child: const _WabaAccountsBody(),
    );
  }
}

class _WabaAccountsBody extends StatelessWidget {
  const _WabaAccountsBody();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<WabaAccountsViewModel>();
    final authVm = context.watch<AuthViewModel>();

    if (!authVm.can('settings.read')) {
      return Scaffold(
        appBar: AppBar(title: const Text('WABA Accounts')),
        body: _buildNoPermission(),
      );
    }

    final canManage = authVm.can('settings.manage');

    return Scaffold(
      appBar: AppBar(
        title: const Text('WABA Accounts'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: vm.isBusy ? null : () => vm.loadAccounts(),
          ),
        ],
      ),
      floatingActionButton: canManage
          ? FloatingActionButton(
              onPressed: () => _showCreateDialog(context, vm),
              child: const Icon(Icons.add),
            )
          : null,
      body: vm.isBusy && vm.accounts.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : vm.accounts.isEmpty
              ? const Center(child: Text('No WABA accounts found'))
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: vm.accounts.length,
                  itemBuilder: (context, index) {
                    final a = vm.accounts[index];
                    final config = vm.webhookConfigs[a.id];
                    return Card(
                      child: ExpansionTile(
                        leading: const Icon(Icons.phone_android),
                        title: Text(a.name),
                        subtitle: Text(a.phoneNumberId),
                        children: [
                          Padding(
                            padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Row(
                                  children: [
                                    FilledButton.tonal(
                                      onPressed: () async {
                                        final msg = await vm.testAccount(a.id);
                                        if (context.mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(content: Text(msg ?? 'Test complete')),
                                          );
                                        }
                                      },
                                      child: const Text('Test Connection'),
                                    ),
                                    const SizedBox(width: 8),
                                    FilledButton.tonal(
                                      onPressed: () async {
                                        final msg = await vm.subscribeAccount(a.id);
                                        if (context.mounted) {
                                          ScaffoldMessenger.of(context).showSnackBar(
                                            SnackBar(content: Text(msg ?? 'Subscription complete')),
                                          );
                                        }
                                      },
                                      child: const Text('Subscribe Webhook'),
                                    ),
                                  ],
                                ),
                                const SizedBox(height: 12),
                                if (config != null) ...[
                                  const Text('Webhook Config', style: TextStyle(fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 8),
                                  _CopyRow(label: 'Callback URL', value: config['callbackUrl'] as String? ?? ''),
                                  const SizedBox(height: 8),
                                  _CopyRow(label: 'Verify Token', value: config['verifyToken'] as String? ?? ''),
                                ] else
                                  TextButton(
                                    onPressed: () => vm.loadWebhookConfig(a.id),
                                    child: const Text('Load Webhook Config'),
                                  ),
                                const SizedBox(height: 8),
                                if (canManage)
                                  Row(
                                    mainAxisAlignment: MainAxisAlignment.end,
                                    children: [
                                      IconButton(
                                        icon: const Icon(Icons.edit_outlined),
                                        onPressed: () => _showEditDialog(context, vm, a),
                                      ),
                                      IconButton(
                                        icon: const Icon(Icons.delete_outline, color: Colors.red),
                                        onPressed: () => _confirmDelete(context, vm, a),
                                      ),
                                    ],
                                  ),
                              ],
                            ),
                          ),
                        ],
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

  Future<void> _showCreateDialog(BuildContext context, WabaAccountsViewModel vm) async {
    await _showAccountDialog(context, vm, null);
  }

  Future<void> _showEditDialog(BuildContext context, WabaAccountsViewModel vm, WabaAccount account) async {
    await _showAccountDialog(context, vm, account);
  }

  Future<void> _showAccountDialog(BuildContext context, WabaAccountsViewModel vm, WabaAccount? existing) async {
    final nameController = TextEditingController(text: existing?.name ?? '');
    final phoneController = TextEditingController(text: existing?.phoneNumberId ?? '');
    final businessController = TextEditingController(text: existing?.businessAccountId ?? '');
    final tokenController = TextEditingController();
    bool isActive = existing?.isActive ?? true;

    await showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            final vm = ctx.watch<WabaAccountsViewModel>();
            return AlertDialog(
              title: Text(existing == null ? 'Add WA Business Account' : 'Edit Account'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    TextField(
                      controller: nameController,
                      decoration: const InputDecoration(labelText: 'Name', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: phoneController,
                      decoration: const InputDecoration(labelText: 'Phone Number ID', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: businessController,
                      decoration: const InputDecoration(labelText: 'Business Account ID', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: tokenController,
                      decoration: const InputDecoration(
                        labelText: 'Access Token',
                        border: OutlineInputBorder(),
                      ),
                      obscureText: true,
                    ),
                    const SizedBox(height: 12),
                    SwitchListTile(
                      title: const Text('Active'),
                      value: isActive,
                      onChanged: (v) => setDialogState(() => isActive = v),
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
                  onPressed: vm.isBusy
                      ? null
                      : () {
                          if (existing == null) {
                            vm.createAccount(
                              nameController.text.trim(),
                              phoneController.text.trim(),
                              businessController.text.trim(),
                              tokenController.text,
                              isActive,
                            );
                          } else {
                            vm.updateAccount(
                              existing.id,
                              nameController.text.trim(),
                              phoneController.text.trim(),
                              businessController.text.trim(),
                              tokenController.text,
                              isActive,
                            );
                          }
                          Navigator.of(ctx).pop();
                        },
                  child: Text(existing == null ? 'Create' : 'Save'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _confirmDelete(BuildContext context, WabaAccountsViewModel vm, WabaAccount account) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete Account'),
        content: Text('Are you sure you want to delete ${account.name}?'),
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
      vm.deleteAccount(account.id);
    }
  }
}

class _CopyRow extends StatelessWidget {
  final String label;
  final String value;

  const _CopyRow({required this.label, required this.value});

  @override
  Widget build(BuildContext context) {
    return Row(
      children: [
        Expanded(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Text(label, style: const TextStyle(fontSize: 12, color: Colors.grey)),
              SelectableText(value, style: const TextStyle(fontWeight: FontWeight.w500)),
            ],
          ),
        ),
        IconButton(
          icon: const Icon(Icons.copy, size: 18),
          onPressed: () {
            Clipboard.setData(ClipboardData(text: value));
            ScaffoldMessenger.of(context).showSnackBar(
              const SnackBar(content: Text('Copied to clipboard')),
            );
          },
        ),
      ],
    );
  }
}
