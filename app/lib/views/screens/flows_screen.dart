import 'dart:convert';
import 'package:flutter/material.dart' hide Flow;
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../core/services/local_storage_service.dart';
import '../../data/models/conversation_model.dart';
import '../../data/models/flow_model.dart';
import '../../data/models/flow_submission_model.dart';
import '../../data/repositories/conversation_repository.dart';
import '../../data/repositories/settings_repository.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../../viewmodels/base_viewmodel.dart';
import '../widgets/custom/custom_widgets.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

class FlowsViewModel extends BaseViewModel {
  final SettingsRepository _settingsRepo;
  final ConversationRepository _conversationRepo;
  final LocalStorageService _localStorage;

  FlowsViewModel(this._settingsRepo, this._conversationRepo, this._localStorage);

  List<Flow> _flows = [];
  List<Flow> get flows => _flows;

  List<FlowSubmission> _submissions = [];
  List<FlowSubmission> get submissions => _submissions;

  List<Conversation> _conversations = [];
  List<Conversation> get conversations => _conversations;

  String? _syncMessage;
  String? get syncMessage => _syncMessage;

  bool _syncSuccess = false;
  bool get syncSuccess => _syncSuccess;

  String? get wabaId => _localStorage.getWabaId();

  Future<void> loadFlows() async {
    await runAsync(() async {
      final result = await _settingsRepo.getFlows();
      result.when(
        success: (data) => _flows = data,
        error: (message, exception) => throw Exception(message),
      );
    });
  }

  Future<void> loadSubmissions() async {
    await runAsync(() async {
      final result = await _settingsRepo.getSubmissions();
      result.when(
        success: (data) => _submissions = data,
        error: (message, exception) => throw Exception(message),
      );
    });
  }

  Future<void> loadConversations() async {
    final result = await _conversationRepo.getConversations();
    result.when(
      success: (data) => _conversations = data,
      error: (message, exception) => _conversations = [],
    );
    notifyListeners();
  }

  Future<void> syncFlows() async {
    final wabaId = _localStorage.getWabaId();
    if (wabaId == null) return;
    setBusy();
    final result = await _settingsRepo.syncFlows(wabaId);
    result.when(
      success: (count) {
        _syncMessage = '$count flows synced';
        _syncSuccess = true;
        loadFlows();
      },
      error: (message, exception) {
        _syncMessage = message;
        _syncSuccess = false;
        setIdle();
      },
    );
  }

  void clearSyncMessage() {
    _syncMessage = null;
    notifyListeners();
  }

  Future<void> createFlow(String name, String category, String flowJson) async {
    final wabaId = _localStorage.getWabaId();
    if (wabaId == null) return;
    setBusy();
    try {
      final parsed = jsonDecode(flowJson) as Map<String, dynamic>;
      final result = await _settingsRepo.createFlow(name, category, parsed, wabaId);
      result.when(
        success: (_) => loadFlows(),
        error: (message, exception) => setError(message),
      );
    } catch (e) {
      setError('Invalid JSON. Please check the format and try again.');
    }
  }

  Future<void> updateFlow(String id, String name, String category, String flowJson) async {
    setBusy();
    try {
      final parsed = jsonDecode(flowJson) as Map<String, dynamic>;
      final result = await _settingsRepo.updateFlow(id, name: name, category: category, flowJson: parsed);
      result.when(
        success: (_) => loadFlows(),
        error: (message, exception) => setError(message),
      );
    } catch (e) {
      setError('Invalid JSON. Please check the format and try again.');
    }
  }

  Future<void> deleteFlow(String id) async {
    final result = await _settingsRepo.deleteFlow(id);
    result.when(
      success: (_) => loadFlows(),
      error: (message, exception) {},
    );
  }

  Future<void> publishFlow(String id) async {
    final result = await _settingsRepo.publishFlow(id);
    result.when(
      success: (_) => loadFlows(),
      error: (message, exception) {},
    );
  }

  Future<bool> sendFlow(String flowId, String conversationId, String body,
      {String? header, String? footer, String? flowToken, String? screen, String? dataJson}) async {
    setBusy();
    Map<String, dynamic>? data;
    if (dataJson != null && dataJson.trim().isNotEmpty) {
      try {
        data = jsonDecode(dataJson) as Map<String, dynamic>;
      } catch (e) {
        setError('Screen data is not valid JSON');
        return false;
      }
    }
    final result = await _settingsRepo.sendFlow(
      flowId,
      conversationId,
      body,
      header: header,
      footer: footer,
      flowToken: flowToken,
      screen: screen,
      data: data,
    );
    return result.when(
      success: (_) {
        setIdle();
        return true;
      },
      error: (message, exception) {
        setError(message);
        return false;
      },
    );
  }

