import 'dart:io';

import 'package:flutter/services.dart';
import 'package:gallery_saver_plus/gallery_saver.dart';
import 'package:path_provider/path_provider.dart';

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

Future<bool?> saveChartImageBytes(Uint8List bytes, String fileName) async {
  final tempDir = await getTemporaryDirectory();
  final file = File('${tempDir.path}/$fileName');
  await file.writeAsBytes(bytes, flush: true);
  return saveChartImage(file.path);
}
