class AppBootstrap {
  AppBootstrap({
    required this.app,
    required this.user,
    required this.home,
    required this.plans,
    required this.subscription,
    required this.payments,
    required this.services,
    required this.specialists,
    required this.courses,
    required this.shop,
    required this.bookings,
    required this.admin,
    required this.badges,
  });

  final AppMeta app;
  final UserProfile user;
  final HomeData home;
  final List<Plan> plans;
  final SubscriptionData subscription;
  final PaymentsConfig payments;
  final List<ServiceOffer> services;
  final List<Specialist> specialists;
  final List<Course> courses;
  final ShopData shop;
  final List<Booking> bookings;
  final AdminSummary admin;
  final BadgeProfileSummary badges;

  factory AppBootstrap.fromJson(Map<String, dynamic> json) {
    return AppBootstrap(
      app: _safeParseMap(json['app'], AppMeta.fromJson, AppMeta.empty()),
      user: _safeParseMap(
          json['user'], UserProfile.fromJson, UserProfile.empty()),
      home: _safeParseMap(json['home'], HomeData.fromJson, HomeData.empty()),
      plans: _mapList(json['plans'], Plan.fromJson),
      subscription: _safeParseMap(
        json['subscription'],
        SubscriptionData.fromJson,
        SubscriptionData.empty(),
      ),
      payments: _safeParseMap(
        json['payments'],
        PaymentsConfig.fromJson,
        PaymentsConfig.empty(),
      ),
      services: _mapList(json['services'], ServiceOffer.fromJson),
      specialists: _mapList(json['specialists'], Specialist.fromJson),
      courses: _parseCourses(json),
      shop: _safeParseMap(json['shop'], ShopData.fromJson, ShopData.empty()),
      bookings: _mapList(json['bookings'], Booking.fromJson),
      admin: _safeParseMap(
          json['admin'], AdminSummary.fromJson, AdminSummary.empty()),
      badges: _safeParseMap(
        json['badges'],
        BadgeProfileSummary.fromJson,
        const BadgeProfileSummary.empty(),
      ),
    );
  }
}

class BadgeProfileSummary {
  const BadgeProfileSummary({
    required this.totalCount,
    required this.unlockedCount,
    required this.lockedCount,
    required this.hiddenCount,
    required this.categories,
    required this.badges,
  });

  const BadgeProfileSummary.empty()
      : totalCount = 0,
        unlockedCount = 0,
        lockedCount = 0,
        hiddenCount = 0,
        categories = const [],
        badges = const [];

  final int totalCount;
  final int unlockedCount;
  final int lockedCount;
  final int hiddenCount;
  final List<BadgeCategorySummary> categories;
  final List<UserBadgeEntry> badges;

  List<UserBadgeEntry> get unlockedBadges =>
      badges.where((item) => item.unlocked).toList(growable: false);

  List<UserBadgeEntry> get visibleLockedBadges => badges
      .where((item) => !item.unlocked && !(item.isSecret && item.displayLocked))
      .toList(growable: false);

  List<UserBadgeEntry> get hiddenBadges => badges
      .where((item) => !item.unlocked && item.isSecret && item.displayLocked)
      .toList(growable: false);

  factory BadgeProfileSummary.fromJson(Map<String, dynamic> json) {
    return BadgeProfileSummary(
      totalCount: json['totalCount'] as int? ?? 0,
      unlockedCount: json['unlockedCount'] as int? ?? 0,
      lockedCount: json['lockedCount'] as int? ?? 0,
      hiddenCount: json['hiddenCount'] as int? ?? 0,
      categories: _mapList(
        json['categories'],
        BadgeCategorySummary.fromJson,
      ),
      badges: _mapList(json['badges'], UserBadgeEntry.fromJson),
    );
  }
}

class BadgeCategorySummary {
  const BadgeCategorySummary({
    required this.category,
    required this.totalCount,
    required this.unlockedCount,
  });

  final String category;
  final int totalCount;
  final int unlockedCount;

  factory BadgeCategorySummary.fromJson(Map<String, dynamic> json) {
    return BadgeCategorySummary(
      category: json['category'] as String? ?? '',
      totalCount: json['totalCount'] as int? ?? 0,
      unlockedCount: json['unlockedCount'] as int? ?? 0,
    );
  }
}

class UserBadgeEntry {
  const UserBadgeEntry({
    required this.id,
    required this.name,
    required this.description,
    required this.displayName,
    required this.displayDescription,
    required this.category,
    required this.rarity,
    required this.type,
    required this.pathId,
    required this.pathOrder,
    required this.stepIndex,
    required this.stepTitle,
    required this.stepDescription,
    required this.prerequisiteBadgeIds,
    required this.lockedReason,
    required this.isPathVisible,
    required this.isConditionHidden,
    required this.iconUrl,
    required this.displayIconUrl,
    required this.isSecret,
    required this.isActive,
    required this.unlocked,
    required this.unlockedAt,
    required this.source,
    required this.metadata,
  });

  final String id;
  final String name;
  final String description;
  final String displayName;
  final String displayDescription;
  final String category;
  final String rarity;
  final String type;
  final String pathId;
  final int pathOrder;
  final int stepIndex;
  final String stepTitle;
  final String stepDescription;
  final List<String> prerequisiteBadgeIds;
  final String lockedReason;
  final bool isPathVisible;
  final bool isConditionHidden;
  final String iconUrl;
  final String displayIconUrl;
  final bool isSecret;
  final bool isActive;
  final bool unlocked;
  final String? unlockedAt;
  final String? source;
  final Map<String, dynamic> metadata;