  Future<void> deleteSubmission(String id) async {
    final result = await _settingsRepo.deleteSubmission(id);
    result.when(
      success: (_) => loadSubmissions(),
      error: (message, exception) {},
    );
  }
}

class FlowsScreen extends StatelessWidget {
  const FlowsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => FlowsViewModel(
        locator<SettingsRepository>(),
        locator<ConversationRepository>(),
        locator<LocalStorageService>(),
      )..loadFlows()..loadConversations(),
      child: const _FlowsBody(),
    );
  }
}

class _FlowsBody extends StatefulWidget {
  const _FlowsBody();

  @override
  State<_FlowsBody> createState() => _FlowsBodyState();
}

class _FlowsBodyState extends State<_FlowsBody> with SingleTickerProviderStateMixin {
  late TabController _tabController;

  @override
  void initState() {
    super.initState();
    _tabController = TabController(length: 2, vsync: this);
    _tabController.addListener(() {
      if (_tabController.indexIsChanging) {
        setState(() {});
        final vm = context.read<FlowsViewModel>();
        if (_tabController.index == 1) {
          vm.loadSubmissions();
        }
      }
    });
  }

  @override
  void dispose() {
    _tabController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<FlowsViewModel>();
    final authVm = context.watch<AuthViewModel>();

    if (!authVm.can('settings.read')) {
      return Scaffold(
        appBar: AppAppBar(title: const Text('WhatsApp Forms')),
        body: _buildNoPermission(),
      );
    }

    final canManage = authVm.can('settings.manage');

    return Scaffold(
      appBar: AppAppBar(
        title: const Text('WhatsApp Forms'),
        bottom: TabBar(
          controller: _tabController,
          tabs: [
            Tab(text: 'Flows (${vm.flows.length})'),
            Tab(text: 'Submissions (${vm.submissions.length})'),
          ],
        ),
        actions: [
          AppIconButton(
            icon: vm.isBusy && vm.flows.isNotEmpty
                ? const SizedBox(width: 20, height: 20, child: CircularProgressIndicator(strokeWidth: 2))
                : const PhosphorIcon(PhosphorIconsRegular.arrowsClockwise),
            tooltip: 'Sync from Meta',
            onPressed: vm.isBusy || vm.wabaId == null ? null : () => _handleSync(context, vm),
          ),
        ],
      ),
      body: TabBarView(
        controller: _tabController,
        children: [
          _FlowsTab(vm: vm, canManage: canManage),
          _SubmissionsTab(vm: vm, canManage: canManage),
        ],
      ),
      floatingActionButton: canManage && _tabController.index == 0 ? AppFloatingActionButton(
        onPressed: vm.wabaId == null ? null : () => _showCreateEditDialog(context, vm),
        child: const PhosphorIcon(PhosphorIconsRegular.plus),
      ) : null,
    );
  }

