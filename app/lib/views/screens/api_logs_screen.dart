import 'dart:async';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../core/services/socket_service.dart';
import '../../data/models/api_log_model.dart';
import '../../data/repositories/settings_repository.dart';
import '../../viewmodels/auth_viewmodel.dart';
import '../../viewmodels/base_viewmodel.dart';
import '../widgets/custom/custom_widgets.dart';
import '../widgets/custom/app_shimmer.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

class ApiLogsViewModel extends BaseViewModel {
  final SettingsRepository _repo;
  final SocketService _socketService;
  StreamSubscription? _apiLogSub;

  ApiLogsViewModel(this._repo, this._socketService);

  List<ApiLog> _logs = [];
  List<ApiLog> get logs => _logs;
  int _total = 0;
  int get total => _total;

  int _offset = 0;
  static const int _limit = 50;
  int get page => (_offset / _limit).floor() + 1;
  int get totalPages => (_total / _limit).ceil();

  String _direction = 'all';
  String get direction => _direction;

  String _provider = 'all';
  String get provider => _provider;

  void setDirection(String value) {
    if (_direction == value) return;
    _direction = value;
    _offset = 0;
    loadLogs();
    notifyListeners();
  }

  void setProvider(String value) {
    if (_provider == value) return;
    _provider = value;
    _offset = 0;
    loadLogs();
    notifyListeners();
  }

  Future<void> loadLogs() async {
    await runAsync(() async {
      final result = await _repo.getApiLogs(
        offset: _offset,
        limit: _limit,
        direction: _direction == 'all' ? null : _direction,
        provider: _provider == 'all' ? null : _provider,
      );
      result.when(
        success: (data) {
          _logs = data['logs'] as List<ApiLog>;
          _total = data['total'] as int;
        },
        error: (message, exception) => throw Exception(message),
      );
    });
  }

  void nextPage() {
    if (_offset + _limit < _total) {
      _offset += _limit;
      loadLogs();
    }
  }

  void previousPage() {
    if (_offset > 0) {
      _offset -= _limit;
      loadLogs();
    }
  }

  void startSocketListener() {
    _apiLogSub ??= _socketService.onNewApiLog.listen((data) {
      final log = ApiLog.fromJson(data);
      if (_matchesFilters(log)) {
        _logs.insert(0, log);
        if (_logs.length > _limit) _logs.removeLast();
        _total++;
        notifyListeners();
      }
    });
  }

  void stopSocketListener() {
    _apiLogSub?.cancel();
    _apiLogSub = null;
  }

  bool _matchesFilters(ApiLog log) {
    if (_direction != 'all' && log.direction != _direction) return false;
    if (_provider != 'all' && log.provider != _provider) return false;
    return true;
  }

  Future<void> clearLogs() async {
    final result = await _repo.clearApiLogs();
    result.when(success: (_) => loadLogs(), error: (message, exception) {});
  }
}

class ApiLogsScreen extends StatelessWidget {
  const ApiLogsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => ApiLogsViewModel(
        locator<SettingsRepository>(),
        locator<SocketService>(),
      )..loadLogs(),
      child: const _ApiLogsBody(),
    );
  }
}

class _ApiLogsBody extends StatefulWidget {
  const _ApiLogsBody();

  @override
  State<_ApiLogsBody> createState() => _ApiLogsBodyState();
}

class _ApiLogsBodyState extends State<_ApiLogsBody> {
  @override
  void initState() {
    super.initState();
    context.read<ApiLogsViewModel>().startSocketListener();
  }

