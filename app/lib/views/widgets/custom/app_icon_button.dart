import 'package:flutter/material.dart';

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
    final iconColor = color ?? (isDark ? Colors.white70 : const Color(0xFF64748B));
    final bgColor = backgroundColor ?? Colors.transparent;

    Widget button = GestureDetector(
      onTap: onPressed,
      child: Container(
        width: size,
        height: size,
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(borderRadius),
        ),
        child: icon ?? Icon(
          iconData ?? Icons.help,
          size: size * 0.5,
          color: onPressed == null ? iconColor.withValues(alpha: 0.4) : iconColor,
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
