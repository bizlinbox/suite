import 'dart:convert';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../core/di.dart';
import '../../core/responsive.dart';
import '../../data/models/analytics_model.dart';
import '../../data/repositories/analytics_repository.dart';
import '../../viewmodels/base_viewmodel.dart';
import '../widgets/charts.dart';
import '../widgets/custom/custom_widgets.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

class AnalyticsViewModel extends BaseViewModel {
  final AnalyticsRepository _repo;
  AnalyticsViewModel(this._repo);

  AnalyticsData? _data;
  AnalyticsData? get data => _data;

  Future<void> loadAnalytics() async {
    await runAsync(() async {
      final result = await _repo.getAnalytics();
      result.when(
        success: (d) => _data = d,
        error: (message, exception) => throw Exception(message),
      );
    });
  }
}

class AnalyticsScreen extends StatelessWidget {
  const AnalyticsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => AnalyticsViewModel(locator<AnalyticsRepository>())..loadAnalytics(),
      child: const _AnalyticsBody(),
    );
  }
}

class _AnalyticsBody extends StatelessWidget {
  const _AnalyticsBody();

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<AnalyticsViewModel>();
    final data = vm.data;

    return Scaffold(
      appBar: AppAppBar(
        title: const Text('Analytics'),
        actions: [
          AppIconButton(
            icon: const PhosphorIcon(PhosphorIconsRegular.arrowsClockwise),
            onPressed: vm.isBusy ? null : () => vm.loadAnalytics(),
          ),
          if (data != null)
            AppIconButton(
              icon: const PhosphorIcon(PhosphorIconsRegular.downloadSimple),
              tooltip: 'Export to CSV',
              onPressed: () => _exportCsv(context, data),
            ),
        ],
      ),
      body: vm.isBusy
          ? const Center(child: AppProgressIndicator())
          : data == null
              ? const Center(child: Text('No data available'))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: CenteredMaxWidth(
                    maxWidth: 960,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        ResponsiveGrid(
                          mobileColumns: 1,
                          tabletColumns: 2,
                          desktopColumns: 3,
                          children: [
                            _StatCard(title: 'Total Conversations', value: '${data.totalConversations}'),
                            _StatCard(title: 'Total Messages', value: '${data.totalMessages}'),
                            _StatCard(title: 'Avg Response Time', value: '${(data.avgResponseTimeSeconds / 60).toStringAsFixed(1)} min'),
                          ],
                        ),
                        const SizedBox(height: 24),
                        if (data.messagesPerDay.isNotEmpty)
                          LineChart(
                            title: 'Messages Per Day',
                            values: data.messagesPerDay.map((e) => e.count).toList(),
                            labels: data.messagesPerDay.map((e) => _shortDate(e.day)).toList(),
                          ),
                        const SizedBox(height: 16),
                        if (data.conversationsPerDay.isNotEmpty)
                          LineChart(
                            title: 'Conversations Per Day',
                            values: data.conversationsPerDay.map((e) => e.count).toList(),
                            labels: data.conversationsPerDay.map((e) => _shortDate(e.day)).toList(),
                          ),
                        const SizedBox(height: 16),
                        if (data.topAgents.isNotEmpty)
                          BarChart(
                            title: 'Top Agents',
                            values: data.topAgents.map((e) => e.conversationsHandled).toList(),
                            labels: data.topAgents.map((e) => e.name).toList(),
                          ),
                        const SizedBox(height: 16),
                        if (data.messagesByType.isNotEmpty)
                          DonutChart(
                            title: 'Messages by Type',
                            values: data.messagesByType.map((e) => e.count).toList(),
                            labels: data.messagesByType.map((e) => e.messageType).toList(),
                          ),
                        const SizedBox(height: 24),
                        Align(
                          alignment: Alignment.centerRight,
                          child: FilledButton.icon(
                            onPressed: () => _exportCsv(context, data),
                            icon: const PhosphorIcon(PhosphorIconsRegular.downloadSimple),
                            label: const Text('Export to CSV'),
                          ),
                        ),
                        const SizedBox(height: 24),
                      ],
                    ),
                  ),
                ),
    );
  }

  String _shortDate(String day) {
    try {
      final parts = day.split('-');
      if (parts.length == 3) {
        return '${parts[1]}/${parts[2]}';
      }
    } catch (_) {}
    return day;
  }

  void _exportCsv(BuildContext context, AnalyticsData data) {
    final buffer = StringBuffer();
    buffer.writeln('Metric,Value');
    buffer.writeln('Total Conversations,${data.totalConversations}');
    buffer.writeln('Total Messages,${data.totalMessages}');
    buffer.writeln('Avg Response Time (min),${(data.avgResponseTimeSeconds / 60).toStringAsFixed(2)}');
    buffer.writeln();
    buffer.writeln('Date,Messages,Conversations');
    final days = data.messagesPerDay.map((e) => e.day).toSet().toList()..sort();
    for (final day in days) {
      final msgCount = data.messagesPerDay.firstWhere((e) => e.day == day, orElse: () => DayCount(day: day, count: 0)).count;
      final convCount = data.conversationsPerDay.firstWhere((e) => e.day == day, orElse: () => DayCount(day: day, count: 0)).count;
      buffer.writeln('$day,$msgCount,$convCount');
    }
    buffer.writeln();
    buffer.writeln('Agent,Conversations Handled');
    for (final a in data.topAgents) {
      buffer.writeln('${a.name},${a.conversationsHandled}');
    }
    buffer.writeln();
    buffer.writeln('Message Type,Count');
    for (final m in data.messagesByType) {
      buffer.writeln('${m.messageType},${m.count}');
    }

    final csvContent = buffer.toString();
    final bytes = utf8.encode(csvContent);
    final base64Csv = base64Encode(bytes);
    final dataUri = Uri.parse('data:text/csv;base64,$base64Csv');

    launchUrl(dataUri, mode: LaunchMode.externalApplication).then((success) {
      if (!context.mounted) return;
      if (!success) {
        // Fallback: show dialog with CSV text that user can copy
        showDialog(
          context: context,
          builder: (context) => AppAlertDialog(
            title: const Text('Export CSV'),
            content: SizedBox(
              width: double.maxFinite,
              child: SingleChildScrollView(
                child: SelectableText(csvContent),
              ),
            ),
            actions: [
              AppButton(variant: AppButtonVariant.ghost, 
                onPressed: () => Navigator.pop(context),
                child: const Text('Close'),
              ),
            ],
          ),
        );
      } else {
        ScaffoldMessenger.of(context).showSnackBar(
          const SnackBar(content: Text('CSV download started')),
        );
      }
    });
  }
}

class _StatCard extends StatelessWidget {
  final String title;
  final String value;
  const _StatCard({required this.title, required this.value});

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: TextStyle(fontSize: 13, color: Colors.grey[700])),
            const SizedBox(height: 8),
            Text(value, style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold)),
          ],
        ),
      ),
    );
  }
}