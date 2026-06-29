import 'dart:io';

import 'package:flutter/services.dart';
import 'package:gallery_saver_plus/gallery_saver.dart';

const MethodChannel _mediaChannel = MethodChannel('lo_renaciente/media');

Future<bool?> saveChartImage(String path) async {
  if (Platform.isIOS) {
    try {
      final saved = await _mediaChannel.invokeMethod<bool>(
        'saveImageToPhotos',
        <String, dynamic>{'path': path},
      );
      return saved ?? false;
    } on MissingPluginException {
      return false;
    } on PlatformException {
      return false;
    }
  }

  try {
    return await GallerySaver.saveImage(path);
  } on MissingPluginException {
    return false;
  } on PlatformException {
    return false;
  }
}