  bool get displayLocked => isSecret && !unlocked;

  factory UserBadgeEntry.fromJson(Map<String, dynamic> json) {
    return UserBadgeEntry(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      description: json['description'] as String? ?? '',
      displayName: json['displayName'] as String? ?? '',
      displayDescription: json['displayDescription'] as String? ?? '',
      category: json['category'] as String? ?? '',
      rarity: json['rarity'] as String? ?? '',
      type: json['type'] as String? ?? '',
      pathId: json['pathId'] as String? ?? '',
      pathOrder: json['pathOrder'] as int? ?? 0,
      stepIndex: json['stepIndex'] as int? ?? 0,
      stepTitle: json['stepTitle'] as String? ?? '',
      stepDescription: json['stepDescription'] as String? ?? '',
      prerequisiteBadgeIds: _stringList(json['prerequisiteBadgeIds']),
      lockedReason: json['lockedReason'] as String? ?? '',
      isPathVisible: json['isPathVisible'] as bool? ?? false,
      isConditionHidden: json['isConditionHidden'] as bool? ?? false,
      iconUrl: json['iconUrl'] as String? ?? '',
      displayIconUrl: json['displayIconUrl'] as String? ?? '',
      isSecret: json['isSecret'] as bool? ?? false,
      isActive: json['isActive'] as bool? ?? false,
      unlocked: json['unlocked'] as bool? ?? false,
      unlockedAt: json['unlockedAt'] as String?,
      source: json['source'] as String?,
      metadata: (json['metadata'] as Map<String, dynamic>?) ??
          const <String, dynamic>{},
    );
  }
}

class AppMeta {
  AppMeta({
    required this.name,
    required this.tagline,
    required this.market,
    required this.timezone,
  });

  final String name;
  final String tagline;
  final String market;
  final String timezone;

  const AppMeta.empty()
      : name = '',
        tagline = '',
        market = '',
        timezone = '';

  factory AppMeta.fromJson(Map<String, dynamic> json) {
    return AppMeta(
      name: json['name'] as String? ?? '',
      tagline: json['tagline'] as String? ?? '',
      market: json['market'] as String? ?? '',
      timezone: json['timezone'] as String? ?? '',
    );
  }
}

class UserProfile {
  UserProfile({
    required this.id,
    required this.firstName,
    required this.lastName,
    required this.nickname,
    required this.email,
    required this.avatarUrl,
    required this.location,
    required this.timezone,
    required this.zodiacSign,
    required this.planId,
    required this.accountType,
    required this.roles,
    required this.natalChart,
    required this.preferences,
    required this.energyProfile,
  });

  final String id;
  final String firstName;
  final String lastName;
  final String nickname;
  final String email;
  final String avatarUrl;
  final String location;
  final String timezone;
  final String zodiacSign;
  final String planId;
  final String accountType;
  final List<String> roles;
  final NatalChart natalChart;
  final UserPreferences preferences;
  final EnergyProfile energyProfile;

  const UserProfile.empty()
      : id = '',
        firstName = '',
        lastName = '',
        nickname = '',
        email = '',
        avatarUrl = '',
        location = '',
        timezone = '',
        zodiacSign = '',
        planId = '',
        accountType = 'client',
        roles = const [],
        natalChart = const NatalChart.empty(),
        preferences = const UserPreferences.empty(),
        energyProfile = const EnergyProfile.empty();

  factory UserProfile.fromJson(Map<String, dynamic> json) {
    return UserProfile(
      id: json['id'] as String? ?? '',
      firstName: json['firstName'] as String? ?? '',
      lastName: json['lastName'] as String? ?? '',
      nickname: json['nickname'] as String? ?? '',
      email: json['email'] as String? ?? '',
      avatarUrl: json['avatarUrl'] as String? ?? '',
      location: json['location'] as String? ?? '',
      timezone: json['timezone'] as String? ?? '',
      zodiacSign: json['zodiacSign'] as String? ?? '',
      planId: json['planId'] as String? ?? '',
      accountType: json['accountType'] as String? ?? 'client',
      roles: _stringList(json['roles']),
      natalChart: NatalChart.fromJson(_asMap(json['natalChart'])),
      preferences: UserPreferences.fromJson(
        _asMap(json['preferences']),
      ),
      energyProfile: EnergyProfile.fromJson(_asMap(json['energyProfile'])),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'id': id,
      'firstName': firstName,
      'lastName': lastName,
      'nickname': nickname,
      'email': email,
      'avatarUrl': avatarUrl,
      'location': location,
      'timezone': timezone,
      'zodiacSign': zodiacSign,
      'planId': planId,
      'accountType': accountType,
      'roles': roles,
      'natalChart': natalChart.toJson(),
      'preferences': preferences.toJson(),
      'energyProfile': energyProfile.toJson(),
    };
  }
}

class EnergyProfile {
  const EnergyProfile({
    required this.sign,
    required this.element,
    required this.modality,
    required this.rulingPlanet,
    required this.powerColorName,
    required this.powerColorHex,
    required this.powerDay,
    required this.energyNumber,
    required this.energyStone,
    required this.chakra,
    required this.ritual,
    required this.affirmation,
    required this.focusArea,
    required this.energyTheme,
  });

