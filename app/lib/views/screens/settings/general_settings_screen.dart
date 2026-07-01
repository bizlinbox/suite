import 'package:dio/dio.dart';
import 'package:file_picker/file_picker.dart';
import 'package:flutter/material.dart';
import 'package:provider/provider.dart';
import '../../../core/di.dart';
import '../../../core/services/api_service.dart';
import '../../../core/utils/api_error.dart';
import '../../../data/models/organization_model.dart';
import '../../../data/repositories/settings_repository.dart';
import '../../../viewmodels/auth_viewmodel.dart';
import '../../../viewmodels/base_viewmodel.dart';
import '../../../core/responsive.dart';
import '../../widgets/custom/custom_widgets.dart';
import 'package:phosphor_flutter/phosphor_flutter.dart';

class GeneralSettingsViewModel extends BaseViewModel {
  final SettingsRepository _repo;
  final ApiService _api;
  GeneralSettingsViewModel(this._repo, this._api);

  Organization? _org;
  Organization? get org => _org;

  Future<void> loadOrganization() async {
    await runAsync(() async {
      final result = await _repo.getOrganizations();
      result.when(
        success: (data) => _org = data.isNotEmpty ? data.first : null,
        error: (message, exception) => throw Exception(message),
      );
    });
  }

  Future<String?> uploadLogo() async {
    try {
      final result = await FilePicker.platform.pickFiles(
        type: FileType.image,
        allowMultiple: false,
        withData: true,
      );
      if (result == null || result.files.isEmpty) return null;
      final file = result.files.first;
      final formData = FormData();
      if (file.bytes != null) {
        formData.files.add(MapEntry(
          'file',
          MultipartFile.fromBytes(file.bytes!, filename: file.name),
        ));
      } else if (file.path != null) {
        formData.files.add(MapEntry(
          'file',
          await MultipartFile.fromFile(file.path!, filename: file.name),
        ));
      } else {
        return null;
      }
      final res = await _api.client.post('/upload', data: formData);
      final url = res.data['url'] as String?;
      return url;
    } catch (e) {
      setError(extractApiError(e, fallback: 'Upload failed. Please try again.'));
      return null;
    }
  }

  Future<void> saveOrganization(String id, Map<String, dynamic> payload) async {
    setBusy();
    final result = await _repo.updateOrganization(id, payload);
    result.when(
      success: (updated) {
        _org = updated;
        setSuccess();
      },
      error: (message, exception) => setError(message),
    );
  }
}

class GeneralSettingsScreen extends StatelessWidget {
  const GeneralSettingsScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => GeneralSettingsViewModel(locator<SettingsRepository>(), locator<ApiService>())..loadOrganization(),
      child: const _GeneralSettingsBody(),
    );
  }
}

class _GeneralSettingsBody extends StatefulWidget {
  const _GeneralSettingsBody();

  @override
  State<_GeneralSettingsBody> createState() => _GeneralSettingsBodyState();
}

class _GeneralSettingsBodyState extends State<_GeneralSettingsBody> {
  final _nameController = TextEditingController();
  final _platformNameController = TextEditingController();
  String _timezone = 'UTC';
  bool _enablePublicRegistration = true;
  String? _logoUrl;
  bool _uploadingLogo = false;

  static const List<String> _timezones = [
    'UTC',
    'Africa/Cairo',
    'Africa/Johannesburg',
    'Africa/Lagos',
    'Africa/Nairobi',
    'America/Anchorage',
    'America/Argentina/Buenos_Aires',
    'America/Bogota',
    'America/Chicago',
    'America/Denver',
    'America/Lima',
    'America/Los_Angeles',
    'America/Mexico_City',
    'America/New_York',
    'America/Phoenix',
    'America/Sao_Paulo',
    'America/Toronto',
    'America/Vancouver',
    'Asia/Bangkok',
    'Asia/Dubai',
    'Asia/Hong_Kong',
    'Asia/Jakarta',
    'Asia/Kolkata',
    'Asia/Manila',
    'Asia/Seoul',
    'Asia/Shanghai',
    'Asia/Singapore',
    'Asia/Taipei',
    'Asia/Tokyo',
    'Australia/Brisbane',
    'Australia/Melbourne',
    'Australia/Perth',
    'Australia/Sydney',
    'Europe/Amsterdam',
    'Europe/Athens',
    'Europe/Berlin',
    'Europe/Brussels',
    'Europe/Budapest',
    'Europe/Copenhagen',
    'Europe/Dublin',
    'Europe/Helsinki',
    'Europe/Istanbul',
    'Europe/Lisbon',
    'Europe/London',
    'Europe/Madrid',
    'Europe/Moscow',
    'Europe/Oslo',
    'Europe/Paris',
    'Europe/Prague',
    'Europe/Rome',
    'Europe/Stockholm',
    'Europe/Vienna',
    'Europe/Warsaw',
    'Europe/Zurich',
    'Pacific/Auckland',
    'Pacific/Honolulu',
    'Pacific/Sydney',
  ];

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<GeneralSettingsViewModel>();
    final authVm = context.watch<AuthViewModel>();
    final org = vm.org;

