import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/i18n/app_i18n.dart';
import '../../core/theme/app_palette.dart';
import '../../core/utils/formatters.dart';
import '../../models/chat_models.dart';
import '../../models/app_models.dart';

class OrderChatScreen extends StatefulWidget {
  const OrderChatScreen({
    super.key,
    required this.order,
    required this.onLoadThread,
    required this.onSendMessage,
    this.initialThread,
  });

  final ShopOrder order;
  final ChatThreadDetail? initialThread;
  final Future<ChatThreadDetail> Function(String orderId) onLoadThread;
  final Future<ChatThreadDetail> Function(String orderId, String body)
      onSendMessage;

  @override
  State<OrderChatScreen> createState() => _OrderChatScreenState();
}

class _OrderChatScreenState extends State<OrderChatScreen>
    with WidgetsBindingObserver {
  final TextEditingController _messageController = TextEditingController();
  Timer? _refreshTimer;
  ChatThreadDetail? _thread;
  bool _isLoading = true;
  bool _isSending = false;
  String? _error;

  bool get _canSend => !_isSending && _messageController.text.trim().isNotEmpty;

  @override
  void initState() {
    super.initState();
    WidgetsBinding.instance.addObserver(this);
    _thread = widget.initialThread;
    _isLoading = widget.initialThread == null;
    _messageController.addListener(_handleComposerChanged);
    unawaited(_load(silent: widget.initialThread != null));
    _refreshTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (mounted) {
        unawaited(_load(silent: true));
      }
    });
  }

  @override
  void dispose() {
    WidgetsBinding.instance.removeObserver(this);
    _refreshTimer?.cancel();
    _messageController.removeListener(_handleComposerChanged);
    _messageController.dispose();
    super.dispose();
  }

  @override
  void didChangeAppLifecycleState(AppLifecycleState state) {
    if (state == AppLifecycleState.resumed && mounted) {
      unawaited(_load(silent: true));
    }
  }

  void _handleComposerChanged() {
    if (mounted) {
      setState(() {});
    }
  }

  Future<void> _load({bool silent = false}) async {
    if (!silent) {
      setState(() {
        _isLoading = true;
        _error = null;
      });
    }

    try {
      final thread = await widget.onLoadThread(widget.order.id);
      if (!mounted) {
        return;
      }
      setState(() {
        _thread = thread;
        _error = null;
      });
    } catch (error) {
      if (!mounted || silent) {
        return;
      }
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted && !silent) {
        setState(() {
          _isLoading = false;
        });
      }
    }
  }

  Future<void> _send() async {
    final body = _messageController.text.trim();
    if (body.isEmpty || _isSending) {
      return;
    }

    setState(() {
      _isSending = true;
      _error = null;
    });

    try {
      final thread = await widget.onSendMessage(widget.order.id, body);
      if (!mounted) {
        return;
      }
      _messageController.clear();
      setState(() {
        _thread = thread;
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

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final messages = _thread?.messages ?? const <ChatMessage>[];

    return Scaffold(
      backgroundColor: AppPalette.petalSoft,
      appBar: AppBar(
        title: Text(l10n.ts('Coordinación')),
      ),
      body: Column(
        children: [
          _OrderChatHeader(order: widget.order),
          Expanded(
            child: _isLoading
                ? const Center(child: CircularProgressIndicator())
                : RefreshIndicator(
                    onRefresh: () => _load(),
                    child: ListView.builder(
                      physics: const AlwaysScrollableScrollPhysics(),
                      padding: const EdgeInsets.fromLTRB(18, 18, 18, 24),
                      itemCount: messages.isEmpty ? 1 : messages.length,
                      itemBuilder: (context, index) {
                        if (messages.isEmpty) {
                          return _OrderChatEmpty(onRefresh: () => _load());
                        }
                        return Padding(
                          padding: const EdgeInsets.only(bottom: 12),
                          child: _OrderChatBubble(message: messages[index]),
                        );
                      },
                    ),
                  ),
          ),
          if (_error != null)
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 0, 18, 10),
              child: Text(
                _error!,
                style: Theme.of(context).textTheme.bodySmall?.copyWith(
                      color: AppPalette.berry,
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ),
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
              border: Border(top: BorderSide(color: AppPalette.border)),
            ),
            padding: const EdgeInsets.fromLTRB(14, 10, 14, 14),
            child: Row(
              crossAxisAlignment: CrossAxisAlignment.end,
              children: [
                Expanded(
                  child: TextField(
                    controller: _messageController,
                    minLines: 1,
                    maxLines: 4,
                    keyboardType: TextInputType.multiline,
                    textInputAction: TextInputAction.newline,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: InputDecoration(
                      hintText: l10n.ts('Escribe sobre pago o entrega'),
                    ),
                  ),
                ),
                const SizedBox(width: 10),
                FilledButton(
                  onPressed: _canSend ? _send : null,
                  style: FilledButton.styleFrom(
                    padding: const EdgeInsets.symmetric(
                      horizontal: 16,
                      vertical: 14,
                    ),
                  ),
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
          ),
        ),
      ),
    );
  }
}

class _OrderChatHeader extends StatelessWidget {
  const _OrderChatHeader({
    required this.order,
  });

  final ShopOrder order;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Container(
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
                color: AppPalette.mutedLavender.withValues(alpha: 0.16),
              ),
            ),
            child: const Icon(
              Icons.receipt_long_rounded,
              color: AppPalette.royalViolet,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  order.orderCode,
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w900,
                        color: AppPalette.butterflyInk,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  l10n.ts(
                    '{store} · {date}',
                    {
                      'store': order.storeName,
                      'date': formatSchedule(order.createdAt),
                    },
                  ),
                  maxLines: 2,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppPalette.mutedLavender,
                        height: 1.35,
                      ),
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _OrderChatEmpty extends StatelessWidget {
  const _OrderChatEmpty({
    required this.onRefresh,
  });

  final Future<void> Function() onRefresh;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Container(
      width: double.infinity,
      padding: const EdgeInsets.all(18),
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppPalette.border),
      ),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            l10n.ts('Sin mensajes todavía'),
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 8),
          Text(
            l10n.ts(
              'Cuando el especialista confirme la venta verás aquí la coordinación de pago y entrega.',
            ),
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: AppPalette.mutedLavender,
                  height: 1.4,
                ),
          ),
          const SizedBox(height: 12),
          TextButton.icon(
            onPressed: onRefresh,
            icon: const Icon(Icons.refresh_rounded),
            label: Text(l10n.ts('Actualizar')),
          ),
        ],
      ),
    );
  }
}