  @override
  void dispose() {
    context.read<ApiLogsViewModel>().stopSocketListener();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<ApiLogsViewModel>();
    final authVm = context.watch<AuthViewModel>();

    if (!authVm.can('settings.read')) {
      return Scaffold(
        appBar: AppAppBar(title: const Text('API Logs')),
        body: _buildNoPermission(),
      );
    }

    final canClear = authVm.can('settings.manage');

    return Scaffold(
      appBar: AppAppBar(
        title: const Text('API Logs'),
        actions: [
          AppIconButton(
            icon: const PhosphorIcon(PhosphorIconsRegular.arrowsClockwise),
            onPressed: vm.isBusy ? null : () => vm.loadLogs(),
          ),
          if (canClear)
            AppIconButton(
              icon: const PhosphorIcon(PhosphorIconsRegular.trash),
              onPressed: vm.isBusy ? null : () => vm.clearLogs(),
            ),
        ],
      ),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.fromLTRB(12, 12, 12, 0),
            child: Row(
              children: [
                Expanded(
                  child: AppInput.dropdown(
                    value: vm.direction,
                    label: 'Direction',
                    options: const [
                      AppInputOption(value: 'all', label: 'All'),
                      AppInputOption(value: 'outgoing', label: 'Outgoing'),
                      AppInputOption(value: 'incoming', label: 'Incoming'),
                    ],
                    onSelected: (v) => vm.setDirection(v!),
                  ),
                ),
                const SizedBox(width: 12),
                Expanded(
                  child: AppInput.dropdown(
                    value: vm.provider,
                    label: 'Provider',
                    options: const [
                      AppInputOption(value: 'all', label: 'All'),
                      AppInputOption(value: 'WhatsApp', label: 'WhatsApp'),
                      AppInputOption(value: 'Meta', label: 'Meta'),
                    ],
                    onSelected: (v) => vm.setProvider(v!),
                  ),
                ),
                const SizedBox(width: 12),
                Text(
                  'Total: ${vm.total}',
                  style: const TextStyle(fontWeight: FontWeight.w600),
                ),
              ],
            ),
          ),
          const SizedBox(height: 8),
          Expanded(
            child: vm.isBusy && vm.logs.isEmpty
                ? AppShimmer(
                    child: ListView.builder(
                      padding: const EdgeInsets.all(12),
                      itemCount: 6,
                      itemBuilder: (context, index) => const Padding(
                        padding: EdgeInsets.only(bottom: 8),
                        child: GenericCardSkeleton(lines: 2),
                      ),
                    ),
                  )
                : vm.logs.isEmpty
                ? const Center(child: Text('No API logs found'))
                : RefreshIndicator(
                    onRefresh: () => vm.loadLogs(),
                    child: ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.all(12),
                      itemCount: vm.logs.length,
                      itemBuilder: (context, index) {
                        final log = vm.logs[index];
                        return AppCard(
                          child: AppListTile(
                            leading: _DirectionBadge(direction: log.direction),
                            title: Text(
                              log.endpoint,
                              maxLines: 1,
                              overflow: TextOverflow.ellipsis,
                            ),
                            subtitle: Text(
                              '${log.provider} • ${log.method ?? ''}',
                            ),
                            trailing: Column(
                              mainAxisAlignment: MainAxisAlignment.center,
                              crossAxisAlignment: CrossAxisAlignment.end,
                              children: [
                                Text(
                                  '${log.statusCode}',
                                  style: TextStyle(
                                    color:
                                        log.statusCode >= 200 &&
                                            log.statusCode < 300
                                        ? Colors.green
                                        : Colors.red,
                                    fontWeight: FontWeight.bold,
                                  ),
                                ),
                                Text(
                                  '${log.durationMs}ms',
                                  style: const TextStyle(
                                    fontSize: 11,
                                    color: Colors.grey,
                                  ),
                                ),
                              ],
                            ),
                            onTap: () => _showLogDetail(context, log),
                          ),
                        );
                      },
                    ),
                  ),
          ),
          Padding(
            padding: const EdgeInsets.all(12),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.center,
              children: [
                ElevatedButton.icon(
                  onPressed: vm.page > 1 ? vm.previousPage : null,
                  icon: const PhosphorIcon(PhosphorIconsRegular.caretLeft),
                  label: const Text('Previous'),
                ),
                const SizedBox(width: 16),
                Text('Page ${vm.page} of ${vm.totalPages}'),
                const SizedBox(width: 16),
                ElevatedButton.icon(
                  onPressed: vm.page < vm.totalPages ? vm.nextPage : null,
                  icon: const PhosphorIcon(PhosphorIconsRegular.caretRight),
                  label: const Text('Next'),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }

  void _showLogDetail(BuildContext context, ApiLog log) {
    showModalBottomSheet(
      context: context,
      isScrollControlled: true,
      shape: const RoundedRectangleBorder(
        borderRadius: BorderRadius.vertical(top: Radius.circular(16)),
      ),
      builder: (_) => Padding(
        padding: EdgeInsets.only(
          bottom: MediaQuery.of(context).viewInsets.bottom,
        ),
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(20),
          child: Column(
            crossAxisAlignment: CrossAxisAlignment.start,
            mainAxisSize: MainAxisSize.min,
            children: [
              Center(
                child: Container(
                  width: 40,
                  height: 4,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade300,
                    borderRadius: BorderRadius.circular(2),
                  ),
                ),
              ),
              const SizedBox(height: 16),
              Row(
                children: [
                  _DirectionBadge(direction: log.direction),
                  const SizedBox(width: 8),
                  Chip(label: Text(log.provider)),
                ],
              ),
              const SizedBox(height: 12),
              _DetailRow(label: 'Method', value: log.method ?? '-'),
              _DetailRow(label: 'Endpoint', value: log.endpoint),
              _DetailRow(
                label: 'Status Code',
                value: '${log.statusCode}',
                valueColor: log.statusCode >= 200 && log.statusCode < 300
                    ? Colors.green
                    : Colors.red,
              ),
              _DetailRow(label: 'Duration', value: '${log.durationMs}ms'),
              _DetailRow(label: 'Created At', value: log.createdAt),
              if (log.errorMessage != null && log.errorMessage!.isNotEmpty)
                _DetailRow(
                  label: 'Error',
                  value: log.errorMessage!,
                  valueColor: Colors.red,
                ),
              const SizedBox(height: 16),
              if (log.requestBody != null && log.requestBody!.isNotEmpty) ...[
                _JsonBlock(title: 'Request Body', json: log.requestBody),
                const SizedBox(height: 16),
              ],
              if (log.responseBody != null && log.responseBody!.isNotEmpty) ...[
                _JsonBlock(title: 'Response Body', json: log.responseBody),
                const SizedBox(height: 16),
              ],
            ],
          ),
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

class _DirectionBadge extends StatelessWidget {
  final String direction;
  const _DirectionBadge({required this.direction});

  @override
  Widget build(BuildContext context) {
    final isOutgoing = direction == 'outgoing';
    return Chip(
      avatar: Icon(
        isOutgoing
            ? PhosphorIconsRegular.arrowUp
            : PhosphorIconsRegular.arrowDown,
        size: 16,
      ),
      label: Text(direction, style: const TextStyle(fontSize: 12)),
      backgroundColor: isOutgoing ? Colors.blue.shade50 : Colors.orange.shade50,
      side: BorderSide.none,
    );
  }
}

class _DetailRow extends StatelessWidget {
  final String label;
  final String value;
  final Color? valueColor;
  const _DetailRow({required this.label, required this.value, this.valueColor});

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.symmetric(vertical: 4),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text('$label: ', style: const TextStyle(fontWeight: FontWeight.w600)),
          Expanded(
            child: Text(value, style: TextStyle(color: valueColor)),
          ),
        ],
      ),
    );
  }
}

class _JsonBlock extends StatelessWidget {
  final String title;
  final String? json;
  const _JsonBlock({required this.title, required this.json});

  @override
  Widget build(BuildContext context) {
    final data = json;
    if (data == null || data.isEmpty) return const SizedBox.shrink();
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 14),
        ),
        const SizedBox(height: 6),
        Container(
          width: double.infinity,
          height: 200,
          padding: const EdgeInsets.all(12),
          decoration: BoxDecoration(
            color: Colors.grey.shade50,
            borderRadius: BorderRadius.circular(8),
            border: Border.all(color: Colors.grey.shade300),
          ),
          child: SingleChildScrollView(
            child: SelectableText(
              data,
              style: const TextStyle(fontFamily: 'monospace', fontSize: 12),
            ),
          ),
        ),
      ],
    );
  }
}
