import 'package:flutter/material.dart';

class AppAppBar extends StatelessWidget implements PreferredSizeWidget {
  final Widget? title;
  final Widget? leading;
  final List<Widget>? actions;
  final PreferredSizeWidget? bottom;
  final double height;
  final Color? backgroundColor;
  final Color? foregroundColor;

  const AppAppBar({
    super.key,
    this.title,
    this.leading,
    this.actions,
    this.bottom,
    this.height = 56,
    this.backgroundColor,
    this.foregroundColor,
  });

  @override
  Size get preferredSize => Size.fromHeight(height + (bottom?.preferredSize.height ?? 0));

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = backgroundColor ??
        (isDark ? const Color(0xFF1E293B) : const Color(0xFF2563EB));
    final fgColor = foregroundColor ?? Colors.white;

    return Container(
      color: bgColor,
      padding: const EdgeInsets.symmetric(horizontal: 8),
      child: SafeArea(
        bottom: false,
        child: Column(
          mainAxisSize: MainAxisSize.min,
          children: [
            SizedBox(
              height: height,
              child: Row(
                children: [
                  if (leading != null) leading!,
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
                  ),
                  if (actions != null)
                    Row(
                      mainAxisSize: MainAxisSize.min,
                      children: actions!,
                    )
                  else
                    const SizedBox(width: 40),
                ],
              ),
            ),
            if (bottom != null) bottom!,
          ],
        ),
      ),
    );
  }
}
