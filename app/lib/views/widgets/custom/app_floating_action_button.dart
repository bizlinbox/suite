import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

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
    final bgColor = backgroundColor ?? AppColors.primary;
    final fgColor = iconColor ?? Colors.white;

    final effectiveLabel = label ?? (labelText != null ? Text(labelText!) : null);
    final effectiveIcon = icon ?? (iconData != null ? Icon(iconData!) : null);
    final borderRadius = BorderRadius.circular(size / 2);

    return Material(
      color: Colors.transparent,
      borderRadius: borderRadius,
      child: Ink(
        decoration: BoxDecoration(
          color: bgColor,
          borderRadius: borderRadius,
          boxShadow: [
            BoxShadow(
              color: Colors.black.withValues(alpha: 0.2),
              blurRadius: 8,
              offset: const Offset(0, 4),
            ),
          ],
        ),
        child: InkWell(
          onTap: onPressed,
          borderRadius: borderRadius,
          mouseCursor: onPressed != null ? SystemMouseCursors.click : SystemMouseCursors.basic,
          child: Container(
            width: effectiveLabel != null ? null : size,
            height: size,
            alignment: Alignment.center,
            padding: effectiveLabel != null ? const EdgeInsets.symmetric(horizontal: 16) : null,
            child: child ?? Row(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (effectiveIcon != null) ...[
                  IconTheme(data: IconThemeData(color: fgColor), child: effectiveIcon),
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
        ),
      ),
    );
  }
}
