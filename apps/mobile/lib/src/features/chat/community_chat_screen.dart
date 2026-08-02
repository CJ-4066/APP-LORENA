import 'dart:async';
import 'dart:typed_data';

import 'package:flutter/material.dart';
import 'package:image_picker/image_picker.dart';

import '../../core/config/app_config.dart';
import '../../core/i18n/app_i18n.dart';
import '../../core/network/content_events_client.dart';
import '../../core/theme/app_palette.dart';
import '../../core/utils/formatters.dart';
import '../../models/chat_models.dart';

class CommunityChatScreen extends StatefulWidget {
  const CommunityChatScreen({
    super.key,
    required this.onLoadMessages,
    required this.onSendMessage,
  });

  final Future<List<CommunityChatMessage>> Function() onLoadMessages;
  final Future<List<CommunityChatMessage>> Function(
    String body, {
    XFile? imageFile,
  }) onSendMessage;

  @override
  State<CommunityChatScreen> createState() => _CommunityChatScreenState();
}

class _CommunityChatScreenState extends State<CommunityChatScreen>
    with WidgetsBindingObserver {
  final TextEditingController _messageController = TextEditingController();
  final ImagePicker _picker = ImagePicker();
  late final ContentEventsClient _contentEventsClient;
  Timer? _refreshTimer;

  List<CommunityChatMessage> _messages = const [];
  XFile? _selectedImage;
  Uint8List? _selectedImageBytes;
  bool _isLoading = true;
  bool _isSending = false;
  bool _isPickingImage = false;
  bool _isRefreshing = false;
  String? _error;

  bool get _canSend =>
      !_isSending &&
      (_messageController.text.trim().isNotEmpty || _selectedImage != null);

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _contentEventsClient = ContentEventsClient(
      baseUrl: AppConfig.apiBaseUrl,
    );
    _messageController.addListener(_handleComposerChanged);
    _load();
    _contentEventsClient.start(
      onChanged: (event) {
        if (!mounted) {
          return;
        }

        if (event.entity == 'communityChat' || event.entity == 'all') {
          _load(silent: true);
        }
      },
    );
    _refreshTimer = Timer.periodic(const Duration(seconds: 4), (_) {
      if (!mounted) {
        return;
      }

      _load(silent: true);
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _refreshTimer?.cancel();
    _refreshTimer = null;
    _contentEventsClient.dispose();
    _messageController.removeListener(_handleComposerChanged);
    _messageController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      _load(silent: true);
    }
  }

  void _handleComposerChanged() {
    if (!mounted) {
      return;
    }

    setState(() {});
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final theme = Theme.of(context);

    return Scaffold(
      backgroundColor: AppPalette.petalSoft,
      appBar: AppBar(
        title: Text(l10n.ts('Chat general')),
      ),
      body: Column(
        children: [
          Container(
            width: double.infinity,
            padding: const EdgeInsets.fromLTRB(20, 14, 20, 16),
            decoration: const BoxDecoration(
              gradient: LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppPalette.petal,
                  AppPalette.petalSoft,
                ],
              ),
            ),
            child: Row(
              children: [
                Container(
                  width: 54,
                  height: 54,
                  decoration: BoxDecoration(
                    color: AppPalette.mistLilac,
                    borderRadius: BorderRadius.circular(18),
                    border: Border.all(
                        color:
                            AppPalette.mutedLavender.withValues(alpha: 0.16)),
                  ),
                  child: const Icon(Icons.forum_rounded,
                      color: AppPalette.royalViolet),
                ),
                const SizedBox(width: 14),
                Expanded(
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    children: [
                      Text(
                        l10n.ts('Chat general'),
                        style: theme.textTheme.titleMedium?.copyWith(
                          fontWeight: FontWeight.w800,
                          color: AppPalette.butterflyInk,
                        ),
                      ),
                      const SizedBox(height: 4),
                      Text(
                        l10n.ts(
                          'Escribe como en una conversación privada: breve, visual y directa.',
                        ),
                        style: theme.textTheme.bodyMedium?.copyWith(
                          color: AppPalette.mutedLavender,
                          height: 1.35,
                        ),
                      ),
                    ],
                  ),
                ),
              ],
            ),
          ),
          Expanded(child: _buildBody(context)),
        ],
      ),
      bottomNavigationBar: SafeArea(
        top: false,
        child: AnimatedPadding(
          duration: const Duration(milliseconds: 180),
          curve: Curves.easeOut,
          padding:
              EdgeInsets.only(bottom: MediaQuery.of(context).viewInsets.bottom),
          child: Container(
            decoration: const BoxDecoration(
              color: Colors.white,
              border: Border(
                top: BorderSide(color: Color(0xFFE9DCE8)),
              ),
            ),
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
            child: Column(
              mainAxisSize: MainAxisSize.min,
              children: [
                if (_selectedImage != null) _buildAttachmentPreview(context),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.end,
                  children: [
                    IconButton.filledTonal(
                      onPressed: _isPickingImage ? null : _pickImage,
                      icon: _isPickingImage
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.photo_rounded),
                    ),
                    const SizedBox(width: 10),
                    Expanded(
                      child: TextField(
                        controller: _messageController,
                        minLines: 1,
                        maxLines: 4,
                        keyboardType: TextInputType.multiline,
                        textInputAction: TextInputAction.newline,
                        textCapitalization: TextCapitalization.sentences,
                        autocorrect: false,
                        enableSuggestions: false,
                        spellCheckConfiguration:
                            const SpellCheckConfiguration.disabled(),
                        decoration: InputDecoration(
                          hintText:
                              l10n.ts('Escribe un mensaje o añade una imagen'),
                        ),
                      ),
                    ),
                    const SizedBox(width: 10),
                    FilledButton(
                      onPressed: _canSend ? _send : null,
                      child: _isSending
                          ? const SizedBox(
                              width: 18,
                              height: 18,
                              child: CircularProgressIndicator(strokeWidth: 2),
                            )
                          : const Icon(Icons.send_rounded),
                    ),
                  ],
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Widget _buildBody(BuildContext context) {
    if (_isLoading) {
      return const Center(
        child: CircularProgressIndicator(),
      );
    }

    if (_error != null && _messages.isEmpty) {
      return Center(
        child: Padding(
          padding: const EdgeInsets.all(24),
          child: Text(
            _error!,
            textAlign: TextAlign.center,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppPalette.berry,
                  fontWeight: FontWeight.w700,
                ),
          ),
        ),
      );
    }

    final items = _messages.toList(growable: false);

    return RefreshIndicator(
      onRefresh: _load,
      child: ListView.separated(
        padding: const EdgeInsets.fromLTRB(16, 16, 16, 16),
        itemCount: items.length,
        separatorBuilder: (_, __) => const SizedBox(height: 10),
        itemBuilder: (context, index) {
          final item = items[index];
          final isGuide = item.authorRole == 'guide';
          return Align(
            alignment: isGuide ? Alignment.centerLeft : Alignment.centerRight,
            child: ConstrainedBox(
              constraints: BoxConstraints(
                maxWidth: MediaQuery.of(context).size.width * 0.84,
              ),
              child: _MessageBubble(item: item),
            ),
          );
        },
      ),
    );
  }

  Widget _buildAttachmentPreview(BuildContext context) {
    return Container(
      margin: const EdgeInsets.only(bottom: 10),
      padding: const EdgeInsets.all(10),
      decoration: BoxDecoration(
        color: AppPalette.softLilac,
        borderRadius: BorderRadius.circular(18),
        border:
            Border.all(color: AppPalette.royalViolet.withValues(alpha: 0.12)),
      ),
      child: Row(
        children: [
          ClipRRect(
            borderRadius: BorderRadius.circular(14),
            child: Image.memory(
              _selectedImageBytes!,
              width: 58,
              height: 58,
              fit: BoxFit.cover,
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  _selectedImage!.name,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        fontWeight: FontWeight.w700,
                        color: AppPalette.butterflyInk,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  context.l10n
                      .ts('Puedes enviarla sola o acompañarla con un mensaje.'),
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: AppPalette.mutedLavender,
                      ),
                ),
              ],
            ),
          ),
          TextButton(
            onPressed: _clearSelectedImage,
            child: Text(context.l10n.ts('Quitar')),
          ),
        ],
      ),
    );
  }

  Future<void> _load({bool silent = false}) async {
    if (silent && (_isRefreshing || _isSending)) {
      return;
    }

    setState(() {
      if (silent) {
        _isRefreshing = true;
      } else {
        _isLoading = true;
      }
      _error = null;
    });

    try {
      final messages = await widget.onLoadMessages();
      if (!mounted) {
        return;
      }
      setState(() {
        _messages = messages;
        _isLoading = false;
        _isRefreshing = false;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
        _isLoading = false;
        _isRefreshing = false;
      });
    }
  }

  Future<void> _pickImage() async {
    setState(() {
      _error = null;
      _isPickingImage = true;
    });

    try {
      final file = await _picker.pickImage(
        source: ImageSource.gallery,
        maxWidth: 1600,
        imageQuality: 86,
      );
      if (!mounted || file == null) {
        return;
      }

      final bytes = await file.readAsBytes();
      setState(() {
        _selectedImage = file;
        _selectedImageBytes = bytes;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = contextErrorMessage(context);
      });
    } finally {
      if (mounted) {
        setState(() {
          _isPickingImage = false;
        });
      }
    }
  }

  Future<void> _send() async {
    final body = _messageController.text.trim();
    if (body.isEmpty && _selectedImage == null) {
      return;
    }

    setState(() {
      _isSending = true;
      _error = null;
    });

    try {
      final messages = await widget.onSendMessage(
        body,
        imageFile: _selectedImage,
      );
      if (!mounted) {
        return;
      }
      _messageController.clear();
      _clearSelectedImage();
      setState(() {
        _messages = messages;
      });
    } catch (error) {
      if (!mounted) {
        return;
      }
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _isSending = false;
        });
      }
    }
  }

  void _clearSelectedImage() {
    setState(() {
      _selectedImage = null;
      _selectedImageBytes = null;
    });
  }

  String contextErrorMessage(BuildContext context) {
    return context.l10n.ts(
      'No se pudo seleccionar la imagen. Revisa permisos de galería.',
    );
  }
}

