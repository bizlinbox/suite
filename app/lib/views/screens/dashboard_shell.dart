import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../core/services/notification_manager.dart';
import '../../core/services/socket_service.dart';
import '../../core/services/theme_service.dart';
import '../../core/theme/app_theme.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../widgets/sidebar.dart';
import '../widgets/mobile_bottom_nav.dart';

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
  @override
  void initState() {
    super.initState();
    locator<SocketService>().connect();
    locator<NotificationManager>().start();
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
        body: Center(child: CircularProgressIndicator()),
      );
    }

    if (!authVm.isLoggedIn) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) context.go('/login');
      });
      return const Scaffold(body: SizedBox.shrink());
    }

    final themeService = locator<ThemeService>();
    return ListenableBuilder(
      listenable: themeService,
      builder: (context, _) {
        final brightness = switch (themeService.themeMode) {
          ThemeMode.light => Brightness.light,
          ThemeMode.dark => Brightness.dark,
          ThemeMode.system => MediaQuery.of(context).platformBrightness,
        };
        final themeData = brightness == Brightness.dark ? AppTheme.darkTheme : AppTheme.lightTheme;
        return Theme(
          data: themeData,
          child: Scaffold(
            appBar: isMobile
                ? AppBar(
                    title: const Text('BizlInbox'),
                    actions: [
                      IconButton(
                        icon: const Icon(Icons.logout),
                        onPressed: () async {
                          await authVm.logout();
                          if (context.mounted) context.go('/login');
                        },
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
          ),
        );
      },
    );
  }
}