class _OrderChatBubble extends StatelessWidget {
  const _OrderChatBubble({
    required this.message,
  });

  final ChatMessage message;

  @override
  Widget build(BuildContext context) {
    final isUser = message.authorType == 'user';
    final color = isUser ? AppPalette.royalViolet : Colors.white;
    final foreground = isUser ? Colors.white : AppPalette.butterflyInk;
    final alignment = isUser ? Alignment.centerRight : Alignment.centerLeft;
    final author = switch (message.authorType) {
      'user' => context.l10n.ts('Tú'),
      'system' => context.l10n.ts('Sistema'),
      _ => context.l10n.ts('Especialista'),
    };

    return Align(
      alignment: alignment,
      child: ConstrainedBox(
        constraints: const BoxConstraints(maxWidth: 320),
        child: DecoratedBox(
          decoration: BoxDecoration(
            color: color,
            borderRadius: BorderRadius.circular(20),
            border: Border.all(
              color: isUser
                  ? AppPalette.royalViolet.withValues(alpha: 0.1)
                  : AppPalette.border,
            ),
          ),
          child: Padding(
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  author,
                  style: Theme.of(context).textTheme.labelMedium?.copyWith(
                        color: foreground.withValues(alpha: 0.78),
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 6),
                Text(
                  message.body,
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: foreground,
                        height: 1.4,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  formatSchedule(message.createdAt),
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: foreground.withValues(alpha: 0.66),
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }
}
