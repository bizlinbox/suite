import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';
import 'package:phosphoricons_flutter/phosphoricons_flutter.dart';

class AppIconButton extends StatelessWidget {
  final Widget? icon;
  final IconData? iconData;
  final VoidCallback? onPressed;
  final double size;
  final Color? color;
  final Color? backgroundColor;
  final String? tooltip;
  final double borderRadius;

  const AppIconButton({
    super.key,
    this.icon,
    this.iconData,
    this.onPressed,
    this.size = 40,
    this.color,
    this.backgroundColor,
    this.tooltip,
    this.borderRadius = 10,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;
    final iconColor = color ?? (isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary);
    final bgColor = backgroundColor ?? Colors.transparent;
    final enabled = onPressed != null;

    Widget button = Material(
      color: bgColor,
      borderRadius: BorderRadius.circular(borderRadius),
      child: InkWell(
        onTap: onPressed,
        borderRadius: BorderRadius.circular(borderRadius),
        mouseCursor: enabled ? SystemMouseCursors.click : SystemMouseCursors.basic,
        child: SizedBox(
          width: size,
          height: size,
          child: Center(
            child: icon ??
                Icon(
                  iconData ?? PhosphorIconsRegular.question,
                  size: size * 0.5,
                  color: enabled ? iconColor : iconColor.withValues(alpha: 0.4),
                ),
          ),
        ),
      ),
    );

    if (tooltip != null) {
      button = Tooltip(
        message: tooltip!,
        child: button,
      );
    }

    return button;
  }
}