class _MessageBubble extends StatelessWidget {
  const _MessageBubble({
    required this.item,
  });

  final CommunityChatMessage item;

  @override
  Widget build(BuildContext context) {
    final isGuide = item.authorRole == 'guide';
    final isSystem = item.authorRole == 'system';
    final accent = isGuide
        ? AppPalette.indigo
        : isSystem
            ? AppPalette.mutedLavender
            : AppPalette.royalViolet;
    final background = isGuide
        ? AppPalette.petal
        : isSystem
            ? AppPalette.softLilac
            : AppPalette.mistLilac;

    return Container(
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: accent.withValues(alpha: 0.14)),
        boxShadow: [
          BoxShadow(
            color: Colors.black.withValues(alpha: 0.03),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Text(
                  item.authorName,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                        color: accent,
                      ),
                ),
              ),
              Text(
                formatSchedule(item.createdAt),
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: AppPalette.mutedLavender,
                    ),
              ),
            ],
          ),
          if ((item.imageUrl ?? '').trim().isNotEmpty) ...[
            const SizedBox(height: 10),
            ClipRRect(
              borderRadius: BorderRadius.circular(18),
              child: AspectRatio(
                aspectRatio: 4 / 3,
                child: Image.network(
                  item.imageUrl!,
                  fit: BoxFit.cover,
                  errorBuilder: (_, __, ___) => Container(
                    color: AppPalette.softLilac,
                    alignment: Alignment.center,
                    child: const Icon(Icons.broken_image_rounded),
                  ),
                ),
              ),
            ),
          ],
          if (item.body.trim().isNotEmpty) ...[
            const SizedBox(height: 8),
            Text(
              item.body,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    height: 1.4,
                    color: AppPalette.butterflyInk,
                  ),
            ),
          ],
        ],
      ),
    );
  }
}
