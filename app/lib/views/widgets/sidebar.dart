import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../core/services/local_storage_service.dart';
import '../../data/models/user_model.dart';
import '../../viewmodels/auth_viewmodel.dart';
import 'custom/custom_widgets.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

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
  final bool collapsed;
  final VoidCallback? onToggle;

  const Sidebar({super.key, this.onItemSelected, this.collapsed = false, this.onToggle});

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
    final collapsed = widget.collapsed;
    return Container(
      width: collapsed ? 72 : 260,
      decoration: BoxDecoration(
        color: theme.colorScheme.surface,
        border: Border(right: BorderSide(color: theme.dividerTheme.color ?? theme.colorScheme.outlineVariant)),
      ),
      child: Column(
        children: [
          Padding(
            padding: EdgeInsets.fromLTRB(collapsed ? 20 : 16, 16, collapsed ? 20 : 16, 12),
            child: Row(
              mainAxisAlignment: collapsed ? MainAxisAlignment.center : MainAxisAlignment.start,
              children: [
                ClipRRect(
                  borderRadius: BorderRadius.circular(8),
                  child: Image.asset(
                    'assets/icon/icon.png',
                    width: 32,
                    height: 32,
                  ),
                ),
                if (!collapsed) ...[
                  const SizedBox(width: 10),
                  Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      const Text(
                        'BizlInbox',
                        style: TextStyle(fontSize: 16, fontWeight: FontWeight.w700),
                      ),
                      Text(
                        'WhatsApp Business',
                        style: TextStyle(fontSize: 11, color: theme.colorScheme.onSurface.withValues(alpha: 0.5)),
                      ),
                    ],
                  ),
                ],
              ],
            ),
          ),
          const AppDivider(height: 1),
          if (activeAccounts.isNotEmpty)
            Padding(
              padding: const EdgeInsets.fromLTRB(12, 10, 12, 10),
              child: _WabaSwitcher(
                accounts: activeAccounts,
                selected: selectedAccount,
                onSelect: _selectWaba,
                collapsed: collapsed,
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
              padding: EdgeInsets.symmetric(horizontal: collapsed ? 8 : 12, vertical: 8),
              children: [
                ..._topNav.where((item) => item.permission == null || authVm.can(item.permission!)).map(
                      (item) => _NavTile(
                        item: item,
                        selected: currentRoute == item.route || currentRoute.startsWith('${item.route}/'),
                        onTap: () => _navigate(item.route),
                        collapsed: collapsed,
                      ),
                    ),
                const SizedBox(height: 8),
                const AppDivider(),
                const SizedBox(height: 8),
                AppListTile(
                  leading: const PhosphorIcon(PhosphorIconsRegular.gear),
                  title: collapsed ? null : const Text('Settings'),
                  trailing: collapsed ? null : Icon(_settingsExpanded ? PhosphorIconsRegular.caretUp : PhosphorIconsRegular.caretDown),
                  onTap: () => setState(() => _settingsExpanded = !_settingsExpanded),
                ),
                if (_settingsExpanded)
                  ..._settingsNav.where((item) => item.permission == null || authVm.can(item.permission!)).map(
                        (item) => _NavTile(
                          item: item,
                          selected: currentRoute == item.route,
                          onTap: () => _navigate(item.route),
                          indent: !collapsed,
                          collapsed: collapsed,
                        ),
                      ),
              ],
            ),
          ),
          const AppDivider(height: 1),
          if (widget.onToggle != null)
            InkWell(
              onTap: widget.onToggle,
              child: Container(
                height: 40,
                alignment: Alignment.center,
                child: PhosphorIcon(
                  collapsed ? PhosphorIconsRegular.caretRight : PhosphorIconsRegular.caretLeft,
                  size: 18,
                  color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
                ),
              ),
            ),
          Padding(
            padding: EdgeInsets.fromLTRB(collapsed ? 8 : 16, 8, collapsed ? 8 : 16, 4),
            child: Row(
              mainAxisAlignment: collapsed ? MainAxisAlignment.center : MainAxisAlignment.start,
              children: [
                AppAvatar(
                  radius: 18,
                  child: Text(
                    authVm.user?.name.isNotEmpty == true ? authVm.user!.name[0].toUpperCase() : '?',
                    style: const TextStyle(fontSize: 14, fontWeight: FontWeight.w600),
                  ),
                ),
                if (!collapsed) ...[
                  const SizedBox(width: 10),
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      mainAxisSize: MainAxisSize.min,
                      children: [
                        Text(
                          authVm.user?.name ?? 'User',
                          style: const TextStyle(fontSize: 13, fontWeight: FontWeight.w600),
                          overflow: TextOverflow.ellipsis,
                        ),
                        Text(
                          authVm.user?.role ?? '',
                          style: TextStyle(
                            fontSize: 11,
                            color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                          ),
                        ),
                      ],
                    ),
                  ),
                  AppIconButton(
                    icon: const PhosphorIcon(PhosphorIconsRegular.signOut, size: 18),
                    tooltip: 'Logout',
                    onPressed: () async {
                      await authVm.logout();
                      if (context.mounted) context.go('/login');
                    },
                  ),
                ],
              ],
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
  final bool collapsed;

  const _NavTile({required this.item, required this.selected, required this.onTap, this.indent = false, this.collapsed = false});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 2),
      child: AppListTile(
        leading: Icon(item.icon, size: 32.0, color: selected ? Theme.of(context).colorScheme.primary : null),
        title: collapsed ? null : Text(item.label),
        selected: selected,
        selectedTileColor: Theme.of(context).colorScheme.primary.withValues(alpha: 0.1),
        padding: EdgeInsets.only(left: collapsed ? 0 : (indent ? 32 : 16), right: collapsed ? 0 : 16, top: 10, bottom: 10),
        onTap: onTap,
      ),
    );
  }
}