  final String sign;
  final String element;
  final String modality;
  final String rulingPlanet;
  final String powerColorName;
  final String powerColorHex;
  final String powerDay;
  final int energyNumber;
  final String energyStone;
  final String chakra;
  final String ritual;
  final String affirmation;
  final String focusArea;
  final String energyTheme;

  const EnergyProfile.empty()
      : sign = '',
        element = '',
        modality = '',
        rulingPlanet = '',
        powerColorName = '',
        powerColorHex = '',
        powerDay = '',
        energyNumber = 0,
        energyStone = '',
        chakra = '',
        ritual = '',
        affirmation = '',
        focusArea = '',
        energyTheme = '';

  bool get isAvailable =>
      sign.trim().isNotEmpty ||
      powerColorName.trim().isNotEmpty ||
      energyStone.trim().isNotEmpty;

  factory EnergyProfile.fromJson(Map<String, dynamic> json) {
    return EnergyProfile(
      sign: json['sign'] as String? ?? '',
      element: json['element'] as String? ?? '',
      modality: json['modality'] as String? ?? '',
      rulingPlanet: json['rulingPlanet'] as String? ?? '',
      powerColorName: json['powerColorName'] as String? ?? '',
      powerColorHex: json['powerColorHex'] as String? ?? '',
      powerDay: json['powerDay'] as String? ?? '',
      energyNumber: json['energyNumber'] as int? ?? 0,
      energyStone: json['energyStone'] as String? ?? '',
      chakra: json['chakra'] as String? ?? '',
      ritual: json['ritual'] as String? ?? '',
      affirmation: json['affirmation'] as String? ?? '',
      focusArea: json['focusArea'] as String? ?? '',
      energyTheme: json['energyTheme'] as String? ?? '',
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'sign': sign,
      'element': element,
      'modality': modality,
      'rulingPlanet': rulingPlanet,
      'powerColorName': powerColorName,
      'powerColorHex': powerColorHex,
      'powerDay': powerDay,
      'energyNumber': energyNumber,
      'energyStone': energyStone,
      'chakra': chakra,
      'ritual': ritual,
      'affirmation': affirmation,
      'focusArea': focusArea,
      'energyTheme': energyTheme,
    };
  }
}

class NatalChart {
  NatalChart({
    required this.subjectName,
    required this.birthDate,
    required this.birthTime,
    required this.birthTimeUnknown,
    required this.city,
    required this.state,
    required this.country,
    required this.timeZoneId,
    required this.utcOffset,
    required this.latitude,
    required this.longitude,
  });

  final String subjectName;
  final String birthDate;
  final String birthTime;
  final bool birthTimeUnknown;
  final String city;
  final String state;
  final String country;
  final String timeZoneId;
  final String utcOffset;
  final double? latitude;
  final double? longitude;

  const NatalChart.empty()
      : subjectName = '',
        birthDate = '',
        birthTime = '',
        birthTimeUnknown = true,
        city = '',
        state = '',
        country = '',
        timeZoneId = '',
        utcOffset = '',
        latitude = null,
        longitude = null;

  factory NatalChart.fromJson(Map<String, dynamic> json) {
    return NatalChart(
      subjectName: json['subjectName'] as String? ?? '',
      birthDate: json['birthDate'] as String? ?? '',
      birthTime: json['birthTime'] as String? ?? '',
      birthTimeUnknown: json['birthTimeUnknown'] as bool? ?? false,
      city: json['city'] as String? ?? '',
      state: json['state'] as String? ?? '',
      country: json['country'] as String? ?? '',
      timeZoneId: json['timeZoneId'] as String? ?? '',
      utcOffset: json['utcOffset'] as String? ?? '',
      latitude: _asNullableDouble(json['latitude']),
      longitude: _asNullableDouble(json['longitude']),
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'subjectName': subjectName,
      'birthDate': birthDate,
      'birthTime': birthTime,
      'birthTimeUnknown': birthTimeUnknown,
      'city': city,
      'state': state,
      'country': country,
      'timeZoneId': timeZoneId,
      'utcOffset': utcOffset,
      'latitude': latitude,
      'longitude': longitude,
    };
  }
}

class UserPreferences {
  UserPreferences({
    required this.focusAreas,
    required this.preferredSessionModes,
    required this.receivesPush,
  });

  final List<String> focusAreas;
  final List<String> preferredSessionModes;
  final bool receivesPush;

  const UserPreferences.empty()
      : focusAreas = const [],
        preferredSessionModes = const [],
        receivesPush = false;

  factory UserPreferences.fromJson(Map<String, dynamic> json) {
    return UserPreferences(
      focusAreas: _stringList(json['focusAreas']),
      preferredSessionModes: _stringList(json['preferredSessionModes']),
      receivesPush: json['receivesPush'] as bool? ?? false,
    );
  }

  Map<String, dynamic> toJson() {
    return {
      'focusAreas': focusAreas,
      'preferredSessionModes': preferredSessionModes,
      'receivesPush': receivesPush,
    };
  }
}

class HomeData {
  HomeData({
    required this.welcomeTitle,
    required this.welcomeSubtitle,
    required this.cardOfTheDay,
    required this.astrologicalEnergy,
    required this.quickActions,
    required this.upcomingBooking,
    required this.featuredMessage,
  });

