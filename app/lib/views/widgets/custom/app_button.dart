import 'package:flutter/material.dart';
import 'app_progress_indicator.dart';

enum AppButtonVariant { primary, secondary, ghost, danger }

class AppButton extends StatelessWidget {
  final String label;
  final VoidCallback? onPressed;
  final AppButtonVariant variant;
  final bool isLoading;
  final Widget? child;
  final EdgeInsetsGeometry? padding;
  final double? width;
  final double? height;
  final double borderRadius;

  const AppButton({
    super.key,
    this.label = '',
    this.onPressed,
    this.variant = AppButtonVariant.primary,
    this.isLoading = false,
    this.child,
    this.padding,
    this.width,
    this.height,
    this.borderRadius = 12,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final bool isDark = theme.brightness == Brightness.dark;

    Color backgroundColor;
    Color foregroundColor;
    Color borderColor;

    switch (variant) {
      case AppButtonVariant.primary:
        backgroundColor = const Color(0xFF2563EB);
        foregroundColor = Colors.white;
        borderColor = Colors.transparent;
        break;
      case AppButtonVariant.secondary:
        backgroundColor = isDark ? const Color(0xFF1E293B) : const Color(0xFFE2E8F0);
        foregroundColor = isDark ? Colors.white : const Color(0xFF1E293B);
        borderColor = Colors.transparent;
        break;
      case AppButtonVariant.ghost:
        backgroundColor = Colors.transparent;
        foregroundColor = isDark ? Colors.white70 : const Color(0xFF64748B);
        borderColor = Colors.transparent;
        break;
      case AppButtonVariant.danger:
        backgroundColor = const Color(0xFFDC2626);
        foregroundColor = Colors.white;
        borderColor = Colors.transparent;
        break;
    }

    return GestureDetector(
      onTap: isLoading || onPressed == null ? null : onPressed,
      child: Opacity(
        opacity: onPressed == null ? 0.5 : 1.0,
        child: Container(
          width: width,
          height: height ?? 48,
          padding: padding ?? const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
          decoration: BoxDecoration(
            color: backgroundColor,
            borderRadius: BorderRadius.circular(borderRadius),
            border: Border.all(color: borderColor),
          ),
          alignment: Alignment.center,
          child: isLoading
              ? AppProgressIndicator(
                  size: 20,
                  strokeWidth: 2,
                  color: foregroundColor,
                )
              : child ?? Text(
                  label,
                  style: TextStyle(
                    color: foregroundColor,
                    fontWeight: FontWeight.w600,
                    fontSize: 14,
                  ),
                ),
        ),
      ),
    );
  }
}
