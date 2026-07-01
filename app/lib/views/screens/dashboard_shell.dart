import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../core/services/local_storage_service.dart';
import '../../core/services/notification_manager.dart';
import '../../core/services/socket_service.dart';
import '../../data/models/user_model.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../widgets/sidebar.dart';
import '../widgets/mobile_bottom_nav.dart';
import '../widgets/custom/custom_widgets.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

class DashboardShell extends StatelessWidget {
  final Widget child;
  const DashboardShell({super.key, required this.child});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider.value(
      value: locator<AuthViewModel>(),
      child: _DashboardShellBody(child: child),
    );
  }
}

class _DashboardShellBody extends StatefulWidget {
  final Widget child;
  const _DashboardShellBody({required this.child});

  @override
  State<_DashboardShellBody> createState() => _DashboardShellBodyState();
}

class _DashboardShellBodyState extends State<_DashboardShellBody> {
  String? _selectedWabaId;

  @override
  void initState() {
    super.initState();
    locator<SocketService>().connect();
    locator<NotificationManager>().start();
    _selectedWabaId = locator<LocalStorageService>().getWabaId();
  }

  List<WabaAccount> _getActiveWabaAccounts(AuthViewModel authVm) {
    final accounts = authVm.user?.wabaAccounts ?? [];
    return accounts.where((a) => a.isActive).toList();
  }

  void _autoSelectFirstWaba(AuthViewModel authVm) {
    final activeAccounts = _getActiveWabaAccounts(authVm);
    if (activeAccounts.isNotEmpty) {
      final first = activeAccounts.first;
      if (_selectedWabaId == null || !activeAccounts.any((a) => a.id == _selectedWabaId)) {
        _selectWaba(first.id);
      }
    }
  }

  void _selectWaba(String? wabaId) {
    if (wabaId == null) return;
    setState(() => _selectedWabaId = wabaId);
    locator<LocalStorageService>().setWabaId(wabaId);
  }

  @override
  void dispose() {
    locator<NotificationManager>().stop();
    locator<SocketService>().disconnect();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final authVm = context.watch<AuthViewModel>();
    final isMobile = MediaQuery.of(context).size.width < 768;

    if (authVm.isBusy) {
      return const Scaffold(
        body: Center(child: AppProgressIndicator()),
      );
    }

    if (!authVm.isLoggedIn) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) context.go('/login');
      });
      return const Scaffold(body: SizedBox.shrink());
    }

    final activeAccounts = _getActiveWabaAccounts(authVm);
    WidgetsBinding.instance.addPostFrameCallback((_) {
      _autoSelectFirstWaba(authVm);
    });

    final selectedAccount = activeAccounts.cast<WabaAccount?>().firstWhere(
      (a) => a!.id == _selectedWabaId,
      orElse: () => null,
    );

    return Scaffold(
      appBar: isMobile
          ? AppAppBar(
              leading: Builder(
                builder: (context) => AppIconButton(
                  icon: const PhosphorIcon(PhosphorIconsRegular.list, size: 22),
                  onPressed: () => Scaffold.of(context).openDrawer(),
                ),
              ),
              title: activeAccounts.isNotEmpty
                  ? Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: Image.asset(
                            'assets/icon/icon.png',
                            width: 28,
                            height: 28,
                          ),
                        ),
                        const SizedBox(width: 8),
                        Flexible(
                          child: DropdownButtonHideUnderline(
                            child: DropdownButton<String>(
                              value: selectedAccount?.id,
                              isDense: true,
                              icon: const PhosphorIcon(PhosphorIconsRegular.caretDown, size: 14),
                              style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                              items: activeAccounts.map((account) {
                                return DropdownMenuItem<String>(
                                  value: account.id,
                                  child: Text(
                                    account.name,
                                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                                    overflow: TextOverflow.ellipsis,
                                  ),
                                );
                              }).toList(),
                              onChanged: (value) => _selectWaba(value),
                            ),
                          ),
                        ),
                      ],
                    )
                  : Row(
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        ClipRRect(
                          borderRadius: BorderRadius.circular(6),
                          child: Image.asset(
                            'assets/icon/icon.png',
                            width: 28,
                            height: 28,
                          ),
                        ),
                        const SizedBox(width: 8),
                        const Text('BizlInbox'),
                      ],
                    ),
              actions: [
                PopupMenuButton<String>(
                  offset: const Offset(0, 40),
                  icon: AppAvatar(
                    radius: 16,
                    child: Text(
                      authVm.user?.name.isNotEmpty == true ? authVm.user!.name[0].toUpperCase() : '?',
                      style: const TextStyle(fontSize: 12, fontWeight: FontWeight.w600),
                    ),
                  ),
                  onSelected: (value) {
                    if (value == 'profile') {
                      context.go('/dashboard/profile');
                    } else if (value == 'logout') {
                      authVm.logout().then((_) {
                        if (context.mounted) context.go('/login');
                      });
                    }
                  },
                  itemBuilder: (_) => [
                    PopupMenuItem(
                      enabled: false,
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        mainAxisSize: MainAxisSize.min,
                        children: [
                          Text(
                            authVm.user?.name ?? 'User',
                            style: const TextStyle(fontWeight: FontWeight.w600, fontSize: 14),
                          ),
                          Text(
                            authVm.user?.email ?? '',
                            style: TextStyle(fontSize: 12, color: Colors.grey.shade600),
                          ),
                        ],
                      ),
                    ),
                    const PopupMenuDivider(),
                    const PopupMenuItem(value: 'profile', child: Text('Profile')),
                    const PopupMenuItem(value: 'logout', child: Text('Logout', style: TextStyle(color: Colors.red))),
                  ],
                ),
              ],
            )
          : null,
      drawer: isMobile ? Drawer(child: Sidebar(onItemSelected: () => Navigator.of(context).pop())) : null,
      body: Row(
        children: [
          if (!isMobile) const Sidebar(),
          Expanded(child: widget.child),
        ],
      ),
      bottomNavigationBar: isMobile ? const MobileBottomNav() : null,
    );
  }
}