  final String welcomeTitle;
  final String welcomeSubtitle;
  final DailyCard cardOfTheDay;
  final AstrologicalEnergy astrologicalEnergy;
  final List<QuickAction> quickActions;
  final BookingSummary? upcomingBooking;
  final String featuredMessage;

  const HomeData.empty()
      : welcomeTitle = '',
        welcomeSubtitle = '',
        cardOfTheDay = const DailyCard.empty(),
        astrologicalEnergy = const AstrologicalEnergy.empty(),
        quickActions = const [],
        upcomingBooking = null,
        featuredMessage = '';

  factory HomeData.fromJson(Map<String, dynamic> json) {
    return HomeData(
      welcomeTitle: json['welcomeTitle'] as String? ?? '',
      welcomeSubtitle: json['welcomeSubtitle'] as String? ?? '',
      cardOfTheDay: DailyCard.fromJson(
        _asMap(json['cardOfTheDay']),
      ),
      astrologicalEnergy: AstrologicalEnergy.fromJson(
        _asMap(json['astrologicalEnergy']),
      ),
      quickActions: _mapList(json['quickActions'], QuickAction.fromJson),
      upcomingBooking: json['upcomingBooking'] == null
          ? null
          : BookingSummary.fromJson(
              json['upcomingBooking'] as Map<String, dynamic>,
            ),
      featuredMessage: json['featuredMessage'] as String? ?? '',
    );
  }
}

class DailyCard {
  DailyCard({
    required this.title,
    required this.cardName,
    required this.message,
    required this.ritual,
    required this.imageUrl,
  });

  final String title;
  final String cardName;
  final String message;
  final String ritual;
  final String imageUrl;

  const DailyCard.empty()
      : title = '',
        cardName = '',
        message = '',
        ritual = '',
        imageUrl = '';

  factory DailyCard.fromJson(Map<String, dynamic> json) {
    return DailyCard(
      title: json['title'] as String? ?? '',
      cardName: json['cardName'] as String? ?? '',
      message: json['message'] as String? ?? '',
      ritual: json['ritual'] as String? ?? '',
      imageUrl: json['imageUrl'] as String? ?? '',
    );
  }
}

class AstrologicalEnergy {
  AstrologicalEnergy({
    required this.title,
    required this.summary,
    required this.advice,
    required this.intensity,
  });

  final String title;
  final String summary;
  final String advice;
  final String intensity;

  const AstrologicalEnergy.empty()
      : title = '',
        summary = '',
        advice = '',
        intensity = '';

  factory AstrologicalEnergy.fromJson(Map<String, dynamic> json) {
    return AstrologicalEnergy(
      title: json['title'] as String? ?? '',
      summary: json['summary'] as String? ?? '',
      advice: json['advice'] as String? ?? '',
      intensity: json['intensity'] as String? ?? '',
    );
  }
}

class QuickAction {
  QuickAction({
    required this.id,
    required this.label,
    required this.description,
    required this.type,
  });

  final String id;
  final String label;
  final String description;
  final String type;

  factory QuickAction.fromJson(Map<String, dynamic> json) {
    return QuickAction(
      id: json['id'] as String? ?? '',
      label: json['label'] as String? ?? '',
      description: json['description'] as String? ?? '',
      type: json['type'] as String? ?? '',
    );
  }
}

class BookingSummary {
  BookingSummary({
    required this.id,
    required this.specialistName,
    required this.serviceName,
    required this.scheduledAt,
    required this.status,
  });

  final String id;
  final String specialistName;
  final String serviceName;
  final String scheduledAt;
  final String status;

  factory BookingSummary.fromJson(Map<String, dynamic> json) {
    return BookingSummary(
      id: json['id'] as String? ?? '',
      specialistName: json['specialistName'] as String? ?? '',
      serviceName: json['serviceName'] as String? ?? '',
      scheduledAt: json['scheduledAt'] as String? ?? '',
      status: json['status'] as String? ?? '',
    );
  }
}

class Plan {
  Plan({
    required this.id,
    required this.name,
    required this.tier,
    required this.priceMonthly,
    required this.currency,
    required this.isPopular,
    required this.features,
    required this.sessionMessageLimit,
    required this.consultationAccess,
  });

  final String id;
  final String name;
  final String tier;
  final double priceMonthly;
  final String currency;
  final bool isPopular;
  final List<String> features;
  final int? sessionMessageLimit;
  final List<String> consultationAccess;

  factory Plan.fromJson(Map<String, dynamic> json) {
    return Plan(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      tier: json['tier'] as String? ?? '',
      priceMonthly: (json['priceMonthly'] as num?)?.toDouble() ?? 0,
      currency: json['currency'] as String? ?? '',
      isPopular: json['isPopular'] as bool? ?? false,
      features: _stringList(json['features']),
      sessionMessageLimit: json['sessionMessageLimit'] as int?,
      consultationAccess: _stringList(json['consultationAccess']),
    );
  }
}

class SubscriptionData {
  SubscriptionData({
    required this.planId,
    required this.planName,
    required this.status,
    required this.renewsAt,
    required this.platform,
    required this.billingProvider,
    required this.entitlements,
  });

