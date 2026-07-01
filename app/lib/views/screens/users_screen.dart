import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/di.dart';
import '../../data/models/role_model.dart';
import '../../data/models/user_model.dart';
import '../../data/repositories/settings_repository.dart';
import '../../data/repositories/user_repository.dart';
import '../../data/repositories/waba_account_repository.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../../viewmodels/base_viewmodel.dart';

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

  String? _inviteUrl;
  String? get inviteUrl => _inviteUrl;

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
    String? password,
    bool sendInvitation = false,
  }) async {
    setBusy();
    _inviteUrl = null;
    final payload = <String, dynamic>{
      'name': name,
      'email': email,
      'role': role,
    };
    if (sendInvitation) {
      payload['sendInvitation'] = true;
    } else if (password != null && password.isNotEmpty) {
      payload['password'] = password;
    }
    final result = await _userRepo.createUser(payload);
    result.when(
      success: (data) {
        if (data['invitation'] != null) {
          _inviteUrl = data['invitation']['inviteUrl'] as String? ?? data['invitation']['url'] as String?;
        }
        loadUsers();
        setSuccess();
      },
      error: (message, exception) => setError(message),
    );
  }

  Future<void> updateUser(String id, {required String name, required String email, required String role}) async {
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

  void clearInvite() {
    _inviteUrl = null;
    notifyListeners();
  }

  Future<void> deleteUser(String id) async {
    final result = await _userRepo.deleteUser(id);
    result.when(
      success: (_) => loadUsers(),
      error: (message, exception) {},
    );
  }

  Future<void> assignWaba(String wabaId, String agentId) async {
    final result = await _wabaRepo.assignAgent(wabaId, agentId);
    result.when(
      success: (_) => loadUsers(),
      error: (message, exception) {},
    );
  }

  Future<void> removeWaba(String wabaId, String agentId) async {
    final result = await _wabaRepo.removeAgent(wabaId, agentId);
    result.when(
      success: (_) => loadUsers(),
      error: (message, exception) {},
    );
  }
}