    if (!authVm.can('settings.read')) {
      return Scaffold(
        appBar: AppAppBar(title: const Text('General Settings')),
        body: _buildNoPermission(),
      );
    }

    final canManage = authVm.can('settings.manage');

    if (org != null && _nameController.text.isEmpty) {
      _nameController.text = org.name;
      _platformNameController.text = org.platformName;
      _timezone = org.timezone;
      _enablePublicRegistration = org.enablePublicRegistration;
      _logoUrl = org.platformLogo;
    }

    return Scaffold(
      appBar: AppAppBar(title: const Text('General Settings')),
      body: vm.isBusy && org == null
          ? const Center(child: AppProgressIndicator())
          : org == null
              ? const Center(child: Text('No organization found'))
              : SingleChildScrollView(
                  padding: const EdgeInsets.all(16),
                  child: CenteredMaxWidth(
                    maxWidth: 640,
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                      Container(
                        width: double.infinity,
                        decoration: BoxDecoration(
                          borderRadius: BorderRadius.circular(12),
                          gradient: const LinearGradient(
                            colors: [Color(0xFF2563EB), Color(0xFF3B82F6)],
                            begin: Alignment.topLeft,
                            end: Alignment.bottomRight,
                          ),
                        ),
                        padding: const EdgeInsets.all(20),
                        child: Column(
                          crossAxisAlignment: CrossAxisAlignment.start,
                          children: [
                            Text(
                              org.name,
                              style: const TextStyle(
                                color: Colors.white,
                                fontSize: 22,
                                fontWeight: FontWeight.bold,
                              ),
                            ),
                            const SizedBox(height: 4),
                            Text(
                              org.platformName,
                              style: const TextStyle(color: Colors.white70),
                            ),
                          ],
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Text('Logo', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 12),
                      Center(
                        child: GestureDetector(
                          onTap: canManage ? () => _pickLogo(vm) : null,
                          child: Container(
                            width: 120,
                            height: 120,
                            decoration: BoxDecoration(
                              color: Colors.grey.shade200,
                              borderRadius: BorderRadius.circular(12),
                              border: Border.all(color: Colors.grey.shade400),
                              image: _logoUrl != null
                                  ? DecorationImage(
                                      image: NetworkImage(_logoUrl!),
                                      fit: BoxFit.cover,
                                    )
                                  : null,
                            ),
                            child: _uploadingLogo
                                ? const Center(child: AppProgressIndicator())
                                : _logoUrl == null
                                    ? const Center(child: PhosphorIcon(PhosphorIconsRegular.image, size: 40, color: Colors.grey))
                                    : null,
                          ),
                        ),
                      ),
                      const SizedBox(height: 24),
                      const Text('Organization Details', style: TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
                      const SizedBox(height: 16),
                      AppTextField(
                        controller: _nameController,
                        enabled: canManage,
                        decoration: const InputDecoration(labelText: 'Organization Name', border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 16),
                      AppTextField(
                        controller: _platformNameController,
                        enabled: canManage,
                        decoration: const InputDecoration(labelText: 'Platform Name', border: OutlineInputBorder()),
                      ),
                      const SizedBox(height: 16),
                      AppDropdown<String>(
                        initialValue: _timezone,
                        decoration: const InputDecoration(labelText: 'Timezone', border: OutlineInputBorder()),
                        items: _timezones.map((tz) {
                          return DropdownMenuItem(value: tz, child: Text(tz));
                        }).toList(),
                        onChanged: canManage ? (v) => setState(() => _timezone = v ?? 'UTC') : null,
                      ),
                      const SizedBox(height: 16),
                      AppSwitch(
                        title: const Text('Public Registration'),
                        subtitle: const Text('Allow anyone to create an account'),
                        value: _enablePublicRegistration,
                        onChanged: canManage ? (v) => setState(() => _enablePublicRegistration = v) : null,
                      ),
                      const SizedBox(height: 24),
                      if (canManage)
                        Align(
                          alignment: Alignment.centerRight,
                          child: AppButton(variant: AppButtonVariant.primary, 
                            onPressed: vm.isBusy
                                ? null
                                : () => vm.saveOrganization(org.id, {
                                      'name': _nameController.text.trim(),
                                      'platform_name': _platformNameController.text.trim(),
                                      'timezone': _timezone,
                                      'enable_public_registration': _enablePublicRegistration,
                                      if (_logoUrl != null) 'platform_logo': _logoUrl,
                                    }),
                            child: vm.isBusy
                                ? const SizedBox(
                                    height: 20,
                                    width: 20,
                                    child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                                  )
                                : const Text('Save Changes'),
                          ),
                        ),
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
          PhosphorIcon(PhosphorIconsRegular.lockKey, size: 48, color: Colors.grey),
          SizedBox(height: 16),
          Text('You do not have permission to view this page.', textAlign: TextAlign.center),
        ],
      ),
    );
  }

  Future<void> _pickLogo(GeneralSettingsViewModel vm) async {
    setState(() => _uploadingLogo = true);
    final url = await vm.uploadLogo();
    setState(() {
      _uploadingLogo = false;
      if (url != null) _logoUrl = url;
    });
  }
}