  final String planId;
  final String planName;
  final String status;
  final String? renewsAt;
  final String platform;
  final String billingProvider;
  final List<String> entitlements;

  bool get isPremiumActive {
    if (planId != 'premium' || status != 'active') {
      return false;
    }

    final rawRenewsAt = renewsAt?.trim() ?? '';
    if (rawRenewsAt.isEmpty) {
      return true;
    }

    final parsed = DateTime.tryParse(rawRenewsAt);
    return parsed == null || parsed.isAfter(DateTime.now());
  }

  const SubscriptionData.empty()
      : planId = '',
        planName = '',
        status = '',
        renewsAt = null,
        platform = '',
        billingProvider = '',
        entitlements = const [];

  factory SubscriptionData.fromJson(Map<String, dynamic> json) {
    return SubscriptionData(
      planId: json['planId'] as String? ?? '',
      planName: json['planName'] as String? ?? '',
      status: json['status'] as String? ?? '',
      renewsAt: json['renewsAt'] as String?,
      platform: json['platform'] as String? ?? '',
      billingProvider: json['billingProvider'] as String? ?? '',
      entitlements: _stringList(json['entitlements']),
    );
  }
}

class PaymentsConfig {
  PaymentsConfig({
    required this.consultationProvider,
    required this.premiumProvider,
    required this.supportedMethods,
    required this.notes,
  });

  final String consultationProvider;
  final String premiumProvider;
  final List<String> supportedMethods;
  final List<String> notes;

  const PaymentsConfig.empty()
      : consultationProvider = '',
        premiumProvider = '',
        supportedMethods = const [],
        notes = const [];

  factory PaymentsConfig.fromJson(Map<String, dynamic> json) {
    return PaymentsConfig(
      consultationProvider: json['consultationProvider'] as String? ?? '',
      premiumProvider: json['premiumProvider'] as String? ?? '',
      supportedMethods: _stringList(json['supportedMethods']),
      notes: _stringList(json['notes']),
    );
  }
}

class ServiceOffer {
  ServiceOffer({
    required this.id,
    required this.name,
    required this.category,
    required this.description,
    required this.durationMinutes,
    required this.price,
    required this.deliveryModes,
    required this.premiumIncluded,
    required this.specialistIds,
  });

  final String id;
  final String name;
  final String category;
  final String description;
  final int durationMinutes;
  final Money price;
  final List<String> deliveryModes;
  final bool premiumIncluded;
  final List<String> specialistIds;

  factory ServiceOffer.fromJson(Map<String, dynamic> json) {
    return ServiceOffer(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      category: json['category'] as String? ?? '',
      description: json['description'] as String? ?? '',
      durationMinutes: json['durationMinutes'] as int? ?? 0,
      price: Money.fromJson(json['price'] as Map<String, dynamic>),
      deliveryModes: _stringList(json['deliveryModes']),
      premiumIncluded: json['premiumIncluded'] as bool? ?? false,
      specialistIds: _stringList(json['specialistIds']),
    );
  }
}

class UpdateServiceOfferInput {
  UpdateServiceOfferInput({
    this.priceAmount,
    this.durationMinutes,
  });

  final double? priceAmount;
  final int? durationMinutes;

  Map<String, dynamic> toJson() {
    return {
      if (priceAmount != null)
        'price': {
          'amount': priceAmount,
          'currency': 'USD',
        },
      if (durationMinutes != null) 'durationMinutes': durationMinutes,
    };
  }
}

class Specialist {
  Specialist({
    required this.id,
    required this.name,
    required this.headline,
    required this.specialties,
    required this.bio,
    required this.yearsExperience,
    required this.sessionModes,
    required this.languages,
    required this.rating,
    required this.reviewCount,
    required this.featured,
    required this.nextAvailableAt,
  });

  final String id;
  final String name;
  final String headline;
  final List<String> specialties;
  final String bio;
  final int yearsExperience;
  final List<String> sessionModes;
  final List<String> languages;
  final double rating;
  final int reviewCount;
  final bool featured;
  final String nextAvailableAt;

  factory Specialist.fromJson(Map<String, dynamic> json) {
    return Specialist(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      headline: json['headline'] as String? ?? '',
      specialties: _stringList(json['specialties']),
      bio: json['bio'] as String? ?? '',
      yearsExperience: json['yearsExperience'] as int? ?? 0,
      sessionModes: _stringList(json['sessionModes']),
      languages: _stringList(json['languages']),
      rating: (json['rating'] as num?)?.toDouble() ?? 0,
      reviewCount: json['reviewCount'] as int? ?? 0,
      featured: json['featured'] as bool? ?? false,
      nextAvailableAt: json['nextAvailableAt'] as String? ?? '',
    );
  }
}

class Course {
  Course({
    required this.id,
    required this.title,
    required this.subtitle,
    required this.category,
    required this.level,
    required this.premium,
    required this.featured,
    required this.removable,
    required this.estimatedHours,
    required this.moduleCount,
    required this.lessonCount,
    required this.progressPercent,
    required this.streakDays,
    required this.hook,
    required this.description,
    required this.outcomes,
    required this.modules,
    this.coverImageUrl,
  });

  final String id;
  final String title;
  final String subtitle;
  final String category;
  final String level;
  final bool premium;
  final bool featured;
  final bool removable;
  final double estimatedHours;
  final int moduleCount;
  final int lessonCount;
  final int progressPercent;
  final int streakDays;
  final String hook;
  final String description;
  final List<String> outcomes;
  final List<CourseModule> modules;
  final String? coverImageUrl;

