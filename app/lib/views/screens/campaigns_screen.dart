import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../data/models/campaign_model.dart';
import '../../data/repositories/campaign_repository.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../../viewmodels/base_viewmodel.dart';
import 'campaign_form_screen.dart';
import '../widgets/custom/custom_widgets.dart';
import '../widgets/custom/app_shimmer.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

class CampaignsViewModel extends BaseViewModel {
  final CampaignRepository _repo;
  CampaignsViewModel(this._repo);

  List<Campaign> _campaigns = [];
  List<Campaign> get campaigns => _campaigns;

  Future<void> loadCampaigns() async {
    await runAsync(() async {
      final result = await _repo.getCampaigns();
      result.when(
        success: (data) => _campaigns = data,
        error: (message, exception) => throw Exception(message),
      );
    });
  }

  Future<void> deleteCampaign(String id) async {
    final result = await _repo.deleteCampaign(id);
    result.when(
      success: (_) => loadCampaigns(),
      error: (message, exception) {},
    );
  }

  Future<void> actionCampaign(String id, String action) async {
    final result = await _repo.action(id, action);
    result.when(
      success: (_) => loadCampaigns(),
      error: (message, exception) {},
    );
  }

  Color _statusColor(String status) {
    switch (status) {
      case 'running':
        return Colors.green;
      case 'completed':
        return Colors.blue;
      case 'failed':
      case 'cancelled':
        return Colors.red;
      case 'scheduled':
        return Colors.amber;
      default:
        return Colors.grey;
    }
  }
}

class CampaignsScreen extends StatelessWidget {
  const CampaignsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) =>
          CampaignsViewModel(locator<CampaignRepository>())..loadCampaigns(),
      child: const _CampaignsBody(),
    );
  }
}

class _CampaignsBody extends StatelessWidget {
  const _CampaignsBody();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<CampaignsViewModel>();
    final authVm = context.watch<AuthViewModel>();

    if (!authVm.can('campaigns.read')) {
      return Scaffold(
        appBar: AppAppBar(title: const Text('Campaigns')),
        body: _buildNoPermission(),
      );
    }

    final canManage = authVm.can('campaigns.manage');

    return Scaffold(
      appBar: AppAppBar(
        title: const Text('Campaigns'),
        actions: [
          AppIconButton(
            icon: const PhosphorIcon(PhosphorIconsRegular.arrowsClockwise),
            onPressed: vm.isBusy ? null : () => vm.loadCampaigns(),
          ),
        ],
      ),
      floatingActionButton: canManage
          ? AppFloatingActionButton(
              onPressed: () async {
                final result = await Navigator.push(
                  context,
                  MaterialPageRoute(builder: (_) => const CampaignFormScreen()),
                );
                if (result == true) {
                  vm.loadCampaigns();
                }
              },
              icon: const PhosphorIcon(PhosphorIconsRegular.plus),
              label: const Text('New Campaign'),
            )
          : null,
      body: vm.isBusy && vm.campaigns.isEmpty
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
          : vm.campaigns.isEmpty
          ? const AppEmptyState(
              icon: PhosphorIconsRegular.megaphone,
              title: 'No campaigns',
              subtitle: 'Create a campaign to broadcast messages',
            )
          : RefreshIndicator(
              onRefresh: () => vm.loadCampaigns(),
              child: ListView.builder(
                physics: const AlwaysScrollableScrollPhysics(),
                padding: const EdgeInsets.all(12),
                itemCount: vm.campaigns.length,
                itemBuilder: (context, index) {
                  final c = vm.campaigns[index];
                  return AppCard(
                    child: GestureDetector(
                      onTap: () async {
                        final result = await Navigator.push(
                          context,
                          MaterialPageRoute(
                            builder: (_) => CampaignFormScreen(campaign: c),
                          ),
                        );
                        if (result == true) {
                          vm.loadCampaigns();
                        }
                      },
                      child: Padding(
                        padding: const EdgeInsets.all(12),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Row(
                              children: [
                                Expanded(
                                  child: Text(
                                    c.name,
                                    style: const TextStyle(
                                      fontSize: 16,
                                      fontWeight: FontWeight.w600,
                                    ),
                                  ),
                                ),
                                Chip(
                                  label: Text(c.status),
                                  backgroundColor: vm
                                      ._statusColor(c.status)
                                      .withValues(alpha: 0.2),
                                  side: BorderSide(
                                    color: vm._statusColor(c.status),
                                  ),
                                  labelStyle: TextStyle(
                                    color: vm._statusColor(c.status),
                                  ),
                                ),
                              ],
                            ),
                            const SizedBox(height: 4),
                            Text(
                              '${c.messageType} | ${c.totalRecipients} recipients',
                            ),
                            const SizedBox(height: 8),
                            Row(
                              mainAxisAlignment: MainAxisAlignment.end,
                              children: [
                                if (c.status == 'draft' || c.status == 'paused')
                                  AppIconButton(
                                    icon: const PhosphorIcon(
                                      PhosphorIconsRegular.play,
                                      color: Colors.green,
                                    ),
                                    tooltip: 'Start',
                                    onPressed: () =>
                                        vm.actionCampaign(c.id, 'start'),
                                  ),
                                if (c.status == 'running')
                                  AppIconButton(
                                    icon: const PhosphorIcon(
                                      PhosphorIconsRegular.pause,
                                      color: Colors.orange,
                                    ),
                                    tooltip: 'Pause',
                                    onPressed: () =>
                                        vm.actionCampaign(c.id, 'pause'),
                                  ),
                                if (c.status == 'draft' ||
                                    c.status == 'scheduled' ||
                                    c.status == 'running' ||
                                    c.status == 'paused')
                                  AppIconButton(
                                    icon: const PhosphorIcon(
                                      PhosphorIconsRegular.xCircle,
                                      color: Colors.red,
                                    ),
                                    tooltip: 'Cancel',
                                    onPressed: () =>
                                        vm.actionCampaign(c.id, 'cancel'),
                                  ),
                                AppIconButton(
                                  icon: const PhosphorIcon(
                                    PhosphorIconsRegular.trash,
                                    color: Colors.red,
                                  ),
                                  tooltip: 'Delete',
                                  onPressed: () =>
                                      _confirmDelete(context, vm, c.id),
                                ),
                              ],
                            ),
                          ],
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
    );
  }

  void _confirmDelete(BuildContext context, CampaignsViewModel vm, String id) {
    showDialog(
      context: context,
      builder: (context) => AppAlertDialog(
        title: const Text('Delete Campaign?'),
        content: const Text('This action cannot be undone.'),
        actions: [
          AppButton(
            variant: AppButtonVariant.ghost,
            onPressed: () => Navigator.pop(context),
            child: const Text('Cancel'),
          ),
          AppButton(
            variant: AppButtonVariant.primary,
            onPressed: () {
              Navigator.pop(context);
              vm.deleteCampaign(id);
            },
            child: const Text('Delete'),
          ),
        ],
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
