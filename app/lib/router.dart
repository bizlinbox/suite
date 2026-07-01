import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'views/screens/splash_screen.dart';
import 'views/screens/domain_screen.dart';
import 'views/screens/login_screen.dart';
import 'views/screens/dashboard_shell.dart';
import 'views/screens/inbox_screen.dart';
import 'views/screens/chat_screen.dart';
import 'views/screens/contacts_screen.dart';
import 'views/screens/campaigns_screen.dart';
import 'views/screens/automations_screen.dart';
import 'views/screens/analytics_screen.dart';
import 'views/screens/templates_screen.dart';
import 'views/screens/flows_screen.dart';
import 'views/screens/quick_replies_screen.dart';
import 'views/screens/users_screen.dart';
import 'views/screens/roles_screen.dart';
import 'views/screens/waba_accounts_screen.dart';
import 'views/screens/profile_screen.dart';
import 'views/screens/api_logs_screen.dart';
import 'views/screens/help_screen.dart';
import 'views/screens/setup_screen.dart';
import 'views/screens/settings/general_settings_screen.dart';
import 'views/screens/settings/labels_settings_screen.dart';
import 'views/screens/settings/notifications_settings_screen.dart';
import 'views/screens/settings/files_settings_screen.dart';
import 'views/screens/settings/integrations_settings_screen.dart';

final rootNavigatorKey = GlobalKey<NavigatorState>();

GoRouter createRouter() {
  return GoRouter(
    navigatorKey: rootNavigatorKey,
    initialLocation: '/splash',
    routes: [
      GoRoute(
        path: '/splash',
        builder: (context, state) => const SplashScreen(),
      ),
      GoRoute(
        path: '/domain',
        builder: (context, state) => const DomainScreen(),
      ),
      GoRoute(
        path: '/login',
        builder: (context, state) => const LoginScreen(),
      ),
      GoRoute(
        path: '/setup',
        builder: (context, state) => const SetupScreen(),
      ),
      ShellRoute(
        builder: (context, state, child) => DashboardShell(child: child),
        routes: [
          GoRoute(path: '/dashboard', redirect: (context, state) => '/dashboard/inbox'),
          ShellRoute(
            builder: (context, state, child) => InboxScreen(detail: child),
            routes: [
              GoRoute(path: '/dashboard/inbox', builder: (context, state) => const InboxEmptyDetail()),
              GoRoute(
                path: '/dashboard/inbox/:id',
                builder: (context, state) => ChatScreen(conversationId: state.pathParameters['id']!),
              ),
            ],
          ),
          GoRoute(path: '/dashboard/contacts', builder: (context, state) => const ContactsScreen()),
          GoRoute(path: '/dashboard/campaigns', builder: (context, state) => const CampaignsScreen()),
          GoRoute(path: '/dashboard/automations', builder: (context, state) => const AutomationsScreen()),
          GoRoute(path: '/dashboard/analytics', builder: (context, state) => const AnalyticsScreen()),
          GoRoute(path: '/dashboard/templates', builder: (context, state) => const TemplatesScreen()),
          GoRoute(path: '/dashboard/flows', builder: (context, state) => const FlowsScreen()),
          GoRoute(path: '/dashboard/quick-replies', builder: (context, state) => const QuickRepliesScreen()),
          GoRoute(path: '/dashboard/users', builder: (context, state) => const UsersScreen()),
          GoRoute(path: '/dashboard/roles', builder: (context, state) => const RolesScreen()),
          GoRoute(path: '/dashboard/waba-accounts', builder: (context, state) => const WabaAccountsScreen()),
          GoRoute(path: '/dashboard/profile', builder: (context, state) => const ProfileScreen()),
          GoRoute(path: '/dashboard/api-logs', builder: (context, state) => const ApiLogsScreen()),
          GoRoute(path: '/dashboard/help', builder: (context, state) => const HelpScreen()),
          GoRoute(path: '/dashboard/settings/general', builder: (context, state) => const GeneralSettingsScreen()),
          GoRoute(path: '/dashboard/settings/labels', builder: (context, state) => const LabelsSettingsScreen()),
          GoRoute(path: '/dashboard/settings/notifications', builder: (context, state) => const NotificationsSettingsScreen()),
          GoRoute(path: '/dashboard/settings/files', builder: (context, state) => const FilesSettingsScreen()),
          GoRoute(path: '/dashboard/settings/integrations', builder: (context, state) => const IntegrationsSettingsScreen()),
        ],
      ),
    ],
  );
}

