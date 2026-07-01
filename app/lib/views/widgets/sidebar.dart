import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../core/services/local_storage_service.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/user_model.dart';
import '../../viewmodels/auth_viewmodel.dart';
import 'custom/custom_widgets.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

class NavItem {
  final String label;
  final String route;
  final IconData icon;
  final String? permission;
  final List<NavItem>? children;

  NavItem({required this.label, required this.route, required this.icon, this.permission, this.children});
}

final List<NavItem> _topNav = [
  NavItem(label: 'Inbox', route: '/dashboard/inbox', icon: PhosphorIconsRegular.chatTeardropText, permission: 'conversations.read'),
  NavItem(label: 'Contacts', route: '/dashboard/contacts', icon: PhosphorIconsRegular.users, permission: 'contacts.read'),
  NavItem(label: 'Campaigns', route: '/dashboard/campaigns', icon: PhosphorIconsRegular.megaphone, permission: 'campaigns.read'),
  NavItem(label: 'Automations', route: '/dashboard/automations', icon: PhosphorIconsRegular.treeStructure, permission: 'automations.read'),
  NavItem(label: 'Analytics', route: '/dashboard/analytics', icon: PhosphorIconsRegular.chartBar, permission: 'analytics.read'),
  NavItem(label: 'Quick Replies', route: '/dashboard/quick-replies', icon: PhosphorIconsRegular.arrowBendUpLeft, permission: 'settings.read'),
  NavItem(label: 'Templates', route: '/dashboard/templates', icon: PhosphorIconsRegular.fileText, permission: 'settings.read'),
  NavItem(label: 'WhatsApp Forms', route: '/dashboard/flows', icon: PhosphorIconsRegular.textbox, permission: 'settings.read'),
];

final List<NavItem> _settingsNav = [
  NavItem(label: 'General', route: '/dashboard/settings/general', icon: PhosphorIconsRegular.buildings, permission: 'settings.read'),
  NavItem(label: 'Labels', route: '/dashboard/settings/labels', icon: PhosphorIconsRegular.tag, permission: 'settings.read'),
  NavItem(label: 'Notifications', route: '/dashboard/settings/notifications', icon: PhosphorIconsRegular.bell, permission: 'settings.read'),
  NavItem(label: 'Files', route: '/dashboard/settings/files', icon: PhosphorIconsRegular.folder, permission: 'settings.read'),
  NavItem(label: 'Integrations', route: '/dashboard/settings/integrations', icon: PhosphorIconsRegular.plugs, permission: 'settings.manage'),
  NavItem(label: 'Users', route: '/dashboard/users', icon: PhosphorIconsRegular.users, permission: 'users.read'),
  NavItem(label: 'Roles', route: '/dashboard/roles', icon: PhosphorIconsRegular.shield, permission: 'roles.read'),
  NavItem(label: 'WABA', route: '/dashboard/waba-accounts', icon: PhosphorIconsRegular.deviceMobile, permission: 'settings.manage'),
  NavItem(label: 'API Logs', route: '/dashboard/api-logs', icon: PhosphorIconsRegular.terminal, permission: 'settings.read'),
  NavItem(label: 'Help', route: '/dashboard/help', icon: PhosphorIconsRegular.question, permission: null),
];

class Sidebar extends StatefulWidget {
  final VoidCallback? onItemSelected;
  const Sidebar({super.key, this.onItemSelected});

  @override
  State<Sidebar> createState() => _SidebarState();
}

class _SidebarState extends State<Sidebar> {
  bool _settingsExpanded = false;

  String? _selectedWabaId;

