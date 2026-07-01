import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../core/services/notification_manager.dart';
import '../../core/services/socket_service.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../widgets/sidebar.dart';
import '../widgets/mobile_bottom_nav.dart';
import '../widgets/custom/custom_widgets.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

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
        body: Center(child: AppProgressIndicator()),
      );
    }

    if (!authVm.isLoggedIn) {
      WidgetsBinding.instance.addPostFrameCallback((_) {
        if (context.mounted) context.go('/login');
      });
      return const Scaffold(body: SizedBox.shrink());
    }

    return Scaffold(
      appBar: isMobile
          ? AppAppBar(
              title: const Text('BizlInbox'),
              actions: [
                AppIconButton(
                  icon: const PhosphorIcon(PhosphorIconsRegular.signOut),
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
    );
  }
}