  factory Course.fromJson(Map<String, dynamic> json) {
    final modules = _mapList(json['modules'], CourseModule.fromJson);
    final derivedLessonCount = modules.fold<int>(
      0,
      (sum, module) => sum + module.lessons.length,
    );

    return Course(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      subtitle: json['subtitle'] as String? ?? '',
      category: json['category'] as String? ?? '',
      level: json['level'] as String? ?? '',
      premium: json['premium'] as bool? ?? false,
      featured: json['featured'] as bool? ?? false,
      removable: json['removable'] as bool? ?? false,
      estimatedHours: (json['estimatedHours'] as num?)?.toDouble() ?? 0,
      moduleCount: json['moduleCount'] as int? ?? modules.length,
      lessonCount: json['lessonCount'] as int? ?? derivedLessonCount,
      progressPercent: json['progressPercent'] as int? ?? 0,
      streakDays: json['streakDays'] as int? ?? 0,
      hook: json['hook'] as String? ?? '',
      description: json['description'] as String? ?? '',
      outcomes: _stringList(json['outcomes']),
      modules: modules,
      coverImageUrl: json['coverImageUrl'] as String?,
    );
  }
}

class CreateCourseFromResourceInput {
  const CreateCourseFromResourceInput({
    required this.title,
    required this.subtitle,
    required this.category,
    required this.description,
    required this.resourceTitle,
    required this.resourceKind,
    required this.resourceUrl,
  });

  final String title;
  final String subtitle;
  final String category;
  final String description;
  final String resourceTitle;
  final String resourceKind;
  final String resourceUrl;

  Map<String, dynamic> toJson() {
    return {
      'title': title,
      'subtitle': subtitle,
      'category': category,
      'description': description,
      'resourceTitle': resourceTitle,
      'resourceKind': resourceKind,
      'resourceUrl': resourceUrl,
    };
  }
}

class CourseModule {
  CourseModule({
    required this.id,
    required this.title,
    required this.summary,
    required this.durationMinutes,
    required this.lessons,
  });

  final String id;
  final String title;
  final String summary;
  final int durationMinutes;
  final List<CourseLesson> lessons;

  factory CourseModule.fromJson(Map<String, dynamic> json) {
    return CourseModule(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      summary: json['summary'] as String? ?? '',
      durationMinutes: json['durationMinutes'] as int? ?? 0,
      lessons: _mapList(json['lessons'], CourseLesson.fromJson),
    );
  }
}

class CourseLesson {
  CourseLesson({
    required this.id,
    required this.title,
    required this.format,
    required this.durationMinutes,
    required this.prompt,
    required this.content,
    this.resourceUrl,
  });

  final String id;
  final String title;
  final String format;
  final int durationMinutes;
  final String prompt;
  final String content;
  final String? resourceUrl;

  factory CourseLesson.fromJson(Map<String, dynamic> json) {
    return CourseLesson(
      id: json['id'] as String? ?? '',
      title: json['title'] as String? ?? '',
      format: json['format'] as String? ?? '',
      durationMinutes: json['durationMinutes'] as int? ?? 0,
      prompt: json['prompt'] as String? ?? '',
      content: json['content'] as String? ?? '',
      resourceUrl: json['resourceUrl'] as String?,
    );
  }
}

class Booking {
  Booking({
    required this.id,
    required this.userId,
    required this.serviceId,
    required this.serviceName,
    required this.specialistId,
    required this.specialistName,
    required this.scheduledAt,
    required this.mode,
    required this.status,
    required this.price,
    required this.notes,
  });

  final String id;
  final String userId;
  final String serviceId;
  final String serviceName;
  final String specialistId;
  final String specialistName;
  final String scheduledAt;
  final String mode;
  final String status;
  final Money price;
  final String notes;

  factory Booking.fromJson(Map<String, dynamic> json) {
    return Booking(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      serviceId: json['serviceId'] as String? ?? '',
      serviceName: json['serviceName'] as String? ?? '',
      specialistId: json['specialistId'] as String? ?? '',
      specialistName: json['specialistName'] as String? ?? '',
      scheduledAt: json['scheduledAt'] as String? ?? '',
      mode: json['mode'] as String? ?? '',
      status: json['status'] as String? ?? '',
      price: Money.fromJson(json['price'] as Map<String, dynamic>),
      notes: json['notes'] as String? ?? '',
    );
  }
}

class ShopData {
  ShopData({
    required this.title,
    required this.subtitle,
    required this.featuredNote,
    required this.supportNote,
    required this.currency,
    required this.products,
    required this.orders,
  });

  final String title;
  final String subtitle;
  final String featuredNote;
  final String supportNote;
  final String currency;
  final List<ShopProduct> products;
  final List<ShopOrder> orders;

  const ShopData.empty()
      : title = '',
        subtitle = '',
        featuredNote = '',
        supportNote = '',
        currency = 'USD',
        products = const [],
        orders = const [];

