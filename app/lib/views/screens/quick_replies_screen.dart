import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../data/models/quick_reply_model.dart';
import '../../data/repositories/settings_repository.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../../viewmodels/base_viewmodel.dart';
import '../widgets/quick_reply_dialog.dart';
import '../widgets/custom/custom_widgets.dart';
import '../widgets/custom/app_shimmer.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

class QuickRepliesViewModel extends BaseViewModel {
  final SettingsRepository _repo;
  QuickRepliesViewModel(this._repo);

  List<QuickReply> _quickReplies = [];
  List<QuickReply> get quickReplies => _quickReplies;

  Future<void> loadQuickReplies() async {
    await runAsync(() async {
      final result = await _repo.getQuickReplies();
      result.when(
        success: (data) => _quickReplies = data,
        error: (message, exception) => throw Exception(message),
      );
    });
  }

  Future<void> deleteQuickReply(String id) async {
    final result = await _repo.deleteQuickReply(id);
    result.when(
      success: (_) => loadQuickReplies(),
      error: (message, exception) {},
    );
  }

  Future<void> createQuickReply(Map<String, dynamic> payload) async {
    setBusy();
    final result = await _repo.createQuickReply(payload);
    result.when(
      success: (_) => loadQuickReplies(),
      error: (message, exception) => setError(message),
    );
  }

  Future<void> updateQuickReply(String id, Map<String, dynamic> payload) async {
    setBusy();
    final result = await _repo.updateQuickReply(id, payload);
    result.when(
      success: (_) => loadQuickReplies(),
      error: (message, exception) => setError(message),
    );
  }
}

class QuickRepliesScreen extends StatelessWidget {
  const QuickRepliesScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) =>
          QuickRepliesViewModel(locator<SettingsRepository>())
            ..loadQuickReplies(),
      child: const _QuickRepliesBody(),
    );
  }
}

class _QuickRepliesBody extends StatelessWidget {
  const _QuickRepliesBody();

  Future<void> _showDialog(
    BuildContext context,
    QuickRepliesViewModel vm, {
    QuickReply? quickReply,
  }) async {
    await showDialog(
      context: context,
      builder: (ctx) => QuickReplyDialog(
        quickReply: quickReply,
        onSave: (payload, id) {
          if (id != null) {
            vm.updateQuickReply(id, payload);
          } else {
            vm.createQuickReply(payload);
          }
        },
      ),
    );
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<QuickRepliesViewModel>();
    final authVm = context.watch<AuthViewModel>();

    if (!authVm.can('settings.read')) {
      return Scaffold(
        appBar: AppAppBar(title: const Text('Quick Replies')),
        body: _buildNoPermission(),
      );
    }

    final canManage = authVm.can('settings.manage');

    return Scaffold(
      appBar: AppAppBar(
        title: const Text('Quick Replies'),
        actions: [
          AppIconButton(
            icon: const PhosphorIcon(PhosphorIconsRegular.arrowsClockwise),
            onPressed: vm.isBusy ? null : () => vm.loadQuickReplies(),
          ),
        ],
      ),
      floatingActionButton: canManage
          ? AppFloatingActionButton(
              onPressed: vm.isBusy ? null : () => _showDialog(context, vm),
              icon: const PhosphorIcon(PhosphorIconsRegular.plus),
              label: const Text('Add Quick Reply'),
            )
          : null,
      body: vm.isBusy && vm.quickReplies.isEmpty
          ? AppShimmer(
              child: ListView.builder(
                padding: const EdgeInsets.all(12),
                itemCount: 6,
                itemBuilder: (_, index) => const Padding(
                  padding: EdgeInsets.only(bottom: 8),
                  child: GenericCardSkeleton(lines: 2),
                ),
              ),
            )
          : vm.quickReplies.isEmpty
          ? const Center(child: Text('No quick replies found'))
          : RefreshIndicator(
              onRefresh: () => vm.loadQuickReplies(),
              child: ListView.builder(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(12),
                itemCount: vm.quickReplies.length,
                itemBuilder: (context, index) {
                  final q = vm.quickReplies[index];
                  return AppCard(
                    child: AppListTile(
                      title: Text('/${q.shortcut}'),
                      subtitle: Text(
                        q.content,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                      ),
                      onTap: canManage
                          ? () => _showDialog(context, vm, quickReply: q)
                          : null,
                      trailing: canManage
                          ? Row(
                              mainAxisSize: MainAxisSize.min,
                              children: [
                                AppIconButton(
                                  icon: const PhosphorIcon(
                                    PhosphorIconsRegular.pencilSimple,
                                  ),
                                  onPressed: () =>
                                      _showDialog(context, vm, quickReply: q),
                                ),
                                AppIconButton(
                                  icon: const PhosphorIcon(
                                    PhosphorIconsRegular.trash,
                                    color: Colors.red,
                                  ),
                                  onPressed: () => vm.deleteQuickReply(q.id),
                                ),
                              ],
                            )
                          : null,
                    ),
                  );
                },
              ),
            ),
    );
  }

  Widget _buildNoPermission() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          PhosphorIcon(
            PhosphorIconsRegular.lockKey,
            size: 48,
            color: Colors.grey,
          ),
          SizedBox(height: 16),
          Text(
            'You do not have permission to view this page.',
            textAlign: TextAlign.center,
          ),
        ],
      ),
    );
  }
}