  Widget _buildNoPermission() {
    return const Center(
      child: Column(
        mainAxisAlignment: MainAxisAlignment.center,
        children: [
          PhosphorIcon(PhosphorIconsRegular.lockKey, size: 48, color: Colors.grey),
          SizedBox(height: 16),
          Text('You do not have permission to view this page.', textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Future<void> _handleSync(BuildContext context, FlowsViewModel vm) async {
    await vm.syncFlows();
    if (vm.syncMessage != null && context.mounted) {
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(vm.syncMessage!),
          backgroundColor: vm.syncSuccess ? Colors.green : Colors.red,
          duration: const Duration(seconds: 4),
        ),
      );
      vm.clearSyncMessage();
    }
  }

  Future<void> _showCreateEditDialog(BuildContext context, FlowsViewModel vm, {Flow? flow}) async {
    final nameController = TextEditingController(text: flow?.name ?? '');
    String category = flow?.category ?? 'OTHER';
    final flowJsonController = TextEditingController(
      text: flow?.flowJson != null ? const JsonEncoder.withIndent('  ').convert(flow!.flowJson) : '{}',
    );

    await showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return AppAlertDialog(
              title: Text(flow == null ? 'Create Flow' : 'Edit Flow'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    AppInput(
                      controller: nameController,
                      label: 'Name',
                    ),
                    const SizedBox(height: 12),
                    AppInput.dropdown(
                      value: category,
                      label: 'Category',
                      options: const [
                        AppInputOption(value: 'OTHER', label: 'Other'),
                        AppInputOption(value: 'SIGN_UP', label: 'Sign Up'),
                        AppInputOption(value: 'SIGN_IN', label: 'Sign In'),
                        AppInputOption(value: 'LEAD_GENERATION', label: 'Lead Generation'),
                        AppInputOption(value: 'BOOKING', label: 'Booking'),
                        AppInputOption(value: 'APPOINTMENT', label: 'Appointment'),
                        AppInputOption(value: 'FEEDBACK', label: 'Feedback'),
                        AppInputOption(value: 'SURVEY', label: 'Survey'),
                        AppInputOption(value: 'QUIZ', label: 'Quiz'),
                        AppInputOption(value: 'RESERVATION', label: 'Reservation'),
                        AppInputOption(value: 'ORDER', label: 'Order'),
                        AppInputOption(value: 'REGISTRATION', label: 'Registration'),
                        AppInputOption(value: 'TICKETING', label: 'Ticketing'),
                      ],
                      onSelected: (v) {
                        if (v != null) setDialogState(() => category = v);
                      },
                    ),
                    const SizedBox(height: 12),
                    AppInput.multiline(
                      controller: flowJsonController,
                      label: 'Flow JSON Definition',
                      maxLines: 12,
                      style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                    ),
                  ],
                ),
              ),
              actions: [
                AppButton(variant: AppButtonVariant.ghost, 
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel'),
                ),
                AppButton(variant: AppButtonVariant.primary, 
                  onPressed: vm.isBusy
                      ? null
                      : () async {
                          if (flow == null) {
                            await vm.createFlow(nameController.text.trim(), category, flowJsonController.text.trim());
                          } else {
                            await vm.updateFlow(flow.id, nameController.text.trim(), category, flowJsonController.text.trim());
                          }
                          if (ctx.mounted && vm.isIdle) {
                            Navigator.pop(ctx);
                          }
                        },
                  child: Text(flow == null ? 'Create' : 'Update'),
                ),
              ],
            );
          },
        );
      },
    );
  }
}

class _FlowsTab extends StatelessWidget {
  final FlowsViewModel vm;
  final bool canManage;
  const _FlowsTab({required this.vm, required this.canManage});

