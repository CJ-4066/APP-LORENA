import 'dart:async';
import 'dart:convert';

import 'package:flutter/foundation.dart';
import 'package:http/http.dart' as http;

import '../config/app_config.dart';
import '../../models/auth_models.dart';
import '../../models/app_models.dart';
import '../../models/astro_models.dart';
import '../../models/booking_models.dart';
import '../../models/chat_models.dart';
import '../../models/numerology_models.dart';
import '../../models/profile_models.dart';
import '../../models/shop_models.dart';
import '../data/birth_place_catalog.dart';

class BootstrapResponse {
  BootstrapResponse({
    required this.data,
    required this.rawJson,
  });

  final AppBootstrap data;
  final String rawJson;
}

class ContentVersionResponse {
  ContentVersionResponse({
    required this.version,
    required this.updatedAt,
    required this.counts,
  });

  final String version;
  final String updatedAt;
  final Map<String, int> counts;

  factory ContentVersionResponse.fromJson(Map<String, dynamic> json) {
    final countsJson = json['counts'] as Map<String, dynamic>? ?? const {};
    return ContentVersionResponse(
      version: json['version'] as String? ?? '',
      updatedAt: json['updatedAt'] as String? ?? '',
      counts: {
        'courses': countsJson['courses'] as int? ?? 0,
        'libraryPdfs': countsJson['libraryPdfs'] as int? ?? 0,
        'specialists': countsJson['specialists'] as int? ?? 0,
        'services': countsJson['services'] as int? ?? 0,
      },
    );
  }
}

class ApiClient {
  ApiClient({
    required this.baseUrl,
    http.Client? httpClient,
  }) : _httpClient = httpClient ?? http.Client();

  final String baseUrl;
  final http.Client _httpClient;

  Future<BootstrapResponse> fetchBootstrap({String? accessToken}) async {
    final response = await _send(
      method: 'GET',
      path: '/api/bootstrap',
      accessToken: accessToken,
    );
    _normalizeBootstrapPayload(response);

    return BootstrapResponse(
      data: AppBootstrap.fromJson(response),
      rawJson: jsonEncode(response),
    );
  }

  Future<ContentVersionResponse> fetchContentVersion() async {
    final response = await _send(
      method: 'GET',
      path: '/api/content/version',
    );
    final item = response['item'] as Map<String, dynamic>? ?? const {};
    return ContentVersionResponse.fromJson(item);
  }

  Future<PhoneAuthStartResult> startPhoneAuth({
    required String countryCode,
    required String dialCode,
    required String nationalNumber,
  }) async {
    final response = await _send(
      method: 'POST',
      path: '/api/auth/phone/start',
      body: {
        'countryCode': countryCode,
        'dialCode': dialCode,
        'nationalNumber': nationalNumber,
      },
    );

    return PhoneAuthStartResult.fromJson(
        response['item'] as Map<String, dynamic>);
  }

  Future<PhoneAuthSession> verifyPhoneAuth({
    required String phoneNumber,
    required String code,
  }) async {
    final response = await _send(
      method: 'POST',
      path: '/api/auth/phone/verify',
      body: {
        'phoneNumber': phoneNumber,
        'code': code,
      },
    );
    _normalizeSessionPayload(response['item'] as Map<String, dynamic>);

    return PhoneAuthSession.fromJson(response['item'] as Map<String, dynamic>);
  }

  Future<PhoneAuthSession> completePhoneProfile({
    required String accessToken,
    required CompletePhoneProfileInput input,
  }) async {
    final response = await _send(
      method: 'PATCH',
      path: '/api/auth/profile',
      accessToken: accessToken,
      body: input.toJson(),
    );
    _normalizeSessionPayload(response['item'] as Map<String, dynamic>);

    return PhoneAuthSession.fromJson(response['item'] as Map<String, dynamic>);
  }

  Future<void> logout({
    required String accessToken,
  }) async {
    await _send(
      method: 'POST',
      path: '/api/auth/logout',
      accessToken: accessToken,
    );
  }

