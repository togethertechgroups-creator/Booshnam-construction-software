import 'dart:convert';
import 'package:http/http.dart' as http;

class OfflineSyncService {
  static const String baseUrl = 'http://localhost:8000/api/v1';
  final List<Map<String, dynamic>> _offlineQueue = [];

  // Enqueue actions when site offline
  void enqueueAction(String endpoint, String method, Map<String, dynamic> payload) {
    _offlineQueue.add({
      'endpoint': endpoint,
      'method': method,
      'payload': payload,
      'timestamp': DateTime.now().toIso8601String(),
    });
  }

  int get pendingQueueCount => _offlineQueue.length;

  // Flush and sync back to DRF backend
  Future<bool> syncPendingQueue(String token) async {
    if (_offlineQueue.isEmpty) return true;

    final List<Map<String, dynamic>> failedItems = [];

    for (final item in List.from(_offlineQueue)) {
      try {
        final uri = Uri.parse('$baseUrl${item['endpoint']}');
        final response = await http.post(
          uri,
          headers: {
            'Content-Type': 'application/json',
            'Authorization': 'Bearer $token',
          },
          body: jsonEncode(item['payload']),
        );

        if (response.statusCode >= 200 && response.statusCode < 300) {
          _offlineQueue.remove(item);
        } else {
          failedItems.add(item);
        }
      } catch (e) {
        failedItems.add(item);
      }
    }

    return _offlineQueue.isEmpty;
  }
}
