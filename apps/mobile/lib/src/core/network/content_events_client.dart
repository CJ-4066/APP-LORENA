import 'dart:async';
import 'dart:convert';
import 'dart:math';

import 'package:http/http.dart' as http;

class ContentRealtimeEvent {
  const ContentRealtimeEvent({
    required this.id,
    required this.type,
    required this.entity,
    required this.action,
    required this.at,
    this.entityId,
  });

  final String id;
  final String type;
  final String entity;
  final String action;
  final DateTime at;
  final String? entityId;

  factory ContentRealtimeEvent.fromJson(Map<String, dynamic> json) {
    return ContentRealtimeEvent(
      id: json['id']?.toString() ?? '',
      type: json['type']?.toString() ?? '',
      entity: json['entity']?.toString() ?? '',
      action: json['action']?.toString() ?? '',
      entityId: json['entityId']?.toString(),
      at: DateTime.tryParse(json['at']?.toString() ?? '') ?? DateTime.now(),
    );
  }
}

class ContentEventsClient {
  ContentEventsClient({
    required String baseUrl,
  }) : _baseUrl = baseUrl.replaceFirst(RegExp(r'/+$'), '');

  final String _baseUrl;

  http.Client? _client;
  Timer? _retryTimer;
  bool _disposed = false;
  bool _connecting = false;
  int _retryAttempt = 0;

  Uri get _eventsUri => Uri.parse('$_baseUrl/api/content/events');

  void start({
    required void Function(ContentRealtimeEvent event) onChanged,
    void Function(Object error)? onError,
  }) {
    if (_disposed) {
      _disposed = false;
    }

    if (_connecting) {
      return;
    }

    _connect(
      onChanged: onChanged,
      onError: onError,
    );
  }

  Future<void> _connect({
    required void Function(ContentRealtimeEvent event) onChanged,
    void Function(Object error)? onError,
  }) async {
    if (_disposed || _connecting) {
      return;
    }

    _connecting = true;

    try {
      final client = http.Client();
      _client = client;

      final request = http.Request('GET', _eventsUri)
        ..headers['Accept'] = 'text/event-stream'
        ..headers['Cache-Control'] = 'no-cache';

      final response = await client.send(request);

      if (response.statusCode != 200) {
        throw StateError(
          'Content events failed with status ${response.statusCode}',
        );
      }

      _retryAttempt = 0;

      var eventName = 'message';
      var dataBuffer = StringBuffer();

      await for (final line in response.stream
          .transform(utf8.decoder)
          .transform(const LineSplitter())) {
        if (_disposed) {
          break;
        }

        if (line.startsWith(':')) {
          continue;
        }

        if (line.startsWith('event:')) {
          eventName = line.substring(6).trim();
          continue;
        }

        if (line.startsWith('data:')) {
          dataBuffer.writeln(line.substring(5).trimLeft());
          continue;
        }

        if (line.isEmpty) {
          final data = dataBuffer.toString().trim();

          if (eventName == 'content.changed' && data.isNotEmpty) {
            final decoded = jsonDecode(data);
            if (decoded is Map<String, dynamic>) {
              onChanged(ContentRealtimeEvent.fromJson(decoded));
            }
          }

          eventName = 'message';
          dataBuffer = StringBuffer();
        }
      }
    } catch (error) {
      if (!_disposed) {
        onError?.call(error);
      }
    } finally {
      _connecting = false;
      _client?.close();
      _client = null;

      if (!_disposed) {
        _scheduleReconnect(
          onChanged: onChanged,
          onError: onError,
        );
      }
    }
  }

  void _scheduleReconnect({
    required void Function(ContentRealtimeEvent event) onChanged,
    void Function(Object error)? onError,
  }) {
    _retryTimer?.cancel();

    final seconds = min(30, pow(2, _retryAttempt).toInt());
    _retryAttempt = min(_retryAttempt + 1, 5);

    _retryTimer = Timer(Duration(seconds: seconds), () {
      _connect(
        onChanged: onChanged,
        onError: onError,
      );
    });
  }

  void dispose() {
    _disposed = true;
    _retryTimer?.cancel();
    _retryTimer = null;
    _client?.close();
    _client = null;
    _connecting = false;
  }
}
