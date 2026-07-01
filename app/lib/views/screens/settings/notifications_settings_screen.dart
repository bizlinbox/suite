import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/di.dart';
import '../../../core/services/local_storage_service.dart';
import '../../../viewmodels/auth_viewmodel.dart';
import '../../widgets/custom/custom_widgets.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

class NotificationsSettingsScreen extends StatelessWidget {
  const NotificationsSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => _NotificationsViewModel(locator<LocalStorageService>()),
      child: const _NotificationsBody(),
    );
  }
}

class _NotificationsViewModel extends ChangeNotifier {
  final LocalStorageService _storage;
  bool _enabled = false;
  bool get enabled => _enabled;

  _NotificationsViewModel(this._storage) {
    _enabled = _storage.getNotificationsEnabled();
  }

  void toggle() {
    _enabled = !_enabled;
    _storage.setNotificationsEnabled(_enabled);
    notifyListeners();
  }
}

class _NotificationsBody extends StatelessWidget {
  const _NotificationsBody();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<_NotificationsViewModel>();
    final authVm = context.watch<AuthViewModel>();

    if (!authVm.can('settings.read')) {
      return Scaffold(
        appBar: AppAppBar(title: const Text('Notifications')),
        body: const Center(
          child: Column(
            mainAxisAlignment: MainAxisAlignment.center,
            children: [
              PhosphorIcon(PhosphorIconsRegular.lockKey, size: 48, color: Colors.grey),
              SizedBox(height: 16),
              Text('You do not have permission to view this page.', textAlign: TextAlign.center),
            ],
          ),
        ),
      );
    }

    return Scaffold(
      appBar: AppAppBar(title: const Text('Notifications')),
      body: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          children: [
            AppCard(
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  AppListTile(
                    leading: Icon(vm.enabled ? PhosphorIconsRegular.bell : PhosphorIconsRegular.bellSlash, color: Colors.blue),
                    title: const Text('Push Notifications'),
                    subtitle: Text(vm.enabled ? 'Notifications are enabled' : 'Notifications are disabled'),
                    trailing: AppInput.switchInput(
                      value: vm.enabled,
                      onToggled: (_) => vm.toggle(),
                    ),
                  ),
                  const Padding(
                    padding: EdgeInsets.fromLTRB(16, 0, 16, 16),
                    child: Text(
                      'Enable push notifications to receive alerts for new messages and updates. This setting is stored locally.',
                      style: TextStyle(fontSize: 12, color: Colors.grey),
                    ),
                  ),
                ],
              ),
            ),
            const SizedBox(height: 16),
            AppCard(
              child: Padding(
                padding: const EdgeInsets.all(16),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Permission Status', style: TextStyle(fontWeight: FontWeight.bold)),
                    const SizedBox(height: 8),
                    Row(
                      children: [
                        Icon(
                          vm.enabled ? PhosphorIconsRegular.checkCircle : PhosphorIconsRegular.info,
                          color: vm.enabled ? Colors.green : Colors.grey,
                        ),
                        const SizedBox(width: 8),
                        Expanded(
                          child: Text(
                            vm.enabled
                                ? 'Notifications preference is enabled. On supported platforms, permission is handled by the operating system.'
                                : 'Notifications are disabled. Enable the toggle above to receive alerts.',
                          ),
                        ),
                      ],
                    ),
                  ],
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}