class _WabaSwitcher extends StatelessWidget {
  final List<WabaAccount> accounts;
  final WabaAccount? selected;
  final ValueChanged<String?> onSelect;
  final bool collapsed;

  const _WabaSwitcher({
    required this.accounts,
    required this.selected,
    required this.onSelect,
    this.collapsed = false,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isActive = selected?.isActive ?? false;

    if (collapsed) {
      return PopupMenuButton<String>(
        tooltip: selected?.name ?? 'Switch WABA account',
        onSelected: onSelect,
        offset: const Offset(60, 0),
        itemBuilder: (_) => accounts.map((a) {
          final isSelected = a.id == selected?.id;
          return PopupMenuItem<String>(
            value: a.id,
            child: Row(
              children: [
                Container(
                  width: 8,
                  height: 8,
                  decoration: BoxDecoration(
                    color: isSelected ? Colors.green : Colors.transparent,
                    shape: BoxShape.circle,
                    border: Border.all(
                      color: isSelected ? Colors.green : theme.colorScheme.outline,
                      width: 1.5,
                    ),
                  ),
                ),
                const SizedBox(width: 12),
                Text(a.name),
              ],
            ),
          );
        }).toList(),
        child: Container(
          width: 48,
          height: 48,
          decoration: BoxDecoration(
            color: isActive ? const Color(0xFF25D366) : Colors.grey,
            borderRadius: BorderRadius.circular(10),
          ),
          child: const Icon(
            Icons.phone_android,
            color: Colors.white,
            size: 20,
          ),
        ),
      );
    }

    return PopupMenuButton<String>(
      tooltip: 'Switch WABA account',
      onSelected: onSelect,
      offset: const Offset(0, 44),
      itemBuilder: (_) => accounts.map((a) {
        final isSelected = a.id == selected?.id;
        return PopupMenuItem<String>(
          value: a.id,
          child: Row(
            children: [
              Container(
                width: 8,
                height: 8,
                decoration: BoxDecoration(
                  color: isSelected ? Colors.green : Colors.transparent,
                  shape: BoxShape.circle,
                  border: Border.all(
                    color: isSelected ? Colors.green : theme.colorScheme.outline,
                    width: 1.5,
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    Text(
                      a.name,
                      style: TextStyle(
                        fontWeight: isSelected ? FontWeight.w600 : FontWeight.normal,
                        color: isSelected ? theme.colorScheme.primary : theme.colorScheme.onSurface,
                      ),
                    ),
                    if (a.phoneNumberId != null && a.phoneNumberId!.isNotEmpty)
                      Text(
                        a.phoneNumberId!,
                        style: TextStyle(
                          fontSize: 11,
                          color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                        ),
                      ),
                  ],
                ),
              ),
              if (isSelected)
                PhosphorIcon(
                  PhosphorIconsRegular.check,
                  size: 16,
                  color: theme.colorScheme.primary,
                ),
            ],
          ),
        );
      }).toList(),
      child: Container(
        padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 10),
        decoration: BoxDecoration(
          color: theme.colorScheme.surfaceContainerHighest.withValues(alpha: 0.5),
          borderRadius: BorderRadius.circular(10),
          border: Border.all(
            color: theme.colorScheme.outlineVariant.withValues(alpha: 0.5),
          ),
        ),
        child: Row(
          children: [
            Container(
              width: 32,
              height: 32,
              decoration: BoxDecoration(
                color: isActive ? const Color(0xFF25D366) : Colors.grey,
                borderRadius: BorderRadius.circular(8),
              ),
              child: const Icon(
                Icons.phone_android,
                color: Colors.white,
                size: 18,
              ),
            ),
            const SizedBox(width: 10),
            Expanded(
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                mainAxisSize: MainAxisSize.min,
                children: [
                  Text(
                    selected?.name ?? 'Select Account',
                    style: const TextStyle(
                      fontSize: 13,
                      fontWeight: FontWeight.w600,
                    ),
                    maxLines: 1,
                    overflow: TextOverflow.ellipsis,
                  ),
                  if (selected?.phoneNumberId != null && selected!.phoneNumberId!.isNotEmpty)
                    Text(
                      selected!.phoneNumberId!,
                      style: TextStyle(
                        fontSize: 11,
                        color: theme.colorScheme.onSurface.withValues(alpha: 0.5),
                      ),
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                    ),
                ],
              ),
            ),
            const SizedBox(width: 4),
            PhosphorIcon(
              PhosphorIconsRegular.caretDown,
              size: 14,
              color: theme.colorScheme.onSurface.withValues(alpha: 0.4),
            ),
          ],
        ),
      ),
    );
  }
}