  Future<UserProfile> updateProfile({
    required String accessToken,
    required UpdateProfileInput input,
  }) async {
    final response = await _send(
      method: 'PATCH',
      path: '/api/profile/me',
      accessToken: accessToken,
      body: input.toJson(),
    );
    _normalizeUserPayload(response['item'] as Map<String, dynamic>);

    return UserProfile.fromJson(response['item'] as Map<String, dynamic>);
  }

  Future<ServiceOffer> updateServiceOffer({
    required String accessToken,
    required String serviceId,
    required UpdateServiceOfferInput input,
  }) async {
    final response = await _send(
      method: 'PATCH',
      path: '/api/services/$serviceId',
      accessToken: accessToken,
      body: input.toJson(),
    );

    return ServiceOffer.fromJson(response['item'] as Map<String, dynamic>);
  }

  Future<String> uploadProfileAvatar({
    required String accessToken,
    required Uint8List bytes,
    required String fileName,
    required String contentType,
  }) async {
    return _uploadStorageAsset(
      accessToken: accessToken,
      bytes: bytes,
      fileName: fileName,
      contentType: contentType,
      category: 'avatar',
    );
  }

  Future<String> uploadCommunityChatImage({
    required String accessToken,
    required Uint8List bytes,
    required String fileName,
    required String contentType,
  }) async {
    return _uploadStorageAsset(
      accessToken: accessToken,
      bytes: bytes,
      fileName: fileName,
      contentType: contentType,
      category: 'chat_attachment',
    );
  }

  Future<Booking> createBooking({
    required String accessToken,
    required CreateBookingInput input,
  }) async {
    final response = await _send(
      method: 'POST',
      path: '/api/bookings',
      accessToken: accessToken,
      body: input.toJson(),
    );

    return Booking.fromJson(response['item'] as Map<String, dynamic>);
  }

  Future<List<SpecialistAvailabilitySlot>> fetchSpecialistAvailability({
    required String specialistId,
    required DateTime from,
    required DateTime to,
    String? mode,
    String? serviceId,
  }) async {
    final response = await _send(
      method: 'GET',
      path: '/api/specialists/$specialistId/availability',
      queryParameters: {
        'from': from.toUtc().toIso8601String(),
        'to': to.toUtc().toIso8601String(),
        if (mode != null && mode.isNotEmpty) 'mode': mode,
        if (serviceId != null && serviceId.isNotEmpty) 'serviceId': serviceId,
      },
    );

    final items = response['items'] as List<dynamic>? ?? const <dynamic>[];
    return items
        .whereType<Map<String, dynamic>>()
        .map(SpecialistAvailabilitySlot.fromJson)
        .toList();
  }

  Future<Booking> updateBooking({
    required String accessToken,
    required String bookingId,
    required UpdateBookingInput input,
  }) async {
    final response = await _send(
      method: 'PATCH',
      path: '/api/bookings/$bookingId',
      accessToken: accessToken,
      body: input.toJson(),
    );

    return Booking.fromJson(response['item'] as Map<String, dynamic>);
  }

  Future<ShopOrder> createShopOrder({
    required String accessToken,
    required CreateShopOrderInput input,
  }) async {
    final response = await _send(
      method: 'POST',
      path: '/api/shop',
      accessToken: accessToken,
      body: input.toJson(),
    );

    final item = response['item'] as Map<String, dynamic>;
    _normalizeShopOrderPayload(item);
    return ShopOrder.fromJson(item);
  }

  Future<ShopProduct> createShopProduct({
    required String accessToken,
    required CreateShopProductInput input,
  }) async {
    final response = await _send(
      method: 'POST',
      path: '/api/shop/products',
      accessToken: accessToken,
      body: input.toJson(),
    );

    final item = response['item'] as Map<String, dynamic>;
    _normalizeShopProductPayload(item);
    return ShopProduct.fromJson(item);
  }

  Future<ShopProduct> updateShopProduct({
    required String accessToken,
    required String productId,
    required UpdateShopProductInput input,
  }) async {
    final response = await _send(
      method: 'PATCH',
      path: '/api/shop/products/$productId',
      accessToken: accessToken,
      body: input.toJson(),
    );

    final item = response['item'] as Map<String, dynamic>;
    _normalizeShopProductPayload(item);
    return ShopProduct.fromJson(item);
  }