  @override
  Widget build(BuildContext context) {
    if (vm.wabaId == null) {
      return const Center(
        child: Column(
          mainAxisAlignment: MainAxisAlignment.center,
          children: [
            PhosphorIcon(PhosphorIconsRegular.buildings, size: 48, color: Colors.grey),
            SizedBox(height: 16),
            Text('Please select a WABA account', style: TextStyle(fontSize: 18, fontWeight: FontWeight.w600)),
            SizedBox(height: 8),
            Text('Use the WABA dropdown in the sidebar to choose an account.', style: TextStyle(color: Colors.grey)),
          ],
        ),
      );
    }

    if (vm.isBusy && vm.flows.isEmpty) {
      return const Center(child: AppProgressIndicator());
    }

    if (vm.flows.isEmpty) {
      return const Center(child: Text('No flows yet. Sync from Meta or create one.'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: vm.flows.length,
      itemBuilder: (context, index) {
        final flow = vm.flows[index];
        return AppCard(
          child: Padding(
            padding: const EdgeInsets.all(12),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(flow.name, style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16)),
                    ),
                    _StatusBadge(status: flow.status),
                  ],
                ),
                const SizedBox(height: 4),
                Row(
                  children: [
                    Chip(
                      label: Text(flow.category ?? 'OTHER', style: const TextStyle(fontSize: 12)),
                      padding: EdgeInsets.zero,
                      visualDensity: VisualDensity.compact,
                    ),
                    const SizedBox(width: 8),
                    Text('Updated ${_formatDate(flow.updatedAt)}', style: const TextStyle(fontSize: 12, color: Colors.grey)),
                  ],
                ),
                const SizedBox(height: 8),
                Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    AppIconButton(
                      icon: const PhosphorIcon(PhosphorIconsRegular.eye, size: 20),
                      tooltip: 'Preview JSON',
                      onPressed: () => _showPreviewDialog(context, flow),
                    ),
                    if (canManage)
                      AppIconButton(
                        icon: const PhosphorIcon(PhosphorIconsRegular.paperPlaneRight, size: 20, color: Colors.blue),
                        tooltip: 'Send',
                        onPressed: () => _showSendDialog(context, vm, flow),
                      ),
                    if (canManage && flow.status != 'PUBLISHED')
                      AppIconButton(
                        icon: const PhosphorIcon(PhosphorIconsRegular.play, size: 20, color: Colors.green),
                        tooltip: 'Publish',
                        onPressed: () => vm.publishFlow(flow.id),
                      ),
                    if (canManage)
                      AppIconButton(
                        icon: const PhosphorIcon(PhosphorIconsRegular.pencilSimple, size: 20),
                        tooltip: 'Edit',
                        onPressed: () => _showEditDialog(context, vm, flow),
                      ),
                    if (canManage)
                      AppIconButton(
                        icon: const PhosphorIcon(PhosphorIconsRegular.trash, size: 20, color: Colors.red),
                        tooltip: 'Delete',
                        onPressed: () => _confirmDeleteFlow(context, vm, flow),
                      ),
                  ],
                ),
              ],
            ),
          ),
        );
      },
    );
  }

  Future<void> _showPreviewDialog(BuildContext context, Flow flow) async {
    final jsonText = flow.flowJson != null
        ? const JsonEncoder.withIndent('  ').convert(flow.flowJson)
        : '{}';
    await showDialog(
      context: context,
      builder: (ctx) => AppAlertDialog(
        title: Text('${flow.name} — JSON'),
        content: SingleChildScrollView(
          child: Container(
            width: double.maxFinite,
            padding: const EdgeInsets.all(12),
            decoration: BoxDecoration(
              color: Colors.grey.shade100,
              borderRadius: BorderRadius.circular(8),
            ),
            child: SelectableText(
              jsonText,
              style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
            ),
          ),
        ),
        actions: [
          AppButton(variant: AppButtonVariant.ghost, 
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Future<void> _showSendDialog(BuildContext context, FlowsViewModel vm, Flow flow) async {
    String? selectedConversationId;
    final bodyController = TextEditingController(text: 'Please complete: ${flow.name}');
    final headerController = TextEditingController();
    final footerController = TextEditingController();
    final flowTokenController = TextEditingController(text: 'flow-${DateTime.now().millisecondsSinceEpoch}');
    final screenController = TextEditingController();
    final dataController = TextEditingController();

    await showDialog(
      context: context,
      builder: (ctx) {
        return StatefulBuilder(
          builder: (ctx, setDialogState) {
            return AppAlertDialog(
              title: Text('Send Flow: ${flow.name}'),
              content: SingleChildScrollView(
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    AppInput.dropdown(
                      value: selectedConversationId,
                      label: 'Conversation',
                      hint: 'Select conversation...',
                      options: [
                        const AppInputOption(value: null, label: 'Select conversation...'),
                        ...vm.conversations.map((c) => AppInputOption(
                          value: c.id,
                          label: c.contactName,
                        )),
                      ],
                      onSelected: (v) => setDialogState(() => selectedConversationId = v),
                    ),
                    const SizedBox(height: 12),
                    AppInput(
                      controller: headerController,
                      label: 'Header (optional)',
                    ),
                    const SizedBox(height: 12),
                    AppInput.multiline(
                      controller: bodyController,
                      label: 'Body',
                      maxLines: 2,
                    ),
                    const SizedBox(height: 12),
                    AppInput(
                      controller: footerController,
                      label: 'Footer (optional)',
                    ),
                    const SizedBox(height: 12),
                    AppInput(
                      controller: flowTokenController,
                      label: 'Flow Token',
                    ),
                    const SizedBox(height: 12),
                    AppInput(
                      controller: screenController,
                      label: 'Screen (optional)',
                      hint: 'e.g. SIGN_UP',
                    ),
                    const SizedBox(height: 12),
                    AppInput.multiline(
                      controller: dataController,
                      label: 'Screen Data (optional)',
                      hint: '{"key": "value"}',
                      maxLines: 3,
                      style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
                    ),
                  ],
                ),
              ),
              actions: [
                AppButton(variant: AppButtonVariant.ghost, 
                  onPressed: () => Navigator.pop(ctx),
                  child: const Text('Cancel'),
                ),
                AppButton(variant: AppButtonVariant.primary, 
                  onPressed: selectedConversationId == null || vm.isBusy
                      ? null
                      : () async {
                          final success = await vm.sendFlow(
                            flow.id,
                            selectedConversationId!,
                            bodyController.text.trim(),
                            header: headerController.text.trim(),
                            footer: footerController.text.trim(),
                            flowToken: flowTokenController.text.trim(),
                            screen: screenController.text.trim(),
                            dataJson: dataController.text.trim(),
                          );
                          if (success && ctx.mounted) {
                            Navigator.pop(ctx);
                            ScaffoldMessenger.of(context).showSnackBar(
                              const SnackBar(content: Text('Flow sent successfully')),
                            );
                          }
                        },
                  child: vm.isBusy ? const SizedBox(width: 16, height: 16, child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white)) : const Text('Send Flow'),
                ),
              ],
            );
          },
        );
      },
    );
  }

  Future<void> _showEditDialog(BuildContext context, FlowsViewModel vm, Flow flow) async {
    final parent = context.findAncestorStateOfType<_FlowsBodyState>();
    if (parent != null) {
      await parent._showCreateEditDialog(context, vm, flow: flow);
    }
  }

  Future<void> _confirmDeleteFlow(BuildContext context, FlowsViewModel vm, Flow flow) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AppAlertDialog(
        title: const Text('Delete Flow'),
        content: Text('Are you sure you want to delete "${flow.name}"?'),
        actions: [
          AppButton(variant: AppButtonVariant.ghost, onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          AppButton(variant: AppButtonVariant.primary, onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete')),
        ],
      ),
    );
    if (confirmed == true) {
      await vm.deleteFlow(flow.id);
    }
  }
}

class _SubmissionsTab extends StatelessWidget {
  final FlowsViewModel vm;
  final bool canManage;
  const _SubmissionsTab({required this.vm, required this.canManage});

  @override
  Widget build(BuildContext context) {
    if (vm.isBusy && vm.submissions.isEmpty) {
      return const Center(child: AppProgressIndicator());
    }

    if (vm.submissions.isEmpty) {
      return const Center(child: Text('No submissions yet. Send a flow and wait for responses.'));
    }

    return ListView.builder(
      padding: const EdgeInsets.all(12),
      itemCount: vm.submissions.length,
      itemBuilder: (context, index) {
        final s = vm.submissions[index];
        return AppCard(
          child: AppListTile(
            title: Text(s.flowName ?? 'Unknown Flow'),
            subtitle: Text(s.contactName ?? 'Unknown'),
            trailing: Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                _SubmissionStatusBadge(status: s.status),
                const SizedBox(width: 8),
                AppIconButton(
                  icon: const PhosphorIcon(PhosphorIconsRegular.eye, size: 20),
                  onPressed: () => _showSubmissionDetail(context, vm, s),
                ),
                if (canManage)
                  AppIconButton(
                    icon: const PhosphorIcon(PhosphorIconsRegular.trash, size: 20, color: Colors.red),
                    onPressed: () => _confirmDeleteSubmission(context, vm, s),
                  ),
              ],
            ),
            onTap: () => _showSubmissionDetail(context, vm, s),
          ),
        );
      },
    );
  }

  Future<void> _showSubmissionDetail(BuildContext context, FlowsViewModel vm, FlowSubmission s) async {
    final entries = _formatFlowResponseEntries(s.responseJson ?? {});
    await showDialog(
      context: context,
      builder: (ctx) => AppAlertDialog(
        title: Text('Submission from ${s.contactName ?? 'Unknown'}'),
        content: SingleChildScrollView(
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Text('Flow: ${s.flowName ?? 'Unknown'}', style: const TextStyle(fontSize: 14)),
              const SizedBox(height: 4),
              Text('Status: ${s.status}', style: const TextStyle(fontSize: 14)),
              const SizedBox(height: 4),
              Text('Completed: ${_formatDate(s.completedAt ?? s.createdAt)}', style: const TextStyle(fontSize: 14)),
              const SizedBox(height: 16),
              Container(
                width: double.maxFinite,
                padding: const EdgeInsets.all(12),
                decoration: BoxDecoration(
                  color: Colors.grey.shade100,
                  borderRadius: BorderRadius.circular(8),
                ),
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    const Text('Response', style: TextStyle(fontSize: 12, fontWeight: FontWeight.bold, color: Colors.grey)),
                    const SizedBox(height: 8),
                    ...entries.map((e) => Padding(
                      padding: const EdgeInsets.only(bottom: 4),
                      child: Row(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text('${e.label}: ', style: const TextStyle(fontWeight: FontWeight.w500, fontSize: 13)),
                          Expanded(child: Text(e.value, style: const TextStyle(fontSize: 13))),
                        ],
                      ),
                    )),
                    if (entries.isEmpty)
                      const Text('No response data', style: TextStyle(color: Colors.grey)),
                  ],
                ),
              ),
            ],
          ),
        ),
        actions: [
          AppButton(variant: AppButtonVariant.ghost, 
            onPressed: () => vm.deleteSubmission(s.id),
            child: const Text('Delete', style: TextStyle(color: Colors.red)),
          ),
          AppButton(variant: AppButtonVariant.ghost, 
            onPressed: () => Navigator.pop(ctx),
            child: const Text('Close'),
          ),
        ],
      ),
    );
  }

  Future<void> _confirmDeleteSubmission(BuildContext context, FlowsViewModel vm, FlowSubmission s) async {
    final confirmed = await showDialog<bool>(
      context: context,
      builder: (ctx) => AppAlertDialog(
        title: const Text('Delete Submission'),
        content: const Text('Are you sure you want to delete this submission?'),
        actions: [
          AppButton(variant: AppButtonVariant.ghost, onPressed: () => Navigator.pop(ctx, false), child: const Text('Cancel')),
          AppButton(variant: AppButtonVariant.primary, onPressed: () => Navigator.pop(ctx, true), child: const Text('Delete')),
        ],
      ),
    );
    if (confirmed == true) {
      await vm.deleteSubmission(s.id);
    }
  }
}

