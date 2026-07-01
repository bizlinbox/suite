import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';

class MobileBottomNav extends StatelessWidget {
  const MobileBottomNav({super.key});

  @override
  Widget build(BuildContext context) {
    final currentRoute = GoRouterState.of(context).uri.path;
    final isInbox = currentRoute.startsWith('/dashboard/inbox');
    final isContacts = currentRoute == '/dashboard/contacts';
    final isCampaigns = currentRoute == '/dashboard/campaigns';
    final isAnalytics = currentRoute == '/dashboard/analytics';
    final isSettings = currentRoute.startsWith('/dashboard/settings');

    return NavigationBar(
      selectedIndex: isInbox
          ? 0
          : isContacts
              ? 1
              : isCampaigns
                  ? 2
                  : isAnalytics
                      ? 3
                      : isSettings
                          ? 4
                          : 0,
      onDestinationSelected: (index) {
        switch (index) {
          case 0:
            context.go('/dashboard/inbox');
            break;
          case 1:
            context.go('/dashboard/contacts');
            break;
          case 2:
            context.go('/dashboard/campaigns');
            break;
          case 3:
            context.go('/dashboard/analytics');
            break;
          case 4:
            context.go('/dashboard/settings/general');
            break;
        }
      },
      destinations: const [
        NavigationDestination(icon: Icon(Icons.message), label: 'Inbox'),
        NavigationDestination(icon: Icon(Icons.people), label: 'Contacts'),
        NavigationDestination(icon: Icon(Icons.campaign), label: 'Campaigns'),
        NavigationDestination(icon: Icon(Icons.bar_chart), label: 'Analytics'),
        NavigationDestination(icon: Icon(Icons.settings), label: 'Settings'),
      ],
    );
  }
}