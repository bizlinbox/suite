import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/di.dart';
import '../../../data/models/file_item_model.dart';
import '../../../data/repositories/settings_repository.dart';
import '../../../viewmodels/auth_viewmodel.dart';
import '../../../viewmodels/base_viewmodel.dart';
import '../../widgets/custom/custom_widgets.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

class FilesSettingsViewModel extends BaseViewModel {
  final SettingsRepository _repo;
  FilesSettingsViewModel(this._repo);

  List<FileItem> _files = [];
  List<FileItem> get files => _files;
  int _totalCount = 0;
  int get totalCount => _totalCount;
  int _totalSize = 0;
  int get totalSize => _totalSize;

  int _offset = 0;
  int get offset => _offset;
  static const int _limit = 20;

  String _searchQuery = '';
  String get searchQuery => _searchQuery;

  bool get hasNext => _offset + _limit < _totalCount;
  bool get hasPrevious => _offset > 0;

  Future<void> loadFiles({String? search, int offset = 0}) async {
    await runAsync(() async {
      final result = await _repo.getFiles(search: search, offset: offset, limit: _limit);
      result.when(
        success: (data) {
          _files = data['files'] as List<FileItem>;
          _totalCount = data['totalCount'] as int;
          _totalSize = data['totalSize'] as int;
          _offset = offset;
          _searchQuery = search ?? '';
        },
        error: (message, exception) => throw Exception(message),
      );
    });
  }

  Future<void> search(String query) async {
    await loadFiles(search: query.trim(), offset: 0);
  }

  Future<void> nextPage() async {
    if (hasNext) {
      await loadFiles(search: _searchQuery, offset: _offset + _limit);
    }
  }

  Future<void> previousPage() async {
    if (hasPrevious) {
      await loadFiles(search: _searchQuery, offset: max(0, _offset - _limit));
    }
  }

  Future<void> deleteFile(String id) async {
    final result = await _repo.deleteFile(id);
    result.when(
      success: (_) => loadFiles(search: _searchQuery, offset: _offset),
      error: (message, exception) {},
    );
  }
}

class FilesSettingsScreen extends StatelessWidget {
  const FilesSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => FilesSettingsViewModel(locator<SettingsRepository>())..loadFiles(),
      child: const _FilesSettingsBody(),
    );
  }
}

class _FilesSettingsBody extends StatefulWidget {
  const _FilesSettingsBody();

  @override
  State<_FilesSettingsBody> createState() => _FilesSettingsBodyState();
}

class _FilesSettingsBodyState extends State<_FilesSettingsBody> {
  final _searchController = TextEditingController();

  static String _formatBytes(int bytes) {
    if (bytes == 0) return '0 B';
    const k = 1024;
    final sizes = ['B', 'KB', 'MB', 'GB'];
    final i = (log(bytes) / log(k)).floor().clamp(0, sizes.length - 1);
    return '${(bytes / pow(k, i)).toStringAsFixed(2)} ${sizes[i]}';
  }

  IconData _mimeIcon(String mimeType) {
    if (mimeType.startsWith('image/')) return PhosphorIconsRegular.image;
    if (mimeType.startsWith('video/')) return PhosphorIconsRegular.videoCamera;
    if (mimeType.startsWith('audio/')) return PhosphorIconsRegular.speakerHigh;
    if (mimeType.contains('pdf') ||
        mimeType.contains('document') ||
        mimeType.contains('word') ||
        mimeType.contains('excel') ||
        mimeType.contains('presentation')) {
      return PhosphorIconsRegular.fileText;
    }
    return PhosphorIconsRegular.file;
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<FilesSettingsViewModel>();
    final authVm = context.watch<AuthViewModel>();

    if (!authVm.can('settings.read')) {
      return Scaffold(
        appBar: AppAppBar(title: const Text('Files')),
        body: _buildNoPermission(),
      );
    }

    final canManage = authVm.can('settings.manage');

    return Scaffold(
      appBar: AppAppBar(title: const Text('Files')),
      body: Column(
        children: [
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              children: [
                Expanded(
                  child: AppInput.search(
                    controller: _searchController,
                    hint: 'Search files...',
                    prefix: const PhosphorIcon(PhosphorIconsRegular.magnifyingGlass, size: 20),
                    contentPadding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
                    onSubmitted: (v) => vm.search(v),
                  ),
                ),
                const SizedBox(width: 8),
                AppButton(variant: AppButtonVariant.primary, 
                  onPressed: () => vm.search(_searchController.text),
                  child: const Text('Search'),
                ),
              ],
            ),
          ),
          Padding(
            padding: const EdgeInsets.symmetric(horizontal: 16),
            child: Row(
              children: [
                Expanded(
                  child: AppCard(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        children: [
                          Text(_formatBytes(vm.totalSize), style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                          const Text('Total Size', style: TextStyle(color: Colors.grey)),
                        ],
                      ),
                    ),
                  ),
                ),
                Expanded(
                  child: AppCard(
                    child: Padding(
                      padding: const EdgeInsets.all(12),
                      child: Column(
                        children: [
                          Text('${vm.totalCount}', style: const TextStyle(fontSize: 20, fontWeight: FontWeight.bold)),
                          const Text('Files', style: TextStyle(color: Colors.grey)),
                        ],
                      ),
                    ),
                  ),
                ),
              ],
            ),
          ),
          Expanded(
            child: vm.isBusy && vm.files.isEmpty
                ? const Center(child: AppProgressIndicator())
                : vm.files.isEmpty
                    ? const Center(child: Text('No files found'))
                    : ListView.builder(
                        padding: const EdgeInsets.symmetric(horizontal: 16),
                        itemCount: vm.files.length,
                        itemBuilder: (context, index) {
                          final f = vm.files[index];
                          return AppCard(
                            child: AppListTile(
                              leading: Icon(_mimeIcon(f.mimeType)),
                              title: Text(f.name),
                              subtitle: Text('${_formatBytes(f.size)} | ${f.mimeType}'),
                              trailing: Row(
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  AppIconButton(
                                    icon: const PhosphorIcon(PhosphorIconsRegular.downloadSimple, color: Color(0xFF2563EB)),
                                    onPressed: () async {
                                      final uri = Uri.parse(f.url);
                                      if (await canLaunchUrl(uri)) {
                                        await launchUrl(uri, mode: LaunchMode.externalApplication);
                                      }
                                    },
                                  ),
                                  if (canManage)
                                    AppIconButton(
                                      icon: const PhosphorIcon(PhosphorIconsRegular.trash, color: Colors.red),
                                      onPressed: () => vm.deleteFile(f.id),
                                    ),
                                ],
                              ),
                            ),
                          );
                        },
                      ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                AppButton(variant: AppButtonVariant.secondary, 
                  onPressed: vm.hasPrevious ? () => vm.previousPage() : null,
                  child: const Text('Previous'),
                ),
                Text('${vm.offset + 1} - ${(vm.offset + vm.files.length).clamp(vm.offset, vm.totalCount)} of ${vm.totalCount}'),
                AppButton(variant: AppButtonVariant.secondary, 
                  onPressed: vm.hasNext ? () => vm.nextPage() : null,
                  child: const Text('Next'),
                ),
              ],
            ),
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
          PhosphorIcon(PhosphorIconsRegular.lockKey, size: 48, color: Colors.grey),
          SizedBox(height: 16),
          Text('You do not have permission to view this page.', textAlign: TextAlign.center),
        ],
      ),
    );
  }
}