  factory ShopData.fromJson(Map<String, dynamic> json) {
    return ShopData(
      title: json['title'] as String? ?? '',
      subtitle: json['subtitle'] as String? ?? '',
      featuredNote: json['featuredNote'] as String? ?? '',
      supportNote: json['supportNote'] as String? ?? '',
      currency: json['currency'] as String? ?? 'USD',
      products: _mapList(json['products'], ShopProduct.fromJson),
      orders: _mapList(json['orders'], ShopOrder.fromJson),
    );
  }
}

class ShopProduct {
  ShopProduct({
    required this.id,
    required this.name,
    required this.category,
    required this.specialistId,
    required this.specialistName,
    required this.storeId,
    required this.storeName,
    required this.shortDescription,
    required this.description,
    required this.price,
    required this.sku,
    required this.status,
    required this.imageUrl,
    required this.imageUrls,
    required this.artwork,
    required this.badge,
    required this.featured,
    required this.stockLabel,
    required this.stockQuantity,
    required this.madeToOrder,
    required this.tags,
  });

  final String id;
  final String name;
  final String category;
  final String specialistId;
  final String specialistName;
  final String storeId;
  final String storeName;
  final String shortDescription;
  final String description;
  final Money price;
  final String sku;
  final String status;
  final String imageUrl;
  final List<String> imageUrls;
  final String artwork;
  final String badge;
  final bool featured;
  final String stockLabel;
  final int stockQuantity;
  final bool madeToOrder;
  final List<String> tags;

  factory ShopProduct.fromJson(Map<String, dynamic> json) {
    final imageUrl = json['imageUrl'] as String? ?? '';
    return ShopProduct(
      id: json['id'] as String? ?? '',
      name: json['name'] as String? ?? '',
      category: json['category'] as String? ?? '',
      specialistId: json['specialistId'] as String? ?? '',
      specialistName: json['specialistName'] as String? ?? '',
      storeId: json['storeId'] as String? ?? '',
      storeName: json['storeName'] as String? ?? '',
      shortDescription: json['shortDescription'] as String? ?? '',
      description: json['description'] as String? ?? '',
      price: Money.fromJson(json['price'] as Map<String, dynamic>),
      sku: json['sku'] as String? ?? '',
      status: json['status'] as String? ?? 'active',
      imageUrl: imageUrl,
      imageUrls: _galleryList(json['imageUrls'], fallback: imageUrl),
      artwork: json['artwork'] as String? ?? '',
      badge: json['badge'] as String? ?? '',
      featured: json['featured'] as bool? ?? false,
      stockLabel: json['stockLabel'] as String? ?? '',
      stockQuantity: (json['stockQuantity'] as num?)?.toInt() ?? 0,
      madeToOrder: json['madeToOrder'] as bool? ?? false,
      tags: _stringList(json['tags']),
    );
  }
}

class ShopOrder {
  ShopOrder({
    required this.id,
    required this.userId,
    required this.orderCode,
    required this.status,
    required this.createdAt,
    required this.specialistId,
    required this.specialistName,
    required this.storeId,
    required this.storeName,
    required this.deliveryAddress,
    required this.notes,
    required this.subtotal,
    required this.shipping,
    required this.total,
    required this.itemCount,
    required this.items,
  });

  final String id;
  final String userId;
  final String orderCode;
  final String status;
  final String createdAt;
  final String specialistId;
  final String specialistName;
  final String storeId;
  final String storeName;
  final String deliveryAddress;
  final String notes;
  final Money subtotal;
  final Money shipping;
  final Money total;
  final int itemCount;
  final List<ShopOrderItem> items;

  factory ShopOrder.fromJson(Map<String, dynamic> json) {
    return ShopOrder(
      id: json['id'] as String? ?? '',
      userId: json['userId'] as String? ?? '',
      orderCode: json['orderCode'] as String? ?? '',
      status: json['status'] as String? ?? '',
      createdAt: json['createdAt'] as String? ?? '',
      specialistId: json['specialistId'] as String? ?? '',
      specialistName: json['specialistName'] as String? ?? '',
      storeId: json['storeId'] as String? ?? '',
      storeName: json['storeName'] as String? ?? '',
      deliveryAddress: json['deliveryAddress'] as String? ?? '',
      notes: json['notes'] as String? ?? '',
      subtotal: Money.fromJson(json['subtotal'] as Map<String, dynamic>),
      shipping: Money.fromJson(json['shipping'] as Map<String, dynamic>),
      total: Money.fromJson(json['total'] as Map<String, dynamic>),
      itemCount: json['itemCount'] as int? ?? 0,
      items: _mapList(json['items'], ShopOrderItem.fromJson),
    );
  }
}

class ShopOrderItem {
  ShopOrderItem({
    required this.productId,
    required this.productName,
    required this.category,
    required this.quantity,
    required this.imageUrl,
    required this.unitPrice,
    required this.lineTotal,
  });

  final String productId;
  final String productName;
  final String category;
  final int quantity;
  final String imageUrl;
  final Money unitPrice;
  final Money lineTotal;

  factory ShopOrderItem.fromJson(Map<String, dynamic> json) {
    return ShopOrderItem(
      productId: json['productId'] as String? ?? '',
      productName: json['productName'] as String? ?? '',
      category: json['category'] as String? ?? '',
      quantity: json['quantity'] as int? ?? 0,
      imageUrl: json['imageUrl'] as String? ?? '',
      unitPrice: Money.fromJson(json['unitPrice'] as Map<String, dynamic>),
      lineTotal: Money.fromJson(json['lineTotal'] as Map<String, dynamic>),
    );
  }
}