  Future<ShopOrder> updateShopOrderStatus({
    required String accessToken,
    required String orderId,
    required UpdateShopOrderStatusInput input,
  }) async {
    final response = await _send(
      method: 'PATCH',
      path: '/api/shop/orders/$orderId',
      accessToken: accessToken,
      body: input.toJson(),
    );

    final item = response['item'] as Map<String, dynamic>;
    _normalizeShopOrderPayload(item);
    return ShopOrder.fromJson(item);
  }

  Future<List<CommunityChatMessage>> fetchCommunityChat({
    String? accessToken,
  }) async {
    final response = await _send(
      method: 'GET',
      path: '/api/chat/community',
      accessToken: accessToken,
    );

    final items = response['items'] as List<dynamic>? ?? const <dynamic>[];
    return items
        .whereType<Map<String, dynamic>>()
        .map((item) {
          final imageUrl = item['imageUrl'];
          if (imageUrl is String) {
            item['imageUrl'] = _resolveAssetUrl(imageUrl);
          }
          return CommunityChatMessage.fromJson(item);
        })
        .toList();
  }

  Future<List<CommunityChatMessage>> sendCommunityChatMessage({
    String? accessToken,
    required String body,
    String? imageUrl,
  }) async {
    final response = await _send(
      method: 'POST',
      path: '/api/chat/community/messages',
      accessToken: accessToken,
      body: {
        'body': body,
        if (imageUrl != null && imageUrl.trim().isNotEmpty) 'imageUrl': imageUrl,
      },
    );

    final items = response['items'] as List<dynamic>? ?? const <dynamic>[];
    return items
        .whereType<Map<String, dynamic>>()
        .map((item) {
          final imageUrl = item['imageUrl'];
          if (imageUrl is String) {
            item['imageUrl'] = _resolveAssetUrl(imageUrl);
          }
          return CommunityChatMessage.fromJson(item);
        })
        .toList();
  }

  Future<BadgeProfileSummary> trackBadgeAction({
    required String accessToken,
    required String actionKey,
    int value = 1,
    Map<String, dynamic>? metadata,
  }) async {
    final response = await _send(
      method: 'POST',
      path: '/api/profile/badges/track',
      accessToken: accessToken,
      body: {
        'actionKey': actionKey,
        'value': value,
        if (metadata != null) 'metadata': metadata,
      },
    );

    return BadgeProfileSummary.fromJson(
      response['item'] as Map<String, dynamic>,
    );
  }

  Future<AstroNatalChartResult> fetchNatalChart({
    required AstroRequestInput input,
  }) async {
    final response = await _send(
      method: 'POST',
      path: '/api/astro/natal',
      body: input.toJson(),
    );

    return AstroNatalChartResult.fromJson(
      response['item'] as Map<String, dynamic>,
    );
  }

  Future<AstroTransitsResult> fetchAstroTransits({
    required AstroRequestInput input,
  }) async {
    final response = await _send(
      method: 'POST',
      path: '/api/astro/transits',
      body: input.toJson(),
    );

    return AstroTransitsResult.fromJson(
      response['item'] as Map<String, dynamic>,
    );
  }

  Future<AstroReturnsResult> fetchAstroReturns({
    required AstroRequestInput input,
  }) async {
    final response = await _send(
      method: 'POST',
      path: '/api/astro/returns',
      body: input.toJson(),
    );

    return AstroReturnsResult.fromJson(
      response['item'] as Map<String, dynamic>,
    );
  }

  Future<AstroEventsResult> fetchAstroEvents({
    required double latitude,
    required double longitude,
  }) async {
    final response = await _send(
      method: 'GET',
      path: '/api/astro/events',
      queryParameters: {
        'latitude': latitude.toString(),
        'longitude': longitude.toString(),
      },
    );

    return AstroEventsResult.fromJson(response['item'] as Map<String, dynamic>);
  }

  Future<AstroUtcOffsetResult> fetchAstroUtcOffset({
    required String birthDate,
    required String birthTime,
    required bool birthTimeUnknown,
    required String timeZoneId,
  }) async {
    final response = await _send(
      method: 'POST',
      path: '/api/astro/utc-offset',
      body: {
        'birthDate': birthDate,
        'birthTime': birthTime,
        'birthTimeUnknown': birthTimeUnknown,
        'timeZoneId': timeZoneId,
      },
    );

    return AstroUtcOffsetResult.fromJson(
      response['item'] as Map<String, dynamic>,
    );
  }

