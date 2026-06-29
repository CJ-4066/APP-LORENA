import Flutter
import Photos
import UIKit
#if canImport(image_picker_ios)
import image_picker_ios
#endif
#if canImport(path_provider_foundation)
import path_provider_foundation
#endif
#if canImport(share_plus)
import share_plus
#endif
#if canImport(shared_preferences_foundation)
import shared_preferences_foundation
#endif
#if canImport(url_launcher_ios)
import url_launcher_ios
#endif

@main
@objc class AppDelegate: FlutterAppDelegate {
  private let mediaChannelName = "lo_renaciente/media"
  lazy var flutterEngine = FlutterEngine(name: "lo_renaciente_engine")

  override func application(
    _ application: UIApplication,
    didFinishLaunchingWithOptions launchOptions: [UIApplication.LaunchOptionsKey: Any]?
  ) -> Bool {
    print("LR iOS AppDelegate didFinishLaunching start")
    flutterEngine.run()
    registerSafePlugins(on: flutterEngine)
    registerMediaChannel(on: flutterEngine)
    print("LR iOS AppDelegate plugins registered")

    let result = super.application(application, didFinishLaunchingWithOptions: launchOptions)
    print("LR iOS AppDelegate didFinishLaunching end \(result)")
    return result
  }

  private func registerSafePlugins(on engine: FlutterEngine) {
    // gallery_saver_plus estaba provocando un crash nativo en iPhone al
    // registrarse durante el arranque. Lo omitimos en iOS para priorizar
    // apertura estable de la app; la exportacion usa fallback en Dart.
#if canImport(image_picker_ios)
    if let registrar = engine.registrar(forPlugin: "FLTImagePickerPlugin") {
      FLTImagePickerPlugin.register(with: registrar)
    }
#endif
#if canImport(path_provider_foundation)
    if let registrar = engine.registrar(forPlugin: "PathProviderPlugin") {
      PathProviderPlugin.register(with: registrar)
    }
#endif
#if canImport(share_plus)
    if let registrar = engine.registrar(forPlugin: "FPPSharePlusPlugin") {
      FPPSharePlusPlugin.register(with: registrar)
    }
#endif
#if canImport(shared_preferences_foundation)
    if let registrar = engine.registrar(forPlugin: "SharedPreferencesPlugin") {
      SharedPreferencesPlugin.register(with: registrar)
    }
#endif
#if canImport(url_launcher_ios)
    if let registrar = engine.registrar(forPlugin: "URLLauncherPlugin") {
      URLLauncherPlugin.register(with: registrar)
    }
#endif
  }

  private func registerMediaChannel(on engine: FlutterEngine) {
    let channel = FlutterMethodChannel(
      name: mediaChannelName,
      binaryMessenger: engine.binaryMessenger
    )

    channel.setMethodCallHandler { [weak self] call, result in
      guard let self = self else {
        result(
          FlutterError(
            code: "delegate_unavailable",
            message: "AppDelegate no disponible.",
            details: nil
          )
        )
        return
      }

      switch call.method {
      case "saveImageToPhotos":
        guard
          let args = call.arguments as? [String: Any],
          let path = args["path"] as? String
        else {
          result(
            FlutterError(
              code: "invalid_arguments",
              message: "Falta la ruta de la imagen.",
              details: nil
            )
          )
          return
        }

        self.saveImageToPhotos(path: path, result: result)
      default:
        result(FlutterMethodNotImplemented)
      }
    }
  }

  private func saveImageToPhotos(path: String, result: @escaping FlutterResult) {
    let fileUrl = URL(fileURLWithPath: path)
    guard FileManager.default.fileExists(atPath: fileUrl.path) else {
      result(
        FlutterError(
          code: "file_not_found",
          message: "La imagen exportada no existe en la ruta temporal.",
          details: path
        )
      )
      return
    }

    guard let image = UIImage(contentsOfFile: fileUrl.path) else {
      result(
        FlutterError(
          code: "invalid_image",
          message: "No se pudo abrir la imagen exportada.",
          details: path
        )
      )
      return
    }

    func performSave() {
      PHPhotoLibrary.shared().performChanges({
        PHAssetChangeRequest.creationRequestForAsset(from: image)
      }) { saved, error in
        DispatchQueue.main.async {
          if let error = error {
            result(
              FlutterError(
                code: "photo_save_failed",
                message: error.localizedDescription,
                details: nil
              )
            )
          } else {
            result(saved)
          }
        }
      }
    }

    if #available(iOS 14, *) {
      let currentStatus = PHPhotoLibrary.authorizationStatus(for: .addOnly)
      switch currentStatus {
      case .authorized, .limited:
        performSave()
      case .notDetermined:
        PHPhotoLibrary.requestAuthorization(for: .addOnly) { status in
          switch status {
          case .authorized, .limited:
            performSave()
          case .denied, .restricted:
            DispatchQueue.main.async {
              result(
                FlutterError(
                  code: "photo_permission_denied",
                  message: "Permiso denegado para guardar en Fotos.",
                  details: nil
                )
              )
            }
          default:
            DispatchQueue.main.async {
              result(false)
            }
          }
        }
      case .denied, .restricted:
        result(
          FlutterError(
            code: "photo_permission_denied",
            message: "Permiso denegado para guardar en Fotos.",
            details: nil
          )
        )
      default:
        result(false)
      }
      return
    }

    let legacyStatus = PHPhotoLibrary.authorizationStatus()
    switch legacyStatus {
    case .authorized:
      performSave()
    case .notDetermined:
      PHPhotoLibrary.requestAuthorization { status in
        switch status {
        case .authorized:
          performSave()
        case .denied, .restricted:
          DispatchQueue.main.async {
            result(
              FlutterError(
                code: "photo_permission_denied",
                message: "Permiso denegado para guardar en Fotos.",
                details: nil
              )
            )
          }
        default:
          DispatchQueue.main.async {
            result(false)
          }
        }
      }
    case .denied, .restricted:
      result(
        FlutterError(
          code: "photo_permission_denied",
          message: "Permiso denegado para guardar en Fotos.",
          details: nil
        )
      )
    default:
      result(false)
    }
  }
}
