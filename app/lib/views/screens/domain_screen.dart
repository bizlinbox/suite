import 'package:flutter/material.dart';
import 'package:go_router/go_router.dart';
import 'package:provider/provider.dart';
import '../../core/di.dart';
import '../../core/services/api_service.dart';
import '../../core/services/local_storage_service.dart';
import '../../viewmodels/domain_viewmodel.dart';
import '../widgets/custom/custom_widgets.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

class DomainScreen extends StatelessWidget {
  const DomainScreen({super.key});

  @override
  Widget build(BuildContext context) {
    return ChangeNotifierProvider(
      create: (_) => DomainViewModel(locator<LocalStorageService>()),
      child: const _DomainBody(),
    );
  }
}

class _DomainBody extends StatefulWidget {
  const _DomainBody();

  @override
  State<_DomainBody> createState() => _DomainBodyState();
}

class _DomainBodyState extends State<_DomainBody> {
  final _controller = TextEditingController();

  @override
  void initState() {
    super.initState();
    final vm = context.read<DomainViewModel>();
    if (vm.savedDomain != null) {
      _controller.text = vm.savedDomain!;
    }
  }

  @override
  Widget build(BuildContext context) {
    final vm = context.watch<DomainViewModel>();

    return Scaffold(
      body: Center(
        child: SingleChildScrollView(
          padding: const EdgeInsets.all(24),
          child: ConstrainedBox(
            constraints: const BoxConstraints(maxWidth: 400),
            child: AppCard(
              elevation: 2,
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Column(
                  mainAxisSize: MainAxisSize.min,
                  children: [
                    const PhosphorIcon(PhosphorIconsRegular.chatTeardropText, size: 48, color: Color(0xFF2563EB)),
                    const SizedBox(height: 16),
                    const Text(
                      'BizlInbox',
                      style: TextStyle(fontSize: 24, fontWeight: FontWeight.bold),
                    ),
                    const SizedBox(height: 8),
                    const Text(
                      'Enter your server domain to get started',
                      textAlign: TextAlign.center,
                      style: TextStyle(color: Colors.grey),
                    ),
                    const SizedBox(height: 24),
                    AppInput(
                      controller: _controller,
                      label: 'Domain URL',
                      hint: 'https://your-domain.com',
                      prefix: const PhosphorIcon(PhosphorIconsRegular.globe, size: 20),
                      textInputAction: TextInputAction.done,
                      onSubmitted: (_) => _save(context, vm),
                    ),
                    const SizedBox(height: 16),
                    if (vm.isError)
                      Text(
                        vm.errorMessage,
                        style: const TextStyle(color: Colors.red),
                      ),
                    const SizedBox(height: 8),
                    SizedBox(
                      width: double.infinity,
                      child: AppButton(variant: AppButtonVariant.primary, 
                        onPressed: vm.isBusy ? null : () => _save(context, vm),
                        child: vm.isBusy
                            ? const SizedBox(
                                height: 20,
                                width: 20,
                                child: CircularProgressIndicator(strokeWidth: 2, color: Colors.white),
                              )
                            : const Text('Continue'),
                      ),
                    ),
                  ],
                ),
              ),
            ),
          ),
        ),
      ),
    );
  }

  void _save(BuildContext context, DomainViewModel vm) async {
    final result = await vm.saveDomain(_controller.text.trim());
    result.when(
      success: (_) {
        locator<ApiService>().updateBaseUrl(_controller.text.trim());
        if (context.mounted) context.go('/login');
      },
      error: (message, exception) {},
    );
  }
}
