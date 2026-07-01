import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
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
    this.borderRadius = 10,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final enabled = !isLoading && onPressed != null;

    Color backgroundColor;
    Color foregroundColor;
    Color borderColor;

    switch (variant) {
      case AppButtonVariant.primary:
        backgroundColor = AppColors.primary;
        foregroundColor = Colors.white;
        borderColor = Colors.transparent;
        break;
      case AppButtonVariant.secondary:
        backgroundColor = isDark ? AppColors.darkBorder : const Color(0xFFE2E8F0);
        foregroundColor = isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary;
        borderColor = Colors.transparent;
        break;
      case AppButtonVariant.ghost:
        backgroundColor = Colors.transparent;
        foregroundColor = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;
        borderColor = Colors.transparent;
        break;
      case AppButtonVariant.danger:
        backgroundColor = AppColors.danger;
        foregroundColor = Colors.white;
        borderColor = Colors.transparent;
        break;
    }

    return Opacity(
      opacity: enabled ? 1.0 : 0.5,
      child: Material(
        color: backgroundColor,
        borderRadius: BorderRadius.circular(borderRadius),
        child: InkWell(
          onTap: enabled ? onPressed : null,
          borderRadius: BorderRadius.circular(borderRadius),
          mouseCursor: enabled ? SystemMouseCursors.click : SystemMouseCursors.basic,
          child: Container(
            width: width,
            height: height ?? 44,
            padding: padding ?? const EdgeInsets.symmetric(horizontal: 18, vertical: 12),
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(borderRadius),
              border: Border.all(color: borderColor),
            ),
            alignment: Alignment.center,
            child: isLoading
                ? AppProgressIndicator(
                    size: 18,
                    strokeWidth: 2,
                    color: foregroundColor,
                  )
                : DefaultTextStyle(
                    style: TextStyle(
                      color: foregroundColor,
                      fontWeight: FontWeight.w600,
                      fontSize: 14,
                    ),
                    child: IconTheme(
                      data: IconThemeData(color: foregroundColor, size: 18),
                      child: child ?? Text(label),
                    ),
                  ),
          ),
        ),
      ),
    );
  }
}