class Money {
  Money({
    required this.amount,
    required this.currency,
  });

  final double amount;
  final String currency;

  factory Money.fromJson(Map<String, dynamic> json) {
    return Money(
      amount: (json['amount'] as num?)?.toDouble() ?? 0,
      currency: json['currency'] as String? ?? '',
    );
  }
}

class AdminSummary {
  AdminSummary({
    required this.activeUsers,
    required this.premiumSubscribers,
    required this.monthlyBookings,
    required this.activeSpecialists,
    required this.openIncidents,
  });

  final int activeUsers;
  final int premiumSubscribers;
  final int monthlyBookings;
  final int activeSpecialists;
  final int openIncidents;

  const AdminSummary.empty()
      : activeUsers = 0,
        premiumSubscribers = 0,
        monthlyBookings = 0,
        activeSpecialists = 0,
        openIncidents = 0;

  factory AdminSummary.fromJson(Map<String, dynamic> json) {
    return AdminSummary(
      activeUsers: json['activeUsers'] as int? ?? 0,
      premiumSubscribers: json['premiumSubscribers'] as int? ?? 0,
      monthlyBookings: json['monthlyBookings'] as int? ?? 0,
      activeSpecialists: json['activeSpecialists'] as int? ?? 0,
      openIncidents: json['openIncidents'] as int? ?? 0,
    );
  }
}

List<T> _mapList<T>(
  Object? raw,
  T Function(Map<String, dynamic> json) factory,
) {
  final list = raw as List<dynamic>? ?? const [];
  final items = <T>[];
  for (final item in list) {
    if (item is Map<String, dynamic>) {
      try {
        items.add(factory(item));
      } catch (_) {
        // Skip invalid items instead of failing the whole bootstrap.
      }
    }
  }
  return items;
}

List<String> _stringList(Object? raw) {
  final list = raw as List<dynamic>? ?? const [];
  return list.map((item) => item as String).toList();
}

Map<String, dynamic> _asMap(Object? raw) {
  if (raw is Map<String, dynamic>) {
    return raw;
  }

  return const <String, dynamic>{};
}

T _safeParseMap<T>(
  Object? raw,
  T Function(Map<String, dynamic> json) factory,
  T fallback,
) {
  try {
    return factory(_asMap(raw));
  } catch (_) {
    return fallback;
  }
}

List<String> _galleryList(
  Object? raw, {
  String fallback = '',
}) {
  final urls = <String>[];
  final seen = <String>{};

  void addUrl(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty || !seen.add(trimmed)) {
      return;
    }
    urls.add(trimmed);
  }

  addUrl(fallback);

  final list = raw as List<dynamic>? ?? const [];
  for (final item in list) {
    if (item is String) {
      addUrl(item);
    }
  }

  if (urls.isNotEmpty && urls.length < 3) {
    final base = List<String>.from(urls);
    var index = 0;
    while (urls.length < 3) {
      urls.add(base[index % base.length]);
      index += 1;
    }
  }

  return urls;
}

List<Course> _parseCourses(Map<String, dynamic> json) {
  final rawCourses = json['courses'];
  if (rawCourses is List<dynamic>) {
    final courses = <Course>[];
    for (final item in rawCourses) {
      if (item is Map<String, dynamic>) {
        try {
          courses.add(Course.fromJson(item));
        } catch (_) {
          // Skip malformed courses instead of aborting bootstrap parsing.
        }
      }
    }
    return courses;
  }

  final rawLibrary = json['library'] as List<dynamic>? ?? const [];
  return rawLibrary.map((item) {
    final entry = item as Map<String, dynamic>;
    final title = entry['title'] as String? ?? 'Curso breve';
    final category = entry['category'] as String? ?? 'General';
    final excerpt = entry['excerpt'] as String? ?? '';
    final readingTimeMinutes = entry['readingTimeMinutes'] as int? ?? 8;

    return Course(
      id: entry['id'] as String? ?? title.toLowerCase(),
      title: title,
      subtitle: 'Ruta express para no perder continuidad',
      category: category,
      level: 'Express',
      premium: entry['premium'] as bool? ?? false,
      featured: false,
      removable: true,
      estimatedHours:
          ((readingTimeMinutes / 60).clamp(0.5, 2.0) as num).toDouble(),
      moduleCount: 1,
      lessonCount: 1,
      progressPercent: 0,
      streakDays: 0,
      hook: excerpt,
      description: excerpt,
      outcomes: [
        'Transformar una lectura heredada en una práctica accionable.',
      ],
      modules: [
        CourseModule(
          id: '${entry['id'] ?? 'legacy'}-module',
          title: 'Transición desde contenido guardado',
          summary: 'Migración automática de la biblioteca anterior.',
          durationMinutes: readingTimeMinutes,
          lessons: [
            CourseLesson(
              id: '${entry['id'] ?? 'legacy'}-lesson',
              title: title,
              format: 'Lectura',
              durationMinutes: readingTimeMinutes,
              prompt: excerpt,
              content: excerpt,
            ),
          ],
        ),
      ],
    );
  }).toList();
}

double? _asNullableDouble(Object? raw) {
  if (raw == null) {
    return null;
  }

  if (raw is num) {
    return raw.toDouble();
  }

  return double.tryParse(raw.toString());
}
