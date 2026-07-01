import 'package:flutter/material.dart';
import 'app_button.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

enum AppSnackType { info, success, error }

class AppSnackBar extends StatelessWidget {
  final String message;
  final AppSnackType type;
  final String? actionLabel;
  final VoidCallback? onAction;
  final VoidCallback? onDismiss;

  const AppSnackBar({
    super.key,
    required this.message,
    this.type = AppSnackType.info,
    this.actionLabel,
    this.onAction,
    this.onDismiss,
  });

  Color get _backgroundColor {
    switch (type) {
      case AppSnackType.success:
        return const Color(0xFFDCfce7);
      case AppSnackType.error:
        return const Color(0xFFFEE2E2);
      case AppSnackType.info:
        return const Color(0xFFDBEAFE);
    }
  }

  Color get _textColor {
    switch (type) {
      case AppSnackType.success:
        return const Color(0xFF166534);
      case AppSnackType.error:
        return const Color(0xFF991B1B);
      case AppSnackType.info:
        return const Color(0xFF1E40AF);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Container(
      margin: const EdgeInsets.all(12),
      padding: const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
      decoration: BoxDecoration(
        color: _backgroundColor,
        borderRadius: BorderRadius.circular(12),
        border: Border.all(
          color: _textColor.withValues(alpha: 0.2),
        ),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Expanded(
            child: Text(
              message,
              style: TextStyle(
                color: _textColor,
                fontSize: 14,
              ),
            ),
          ),
          if (actionLabel != null) ...[
            const SizedBox(width: 12),
            AppButton(
              label: actionLabel!,
              variant: AppButtonVariant.ghost,
              onPressed: onAction,
            ),
          ],
          if (onDismiss != null) ...[
            const SizedBox(width: 8),
            GestureDetector(
              onTap: onDismiss,
              child: PhosphorIcon(PhosphorIconsRegular.x,
                size: 18,
                color: _textColor,
              ),
            ),
          ],
        ],
      ),
    );
  }
}

void showAppSnackBar(
  BuildContext context, {
  required String message,
  AppSnackType type = AppSnackType.info,
  String? actionLabel,
  VoidCallback? onAction,
  Duration duration = const Duration(seconds: 4),
}) {
  final overlay = Overlay.of(context);
  final entry = OverlayEntry(
    builder: (_) => Positioned(
      left: 0,
      right: 0,
      bottom: 16,
      child: Center(
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 600),
          child: AppSnackBar(
            message: message,
            type: type,
            actionLabel: actionLabel,
            onAction: onAction,
            onDismiss: () {},
          ),
        ),
      ),
    ),
  );

  overlay.insert(entry);
  Future.delayed(duration, () {
    if (entry.mounted) entry.remove();
  });
}

