import 'package:flutter/material.dart';

class AppAppBar extends StatelessWidget implements PreferredSizeWidget {
  final Widget? title;
  final Widget? leading;
  final List<Widget>? actions;
  final PreferredSizeWidget? bottom;
  final double height;
  final Color? backgroundColor;
  final Color? foregroundColor;
  final bool centerTitle;

  const AppAppBar({
    super.key,
    this.title,
    this.leading,
    this.actions,
    this.bottom,
    this.height = 56,
    this.backgroundColor,
    this.foregroundColor,
    this.centerTitle = false,
  });

  @override
  Size get preferredSize => Size.fromHeight(height + (bottom?.preferredSize.height ?? 0));

  @override
  Widget build(BuildContext context) {
    final theme = Theme.of(context);
    final appBarTheme = theme.appBarTheme;
    final bgColor = backgroundColor ?? appBarTheme.backgroundColor ?? theme.colorScheme.surface;
    final fgColor = foregroundColor ?? appBarTheme.foregroundColor ?? theme.colorScheme.onSurface;
    final borderColor = theme.dividerTheme.color ?? theme.colorScheme.outlineVariant;
    final isDark = theme.brightness == Brightness.dark;

    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12),
      decoration: BoxDecoration(
        color: bgColor,
        border: Border(bottom: BorderSide(color: borderColor)),
        boxShadow: isDark
            ? null
            : [
                BoxShadow(
                  color: Colors.black.withValues(alpha: 0.04),
                  blurRadius: 8,
                  offset: const Offset(0, 2),
                ),
              ],
      ),
      child: SafeArea(
        bottom: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: height,
              child: Row(
                children: [
                  if (leading != null)
                    Padding(
                      padding: const EdgeInsets.only(right: 8),
                      child: leading!,
                    ),
                  if (centerTitle)
                    Expanded(
                      child: title != null
                          ? DefaultTextStyle(
                              textAlign: TextAlign.center,
                              style: TextStyle(
                                color: fgColor,
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                              child: title!,
                            )
                          : const SizedBox.shrink(),
                    )
                  else
                    Expanded(
                      child: title != null
                          ? DefaultTextStyle(
                              style: TextStyle(
                                color: fgColor,
                                fontSize: 16,
                                fontWeight: FontWeight.w600,
                              ),
                              child: title!,
                            )
                          : const SizedBox.shrink(),
                    ),
                  if (actions != null)
                    Padding(
                      padding: const EdgeInsets.only(left: 8),
                      child: Row(
                        mainAxisSize: MainAxisSize.min,
                        children: actions!,
                      ),
                    )
                  else
                    const SizedBox(width: 40),
                ],
              ),
            ),
            bottom ?? const SizedBox.shrink(),
          ],
        ),
      ),
    );
  }
}