  Future<NumerologyGuideData> fetchNumerologyGuide() async {
    final response = await _send(
      method: 'GET',
      path: '/api/numerology/guide',
    );

    return NumerologyGuideData.fromJson(
      response['item'] as Map<String, dynamic>,
    );
  }

  Future<NumerologyProfileData> fetchNumerologyProfile({
    required NumerologyRequestInput input,
  }) async {
    final response = await _send(
      method: 'POST',
      path: '/api/numerology/profile',
      body: input.toJson(),
    );

    return NumerologyProfileData.fromJson(
      response['item'] as Map<String, dynamic>,
    );
  }

  Future<List<BirthPlaceOption>> searchBirthPlaces({
    required String query,
    int limit = 8,
  }) async {
    final response = await _send(
      method: 'GET',
      path: '/api/places/search',
      queryParameters: {
        'q': query,
        'limit': '$limit',
      },
    );

    final items = response['items'] as List<dynamic>? ?? const <dynamic>[];
    return items
        .whereType<Map<String, dynamic>>()
        .map(BirthPlaceOption.fromJson)
        .toList();
  }

  Future<Map<String, dynamic>> _send({
    required String method,
    required String path,
    String? accessToken,
    Map<String, dynamic>? body,
    Map<String, String>? queryParameters,
  }) async {
    final baseUri = Uri.parse('$baseUrl$path');
    final uri = queryParameters == null
        ? baseUri
        : baseUri.replace(
            queryParameters: {
              ...baseUri.queryParameters,
              ...queryParameters,
            },
          );
    final headers = <String, String>{
      'content-type': 'application/json',
      if (accessToken != null && accessToken.isNotEmpty)
        'authorization': 'Bearer $accessToken',
    };

    debugPrint('API $method $uri');
    late final http.Response response;
    try {
      switch (method) {
        case 'POST':
          response = await _httpClient
              .post(uri, headers: headers, body: jsonEncode(body ?? const {}))
              .timeout(const Duration(seconds: 15));
          break;
        case 'PATCH':
          response = await _httpClient
              .patch(uri, headers: headers, body: jsonEncode(body ?? const {}))
              .timeout(const Duration(seconds: 15));
          break;
        default:
          response = await _httpClient
              .get(uri, headers: headers)
              .timeout(const Duration(seconds: 15));
          break;
      }
    } on TimeoutException {
      debugPrint('API $method $uri -> timeout');
      throw Exception(AppConfig.connectionHelpMessage(baseUrl));
    } on http.ClientException {
      debugPrint('API $method $uri -> client exception');
      throw Exception(AppConfig.connectionHelpMessage(baseUrl));
    }

    debugPrint('API $method $uri -> ${response.statusCode}');
    final payload = jsonDecode(response.body) as Map<String, dynamic>;
    if (response.statusCode < 200 || response.statusCode >= 300) {
      final errorMessage = payload['error'] as String? ??
          'La API devolvió ${response.statusCode}.';
      throw Exception(errorMessage);
    }

    return payload;
  }

  String _resolveAssetUrl(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty ||
        trimmed.startsWith('data:') ||
        trimmed.startsWith('http://') ||
        trimmed.startsWith('https://')) {
      return trimmed;
    }

    if (trimmed.startsWith('/uploads/')) {
      return Uri.parse(baseUrl).resolve('/api$trimmed').toString();
    }

