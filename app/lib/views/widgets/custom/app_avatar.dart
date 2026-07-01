import 'package:flutter/material.dart';

class AppAvatar extends StatelessWidget {
  final String? text;
  final Widget? child;
  final double size;
  final double? radius;
  final Color? backgroundColor;
  final Color? textColor;
  final String? imageUrl;

  const AppAvatar({
    super.key,
    this.text,
    this.child,
    this.size = 40,
    this.radius,
    this.backgroundColor,
    this.textColor,
    this.imageUrl,
  });

  @override
  Widget build(BuildContext context) {
    final isDark = Theme.of(context).brightness == Brightness.dark;
    final bgColor = backgroundColor ??
        (isDark ? const Color(0xFF334155) : const Color(0xFFDBEAFE));
    final fgColor = textColor ??
        (isDark ? Colors.white : const Color(0xFF2563EB));

    final effectiveSize = radius != null ? radius! * 2 : size;

    Widget displayChild;
    if (child != null) {
      displayChild = child!;
    } else if (imageUrl != null && imageUrl!.isNotEmpty) {
      final displayText = (text != null && text!.isNotEmpty) ? text![0].toUpperCase() : '?';
      displayChild = ClipOval(
        child: Image.network(
          imageUrl!,
          width: effectiveSize,
          height: effectiveSize,
          fit: BoxFit.cover,
          errorBuilder: (_, _, _) => _FallbackText(displayText, fgColor),
        ),
      );
    } else {
      final displayText = (text != null && text!.isNotEmpty) ? text![0].toUpperCase() : '?';
      displayChild = _FallbackText(displayText, fgColor);
    }

    return Container(
      width: effectiveSize,
      height: effectiveSize,
      decoration: BoxDecoration(
        color: bgColor,
        shape: BoxShape.circle,
      ),
      child: Center(child: displayChild),
    );
  }
}

class _FallbackText extends StatelessWidget {
  final String text;
  final Color color;

  const _FallbackText(this.text, this.color);

  @override
  Widget build(BuildContext context) {
    return Text(
      text,
      style: TextStyle(
        color: color,
        fontWeight: FontWeight.bold,
        fontSize: 14,
      ),
    );
  }
}