class _StatusBadge extends StatelessWidget {
  final String status;
  const _StatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    switch (status) {
      case 'DRAFT':
        color = Colors.amber;
        break;
      case 'PUBLISHED':
        color = Colors.green;
        break;
      case 'DEPRECATED':
        color = Colors.grey;
        break;
      case 'THROTTLED':
        color = Colors.red;
        break;
      default:
        color = Colors.grey;
    }
    return Chip(
      label: Text(status, style: TextStyle(color: color.computeLuminance() > 0.5 ? Colors.black : Colors.white, fontSize: 12)),
      backgroundColor: color.withValues(alpha: 0.15),
      side: BorderSide(color: color.withValues(alpha: 0.5)),
      padding: EdgeInsets.zero,
      visualDensity: VisualDensity.compact,
    );
  }
}

class _SubmissionStatusBadge extends StatelessWidget {
  final String status;
  const _SubmissionStatusBadge({required this.status});

  @override
  Widget build(BuildContext context) {
    Color color;
    if (status == 'completed') {
      color = Colors.green;
    } else if (status == 'failed') {
      color = Colors.red;
    } else {
      color = Colors.amber;
    }
    return Chip(
      label: Text(status, style: TextStyle(color: color.computeLuminance() > 0.5 ? Colors.black : Colors.white, fontSize: 12)),
      backgroundColor: color.withValues(alpha: 0.15),
      side: BorderSide(color: color.withValues(alpha: 0.5)),
      padding: EdgeInsets.zero,
      visualDensity: VisualDensity.compact,
    );
  }
}

String _formatDate(String dateStr) {
  try {
    final d = DateTime.parse(dateStr);
    return '${d.year}-${_two(d.month)}-${_two(d.day)} ${_two(d.hour)}:${_two(d.minute)}';
  } catch (_) {
    return dateStr;
  }
}

String _two(int n) => n.toString().padLeft(2, '0');

List<_Entry> _formatFlowResponseEntries(Map<String, dynamic> data) {
  final entries = <_Entry>[];
  for (final entry in data.entries) {
    if (entry.key == 'flow_token') continue;
    String display;
    if (entry.value is List) {
      display = (entry.value as List).map((v) => v is String ? v.replaceAll('_', ' ') : v.toString()).join(', ');
    } else if (entry.value is String) {
      display = (entry.value as String).replaceAll('_', ' ');
    } else {
      display = entry.value.toString();
    }
    final label = entry.key
        .replaceAll('_', ' ')
        .split(' ')
        .map((w) => w.isEmpty ? '' : '${w[0].toUpperCase()}${w.substring(1)}')
        .join(' ');
    entries.add(_Entry(label, display));
  }
  return entries;
}

class _Entry {
  final String label;
  final String value;
  _Entry(this.label, this.value);
}
