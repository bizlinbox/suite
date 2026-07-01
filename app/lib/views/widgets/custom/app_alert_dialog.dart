import 'package:flutter/material.dart';
import 'app_button.dart';
import 'app_card.dart';

class AppAlertDialog extends StatelessWidget {
  final Widget? title;
  final Widget? content;
  final String? confirmLabel;
  final String? cancelLabel;
  final VoidCallback? onConfirm;
  final VoidCallback? onCancel;
  final AppButtonVariant confirmVariant;
  final List<Widget>? actions;
  final EdgeInsetsGeometry? contentPadding;

  const AppAlertDialog({
    super.key,
    this.title,
    this.content,
    this.confirmLabel,
    this.cancelLabel,
    this.onConfirm,
    this.onCancel,
    this.confirmVariant = AppButtonVariant.danger,
    this.actions,
    this.contentPadding,
  });

  @override
  Widget build(BuildContext context) {
    return Dialog(
      backgroundColor: Colors.transparent,
      child: AppCard(
        padding: contentPadding ?? const EdgeInsets.all(24),
        child: ConstrainedBox(
          constraints: const BoxConstraints(maxWidth: 400),
          child: Column(
            mainAxisSize: MainAxisSize.min,
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              if (title != null)
                DefaultTextStyle(
                  style: const TextStyle(
                    fontSize: 18,
                    fontWeight: FontWeight.bold,
                    color: Colors.black,
                  ),
                  child: title!,
                ),
              if (title != null && content != null) const SizedBox(height: 12),
              content ?? const SizedBox.shrink(),
              const SizedBox(height: 24),
              Row(
                mainAxisAlignment: MainAxisAlignment.end,
                children: actions ?? [
                  if (cancelLabel != null)
                    AppButton(
                      label: cancelLabel!,
                      variant: AppButtonVariant.ghost,
                      onPressed: onCancel ?? () => Navigator.of(context).pop(),
                    ),
                  if (cancelLabel != null) const SizedBox(width: 12),
                  if (confirmLabel != null)
                    AppButton(
                      label: confirmLabel!,
                      variant: confirmVariant,
                      onPressed: onConfirm,
                    ),
                ],
              ),
            ],
          ),
        ),
      ),
    );
  }
}

Future<T?> showAppDialog<T>({
  required BuildContext context,
  String? title,
  Widget? content,
  String? confirmLabel,
  String? cancelLabel,
  VoidCallback? onConfirm,
  VoidCallback? onCancel,
  AppButtonVariant confirmVariant = AppButtonVariant.danger,
}) {
  return showDialog<T>(
    context: context,
    builder: (_) => AppAlertDialog(
      title: title != null ? Text(title) : null,
      content: content,
      confirmLabel: confirmLabel,
      cancelLabel: cancelLabel,
      onConfirm: onConfirm,
      onCancel: onCancel,
      confirmVariant: confirmVariant,
    ),
  );
}

