class DayCount {
  final String day;
  final int count;

  DayCount({required this.day, required this.count});

  factory DayCount.fromJson(Map<String, dynamic> json) {
    return DayCount(
      day: json['day'] as String,
      count: json['count'] as int? ?? 0,
    );
  }
}

class TopAgent {
  final String name;
  final int conversationsHandled;

  TopAgent({required this.name, required this.conversationsHandled});

  factory TopAgent.fromJson(Map<String, dynamic> json) {
    return TopAgent(
      name: json['name'] as String,
      conversationsHandled: json['conversationsHandled'] as int? ?? 0,
    );
  }
}

class MsgByType {
  final String messageType;
  final int count;

  MsgByType({required this.messageType, required this.count});

  factory MsgByType.fromJson(Map<String, dynamic> json) {
    return MsgByType(
      messageType: json['messageType'] as String,
      count: json['count'] as int? ?? 0,
    );
  }
}

class AnalyticsData {
  final int totalConversations;
  final int totalMessages;
  final double avgResponseTimeSeconds;
  final List<DayCount> messagesPerDay;
  final List<DayCount> conversationsPerDay;
  final List<TopAgent> topAgents;
  final List<MsgByType> messagesByType;

  AnalyticsData({
    required this.totalConversations,
    required this.totalMessages,
    required this.avgResponseTimeSeconds,
    required this.messagesPerDay,
    required this.conversationsPerDay,
    required this.topAgents,
    required this.messagesByType,
  });

  factory AnalyticsData.fromJson(Map<String, dynamic> json) {
    return AnalyticsData(
      totalConversations: json['totalConversations'] as int? ?? 0,
      totalMessages: json['totalMessages'] as int? ?? 0,
      avgResponseTimeSeconds: (json['avgResponseTimeSeconds'] as num?)?.toDouble() ?? 0.0,
      messagesPerDay: (json['messagesPerDay'] as List<dynamic>?)
              ?.map((e) => DayCount.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      conversationsPerDay: (json['conversationsPerDay'] as List<dynamic>?)
              ?.map((e) => DayCount.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      topAgents: (json['topAgents'] as List<dynamic>?)
              ?.map((e) => TopAgent.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
      messagesByType: (json['messagesByType'] as List<dynamic>?)
              ?.map((e) => MsgByType.fromJson(e as Map<String, dynamic>))
              .toList() ??
          [],
    );
  }
}
