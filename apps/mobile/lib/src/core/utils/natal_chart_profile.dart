import '../../models/app_models.dart';

bool hasReusableNatalChartData(NatalChart natalChart) {
  final hasBirthTime =
      natalChart.birthTimeUnknown || natalChart.birthTime.trim().isNotEmpty;
  final latitude = natalChart.latitude;
  final longitude = natalChart.longitude;

  return natalChart.birthDate.trim().isNotEmpty &&
      hasBirthTime &&
      natalChart.city.trim().isNotEmpty &&
      natalChart.country.trim().isNotEmpty &&
      natalChart.utcOffset.trim().isNotEmpty &&
      latitude != null &&
      latitude >= -90 &&
      latitude <= 90 &&
      longitude != null &&
      longitude >= -180 &&
      longitude <= 180;
}

bool hasCompleteNatalProfileData(NatalChart natalChart) {
  return hasReusableNatalChartData(natalChart) &&
      natalChart.timeZoneId.trim().isNotEmpty;
}