class UsersScreen extends StatelessWidget {
  const UsersScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => UsersViewModel(
        locator<UserRepository>(),
        locator<SettingsRepository>(),
        locator<WabaAccountRepository>(),
      )..loadUsers()
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
        appBar: AppBar(title: const Text('Users')),
        body: _buildNoPermission(),
      );
    }

    final canManage = authVm.can('users.manage');

    return Scaffold(
      appBar: AppBar(
        title: const Text('Users'),
        actions: [
          IconButton(
            icon: const Icon(Icons.refresh),
            onPressed: vm.isBusy ? null : () => vm.loadUsers(),
          ),
        ],
      ),
      floatingActionButton: canManage
          ? FloatingActionButton(
              onPressed: () => _showAddDialog(context, vm),
              child: const Icon(Icons.add),
            )
          : null,
      body: vm.isBusy && vm.users.isEmpty
          ? const Center(child: CircularProgressIndicator())
          : vm.users.isEmpty
              ? const Center(child: Text('No users found'))
              : ListView.builder(
                  padding: const EdgeInsets.all(12),
                  itemCount: vm.users.length,
                  itemBuilder: (context, index) {
                    final u = vm.users[index];
                    return Card(
                      child: Padding(
                        padding: const EdgeInsets.symmetric(vertical: 8),
                        child: Column(
                          children: [
                            ListTile(
                              leading: CircleAvatar(child: Text(u.name.isNotEmpty ? u.name[0].toUpperCase() : '?')),
                              title: Text(u.name),
                              subtitle: Text(u.email),
                              trailing: canManage
                                  ? Row(
                                      mainAxisSize: MainAxisSize.min,
                                      children: [
                                        Chip(label: Text(u.role)),
                                        IconButton(
                                          icon: const Icon(Icons.edit_outlined),
                                          onPressed: () => _showEditDialog(context, vm, u),
                                        ),
                                        IconButton(
                                          icon: const Icon(Icons.delete_outline, color: Colors.red),
                                          onPressed: () => _confirmDelete(context, vm, u),
                                        ),
                                      ],
                                    )
                                  : Chip(label: Text(u.role)),
                            ),
                            const Divider(height: 1),
                            Padding(
                              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                children: [
                                  const Text('WABA Access', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold)),
                                  const SizedBox(height: 6),
                                  Wrap(
                                    spacing: 8,
                                    children: vm.wabaAccounts.map((waba) {
                                      final hasAccess = u.wabaAccounts.any((w) => w.id == waba.id);
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
    );
  }

  Future<void> _showAddDialog(BuildContext context, UsersViewModel vm) async {
    vm.clearInvite();
    final nameController = TextEditingController();
    final emailController = TextEditingController();
    final passwordController = TextEditingController();
    String selectedRole = vm.roles.isNotEmpty ? vm.roles.first.name : '';
    bool sendInvitation = false;
    bool obscurePassword = true;

    await showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            final vm = ctx.watch<UsersViewModel>();
            return AlertDialog(
              title: const Text('Add User'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    if (vm.isSuccess && vm.inviteUrl != null) ...[
                      Container(
                        padding: const EdgeInsets.all(12),
                        decoration: BoxDecoration(
                          color: Colors.green.shade50,
                          borderRadius: BorderRadius.circular(8),
                        ),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            const Text('Invitation sent!', style: TextStyle(fontWeight: FontWeight.bold)),
                            const SizedBox(height: 4),
                            SelectableText(vm.inviteUrl!),
                            const SizedBox(height: 8),
                            Row(
                              children: [
                                TextButton.icon(
                                  onPressed: () {
                                    Clipboard.setData(ClipboardData(text: vm.inviteUrl!));
                                    ScaffoldMessenger.of(ctx).showSnackBar(
                                      const SnackBar(content: Text('Copied to clipboard')),
                                    );
                                  },
                                  icon: const Icon(Icons.copy),
                                  label: const Text('Copy'),
                                ),
                                TextButton.icon(
                                  onPressed: () async {
                                    final uri = Uri.parse(vm.inviteUrl!);
                                    if (await canLaunchUrl(uri)) {
                                      await launchUrl(uri, mode: LaunchMode.externalApplication);
                                    }
                                  },
                                  icon: const Icon(Icons.open_in_new),
                                  label: const Text('Open'),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 16),
                    ],
                    TextField(
                      controller: nameController,
                      decoration: const InputDecoration(labelText: 'Name', border: OutlineInputBorder()),
                    ),
                    const SizedBox(height: 12),
                    TextField(
                      controller: emailController,
                      decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 12),
                    if (vm.roles.isNotEmpty)
                      DropdownButtonFormField<String>(
                        initialValue: selectedRole,
                        decoration: const InputDecoration(labelText: 'Role', border: OutlineInputBorder()),
                        items: vm.roles.map((r) {
                          return DropdownMenuItem(value: r.name, child: Text(r.name));
                        }).toList(),
                        onChanged: (v) {
                          if (v != null) setDialogState(() => selectedRole = v);
                        },
                      ),
                    const SizedBox(height: 12),
                    SwitchListTile(
                      title: const Text('Send invitation link'),
                      value: sendInvitation,
                      onChanged: (v) => setDialogState(() => sendInvitation = v),
                    ),
                    if (!sendInvitation) ...[
                      const SizedBox(height: 8),
                      TextField(
                        controller: passwordController,
                        obscureText: obscurePassword,
                        decoration: InputDecoration(
                          labelText: 'Password',
                          border: const OutlineInputBorder(),
                          suffixIcon: IconButton(
                            icon: Icon(obscurePassword ? Icons.visibility_off : Icons.visibility),
                            onPressed: () => setDialogState(() => obscurePassword = !obscurePassword),
                          ),
                        ),
                      ),
                    ],
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
                          vm.createUser(
                            name: nameController.text.trim(),
                            email: emailController.text.trim(),
                            role: selectedRole,
                            password: passwordController.text,
                            sendInvitation: sendInvitation,
                          );
                        },
                  child: vm.isBusy
                      ? const SizedBox(
                          height: 20,
                          width: 20,
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
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

  Future<void> _showEditDialog(BuildContext context, UsersViewModel vm, User user) async {
    final nameController = TextEditingController(text: user.name);
    final emailController = TextEditingController(text: user.email);
    String selectedRole = user.role;

    await showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            final vm = ctx.watch<UsersViewModel>();
            return AlertDialog(
              title: const Text('Edit User'),
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
                      controller: emailController,
                      decoration: const InputDecoration(labelText: 'Email', border: OutlineInputBorder()),
                      keyboardType: TextInputType.emailAddress,
                    ),
                    const SizedBox(height: 12),
                    if (vm.roles.isNotEmpty)
                      DropdownButtonFormField<String>(
                        initialValue: selectedRole,
                        decoration: const InputDecoration(labelText: 'Role', border: OutlineInputBorder()),
                        items: vm.roles.map((r) {
                          return DropdownMenuItem(value: r.name, child: Text(r.name));
                        }).toList(),
                        onChanged: (v) {
                          if (v != null) setDialogState(() => selectedRole = v);
                        },
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
                          child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
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

  Future<void> _confirmDelete(BuildContext context, UsersViewModel vm, User user) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AlertDialog(
        title: const Text('Delete User'),
        content: Text('Are you sure you want to delete ${user.name}?'),
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
      vm.deleteUser(user.id);
    }
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
