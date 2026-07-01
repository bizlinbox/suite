import 'dart:math';
import 'package:flutter/material.dart';
import 'custom/custom_widgets.dart';

class LineChartPainter extends CustomPainter {
  final List<int> values;
  final List<String> labels;
  final Color lineColor;
  final Color fillColor;

  LineChartPainter({
    required this.values,
    required this.labels,
    required this.lineColor,
    required this.fillColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;

    final padding = const EdgeInsets.only(left: 40, right: 16, top: 24, bottom: 32);
    final chartWidth = size.width - padding.left - padding.right;
    final chartHeight = size.height - padding.top - padding.bottom;

    final maxValue = values.reduce((a, b) => a > b ? a : b).toDouble();
    final yMax = maxValue == 0 ? 1.0 : maxValue * 1.2;

    // Grid lines
    final gridPaint = Paint()
      ..color = Colors.grey.withValues(alpha: 0.2)
      ..strokeWidth = 1;

    for (int i = 0; i <= 4; i++) {
      final y = padding.top + chartHeight - (chartHeight * i / 4);
      canvas.drawLine(Offset(padding.left, y), Offset(size.width - padding.right, y), gridPaint);
      final label = (yMax * i / 4).toStringAsFixed(0);
      final textSpan = TextSpan(text: label, style: TextStyle(fontSize: 10, color: Colors.grey[600]));
      final textPainter = TextPainter(text: textSpan, textDirection: TextDirection.ltr);
      textPainter.layout();
      textPainter.paint(canvas, Offset(padding.left - textPainter.width - 4, y - textPainter.height / 2));
    }

    // Points
    final points = <Offset>[];
    for (int i = 0; i < values.length; i++) {
      final x = padding.left + (chartWidth * i / (values.length - 1));
      final y = padding.top + chartHeight - (chartHeight * values[i] / yMax);
      points.add(Offset(x, y));
    }

    // Fill area
    final fillPath = Path();
    fillPath.moveTo(points.first.dx, padding.top + chartHeight);
    for (final p in points) {
      fillPath.lineTo(p.dx, p.dy);
    }
    fillPath.lineTo(points.last.dx, padding.top + chartHeight);
    fillPath.close();
    canvas.drawPath(
      fillPath,
      Paint()..color = fillColor.withValues(alpha: 0.2),
    );

    // Line
    final linePaint = Paint()
      ..color = lineColor
      ..strokeWidth = 2.5
      ..style = PaintingStyle.stroke
      ..strokeCap = StrokeCap.round;

    final linePath = Path();
    linePath.moveTo(points.first.dx, points.first.dy);
    for (int i = 1; i < points.length; i++) {
      linePath.lineTo(points[i].dx, points[i].dy);
    }
    canvas.drawPath(linePath, linePaint);

    // Dots
    final dotPaint = Paint()
      ..color = lineColor
      ..strokeWidth = 2
      ..style = PaintingStyle.fill;
    for (final p in points) {
      canvas.drawCircle(p, 3.5, dotPaint);
      canvas.drawCircle(p, 3.5, Paint()..color = Colors.white..style = PaintingStyle.fill);
      canvas.drawCircle(p, 3.5, dotPaint);
    }

    // X labels
    for (int i = 0; i < labels.length; i++) {
      final x = padding.left + (chartWidth * i / (labels.length - 1));
      final textSpan = TextSpan(text: labels[i], style: TextStyle(fontSize: 10, color: Colors.grey[600]));
      final textPainter = TextPainter(text: textSpan, textDirection: TextDirection.ltr, textAlign: TextAlign.center);
      textPainter.layout();
      textPainter.paint(canvas, Offset(x - textPainter.width / 2, padding.top + chartHeight + 6));
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

class LineChart extends StatelessWidget {
  final List<int> values;
  final List<String> labels;
  final String title;
  final double height;

  const LineChart({
    super.key,
    required this.values,
    required this.labels,
    required this.title,
    this.height = 220,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            SizedBox(
              height: height,
              child: CustomPaint(
                size: Size.infinite,
                painter: LineChartPainter(
                  values: values,
                  labels: labels,
                  lineColor: const Color(0xFF2563EB),
                  fillColor: const Color(0xFF2563EB),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class BarChartPainter extends CustomPainter {
  final List<int> values;
  final List<String> labels;
  final Color barColor;

  BarChartPainter({
    required this.values,
    required this.labels,
    required this.barColor,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;

    final padding = const EdgeInsets.only(left: 40, right: 16, top: 24, bottom: 40);
    final chartWidth = size.width - padding.left - padding.right;
    final chartHeight = size.height - padding.top - padding.bottom;

    final maxValue = values.reduce((a, b) => a > b ? a : b).toDouble();
    final yMax = maxValue == 0 ? 1.0 : maxValue * 1.2;

    // Grid lines
    final gridPaint = Paint()
      ..color = Colors.grey.withValues(alpha: 0.2)
      ..strokeWidth = 1;

    for (int i = 0; i <= 4; i++) {
      final y = padding.top + chartHeight - (chartHeight * i / 4);
      canvas.drawLine(Offset(padding.left, y), Offset(size.width - padding.right, y), gridPaint);
      final label = (yMax * i / 4).toStringAsFixed(0);
      final textSpan = TextSpan(text: label, style: TextStyle(fontSize: 10, color: Colors.grey[600]));
      final textPainter = TextPainter(text: textSpan, textDirection: TextDirection.ltr);
      textPainter.layout();
      textPainter.paint(canvas, Offset(padding.left - textPainter.width - 4, y - textPainter.height / 2));
    }

    // Bars
    final barWidth = chartWidth / values.length * 0.6;
    final spacing = chartWidth / values.length;

    for (int i = 0; i < values.length; i++) {
      final barHeight = chartHeight * values[i] / yMax;
      final x = padding.left + (spacing * i) + (spacing - barWidth) / 2;
      final y = padding.top + chartHeight - barHeight;

      final rect = RRect.fromRectAndRadius(
        Rect.fromLTWH(x, y, barWidth, barHeight),
        const Radius.circular(4),
      );
      canvas.drawRRect(
        rect,
        Paint()..color = barColor.withValues(alpha: 0.8 + (i % 3) * 0.1),
      );

      // Value label on top
      final valueSpan = TextSpan(
        text: '${values[i]}',
        style: TextStyle(fontSize: 10, color: barColor, fontWeight: FontWeight.bold),
      );
      final valuePainter = TextPainter(text: valueSpan, textDirection: TextDirection.ltr, textAlign: TextAlign.center);
      valuePainter.layout();
      valuePainter.paint(canvas, Offset(x + barWidth / 2 - valuePainter.width / 2, y - 14));

      // X label
      final textSpan = TextSpan(text: labels[i], style: TextStyle(fontSize: 10, color: Colors.grey[600]));
      final textPainter = TextPainter(text: textSpan, textDirection: TextDirection.ltr, textAlign: TextAlign.center);
      textPainter.layout(maxWidth: spacing - 8);
      textPainter.paint(canvas, Offset(x + barWidth / 2 - textPainter.width / 2, padding.top + chartHeight + 6));
    }
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

class BarChart extends StatelessWidget {
  final List<int> values;
  final List<String> labels;
  final String title;
  final double height;

  const BarChart({
    super.key,
    required this.values,
    required this.labels,
    required this.title,
    this.height = 220,
  });

  @override
  Widget build(BuildContext context) {
    return AppCard(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            SizedBox(
              height: height,
              child: CustomPaint(
                size: Size.infinite,
                painter: BarChartPainter(
                  values: values,
                  labels: labels,
                  barColor: const Color(0xFF2563EB),
                ),
              ),
            ),
          ],
        ),
      ),
    );
  }
}

class DonutChartPainter extends CustomPainter {
  final List<int> values;
  final List<String> labels;
  final List<Color> colors;

  DonutChartPainter({
    required this.values,
    required this.labels,
    required this.colors,
  });

  @override
  void paint(Canvas canvas, Size size) {
    if (values.isEmpty) return;

    final total = values.reduce((a, b) => a + b);
    if (total == 0) return;

    final center = Offset(size.width / 2, size.height / 2);
    final radius = min(size.width, size.height) / 2 - 16;
    final thickness = radius * 0.35;

    double startAngle = -pi / 2;

    for (int i = 0; i < values.length; i++) {
      final sweepAngle = (values[i] / total) * 2 * pi;
      final rect = Rect.fromCircle(center: center, radius: radius);

      final paint = Paint()
        ..color = colors[i % colors.length]
        ..style = PaintingStyle.stroke
        ..strokeWidth = thickness;

      canvas.drawArc(rect, startAngle, sweepAngle, false, paint);
      startAngle += sweepAngle;
    }

    // Center text
    final textSpan = TextSpan(
      text: '$total',
      style: const TextStyle(fontSize: 22, fontWeight: FontWeight.bold, color: Colors.black87),
    );
    final textPainter = TextPainter(text: textSpan, textDirection: TextDirection.ltr, textAlign: TextAlign.center);
    textPainter.layout();
    textPainter.paint(canvas, Offset(center.dx - textPainter.width / 2, center.dy - textPainter.height / 2));
  }

  @override
  bool shouldRepaint(covariant CustomPainter oldDelegate) => true;
}

class DonutChart extends StatelessWidget {
  final List<int> values;
  final List<String> labels;
  final String title;
  final double height;

  DonutChart({
    super.key,
    required this.values,
    required this.labels,
    required this.title,
    this.height = 220,
  });

  final List<Color> _colors = [
    const Color(0xFF2563EB),
    const Color(0xFF3B82F6),
    const Color(0xFF60A5FA),
    const Color(0xFF93C5FD),
    const Color(0xFF1D4ED8),
    const Color(0xFF1E40AF),
  ];

  @override
  Widget build(BuildContext context) {
    final total = values.isEmpty ? 0 : values.reduce((a, b) => a + b);

    return AppCard(
      child: Padding(
        padding: const EdgeInsets.all(16),
        child: Column(
          crossAxisAlignment: CrossAxisAlignment.start,
          children: [
            Text(title, style: const TextStyle(fontSize: 16, fontWeight: FontWeight.bold)),
            const SizedBox(height: 12),
            Row(
              children: [
                SizedBox(
                  height: height,
                  width: height,
                  child: CustomPaint(
                    size: Size.infinite,
                    painter: DonutChartPainter(
                      values: values,
                      labels: labels,
                      colors: _colors,
                    ),
                  ),
                ),
                const SizedBox(width: 16),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: labels.asMap().entries.map((entry) {
                      final i = entry.key;
                      final label = entry.value;
                      final value = i < values.length ? values[i] : 0;
                      final pct = total == 0 ? 0 : (value / total * 100).toStringAsFixed(1);
                      return Padding(
                        padding: const EdgeInsets.only(bottom: 8),
                        child: Row(
                          children: [
                            Container(
                              width: 12,
                              height: 12,
                              decoration: BoxDecoration(
                                color: _colors[i % _colors.length],
                                borderRadius: BorderRadius.circular(3),
                              ),
                            ),
                            const SizedBox(width: 8),
                            Expanded(
                              child: Text(
                                label,
                                style: const TextStyle(fontSize: 12),
                                overflow: TextOverflow.ellipsis,
                              ),
                            ),
                            Text('$value ($pct%)', style: TextStyle(fontSize: 12, color: Colors.grey[700])),
                          ],
                        ),
                      );
                    }).toList(),
                  ),
                ),
              ],
            ),
          ],
        ),
      ),
    );
  }
}