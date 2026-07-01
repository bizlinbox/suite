import 'dart:math';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import 'package:url_launcher/url_launcher.dart';
import '../../../core/di.dart';
import '../../../data/models/file_item_model.dart';
import '../../../data/repositories/settings_repository.dart';
import '../../../viewmodels/auth_viewmodel.dart';
import '../../../viewmodels/base_viewmodel.dart';
import '../../../core/theme/app_theme.dart';
import '../../widgets/custom/custom_widgets.dart';
import '../../widgets/custom/app_shimmer.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

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

  // Selection mode
  bool _isSelectionMode = false;
  bool get isSelectionMode => _isSelectionMode;

  final Set<String> _selectedIds = {};
  Set<String> get selectedIds => _selectedIds;

  bool isSelected(String id) => _selectedIds.contains(id);

  void enterSelectionMode() {
    _isSelectionMode = true;
    notifyListeners();
  }

  void exitSelectionMode() {
    _isSelectionMode = false;
    _selectedIds.clear();
    notifyListeners();
  }

  void toggleSelection(String id) {
    if (_selectedIds.contains(id)) {
      _selectedIds.remove(id);
      if (_selectedIds.isEmpty) _isSelectionMode = false;
    } else {
      _selectedIds.add(id);
      _isSelectionMode = true;
    }
    notifyListeners();
  }

  Future<void> loadFiles({String? search, int offset = 0}) async {
    await runAsync(() async {
      final result = await _repo.getFiles(
        search: search,
        offset: offset,
        limit: _limit,
      );
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

  Future<void> deleteSelected() async {
    if (_selectedIds.isEmpty) return;
    setBusy();
    for (final id in _selectedIds.toList()) {
      await _repo.deleteFile(id);
    }
    _selectedIds.clear();
    _isSelectionMode = false;
    await loadFiles(search: _searchQuery, offset: _offset);
  }

  Future<void> downloadSelected() async {
    for (final f in _files.where((f) => _selectedIds.contains(f.id))) {
      final uri = Uri.parse(f.url);
      if (await canLaunchUrl(uri)) {
        await launchUrl(uri, mode: LaunchMode.externalApplication);
      }
    }
  }
}

class FilesSettingsScreen extends StatelessWidget {
  const FilesSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) =>
          FilesSettingsViewModel(locator<SettingsRepository>())..loadFiles(),
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
      appBar: AppAppBar(
        title: vm.isSelectionMode
            ? Text('${vm.selectedIds.length} selected')
            : const Text('Files'),
        leading: vm.isSelectionMode
            ? AppIconButton(
                icon: const PhosphorIcon(PhosphorIconsRegular.x),
                onPressed: () => vm.exitSelectionMode(),
              )
            : null,
        actions: [
          if (vm.isSelectionMode && canManage) ...[
            AppIconButton(
              icon: const PhosphorIcon(PhosphorIconsRegular.downloadSimple),
              onPressed: vm.isBusy ? null : () => vm.downloadSelected(),
            ),
            AppIconButton(
              icon: const PhosphorIcon(PhosphorIconsRegular.trash, color: Colors.red),
              onPressed: vm.isBusy ? null : () => _confirmBulkDelete(context, vm),
            ),
          ] else ...[
            AppIconButton(
              icon: const PhosphorIcon(PhosphorIconsRegular.arrowsClockwise),
              onPressed: vm.isBusy ? null : () => vm.loadFiles(),
            ),
          ],
        ],
      ),
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
                    prefix: const PhosphorIcon(
                      PhosphorIconsRegular.magnifyingGlass,
                      size: 20,
                    ),
                    contentPadding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 12,
                    ),
                    onSubmitted: (v) => vm.search(v),
                  ),
                ),
                const SizedBox(width: 8),
                AppButton(
                  variant: AppButtonVariant.primary,
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
                          Text(
                            _formatBytes(vm.totalSize),
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Text(
                            'Total Size',
                            style: TextStyle(color: Colors.grey),
                          ),
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
                          Text(
                            '${vm.totalCount}',
                            style: const TextStyle(
                              fontSize: 20,
                              fontWeight: FontWeight.bold,
                            ),
                          ),
                          const Text(
                            'Files',
                            style: TextStyle(color: Colors.grey),
                          ),
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
                : vm.files.isEmpty
                ? const AppEmptyState(
                    icon: PhosphorIconsRegular.folder,
                    title: 'No files',
                    subtitle: 'Upload files to use in messages',
                  )
                : RefreshIndicator(
                    onRefresh: () => vm.loadFiles(),
                    child: ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.symmetric(horizontal: 16),
                      itemCount: vm.files.length,
                      itemBuilder: (context, index) {
                        final f = vm.files[index];
                        final isSelected = vm.isSelected(f.id);
                        return AppCard(
                          child: ListTile(
                            leading: vm.isSelectionMode
                                ? Checkbox(
                                    value: isSelected,
                                    onChanged: (_) => vm.toggleSelection(f.id),
                                  )
                                : Icon(_mimeIcon(f.mimeType)),
                            title: Text(f.name),
                            subtitle: Text(
                              '${_formatBytes(f.size)} | ${f.mimeType}',
                            ),
                            trailing: vm.isSelectionMode
                                ? null
                                : Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      AppIconButton(
                                        icon: const PhosphorIcon(
                                          PhosphorIconsRegular.eye,
                                          color: AppColors.primary,
                                        ),
                                        onPressed: () => _showPreview(context, f),
                                      ),
                                      AppIconButton(
                                        icon: const PhosphorIcon(
                                          PhosphorIconsRegular.downloadSimple,
                                          color: AppColors.primary,
                                        ),
                                        onPressed: () async {
                                          final uri = Uri.parse(f.url);
                                          if (await canLaunchUrl(uri)) {
                                            await launchUrl(
                                              uri,
                                              mode: LaunchMode.externalApplication,
                                            );
                                          }
                                        },
                                      ),
                                      if (canManage)
                                        AppIconButton(
                                          icon: const PhosphorIcon(
                                            PhosphorIconsRegular.trash,
                                            color: Colors.red,
                                          ),
                                          onPressed: () => _confirmDelete(context, vm, f.id),
                                        ),
                                    ],
                                  ),
                            onTap: () {
                              if (vm.isSelectionMode) {
                                vm.toggleSelection(f.id);
                              } else {
                                _showPreview(context, f);
                              }
                            },
                            onLongPress: () {
                              if (!vm.isSelectionMode) {
                                vm.enterSelectionMode();
                                vm.toggleSelection(f.id);
                              }
                            },
                          ),
                        );
                      },
                    ),
                  ),
          ),
          Padding(
            padding: const EdgeInsets.all(16),
            child: Row(
              mainAxisAlignment: MainAxisAlignment.spaceBetween,
              children: [
                AppButton(
                  variant: AppButtonVariant.secondary,
                  onPressed: vm.hasPrevious ? () => vm.previousPage() : null,
                  child: const Text('Previous'),
                ),
                Text(
                  '${vm.offset + 1} - ${(vm.offset + vm.files.length).clamp(vm.offset, vm.totalCount)} of ${vm.totalCount}',
                ),
                AppButton(
                  variant: AppButtonVariant.secondary,
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

  void _showPreview(BuildContext context, FileItem f) {
    showDialog(
      context: context,
      builder: (_) => Dialog(
        insetPadding: const EdgeInsets.all(16),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600, maxHeight: 600),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Padding(
                padding: const EdgeInsets.all(16),
                child: Row(
                  children: [
                    Expanded(
                      child: Text(
                        f.name,
                        style: const TextStyle(fontWeight: FontWeight.bold, fontSize: 16),
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                      ),
                    ),
                    IconButton(
                      icon: const PhosphorIcon(PhosphorIconsRegular.x),
                      onPressed: () => Navigator.pop(context),
                    ),
                  ],
                ),
              ),
              const Divider(height: 1),
              Flexible(
                child: _PreviewContent(file: f),
              ),
              const Divider(height: 1),
              Padding(
                padding: const EdgeInsets.all(12),
                child: Row(
                  mainAxisAlignment: MainAxisAlignment.end,
                  children: [
                    AppButton(
                      variant: AppButtonVariant.ghost,
                      onPressed: () => Navigator.pop(context),
                      child: const Text('Close'),
                    ),
                    const SizedBox(width: 8),
                    AppButton(
                      variant: AppButtonVariant.primary,
                      onPressed: () async {
                        final uri = Uri.parse(f.url);
                        if (await canLaunchUrl(uri)) {
                          await launchUrl(uri, mode: LaunchMode.externalApplication);
                        }
                      },
                      child: const Text('Open / Download'),
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  void _confirmDelete(BuildContext context, FilesSettingsViewModel vm, String id) {
    showDialog(
      context: context,
      builder: (_) => AppAlertDialog(
        title: const Text('Delete File?'),
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
              vm.deleteFile(id);
            },
            child: const Text('Delete'),
          ),
        ],
      ),
    );
  }

  void _confirmBulkDelete(BuildContext context, FilesSettingsViewModel vm) {
    showDialog(
      context: context,
      builder: (_) => AppAlertDialog(
        title: const Text('Delete Selected Files?'),
        content: Text('This will delete ${vm.selectedIds.length} file(s). This action cannot be undone.'),
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
              vm.deleteSelected();
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

class _PreviewContent extends StatelessWidget {
  final FileItem file;
  const _PreviewContent({required this.file});

  @override
  Widget build(BuildContext context) {
    if (file.mimeType.startsWith('image/')) {
      return InteractiveViewer(
        child: Image.network(
          file.url,
          fit: BoxFit.contain,
          loadingBuilder: (context, child, progress) {
            if (progress == null) return child;
            return const Center(child: CircularProgressIndicator());
          },
          errorBuilder: (context, error, stackTrace) => const Center(child: Text('Failed to load image')),
        ),
      );
    }

    if (file.mimeType.startsWith('video/')) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              PhosphorIcon(PhosphorIconsRegular.videoCamera, size: 48, color: Colors.grey),
              SizedBox(height: 12),
              Text('Video preview is not available in the file manager.', textAlign: TextAlign.center),
              SizedBox(height: 4),
              Text('Use Open/Download to view the video.', style: TextStyle(color: Colors.grey, fontSize: 12)),
            ],
          ),
        ),
      );
    }

    if (file.mimeType.startsWith('audio/')) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              PhosphorIcon(PhosphorIconsRegular.speakerHigh, size: 48, color: Colors.grey),
              SizedBox(height: 12),
              Text('Audio preview is not available in the file manager.', textAlign: TextAlign.center),
              SizedBox(height: 4),
              Text('Use Open/Download to play the audio.', style: TextStyle(color: Colors.grey, fontSize: 12)),
            ],
          ),
        ),
      );
    }

    if (file.mimeType.contains('pdf')) {
      return const Center(
        child: Padding(
          padding: EdgeInsets.all(32),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            children: [
              PhosphorIcon(PhosphorIconsRegular.fileText, size: 48, color: Colors.grey),
              SizedBox(height: 12),
              Text('PDF preview is not available in the file manager.', textAlign: TextAlign.center),
              SizedBox(height: 4),
              Text('Use Open/Download to view the PDF.', style: TextStyle(color: Colors.grey, fontSize: 12)),
            ],
          ),
        ),
      );
    }

    return Center(
      child: Padding(
        padding: const EdgeInsets.all(32),
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            PhosphorIcon(_mimeIcon(file.mimeType), size: 48, color: Colors.grey),
            const SizedBox(height: 12),
            Text(file.name, textAlign: TextAlign.center, style: const TextStyle(fontWeight: FontWeight.w600)),
            const SizedBox(height: 4),
            Text(
              '${_formatBytes(file.size)} | ${file.mimeType}',
              style: const TextStyle(color: Colors.grey, fontSize: 12),
            ),
          ],
        ),
      ),
    );
  }

  static String _formatBytes(int bytes) {
    if (bytes == 0) return '0 B';
    const k = 1024;
    final sizes = ['B', 'KB', 'MB', 'GB'];
    final i = (log(bytes) / log(k)).floor().clamp(0, sizes.length - 1);
    return '${(bytes / pow(k, i)).toStringAsFixed(2)} ${sizes[i]}';
  }

  static IconData _mimeIcon(String mimeType) {
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
}
