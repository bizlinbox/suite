import 'package:flutter/material.dart';
import '../../../core/theme/app_theme.dart';

class AppListTile extends StatelessWidget {
  final Widget? leading;
  final Widget? title;
  final Widget? subtitle;
  final Widget? trailing;
  final VoidCallback? onTap;
  final VoidCallback? onLongPress;
  final bool selected;
  final Color? selectedTileColor;
  final EdgeInsetsGeometry padding;
  final double borderRadius;

  const AppListTile({
    super.key,
    this.leading,
    this.title,
    this.subtitle,
    this.trailing,
    this.onTap,
    this.onLongPress,
    this.selected = false,
    this.selectedTileColor,
    this.padding = const EdgeInsets.symmetric(horizontal: 16, vertical: 12),
    this.borderRadius = 8,
  });

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final isDark = theme.brightness == Brightness.dark;

    final defaultSelectedColor = isDark
        ? AppColors.primary.withValues(alpha: 0.16)
        : AppColors.primary.withValues(alpha: 0.08);
    final bgColor = selected ? (selectedTileColor ?? defaultSelectedColor) : Colors.transparent;

    final titleColor = selected
        ? (isDark ? AppColors.primaryLight : AppColors.primaryDark)
        : (isDark ? AppColors.darkTextPrimary : AppColors.lightTextPrimary);
    final subtitleColor = isDark ? AppColors.darkTextSecondary : AppColors.lightTextSecondary;

    Widget tile = Container(
      decoration: BoxDecoration(
        color: bgColor,
        borderRadius: BorderRadius.circular(borderRadius),
        border: selected
            ? Border(left: BorderSide(color: AppColors.primary, width: 3))
            : const Border(left: BorderSide(color: Colors.transparent, width: 3)),
      ),
      padding: padding,
      child: Row(
        children: [
          if (leading != null) ...[
            IconTheme(
              data: IconThemeData(color: selected ? AppColors.primary : theme.iconTheme.color),
              child: leading!,
            ),
            const SizedBox(width: 12),
          ],
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              mainAxisSize: MainAxisSize.min,
              children: [
                if (title != null)
                  DefaultTextStyle(
                    style: TextStyle(
                      fontSize: 14,
                      fontWeight: selected ? FontWeight.w600 : FontWeight.w500,
                      color: titleColor,
                    ),
                    child: title!,
                  ),
                if (subtitle != null)
                  DefaultTextStyle(
                    style: TextStyle(
                      fontSize: 12,
                      color: subtitleColor,
                    ),
                    child: subtitle!,
                  ),
              ],
            ),
          ),
          if (trailing != null) ...[
            const SizedBox(width: 8),
            trailing!,
          ],
        ],
      ),
    );

    if (onTap != null || onLongPress != null) {
      tile = Material(
        color: Colors.transparent,
        borderRadius: BorderRadius.circular(borderRadius),
        child: InkWell(
          onTap: onTap,
          onLongPress: onLongPress,
          borderRadius: BorderRadius.circular(borderRadius),
          mouseCursor: SystemMouseCursors.click,
          child: tile,
        ),
      );
    }

    return tile;
  }
}