  @override
  void initState() {
    super.initState();
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
  Widget build(BuildContext context) {
    final authVm = context.watch<AuthViewModel>();
    final currentRoute = GoRouterState.of(context).uri.path;
    final activeAccounts = _getActiveWabaAccounts(authVm);

    WidgetsBinding.instance.addPostFrameCallback((_) {
      _autoSelectFirstWaba(authVm);
    });

    final selectedAccount = activeAccounts.cast<WabaAccount?>().firstWhere(
      (a) => a!.id == _selectedWabaId,
      orElse: () => null,
    );

    final theme = Theme.of(context);
    return Container(
      width: 260,
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(right: BorderSide(color: theme.dividerTheme.color ?? theme.colorScheme.outlineVariant)),
      ),
      child: Column(
        children: [
          Container(
            padding: const EdgeInsets.fromLTRB(20, 20, 20, 16),
            child: Row(
              children: [
                Container(
                  width: 32,
                  height: 32,
                  decoration: BoxDecoration(
                    color: AppColors.primary,
                    borderRadius: BorderRadius.circular(8),
                  ),
                  child: const PhosphorIcon(PhosphorIconsRegular.chatTeardrop, color: Colors.white, size: 18),
                ),
                const SizedBox(width: 12),
                Text(
                  'BizlInbox',
                  style: theme.textTheme.titleLarge?.copyWith(fontWeight: FontWeight.w700),
                ),
              ],
            ),
          ),
          const AppDivider(height: 1),
          Padding(
            padding: const EdgeInsets.fromLTRB(16, 8, 16, 8),
            child: AppInput<String>.dropdown(
              value: selectedAccount?.id,
              label: 'WABA Account',
              hint: 'Select WABA',
              options: activeAccounts.map((account) {
                return AppInputOption<String>(
                  value: account.id,
                  label: account.name,
                );
              }).toList(),
              onSelected: (value) {
                if (value != null) _selectWaba(value);
              },
            ),
          ),
          if (activeAccounts.isEmpty && authVm.isAdmin)
            Padding(
              padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 8),
              child: AppCard(
                color: Colors.amber.withValues(alpha: 0.1),
                child: Padding(
                  padding: const EdgeInsets.all(12),
                  child: Row(
                    children: [
                      PhosphorIcon(PhosphorIconsRegular.warning, color: Colors.amber[800]),
                      const SizedBox(width: 8),
                      Expanded(
                        child: Text(
                          'No WABA accounts configured. Go to Settings > WABA to add one.',
                          style: TextStyle(color: Colors.amber[900], fontSize: 12),
                        ),
                      ),
                    ],
                  ),
                ),
              ),
            ),
          Expanded(
            child: ListView(
              padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              children: [
                ..._topNav.where((item) => item.permission == null || authVm.can(item.permission!)).map(
                      (item) => _NavTile(
                        item: item,
                        selected: currentRoute == item.route || currentRoute.startsWith('${item.route}/'),
                        onTap: () => _navigate(item.route),
                      ),
                    ),
                const SizedBox(height: 8),
                const AppDivider(),
                const SizedBox(height: 8),
                AppListTile(
                  leading: const PhosphorIcon(PhosphorIconsRegular.gear),
                  title: const Text('Settings'),
                  trailing: Icon(_settingsExpanded ? PhosphorIconsRegular.caretUp : PhosphorIconsRegular.caretDown),
                  onTap: () => setState(() => _settingsExpanded = !_settingsExpanded),
                ),
                if (_settingsExpanded)
                  ..._settingsNav.where((item) => item.permission == null || authVm.can(item.permission!)).map(
                        (item) => _NavTile(
                          item: item,
                          selected: currentRoute == item.route,
                          onTap: () => _navigate(item.route),
                          indent: true,
                        ),
                      ),
              ],
            ),
          ),
          const AppDivider(height: 1),
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 8, 12, 12),
            child: AppListTile(
              leading: const PhosphorIcon(PhosphorIconsRegular.signOut),
              title: const Text('Logout'),
              onTap: () async {
                await authVm.logout();
                if (context.mounted) context.go('/login');
              },
            ),
          ),
        ],
      ),
    );
  }

  void _navigate(String route) {
    context.go(route);
    widget.onItemSelected?.call();
  }
}

class _NavTile extends StatelessWidget {
  final NavItem item;
  final bool selected;
  final VoidCallback onTap;
  final bool indent;

  const _NavTile({required this.item, required this.selected, required this.onTap, this.indent = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: AppListTile(
        leading: Icon(item.icon, color: selected ? Theme.of(context).colorScheme.primary : null),
        title: Text(item.label),
        selected: selected,
        selectedTileColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
        padding: EdgeInsets.only(left: indent ? 32 : 16, right: 16),
        onTap: onTap,
      ),
    );
  }
}
