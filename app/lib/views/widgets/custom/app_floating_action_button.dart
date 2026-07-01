import 'package:flutter/material.dart';

class AppFloatingActionButton extends StatelessWidget {
  final Widget? icon;
  final IconData? iconData;
  final Widget? child;
  final Widget? label;
  final String? labelText;
  final VoidCallback? onPressed;
  final Color? backgroundColor;
  final Color? iconColor;
  final double size;

  const AppFloatingActionButton({
    super.key,
    this.icon,
    this.iconData,
    this.child,
    this.label,
    this.labelText,
    this.onPressed,
    this.backgroundColor,
    this.iconColor,
    this.size = 56,
  });

  @override
  Widget build(BuildContext context) {
    final bgColor = backgroundColor ?? const Color(0xFF2563EB);
    final fgColor = iconColor ?? Colors.white;

    final effectiveLabel = label ?? (labelText != null ? Text(labelText!) : null);
    final effectiveIcon = icon ?? (iconData != null ? Icon(iconData!) : null);

    return GestureDetector(
      onTap: onPressed,
      child: Container(
        width: effectiveLabel != null ? null : size,
        height: size,
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: BorderRadius.circular(size / 2),
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.2),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        padding: effectiveLabel != null ? const EdgeInsets.symmetric(horizontal: 16) : null,
        child: child ?? Row(
          mainAxisSize: MainAxisSize.min,
          children: [
            if (effectiveIcon != null) ...[
              effectiveIcon,
              if (effectiveLabel != null) const SizedBox(width: 8),
            ],
            if (effectiveLabel != null)
              DefaultTextStyle(
                style: TextStyle(
                  color: onPressed == null ? fgColor.withValues(alpha: 0.5) : fgColor,
                  fontWeight: FontWeight.w500,
                ),
                child: effectiveLabel,
              ),
          ],
        ),
      ),
    );
  }
}
