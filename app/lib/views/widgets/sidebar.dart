import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../core/services/local_storage_service.dart';
import '../../core/services/theme_service.dart';
import '../../core/theme/app_theme.dart';
import '../../data/models/user_model.dart';
import '../../viewmodels/auth_viewmodel.dart';
import 'custom/custom_widgets.dart';

class NavItem {
  final String label;
  final String route;
  final IconData icon;
  final String? permission;
  final List<NavItem>? children;

  NavItem({required this.label, required this.route, required this.icon, this.permission, this.children});
}

final List<NavItem> _topNav = [
  NavItem(label: 'Inbox', route: '/dashboard/inbox', icon: Icons.message, permission: 'conversations.read'),
  NavItem(label: 'Contacts', route: '/dashboard/contacts', icon: Icons.people, permission: 'contacts.read'),
  NavItem(label: 'Campaigns', route: '/dashboard/campaigns', icon: Icons.campaign, permission: 'campaigns.read'),
  NavItem(label: 'Automations', route: '/dashboard/automations', icon: Icons.account_tree, permission: 'automations.read'),
  NavItem(label: 'Analytics', route: '/dashboard/analytics', icon: Icons.bar_chart, permission: 'analytics.read'),
  NavItem(label: 'Quick Replies', route: '/dashboard/quick-replies', icon: Icons.reply, permission: 'settings.read'),
  NavItem(label: 'Templates', route: '/dashboard/templates', icon: Icons.description, permission: 'settings.read'),
  NavItem(label: 'WhatsApp Forms', route: '/dashboard/flows', icon: Icons.input, permission: 'settings.read'),
];

final List<NavItem> _settingsNav = [
  NavItem(label: 'General', route: '/dashboard/settings/general', icon: Icons.business, permission: 'settings.read'),
  NavItem(label: 'Labels', route: '/dashboard/settings/labels', icon: Icons.label, permission: 'settings.read'),
  NavItem(label: 'Notifications', route: '/dashboard/settings/notifications', icon: Icons.notifications, permission: 'settings.read'),
  NavItem(label: 'Files', route: '/dashboard/settings/files', icon: Icons.folder, permission: 'settings.read'),
  NavItem(label: 'Integrations', route: '/dashboard/settings/integrations', icon: Icons.webhook, permission: 'settings.manage'),
  NavItem(label: 'Users', route: '/dashboard/users', icon: Icons.people, permission: 'users.read'),
  NavItem(label: 'Roles', route: '/dashboard/roles', icon: Icons.shield, permission: 'roles.read'),
  NavItem(label: 'WABA', route: '/dashboard/waba-accounts', icon: Icons.phone_android, permission: 'settings.manage'),
  NavItem(label: 'API Logs', route: '/dashboard/api-logs', icon: Icons.terminal, permission: 'settings.read'),
  NavItem(label: 'Help', route: '/dashboard/help', icon: Icons.help_outline, permission: null),
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
                  child: const Icon(Icons.message_rounded, color: Colors.white, size: 18),
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
            child: AppDropdown<String>(
              initialValue: selectedAccount?.id,
              isExpanded: true,
              decoration: const InputDecoration(
                labelText: 'WABA Account',
                border: OutlineInputBorder(),
                contentPadding: EdgeInsets.symmetric(horizontal: 12, vertical: 8),
              ),
              hint: const Text('Select WABA'),
              items: activeAccounts.map((account) {
                return DropdownMenuItem<String>(
                  value: account.id,
                  child: Text(account.name, overflow: TextOverflow.ellipsis),
                );
              }).toList(),
              onChanged: (value) {
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
                      Icon(Icons.warning_amber, color: Colors.amber[800]),
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
              padding: const EdgeInsets.symmetric(vertical: 8),
              children: [
                ..._topNav.where((item) => item.permission == null || authVm.can(item.permission!)).map(
                  (item) => _NavTile(
                    item: item,
                    selected: currentRoute == item.route || currentRoute.startsWith('${item.route}/'),
                    onTap: () => _navigate(item.route),
                  ),
                ),
                const AppDivider(),
                AppListTile(
                  leading: const Icon(Icons.settings),
                  title: const Text('Settings'),
                  trailing: Icon(_settingsExpanded ? Icons.expand_less : Icons.expand_more),
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
          AppListTile(
            leading: const Icon(Icons.logout),
            title: const Text('Logout'),
            onTap: () async {
              await authVm.logout();
              if (context.mounted) context.go('/login');
            },
          ),
          const AppDivider(height: 1),
          _ThemeToggleTile(),
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
    return AppListTile(
      leading: Icon(item.icon, color: selected ? Theme.of(context).colorScheme.primary : null),
      title: Text(item.label),
      selected: selected,
      selectedTileColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
      padding: EdgeInsets.only(left: indent ? 32 : 16, right: 16),
      onTap: onTap,
    );
  }
}

class _ThemeToggleTile extends StatelessWidget {
  @override
  Widget build(BuildContext context) {
    final themeService = locator<ThemeService>();
    final icon = switch (themeService.themeMode) {
      ThemeMode.light => Icons.wb_sunny,
      ThemeMode.dark => Icons.nights_stay,
      ThemeMode.system => Icons.brightness_auto,
    };
    final label = switch (themeService.themeMode) {
      ThemeMode.light => 'Light',
      ThemeMode.dark => 'Dark',
      ThemeMode.system => 'System',
    };
    return AppListTile(
      leading: Icon(icon),
      title: Text('Theme: $label'),
      onTap: () => themeService.toggleTheme(),
    );
  }
}