    return Uri.parse(baseUrl).resolve(trimmed).toString();
  }

  Future<String> _uploadStorageAsset({
    required String accessToken,
    required Uint8List bytes,
    required String fileName,
    required String contentType,
    required String category,
  }) async {
    final createResponse = await _send(
      method: 'POST',
      path: '/api/storage/uploads',
      accessToken: accessToken,
      body: {
        'filename': fileName,
        'contentType': contentType,
        'byteSize': bytes.length,
        'category': category,
      },
    );

    final item = createResponse['item'] as Map<String, dynamic>? ?? const {};
    final uploadUrl = item['uploadUrl'] as String? ?? '';
    final asset = item['asset'] as Map<String, dynamic>? ?? const {};
    if (uploadUrl.isEmpty) {
      throw Exception('La API no devolvió una URL de upload válida.');
    }

    late final http.Response uploadResponse;
    try {
      uploadResponse = await _httpClient
          .put(
            Uri.parse(uploadUrl),
            headers: {
              'content-type': contentType,
            },
            body: bytes,
          )
          .timeout(const Duration(seconds: 30));
    } on TimeoutException {
      throw Exception(AppConfig.connectionHelpMessage(baseUrl));
    } on http.ClientException {
      throw Exception(AppConfig.connectionHelpMessage(baseUrl));
    }

    Map<String, dynamic> payload = const {};
    if (uploadResponse.body.isNotEmpty) {
      final decoded = jsonDecode(uploadResponse.body);
      if (decoded is Map<String, dynamic>) {
        payload = decoded;
      }
    }

    if (uploadResponse.statusCode < 200 || uploadResponse.statusCode >= 300) {
      throw Exception(
        payload['error'] as String? ?? 'No se pudo subir el archivo a storage.',
      );
    }

    final uploadedItem = payload['item'] as Map<String, dynamic>? ?? asset;
    final publicUrl = uploadedItem['publicUrl'] as String? ?? '';
    if (publicUrl.isEmpty) {
      throw Exception('La API no devolvió la URL final del archivo.');
    }

    return publicUrl;
  }

  void _normalizeUserPayload(Map<String, dynamic> userJson) {
    final avatarUrl = userJson['avatarUrl'];
    if (avatarUrl is String) {
      userJson['avatarUrl'] = _resolveAssetUrl(avatarUrl);
    }
  }

  void _normalizeSessionPayload(Map<String, dynamic> sessionJson) {
    final userJson = sessionJson['user'];
    if (userJson is Map<String, dynamic>) {
      _normalizeUserPayload(userJson);
    }
  }

  void _normalizeBootstrapPayload(Map<String, dynamic> bootstrapJson) {
    final userJson = bootstrapJson['user'];
    if (userJson is Map<String, dynamic>) {
      _normalizeUserPayload(userJson);
    }

    final homeJson = bootstrapJson['home'];
    if (homeJson is Map<String, dynamic>) {
      final dailyCardJson = homeJson['cardOfTheDay'];
      if (dailyCardJson is Map<String, dynamic>) {
        final imageUrl = dailyCardJson['imageUrl'];
        if (imageUrl is String) {
          dailyCardJson['imageUrl'] = _resolveAssetUrl(imageUrl);
        }
      }
    }

    final shopJson = bootstrapJson['shop'];
    if (shopJson is Map<String, dynamic>) {
      final products = shopJson['products'] as List<dynamic>? ?? const [];
      for (final product in products) {
        if (product is Map<String, dynamic>) {
          _normalizeShopProductPayload(product);
        }
      }

      final orders = shopJson['orders'] as List<dynamic>? ?? const [];
      for (final order in orders) {
        if (order is Map<String, dynamic>) {
          _normalizeShopOrderPayload(order);
        }
      }
    }
  }

  void _normalizeShopProductPayload(Map<String, dynamic> productJson) {
    final imageUrl = productJson['imageUrl'];
    if (imageUrl is String) {
      productJson['imageUrl'] = _resolveAssetUrl(imageUrl);
    }

    final imageUrls = productJson['imageUrls'] as List<dynamic>? ?? const [];
    productJson['imageUrls'] = imageUrls
        .whereType<String>()
        .map(_resolveAssetUrl)
        .where((value) => value.trim().isNotEmpty)
        .toList();
  }

  void _normalizeShopOrderPayload(Map<String, dynamic> orderJson) {
    final items = orderJson['items'] as List<dynamic>? ?? const [];
    for (final item in items) {
      if (item is Map<String, dynamic>) {
        final imageUrl = item['imageUrl'];
        if (imageUrl is String) {
          item['imageUrl'] = _resolveAssetUrl(imageUrl);
        }
      }
    }
  }

  void dispose() {
    _httpClient.close();
  }
}
