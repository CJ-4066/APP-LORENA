import 'dart:async';

import 'package:flutter/material.dart';

import '../../core/i18n/app_i18n.dart';
import '../../core/theme/app_palette.dart';
import '../../core/utils/formatters.dart';
import '../../models/app_models.dart';
import '../../models/shop_models.dart';

class ShopScreen extends StatefulWidget {
  const ShopScreen({
    super.key,
    required this.data,
    required this.onRefresh,
    required this.onCreateOrder,
    required this.onCreateProduct,
    required this.onUpdateProduct,
    required this.onUpdateOrderStatus,
    this.canManageShop = false,
  });

  final AppBootstrap data;
  final Future<void> Function() onRefresh;
  final Future<ShopOrder> Function(CreateShopOrderInput input) onCreateOrder;
  final Future<ShopProduct> Function(CreateShopProductInput input)
      onCreateProduct;
  final Future<ShopProduct> Function({
    required String productId,
    required UpdateShopProductInput input,
  }) onUpdateProduct;
  final Future<ShopOrder> Function({
    required String orderId,
    required String status,
  }) onUpdateOrderStatus;
  final bool canManageShop;

  @override
  State<ShopScreen> createState() => _ShopScreenState();
}

class _ShopScreenState extends State<ShopScreen> {
  static const _allCategory = 'Todos';

  String _selectedCategory = _allCategory;
  _ShopSection _selectedSection = _ShopSection.home;
  final Map<String, int> _cart = <String, int>{};

  @override
  void initState() {
    super.initState();
    if (widget.canManageShop) {
      _selectedSection = _ShopSection.admin;
    }
  }

  @override
  void didUpdateWidget(covariant ShopScreen oldWidget) {
    super.didUpdateWidget(oldWidget);

    _normalizeCart();

    if (widget.canManageShop) {
      _cart.clear();
      if (!oldWidget.canManageShop ||
          (_selectedSection != _ShopSection.admin &&
              _selectedSection != _ShopSection.orders)) {
        _selectedSection = _ShopSection.admin;
      }
    } else if (oldWidget.canManageShop &&
        _selectedSection == _ShopSection.admin) {
      _selectedSection = _ShopSection.home;
    }
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final products = widget.data.shop.products;
    final categories = <String>{
      _allCategory,
      ...products.map((item) => item.category),
    }.toList();
    final featured = products.where((item) => item.featured).toList();
    final visibleProducts = _selectedCategory == _allCategory
        ? products
        : products
            .where((item) => item.category == _selectedCategory)
            .toList(growable: false);
    final cartLines =
        widget.canManageShop ? <_CartLine>[] : _cartLines(products);
    final cartItemCount = cartLines.fold<int>(
      0,
      (sum, line) => sum + line.quantity,
    );
    final cartSubtotal = cartLines.fold<double>(
      0,
      (sum, line) => sum + (line.product.price.amount * line.quantity),
    );
    final cartShipping = cartSubtotal >= 120 || cartSubtotal == 0 ? 0.0 : 9.0;
    final cartTotal = cartSubtotal + cartShipping;
    final lowStockProducts = products.where(_isLowStockProduct).toList();
    final customizableProducts =
        products.where(_isCustomizableProduct).toList(growable: false);
    final visibleSections = widget.canManageShop
        ? const [_ShopSection.admin]
        : _ShopSection.values
            .where((section) => section != _ShopSection.admin)
            .toList(growable: false);
    final effectiveSection = visibleSections.contains(_selectedSection)
        ? _selectedSection
        : widget.canManageShop
            ? _ShopSection.admin
            : _ShopSection.home;

    return Container(
      decoration: const BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topCenter,
          end: Alignment.bottomCenter,
          colors: [
            AppPalette.shellGradientTop,
            AppPalette.shellGradientMid,
            AppPalette.shellGradientBottom,
          ],
        ),
      ),
      child: SafeArea(
        bottom: false,
        child: Stack(
          children: [
            RefreshIndicator(
              onRefresh: widget.onRefresh,
              child: ListView(
                padding: EdgeInsets.fromLTRB(
                  20,
                  14,
                  20,
                  widget.canManageShop || cartLines.isEmpty ? 28 : 126,
                ),
                children: [
                  if (widget.canManageShop) ...[
                    Align(
                      alignment: Alignment.centerRight,
                      child: FilledButton.icon(
                        onPressed: _openCreateProductSheet,
                        icon: const Icon(Icons.add_shopping_cart_outlined),
                        label: Text(l10n.ts('Nuevo producto')),
                      ),
                    ),
                    const SizedBox(height: 18),
                  ],
                  _ShopSectionTabs(
                    sections: visibleSections,
                    selected: effectiveSection,
                    cartItemCount: cartItemCount,
                    onSelected: (section) {
                      setState(() {
                        _selectedSection = section;
                      });
                    },
                  ),
                  const SizedBox(height: 18),
                  AnimatedSwitcher(
                    duration: const Duration(milliseconds: 220),
                    switchInCurve: Curves.easeOutCubic,
                    switchOutCurve: Curves.easeInCubic,
                    child: KeyedSubtree(
                      key: ValueKey(effectiveSection),
                      child: switch (effectiveSection) {
                        _ShopSection.home => _ShopHomeView(
                            featured: featured,
                            categories: categories,
                            products: products,
                            cart: _cart,
                            onAdd: _incrementProduct,
                            onRemove: _decrementProduct,
                            onOpenProduct: _openProductDetailSheet,
                            onOpenCatalog: (category) {
                              setState(() {
                                _selectedSection = _ShopSection.catalog;
                                _selectedCategory = category ?? _allCategory;
                              });
                            },
                          ),
                        _ShopSection.catalog => _ShopCatalogView(
                            categories: categories,
                            products: products,
                            selectedCategory: _selectedCategory,
                            visibleProducts: visibleProducts,
                            cart: _cart,
                            onSelectCategory: (category) {
                              setState(() {
                                _selectedCategory = category;
                              });
                            },
                            onAdd: _incrementProduct,
                            onRemove: _decrementProduct,
                            onOpenProduct: _openProductDetailSheet,
                          ),
                        _ShopSection.cart => _ShopCartView(
                            lines: cartLines,
                            subtotal: cartSubtotal,
                            shipping: cartShipping,
                            total: cartTotal,
                            onAdd: _incrementProduct,
                            onRemove: _decrementProduct,
                            onOpenProduct: _openProductDetailSheet,
                            onCheckout: _openCheckoutSheet,
                            onOpenCatalog: () {
                              setState(() {
                                _selectedSection = _ShopSection.catalog;
                              });
                            },
                          ),
                        _ShopSection.orders => _ShopOrdersView(
                            orders: widget.data.shop.orders,
                          ),
                        _ShopSection.admin => _ShopAdminView(
                            products: products,
                            orders: widget.data.shop.orders,
                            lowStockProducts: lowStockProducts,
                            customizableProducts: customizableProducts,
                            onCreateProduct: _openCreateProductSheet,
                            onEditStock: _openStockManagerSheet,
                            onEditFeatured: _openFeaturedManagerSheet,
                            onOpenOrders: () {
                              setState(() {
                                _selectedSection = _ShopSection.admin;
                              });
                            },
                            onUpdateOrderStatus: _updateOrderStatus,
                          ),
                      },
                    ),
                  ),
                ],
              ),
            ),
            if (!widget.canManageShop && cartLines.isNotEmpty)
              Positioned(
                left: 20,
                right: 20,
                bottom: 18,
                child: _FloatingCartBar(
                  itemCount: cartItemCount,
                  total: cartTotal,
                  onTap: () {
                    setState(() {
                      _selectedSection = _ShopSection.cart;
                    });
                  },
                ),
              ),
          ],
        ),
      ),
    );
  }

  Future<void> _openCheckoutSheet() async {
    if (widget.canManageShop) {
      return;
    }

    final cartLines = _cartLines(widget.data.shop.products);
    if (cartLines.isEmpty) {
      return;
    }

    final order = await showModalBottomSheet<ShopOrder>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return _CheckoutSheet(
          lines: cartLines,
          suggestedAddress: widget.data.user.location,
          onSubmit: (deliveryAddress, notes) async {
            return widget.onCreateOrder(
              CreateShopOrderInput(
                items: cartLines
                    .map(
                      (line) => CreateShopOrderItemInput(
                        productId: line.product.id,
                        quantity: line.quantity,
                      ),
                    )
                    .toList(),
                deliveryAddress: deliveryAddress,
                notes: notes,
              ),
            );
          },
        );
      },
    );

    if (!mounted || order == null) {
      return;
    }

    setState(() {
      _cart.clear();
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          context.l10n.ts(
            'Orden {code} creada por {total}.',
            {
              'code': order.orderCode,
              'total': formatMoney(order.total),
            },
          ),
        ),
      ),
    );
  }

  Future<void> _openProductDetailSheet(ShopProduct product) async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return _ProductDetailSheet(
          product: product,
          quantity: _cart[product.id] ?? 0,
          canAddToCart: !widget.canManageShop,
          onAdd: () => _tryIncrementProduct(product.id),
        );
      },
    );
  }

  List<_CartLine> _cartLines(List<ShopProduct> products) {
    final byId = {
      for (final product in products) product.id: product,
    };
    return _cart.entries
        .where((entry) => entry.value > 0 && byId.containsKey(entry.key))
        .map(
          (entry) => _CartLine(
            product: byId[entry.key]!,
            quantity: entry.value,
          ),
        )
        .toList(growable: false);
  }

  void _normalizeCart() {
    final productsById = {
      for (final product in widget.data.shop.products) product.id: product,
    };
    final nextCart = <String, int>{};
    String? activeStoreId;

    for (final entry in _cart.entries) {
      final product = productsById[entry.key];
      if (product == null) {
        continue;
      }

      final normalizedQuantity = product.madeToOrder
          ? entry.value
          : entry.value > product.stockQuantity
              ? product.stockQuantity
              : entry.value;
      if (normalizedQuantity <= 0) {
        continue;
      }

      activeStoreId ??= product.storeId;
      if (product.storeId != activeStoreId) {
        continue;
      }

      nextCart[entry.key] = normalizedQuantity;
    }

    _cart
      ..clear()
      ..addAll(nextCart);
  }

  ShopProduct? _findProductById(String productId) {
    for (final product in widget.data.shop.products) {
      if (product.id == productId) {
        return product;
      }
    }

    return null;
  }

  void _showCartMessage(String message) {
    if (!mounted) {
      return;
    }

    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(content: Text(message)),
    );
  }

  bool _tryIncrementProduct(String productId) {
    if (widget.canManageShop) {
      return false;
    }

    final product = _findProductById(productId);
    if (product == null) {
      return false;
    }

    final currentQuantity = _cart[productId] ?? 0;
    final cartLines = _cartLines(widget.data.shop.products);
    final currentStoreId =
        cartLines.isEmpty ? null : cartLines.first.product.storeId;

    if (currentStoreId != null &&
        currentStoreId != product.storeId &&
        currentQuantity == 0) {
      _showCartMessage(
        context.l10n.ts(
          'Cada pedido debe salir de una sola tienda. Finaliza o vacía el carrito para cambiar de especialista.',
        ),
      );
      return false;
    }

    if (!product.madeToOrder && product.stockQuantity <= 0) {
      _showCartMessage(
        context.l10n.ts(
          '{name} está agotado por ahora.',
          {'name': product.name},
        ),
      );
      return false;
    }

    if (!product.madeToOrder && currentQuantity >= product.stockQuantity) {
      _showCartMessage(
        context.l10n.ts(
          'Ya agregaste todo el stock disponible de {name}.',
          {'name': product.name},
        ),
      );
      return false;
    }

    setState(() {
      _cart.update(productId, (value) => value + 1, ifAbsent: () => 1);
    });

    return true;
  }

  void _incrementProduct(String productId) {
    _tryIncrementProduct(productId);
  }

  void _decrementProduct(String productId) {
    if (widget.canManageShop) {
      return;
    }

    final current = _cart[productId] ?? 0;
    if (current <= 1) {
      setState(() {
        _cart.remove(productId);
      });
      return;
    }

    setState(() {
      _cart[productId] = current - 1;
    });
  }

  Future<void> _openCreateProductSheet() async {
    final product = await showModalBottomSheet<ShopProduct>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return _ProductEditorSheet(
          categories: widget.data.shop.products
              .map((product) => product.category)
              .toSet()
              .toList(),
          onSubmit: widget.onCreateProduct,
        );
      },
    );

    if (!mounted || product == null) {
      return;
    }

    setState(() {
      _selectedSection =
          widget.canManageShop ? _ShopSection.admin : _ShopSection.catalog;
      _selectedCategory = product.category;
    });
    ScaffoldMessenger.of(context).showSnackBar(
      SnackBar(
        content: Text(
          context.l10n.ts(
            '{name} agregado al catálogo.',
            {'name': product.name},
          ),
        ),
      ),
    );
  }

  Future<void> _openStockManagerSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return _StockManagerSheet(
          products: widget.data.shop.products,
          onUpdateProduct: (product, input) {
            return widget.onUpdateProduct(
              productId: product.id,
              input: input,
            );
          },
        );
      },
    );
  }

  Future<void> _openFeaturedManagerSheet() async {
    await showModalBottomSheet<void>(
      context: context,
      isScrollControlled: true,
      backgroundColor: Colors.transparent,
      builder: (context) {
        return _FeaturedManagerSheet(
          products: widget.data.shop.products,
          onUpdateFeatured: (product, featured) {
            return widget.onUpdateProduct(
              productId: product.id,
              input: UpdateShopProductInput(featured: featured),
            );
          },
        );
      },
    );
  }

  Future<void> _updateOrderStatus(ShopOrder order, String status) async {
    try {
      final updated = await widget.onUpdateOrderStatus(
        orderId: order.id,
        status: status,
      );
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(
            context.l10n.ts(
              '{code} actualizado a {status}.',
              {
                'code': updated.orderCode,
                'status': _statusCopy(context, updated.status).label,
              },
            ),
          ),
        ),
      );
    } catch (error) {
      if (!mounted) {
        return;
      }
      ScaffoldMessenger.of(context).showSnackBar(
        SnackBar(
          content: Text(error.toString().replaceFirst('Exception: ', '')),
        ),
      );
    }
  }
}

enum _ShopSection { home, catalog, cart, orders, admin }

class _ShopSectionTabs extends StatelessWidget {
  const _ShopSectionTabs({
    required this.sections,
    required this.selected,
    required this.onSelected,
    this.cartItemCount = 0,
  });

  final List<_ShopSection> sections;
  final _ShopSection selected;
  final ValueChanged<_ShopSection> onSelected;
  final int cartItemCount;

  @override
  Widget build(BuildContext context) {
    return SingleChildScrollView(
      scrollDirection: Axis.horizontal,
      child: Row(
        children: sections.map((section) {
          return Padding(
            padding: const EdgeInsets.only(right: 10),
            child: _ShopSectionButton(
              section: section,
              selected: section == selected,
              cartItemCount: cartItemCount,
              onTap: () => onSelected(section),
            ),
          );
        }).toList(),
      ),
    );
  }
}

class _ShopSectionButton extends StatelessWidget {
  const _ShopSectionButton({
    required this.section,
    required this.selected,
    required this.onTap,
    this.cartItemCount = 0,
  });

  final _ShopSection section;
  final bool selected;
  final VoidCallback onTap;
  final int cartItemCount;

  @override
  Widget build(BuildContext context) {
    final accent = selected ? AppPalette.royalViolet : AppPalette.mutedLavender;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: AnimatedContainer(
          duration: const Duration(milliseconds: 180),
          padding: const EdgeInsets.symmetric(horizontal: 15, vertical: 11),
          decoration: BoxDecoration(
            color: selected
                ? AppPalette.softLilac
                : AppPalette.moonIvory.withValues(alpha: 0.94),
            borderRadius: BorderRadius.circular(999),
            border: Border.all(
              color:
                  selected ? accent.withValues(alpha: 0.32) : AppPalette.border,
            ),
          ),
          child: Row(
            mainAxisSize: MainAxisSize.min,
            children: [
              Icon(_sectionIcon(section), color: accent, size: 18),
              const SizedBox(width: 8),
              Text(
                _sectionLabel(context, section),
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      color: accent,
                      fontWeight: FontWeight.w800,
                    ),
              ),
              if (section == _ShopSection.cart && cartItemCount > 0) ...[
                const SizedBox(width: 8),
                Container(
                  padding:
                      const EdgeInsets.symmetric(horizontal: 8, vertical: 3),
                  decoration: BoxDecoration(
                    color: selected
                        ? Colors.white.withValues(alpha: 0.18)
                        : AppPalette.royalViolet,
                    borderRadius: BorderRadius.circular(999),
                  ),
                  child: Text(
                    '$cartItemCount',
                    style: Theme.of(context).textTheme.labelSmall?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                ),
              ],
            ],
          ),
        ),
      ),
    );
  }
}

class _ShopHomeView extends StatelessWidget {
  const _ShopHomeView({
    required this.featured,
    required this.categories,
    required this.products,
    required this.cart,
    required this.onAdd,
    required this.onRemove,
    required this.onOpenProduct,
    required this.onOpenCatalog,
  });

  final List<ShopProduct> featured;
  final List<String> categories;
  final List<ShopProduct> products;
  final Map<String, int> cart;
  final ValueChanged<String> onAdd;
  final ValueChanged<String> onRemove;
  final ValueChanged<ShopProduct> onOpenProduct;
  final ValueChanged<String?> onOpenCatalog;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final catalogCategories = categories
        .where((category) => category != _ShopScreenState._allCategory);
    final promoProducts = _promotionalProducts(
      featured: featured,
      products: products,
    );

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionTitle(
          title: l10n.ts('Ofertas y promociones'),
        ),
        const SizedBox(height: 12),
        if (promoProducts.isEmpty)
          _EmptyState(
            title: l10n.ts('Todavía no hay promociones'),
          )
        else
          _PromotionCarousel(
            products: promoProducts,
            cart: cart,
            onAdd: onAdd,
            onRemove: onRemove,
            onOpenProduct: onOpenProduct,
          ),
        const SizedBox(height: 24),
        _SectionTitle(
          title: l10n.ts('Colecciones'),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 12,
          runSpacing: 12,
          children: catalogCategories.map((category) {
            final count = products
                .where((product) => product.category == category)
                .length;
            return _CollectionTile(
              label: category,
              count: count,
              onTap: () => onOpenCatalog(category),
            );
          }).toList(),
        ),
      ],
    );
  }
}

class _PromotionCarousel extends StatefulWidget {
  const _PromotionCarousel({
    required this.products,
    required this.cart,
    required this.onAdd,
    required this.onRemove,
    required this.onOpenProduct,
  });

  final List<ShopProduct> products;
  final Map<String, int> cart;
  final ValueChanged<String> onAdd;
  final ValueChanged<String> onRemove;
  final ValueChanged<ShopProduct> onOpenProduct;

  @override
  State<_PromotionCarousel> createState() => _PromotionCarouselState();
}

class _PromotionCarouselState extends State<_PromotionCarousel> {
  late final PageController _controller;
  Timer? _autoplayTimer;
  double _page = 0;
  bool _userInteracting = false;

  @override
  void initState() {
    super.initState();
    _controller = PageController(viewportFraction: 0.86)
      ..addListener(_handleScroll);
    _startAutoplay();
  }

  @override
  void didUpdateWidget(covariant _PromotionCarousel oldWidget) {
    super.didUpdateWidget(oldWidget);
    if (oldWidget.products.length != widget.products.length) {
      _restartAutoplay();
    }
  }

  @override
  void dispose() {
    _autoplayTimer?.cancel();
    _controller
      ..removeListener(_handleScroll)
      ..dispose();
    super.dispose();
  }

  void _handleScroll() {
    if (!_controller.hasClients) {
      return;
    }

    final nextPage = _controller.page ?? _controller.initialPage.toDouble();
    if ((_page - nextPage).abs() < 0.01) {
      return;
    }

    setState(() {
      _page = nextPage;
    });
  }

  void _startAutoplay() {
    _autoplayTimer?.cancel();
    if (widget.products.length <= 1) {
      return;
    }

    _autoplayTimer = Timer.periodic(const Duration(seconds: 5), (_) {
      if (!mounted || !_controller.hasClients || _userInteracting) {
        return;
      }

      final currentIndex =
          (_controller.page ?? _controller.initialPage.toDouble()).round();
      final nextIndex = (currentIndex + 1) % widget.products.length;

      _controller.animateToPage(
        nextIndex,
        duration: const Duration(milliseconds: 720),
        curve: Curves.easeInOutCubic,
      );
    });
  }

  void _restartAutoplay() {
    _autoplayTimer?.cancel();
    _startAutoplay();
  }

  void _pauseAutoplay() {
    _userInteracting = true;
  }

  void _resumeAutoplay() {
    if (!_userInteracting) {
      return;
    }
    _userInteracting = false;
    _restartAutoplay();
  }

  @override
  Widget build(BuildContext context) {
    final activeIndex =
        _page.round().clamp(0, widget.products.length - 1).toInt();

    return Column(
      children: [
        SizedBox(
          height: 354,
          child: GestureDetector(
            behavior: HitTestBehavior.translucent,
            onHorizontalDragStart: (_) => _pauseAutoplay(),
            onHorizontalDragCancel: _resumeAutoplay,
            onHorizontalDragEnd: (_) => _resumeAutoplay(),
            child: PageView.builder(
              controller: _controller,
              clipBehavior: Clip.none,
              padEnds: false,
              physics: const BouncingScrollPhysics(),
              itemCount: widget.products.length,
              itemBuilder: (context, index) {
                final product = widget.products[index];

                return AnimatedBuilder(
                  animation: _controller,
                  builder: (context, child) {
                    final distance = (_page - index).abs().clamp(0.0, 1.0);
                    final scale = (1 - (distance * 0.055)).clamp(0.94, 1.0);
                    final yOffset = distance * 10;
                    final xOffset = distance * 6;

                    return Transform.translate(
                      offset: Offset(xOffset, yOffset),
                      child: Transform.scale(
                        scale: scale.toDouble(),
                        alignment: Alignment.centerLeft,
                        child: child,
                      ),
                    );
                  },
                  child: Padding(
                    padding: const EdgeInsets.only(right: 14),
                    child: _PromotionProductCard(
                      product: product,
                      quantity: widget.cart[product.id] ?? 0,
                      onAdd: () => widget.onAdd(product.id),
                      onRemove: () => widget.onRemove(product.id),
                      onOpen: () => widget.onOpenProduct(product),
                    ),
                  ),
                );
              },
            ),
          ),
        ),
        if (widget.products.length > 1) ...[
          const SizedBox(height: 12),
          Row(
            mainAxisAlignment: MainAxisAlignment.center,
            children: List.generate(widget.products.length, (index) {
              final active = index == activeIndex;

              return AnimatedContainer(
                duration: const Duration(milliseconds: 180),
                width: active ? 24 : 7,
                height: 7,
                margin: const EdgeInsets.symmetric(horizontal: 4),
                decoration: BoxDecoration(
                  color: active
                      ? AppPalette.indigo
                      : AppPalette.borderStrong.withValues(alpha: 0.7),
                  borderRadius: BorderRadius.circular(999),
                ),
              );
            }),
          ),
        ],
      ],
    );
  }
}

class _PromotionProductCard extends StatelessWidget {
  const _PromotionProductCard({
    required this.product,
    required this.quantity,
    required this.onAdd,
    required this.onRemove,
    required this.onOpen,
  });

  final ShopProduct product;
  final int quantity;
  final VoidCallback onAdd;
  final VoidCallback onRemove;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final addEnabled = product.madeToOrder || quantity < product.stockQuantity;
    final addLabel = !product.madeToOrder && product.stockQuantity <= 0
        ? context.l10n.ts('Agotado')
        : context.l10n.ts('Agregar');

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(30),
        onTap: onOpen,
        child: Ink(
          decoration: BoxDecoration(
            color: AppPalette.midnight,
            borderRadius: BorderRadius.circular(30),
            border: Border.all(color: Colors.white.withValues(alpha: 0.18)),
            boxShadow: [
              BoxShadow(
                color: AppPalette.indigo.withValues(alpha: 0.22),
                blurRadius: 26,
                offset: const Offset(0, 16),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(30),
            child: Stack(
              fit: StackFit.expand,
              children: [
                Positioned.fill(
                  child: _ProductArtwork(product: product),
                ),
                Positioned.fill(
                  child: DecoratedBox(
                    decoration: BoxDecoration(
                      gradient: LinearGradient(
                        begin: Alignment.topCenter,
                        end: Alignment.bottomCenter,
                        colors: [
                          AppPalette.midnight.withValues(alpha: 0.04),
                          AppPalette.midnight.withValues(alpha: 0.18),
                          AppPalette.midnight.withValues(alpha: 0.9),
                        ],
                        stops: const [0.0, 0.46, 1.0],
                      ),
                    ),
                  ),
                ),
                Positioned(
                  left: 16,
                  top: 16,
                  child: _PromotionRibbon(
                      label: _promotionLabel(context, product)),
                ),
                Positioned(
                  right: 16,
                  top: 16,
                  child: _ProductBadge(label: product.badge),
                ),
                Positioned(
                  left: 18,
                  right: 18,
                  bottom: 18,
                  child: Column(
                    crossAxisAlignment: CrossAxisAlignment.start,
                    mainAxisSize: MainAxisSize.min,
                    children: [
                      Text(
                        product.name,
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleLarge?.copyWith(
                              color: Colors.white,
                              fontWeight: FontWeight.w900,
                              height: 0.98,
                            ),
                      ),
                      const SizedBox(height: 7),
                      Text(
                        _promotionSubtitle(context, product),
                        maxLines: 2,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                              color: Colors.white.withValues(alpha: 0.78),
                              height: 1.28,
                              fontWeight: FontWeight.w600,
                            ),
                      ),
                      const SizedBox(height: 14),
                      Row(
                        children: [
                          Expanded(
                            child: Column(
                              crossAxisAlignment: CrossAxisAlignment.start,
                              children: [
                                Text(
                                  formatMoney(product.price),
                                  style: Theme.of(context)
                                      .textTheme
                                      .headlineSmall
                                      ?.copyWith(
                                        color: AppPalette.moonIvory,
                                        fontWeight: FontWeight.w900,
                                        height: 0.96,
                                      ),
                                ),
                                const SizedBox(height: 3),
                                Text(
                                  _stockSummary(context, product),
                                  maxLines: 1,
                                  overflow: TextOverflow.ellipsis,
                                  style: Theme.of(context)
                                      .textTheme
                                      .labelSmall
                                      ?.copyWith(
                                        color: AppPalette.softLilac,
                                        fontWeight: FontWeight.w800,
                                      ),
                                ),
                              ],
                            ),
                          ),
                          const SizedBox(width: 12),
                          _QuantityControl(
                            quantity: quantity,
                            addEnabled: addEnabled,
                            emptyLabel: addLabel,
                            onAdd: onAdd,
                            onRemove: onRemove,
                          ),
                        ],
                      ),
                    ],
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

class _PromotionRibbon extends StatelessWidget {
  const _PromotionRibbon({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 12, vertical: 7),
      decoration: BoxDecoration(
        gradient: const LinearGradient(
          colors: [
            AppPalette.flameGold,
            AppPalette.warning,
          ],
        ),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: Colors.white.withValues(alpha: 0.28)),
        boxShadow: [
          BoxShadow(
            color: AppPalette.flameGold.withValues(alpha: 0.24),
            blurRadius: 14,
            offset: const Offset(0, 6),
          ),
        ],
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          const Icon(
            Icons.local_offer_rounded,
            color: AppPalette.midnight,
            size: 15,
          ),
          const SizedBox(width: 6),
          Text(
            label,
            style: Theme.of(context).textTheme.labelSmall?.copyWith(
                  color: AppPalette.midnight,
                  fontWeight: FontWeight.w900,
                  letterSpacing: 0.15,
                ),
          ),
        ],
      ),
    );
  }
}

class _CollectionTile extends StatelessWidget {
  const _CollectionTile({
    required this.label,
    required this.count,
    required this.onTap,
  });

  final String label;
  final int count;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return SizedBox(
      width: 158,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(22),
          onTap: onTap,
          child: Ink(
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppPalette.moonIvory,
                  AppPalette.mistLilac,
                ],
              ),
              borderRadius: BorderRadius.circular(22),
              border: Border.all(color: AppPalette.border),
            ),
            padding: const EdgeInsets.all(14),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Icon(
                  _categoryIcon(label),
                  color: AppPalette.flameGold,
                ),
                const SizedBox(height: 14),
                Text(
                  _categoryLabel(context, label),
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  l10n.ts('{count} productos', {'count': '$count'}),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppPalette.mutedLavender,
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

class _ShopCatalogView extends StatelessWidget {
  const _ShopCatalogView({
    required this.categories,
    required this.products,
    required this.selectedCategory,
    required this.visibleProducts,
    required this.cart,
    required this.onSelectCategory,
    required this.onAdd,
    required this.onRemove,
    required this.onOpenProduct,
  });

  final List<String> categories;
  final List<ShopProduct> products;
  final String selectedCategory;
  final List<ShopProduct> visibleProducts;
  final Map<String, int> cart;
  final ValueChanged<String> onSelectCategory;
  final ValueChanged<String> onAdd;
  final ValueChanged<String> onRemove;
  final ValueChanged<ShopProduct> onOpenProduct;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final catalogLabel = selectedCategory == _ShopScreenState._allCategory
        ? l10n.ts('{count} piezas', {'count': '${visibleProducts.length}'})
        : l10n.ts(
            '{count} en {category}',
            {
              'count': '${visibleProducts.length}',
              'category': _categoryLabel(context, selectedCategory),
            },
          );
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: _SectionTitle(
                title: l10n.ts('Catálogo'),
              ),
            ),
            _CatalogMetaChip(
              label: catalogLabel,
              foreground: AppPalette.indigo,
              background: AppPalette.indigo.withValues(alpha: 0.10),
              borderColor: AppPalette.indigo.withValues(alpha: 0.18),
            ),
          ],
        ),
        const SizedBox(height: 12),
        SizedBox(
          height: 92,
          child: ListView.separated(
            scrollDirection: Axis.horizontal,
            itemCount: categories.length,
            separatorBuilder: (_, __) => const SizedBox(width: 10),
            itemBuilder: (context, index) {
              final category = categories[index];
              final count = category == _ShopScreenState._allCategory
                  ? products.length
                  : products
                      .where((product) => product.category == category)
                      .length;
              return _CategoryChip(
                label: category,
                count: count,
                selected: category == selectedCategory,
                onTap: () => onSelectCategory(category),
              );
            },
          ),
        ),
        const SizedBox(height: 18),
        if (visibleProducts.isEmpty)
          _EmptyState(
            title: l10n.ts('No hay artículos en esta categoría'),
          )
        else
          LayoutBuilder(
            builder: (context, constraints) {
              final columns = constraints.maxWidth >= 720 ? 3 : 2;
              final spacing = columns == 3 ? 14.0 : 12.0;
              final aspectRatio = columns == 3 ? 0.64 : 0.56;

              return GridView.builder(
                shrinkWrap: true,
                physics: const NeverScrollableScrollPhysics(),
                itemCount: visibleProducts.length,
                gridDelegate: SliverGridDelegateWithFixedCrossAxisCount(
                  crossAxisCount: columns,
                  mainAxisSpacing: 14,
                  crossAxisSpacing: spacing,
                  childAspectRatio: aspectRatio,
                ),
                itemBuilder: (context, index) {
                  final product = visibleProducts[index];
                  return _CatalogProductTile(
                    product: product,
                    quantity: cart[product.id] ?? 0,
                    onAdd: () => onAdd(product.id),
                    onRemove: () => onRemove(product.id),
                    onOpen: () => onOpenProduct(product),
                  );
                },
              );
            },
          ),
      ],
    );
  }
}

class _CatalogProductTile extends StatelessWidget {
  const _CatalogProductTile({
    required this.product,
    required this.quantity,
    required this.onAdd,
    required this.onRemove,
    required this.onOpen,
  });

  final ShopProduct product;
  final int quantity;
  final VoidCallback onAdd;
  final VoidCallback onRemove;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final addEnabled = product.madeToOrder || quantity < product.stockQuantity;
    final addLabel = !product.madeToOrder && product.stockQuantity <= 0
        ? context.l10n.ts('Agotado')
        : context.l10n.ts('Agregar');
    final stockLabel = _catalogAvailabilityLabel(context, product);

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(26),
        onTap: onOpen,
        child: Ink(
          decoration: BoxDecoration(
            gradient: const LinearGradient(
              begin: Alignment.topLeft,
              end: Alignment.bottomRight,
              colors: [
                Colors.white,
                AppPalette.moonIvory,
              ],
            ),
            borderRadius: BorderRadius.circular(28),
            border: Border.all(color: AppPalette.borderSoft),
            boxShadow: [
              BoxShadow(
                color: AppPalette.midnight.withValues(alpha: 0.08),
                blurRadius: 22,
                offset: const Offset(0, 14),
              ),
            ],
          ),
          child: ClipRRect(
            borderRadius: BorderRadius.circular(28),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                AspectRatio(
                  aspectRatio: 0.82,
                  child: Stack(
                    fit: StackFit.expand,
                    children: [
                      _ProductArtwork(product: product),
                      Positioned.fill(
                        child: DecoratedBox(
                          decoration: BoxDecoration(
                            gradient: LinearGradient(
                              begin: Alignment.topCenter,
                              end: Alignment.bottomCenter,
                              colors: [
                                Colors.transparent,
                                AppPalette.midnight.withValues(alpha: 0.05),
                                AppPalette.midnight.withValues(alpha: 0.16),
                              ],
                              stops: const [0.0, 0.72, 1.0],
                            ),
                          ),
                        ),
                      ),
                      Positioned(
                        left: 10,
                        top: 10,
                        child: _ProductBadge(
                          label: product.badge,
                        ),
                      ),
                      Positioned(
                        right: 10,
                        top: 10,
                        child: Container(
                          width: 36,
                          height: 36,
                          decoration: BoxDecoration(
                            color: Colors.white.withValues(alpha: 0.82),
                            borderRadius: BorderRadius.circular(14),
                            border: Border.all(
                              color: Colors.white.withValues(alpha: 0.72),
                            ),
                          ),
                          child: const Icon(
                            Icons.north_east_rounded,
                            color: AppPalette.midnight,
                            size: 18,
                          ),
                        ),
                      ),
                    ],
                  ),
                ),
                Expanded(
                  child: Padding(
                    padding: const EdgeInsets.fromLTRB(15, 14, 15, 15),
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        SizedBox(
                          height: 44,
                          child: Align(
                            alignment: Alignment.topLeft,
                            child: Text(
                              product.name,
                              maxLines: 2,
                              overflow: TextOverflow.ellipsis,
                              style: Theme.of(context)
                                  .textTheme
                                  .titleSmall
                                  ?.copyWith(
                                    fontWeight: FontWeight.w900,
                                    height: 1.08,
                                  ),
                            ),
                          ),
                        ),
                        const SizedBox(height: 8),
                        SizedBox(
                          height: 30,
                          child: Row(
                            children: [
                              Flexible(
                                child: _CatalogMetaChip(
                                  label: _categoryLabel(
                                    context,
                                    product.category,
                                  ),
                                  foreground: AppPalette.indigo,
                                  background:
                                      AppPalette.indigo.withValues(alpha: 0.10),
                                  borderColor:
                                      AppPalette.indigo.withValues(alpha: 0.18),
                                ),
                              ),
                              if (stockLabel != null) ...[
                                const SizedBox(width: 8),
                                Flexible(
                                  child: _CatalogMetaChip(
                                    label: stockLabel,
                                    foreground: _stockColor(product.stockLabel),
                                    background: _stockColor(product.stockLabel)
                                        .withValues(alpha: 0.10),
                                    borderColor: _stockColor(product.stockLabel)
                                        .withValues(alpha: 0.16),
                                  ),
                                ),
                              ],
                            ],
                          ),
                        ),
                        const Spacer(),
                        Text(
                          product.storeName,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style:
                              Theme.of(context).textTheme.labelSmall?.copyWith(
                                    color: AppPalette.mutedLavender,
                                    fontWeight: FontWeight.w800,
                                  ),
                        ),
                        const SizedBox(height: 4),
                        Text(
                          formatMoney(product.price),
                          style:
                              Theme.of(context).textTheme.titleMedium?.copyWith(
                                    fontWeight: FontWeight.w900,
                                  ),
                        ),
                        const SizedBox(height: 12),
                        _CompactQuantityControl(
                          quantity: quantity,
                          addEnabled: addEnabled,
                          emptyLabel: addLabel,
                          onAdd: onAdd,
                          onRemove: onRemove,
                        ),
                      ],
                    ),
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

class _CompactQuantityControl extends StatelessWidget {
  const _CompactQuantityControl({
    required this.quantity,
    required this.addEnabled,
    required this.emptyLabel,
    required this.onAdd,
    required this.onRemove,
  });

  final int quantity;
  final bool addEnabled;
  final String emptyLabel;
  final VoidCallback onAdd;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    if (quantity == 0) {
      return SizedBox(
        width: double.infinity,
        child: FilledButton(
          onPressed: addEnabled ? onAdd : null,
          style: FilledButton.styleFrom(
            padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 12),
            visualDensity: VisualDensity.compact,
            backgroundColor: AppPalette.midnight,
            foregroundColor: Colors.white,
            shape: RoundedRectangleBorder(
              borderRadius: BorderRadius.circular(18),
            ),
          ),
          child: Text(emptyLabel),
        ),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: AppPalette.petalSoft,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppPalette.borderSoft),
      ),
      child: Row(
        mainAxisAlignment: MainAxisAlignment.spaceBetween,
        children: [
          IconButton(
            onPressed: onRemove,
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.remove_rounded),
          ),
          Text(
            '$quantity',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          IconButton(
            onPressed: addEnabled ? onAdd : null,
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.add_rounded),
          ),
        ],
      ),
    );
  }
}

class _CatalogMetaChip extends StatelessWidget {
  const _CatalogMetaChip({
    required this.label,
    required this.foreground,
    required this.background,
    required this.borderColor,
  });

  final String label;
  final Color foreground;
  final Color background;
  final Color borderColor;

  @override
  Widget build(BuildContext context) {
    return Container(
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 6),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: borderColor),
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: foreground,
              fontWeight: FontWeight.w900,
            ),
      ),
    );
  }
}

class _ShopOrdersView extends StatefulWidget {
  const _ShopOrdersView({
    required this.orders,
  });

  final List<ShopOrder> orders;

  @override
  State<_ShopOrdersView> createState() => _ShopOrdersViewState();
}

class _ShopCartView extends StatelessWidget {
  const _ShopCartView({
    required this.lines,
    required this.subtotal,
    required this.shipping,
    required this.total,
    required this.onAdd,
    required this.onRemove,
    required this.onOpenProduct,
    required this.onCheckout,
    required this.onOpenCatalog,
  });

  final List<_CartLine> lines;
  final double subtotal;
  final double shipping;
  final double total;
  final ValueChanged<String> onAdd;
  final ValueChanged<String> onRemove;
  final ValueChanged<ShopProduct> onOpenProduct;
  final VoidCallback onCheckout;
  final VoidCallback onOpenCatalog;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final itemCount = lines.fold<int>(0, (sum, line) => sum + line.quantity);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            Expanded(
              child: _SectionTitle(
                title: l10n.ts('Carrito'),
              ),
            ),
            _CatalogMetaChip(
              label: l10n.ts('{count} artículos', {'count': '$itemCount'}),
              foreground: AppPalette.royalViolet,
              background: AppPalette.royalViolet.withValues(alpha: 0.10),
              borderColor: AppPalette.royalViolet.withValues(alpha: 0.18),
            ),
          ],
        ),
        const SizedBox(height: 14),
        if (lines.isEmpty)
          Container(
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
                  l10n.ts('Tu carrito está vacío'),
                  style: Theme.of(context).textTheme.titleMedium?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 10),
                FilledButton.icon(
                  onPressed: onOpenCatalog,
                  icon: const Icon(Icons.storefront_rounded),
                  label: Text(l10n.ts('Ver catálogo')),
                ),
              ],
            ),
          )
        else ...[
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              gradient: const LinearGradient(
                begin: Alignment.topLeft,
                end: Alignment.bottomRight,
                colors: [
                  AppPalette.midnight,
                  AppPalette.indigo,
                  AppPalette.royalViolet,
                ],
              ),
              borderRadius: BorderRadius.circular(28),
              boxShadow: [
                BoxShadow(
                  color: AppPalette.indigo.withValues(alpha: 0.18),
                  blurRadius: 22,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.ts('Listo para confirmar'),
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 8),
                Text(
                  l10n.ts(
                    '{count} artículos seleccionados con total de {total}.',
                    {
                      'count': '$itemCount',
                      'total': _formatUsd(total),
                    },
                  ),
                  style: Theme.of(context).textTheme.bodyLarge?.copyWith(
                        color: Colors.white.withValues(alpha: 0.82),
                        height: 1.4,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(height: 16),
          ...lines.map(
            (line) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _CartProductCard(
                line: line,
                onAdd: () => onAdd(line.product.id),
                onRemove: () => onRemove(line.product.id),
                onOpen: () => onOpenProduct(line.product),
              ),
            ),
          ),
          const SizedBox(height: 4),
          Container(
            width: double.infinity,
            padding: const EdgeInsets.all(18),
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: AppPalette.border),
            ),
            child: Column(
              children: [
                _SummaryRow(
                  label: l10n.ts('Subtotal'),
                  value: _formatUsd(subtotal),
                ),
                const SizedBox(height: 10),
                _SummaryRow(
                  label: l10n.ts('Envío'),
                  value: _formatUsd(shipping),
                ),
                const SizedBox(height: 10),
                _SummaryRow(
                  label: l10n.ts('Total'),
                  value: _formatUsd(total),
                  highlight: true,
                ),
                const SizedBox(height: 16),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: onCheckout,
                    style: FilledButton.styleFrom(
                      backgroundColor: AppPalette.midnight,
                      foregroundColor: Colors.white,
                      padding: const EdgeInsets.symmetric(vertical: 16),
                    ),
                    icon: const Icon(Icons.payment_rounded),
                    label: Text(l10n.ts('Continuar compra')),
                  ),
                ),
              ],
            ),
          ),
        ],
      ],
    );
  }
}

class _CartProductCard extends StatelessWidget {
  const _CartProductCard({
    required this.line,
    required this.onAdd,
    required this.onRemove,
    required this.onOpen,
  });

  final _CartLine line;
  final VoidCallback onAdd;
  final VoidCallback onRemove;
  final VoidCallback onOpen;

  @override
  Widget build(BuildContext context) {
    final product = line.product;
    final addEnabled =
        product.madeToOrder || line.quantity < product.stockQuantity;

    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(24),
        onTap: onOpen,
        child: Ink(
          decoration: BoxDecoration(
            color: Colors.white,
            borderRadius: BorderRadius.circular(24),
            border: Border.all(color: AppPalette.border),
          ),
          padding: const EdgeInsets.all(14),
          child: Row(
            children: [
              ClipRRect(
                borderRadius: BorderRadius.circular(18),
                child: SizedBox(
                  width: 92,
                  height: 92,
                  child: _ProductArtwork(product: product),
                ),
              ),
              const SizedBox(width: 14),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      product.name,
                      maxLines: 2,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w900,
                            height: 1.12,
                          ),
                    ),
                    const SizedBox(height: 6),
                    Text(
                      product.storeName,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppPalette.mutedLavender,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                    const SizedBox(height: 8),
                    Text(
                      formatMoney(product.price),
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: AppPalette.midnight,
                          ),
                    ),
                    const SizedBox(height: 10),
                    _QuantityControl(
                      quantity: line.quantity,
                      addEnabled: addEnabled,
                      emptyLabel: context.l10n.ts('Agregar'),
                      onAdd: onAdd,
                      onRemove: onRemove,
                    ),
                  ],
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _ShopOrdersViewState extends State<_ShopOrdersView> {
  final Set<String> _expandedOrderIds = <String>{};

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final visibleOrders = widget.orders;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionTitle(
          title: l10n.ts('Mis pedidos'),
        ),
        const SizedBox(height: 12),
        _OrderPipeline(orders: widget.orders),
        const SizedBox(height: 16),
        if (widget.orders.isEmpty)
          _EmptyState(
            title: l10n.ts('Aún no hay órdenes'),
          )
        else
          ...visibleOrders.map(
            (order) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _OrderCard(
                order: order,
                expanded: _expandedOrderIds.contains(order.id),
                onToggle: () {
                  setState(() {
                    if (_expandedOrderIds.contains(order.id)) {
                      _expandedOrderIds.remove(order.id);
                    } else {
                      _expandedOrderIds.add(order.id);
                    }
                  });
                },
              ),
            ),
          ),
      ],
    );
  }
}

class _OrderPipeline extends StatelessWidget {
  const _OrderPipeline({
    required this.orders,
  });

  final List<ShopOrder> orders;

  @override
  Widget build(BuildContext context) {
    final stages = _shopOrderStages(context);

    return SizedBox(
      height: 104,
      child: ListView.separated(
        scrollDirection: Axis.horizontal,
        itemCount: stages.length,
        separatorBuilder: (_, __) => const SizedBox(width: 10),
        itemBuilder: (context, index) {
          final stage = stages[index];
          final count =
              orders.where((order) => order.status == stage.status).length;
          return _PipelineTile(stage: stage, count: count);
        },
      ),
    );
  }
}

class _PipelineTile extends StatelessWidget {
  const _PipelineTile({
    required this.stage,
    required this.count,
  });

  final _PipelineStage stage;
  final int count;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 142,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: stage.color.withValues(alpha: 0.2)),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 34,
            height: 34,
            decoration: BoxDecoration(
              color: stage.color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(13),
            ),
            child: Icon(Icons.local_shipping_outlined, color: stage.color),
          ),
          const Spacer(),
          Text(
            '$count',
            style: Theme.of(context).textTheme.titleLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          Text(
            stage.label,
            style: Theme.of(context).textTheme.labelMedium?.copyWith(
                  color: AppPalette.mutedLavender,
                  fontWeight: FontWeight.w800,
                ),
          ),
        ],
      ),
    );
  }
}

class _ShopAdminView extends StatefulWidget {
  const _ShopAdminView({
    required this.products,
    required this.orders,
    required this.lowStockProducts,
    required this.customizableProducts,
    required this.onCreateProduct,
    required this.onEditStock,
    required this.onEditFeatured,
    required this.onOpenOrders,
    required this.onUpdateOrderStatus,
  });

  final List<ShopProduct> products;
  final List<ShopOrder> orders;
  final List<ShopProduct> lowStockProducts;
  final List<ShopProduct> customizableProducts;
  final VoidCallback onCreateProduct;
  final VoidCallback onEditStock;
  final VoidCallback onEditFeatured;
  final VoidCallback onOpenOrders;
  final Future<void> Function(ShopOrder order, String status)
      onUpdateOrderStatus;

  @override
  State<_ShopAdminView> createState() => _ShopAdminViewState();
}

class _ShopAdminViewState extends State<_ShopAdminView> {
  String _selectedInventoryFilter = 'all';
  String _selectedOrderFilter = 'all';
  final Set<String> _expandedOrderIds = <String>{};

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final activeProducts =
        widget.products.where((product) => product.status == 'active').length;
    final nonVisibleProducts = widget.products
        .where((product) =>
            product.status == 'draft' || product.status == 'hidden')
        .length;
    final visibleInventory = _filterInventory(widget.products);
    final visibleOrders = _filterOrders(widget.orders);
    final activeOrders =
        widget.orders.where((order) => order.status != 'shipped').length;

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        _SectionTitle(
          title: l10n.ts('Administrar tienda'),
        ),
        const SizedBox(height: 12),
        LayoutBuilder(
          builder: (context, constraints) {
            final tileWidth = (constraints.maxWidth - 12) / 2;

            return Wrap(
              spacing: 12,
              runSpacing: 12,
              children: [
                _AdminActionCard(
                  width: tileWidth,
                  title: l10n.ts('Nuevo producto'),
                  subtitle: l10n.ts(
                    '{count} en catálogo',
                    {'count': '${widget.products.length}'},
                  ),
                  icon: Icons.add_box_outlined,
                  color: AppPalette.indigo,
                  onTap: widget.onCreateProduct,
                ),
                _AdminActionCard(
                  width: tileWidth,
                  title: l10n.ts('Editar stock'),
                  subtitle: l10n.ts(
                    '{count} alertas',
                    {'count': '${widget.lowStockProducts.length}'},
                  ),
                  icon: Icons.inventory_outlined,
                  color: AppPalette.berry,
                  onTap: widget.onEditStock,
                ),
                _AdminActionCard(
                  width: tileWidth,
                  title: l10n.ts('Destacados'),
                  subtitle: l10n.ts(
                    '{count} activos',
                    {
                      'count':
                          '${widget.products.where((product) => product.featured).length}',
                    },
                  ),
                  icon: Icons.auto_awesome_rounded,
                  color: AppPalette.roseDust,
                  onTap: widget.onEditFeatured,
                ),
                _AdminActionCard(
                  width: tileWidth,
                  title: l10n.ts('Órdenes'),
                  subtitle: l10n.ts(
                    '{count} recientes',
                    {'count': '${widget.orders.length}'},
                  ),
                  icon: Icons.receipt_long_rounded,
                  color: AppPalette.success,
                  onTap: () {
                    setState(() {
                      _selectedOrderFilter = 'all';
                    });
                    widget.onOpenOrders();
                  },
                ),
              ],
            );
          },
        ),
        const SizedBox(height: 18),
        SizedBox(
          height: 110,
          child: ListView(
            scrollDirection: Axis.horizontal,
            children: [
              _MetricTile(
                title: l10n.ts('Activos'),
                value: '$activeProducts',
                icon: Icons.storefront_rounded,
                color: AppPalette.indigo,
              ),
              const SizedBox(width: 10),
              _MetricTile(
                title: l10n.ts('No visibles'),
                value: '$nonVisibleProducts',
                icon: Icons.visibility_off_rounded,
                color: AppPalette.berry,
              ),
              const SizedBox(width: 10),
              _MetricTile(
                title: l10n.ts('Stock crítico'),
                value: '${widget.lowStockProducts.length}',
                icon: Icons.inventory_2_rounded,
                color: AppPalette.flameGold,
              ),
              const SizedBox(width: 10),
              _MetricTile(
                title: l10n.ts('Órdenes activas'),
                value: '$activeOrders',
                icon: Icons.local_shipping_rounded,
                color: AppPalette.success,
              ),
            ],
          ),
        ),
        const SizedBox(height: 22),
        _SectionTitle(
          title: l10n.ts('Inventario y visibilidad'),
        ),
        const SizedBox(height: 12),
        Wrap(
          spacing: 8,
          runSpacing: 8,
          children: _inventoryFilterOptions(context).map((option) {
            final count = _filterInventory(
              widget.products,
              filter: option.status,
            ).length;
            return FilterChip(
              label: Text('${option.label} ($count)'),
              selected: _selectedInventoryFilter == option.status,
              onSelected: (_) {
                setState(() {
                  _selectedInventoryFilter = option.status;
                });
              },
            );
          }).toList(),
        ),
        const SizedBox(height: 12),
        if (visibleInventory.isEmpty)
          _EmptyState(
            title: l10n.ts('No hay productos para este filtro'),
          )
        else
          ...visibleInventory.map(
            (product) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _InventoryRow(product: product),
            ),
          ),
        const SizedBox(height: 14),
        _SectionTitle(
          title: l10n.ts('Personalizables'),
        ),
        const SizedBox(height: 12),
        if (widget.customizableProducts.isEmpty)
          _EmptyState(
            title: l10n.ts('Sin piezas personalizables'),
          )
        else
          ...widget.customizableProducts.map(
            (product) => Padding(
              padding: const EdgeInsets.only(bottom: 10),
              child: _InventoryRow(product: product),
            ),
          ),
        const SizedBox(height: 14),
        _SectionTitle(
          title: l10n.ts('Gestión de órdenes'),
        ),
        const SizedBox(height: 12),
        if (widget.orders.isEmpty)
          _EmptyState(
            title: l10n.ts('Sin órdenes para gestionar'),
          )
        else ...[
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _orderStatusFilterOptions(context).map((option) {
              final count = option.status == 'all'
                  ? widget.orders.length
                  : widget.orders
                      .where((order) => order.status == option.status)
                      .length;
              return FilterChip(
                label: Text('${option.label} ($count)'),
                selected: _selectedOrderFilter == option.status,
                onSelected: (_) {
                  setState(() {
                    _selectedOrderFilter = option.status;
                  });
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
          if (visibleOrders.isEmpty)
            _EmptyState(
              title: l10n.ts('No hay órdenes para este filtro'),
            )
          else
            ...visibleOrders.map(
              (order) => Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: _AdminOrderRow(
                  order: order,
                  expanded: _expandedOrderIds.contains(order.id),
                  onToggle: () {
                    setState(() {
                      if (_expandedOrderIds.contains(order.id)) {
                        _expandedOrderIds.remove(order.id);
                      } else {
                        _expandedOrderIds.add(order.id);
                      }
                    });
                  },
                  onUpdateStatus: (status) =>
                      widget.onUpdateOrderStatus(order, status),
                ),
              ),
            ),
        ],
      ],
    );
  }

  List<ShopProduct> _filterInventory(
    List<ShopProduct> products, {
    String? filter,
  }) {
    final selected = filter ?? _selectedInventoryFilter;
    switch (selected) {
      case 'low_stock':
        return products
            .where(
              (product) =>
                  !product.madeToOrder &&
                  product.stockQuantity > 0 &&
                  product.stockQuantity <= 3,
            )
            .toList();
      case 'made_to_order':
        return products.where((product) => product.madeToOrder).toList();
      case 'draft':
      case 'hidden':
      case 'archived':
      case 'active':
        return products.where((product) => product.status == selected).toList();
      default:
        return products;
    }
  }

  List<ShopOrder> _filterOrders(List<ShopOrder> orders) {
    if (_selectedOrderFilter == 'all') {
      return orders;
    }
    return orders
        .where((order) => order.status == _selectedOrderFilter)
        .toList();
  }
}

class _AdminActionCard extends StatelessWidget {
  const _AdminActionCard({
    required this.width,
    required this.title,
    required this.subtitle,
    required this.icon,
    required this.color,
    required this.onTap,
  });

  final double width;
  final String title;
  final String subtitle;
  final IconData icon;
  final Color color;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    return SizedBox(
      width: width,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(24),
          onTap: onTap,
          child: Ink(
            decoration: BoxDecoration(
              color: Colors.white,
              borderRadius: BorderRadius.circular(24),
              border: Border.all(color: color.withValues(alpha: 0.2)),
            ),
            padding: const EdgeInsets.all(15),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 42,
                  height: 42,
                  decoration: BoxDecoration(
                    color: color.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(16),
                  ),
                  child: Icon(icon, color: color),
                ),
                const SizedBox(height: 18),
                Text(
                  title,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 5),
                Text(
                  subtitle,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: AppPalette.mutedLavender,
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

class _ProductEditorSheet extends StatefulWidget {
  const _ProductEditorSheet({
    required this.categories,
    required this.onSubmit,
  });

  final List<String> categories;
  final Future<ShopProduct> Function(CreateShopProductInput input) onSubmit;

  @override
  State<_ProductEditorSheet> createState() => _ProductEditorSheetState();
}

class _ProductEditorSheetState extends State<_ProductEditorSheet> {
  late final TextEditingController _nameController;
  late final TextEditingController _categoryController;
  late final TextEditingController _shortDescriptionController;
  late final TextEditingController _descriptionController;
  late final TextEditingController _priceController;
  late final TextEditingController _skuController;
  late final TextEditingController _imageUrlController;
  late final TextEditingController _badgeController;
  late final TextEditingController _stockQuantityController;
  late final TextEditingController _tagsController;
  String _status = 'active';
  bool _featured = false;
  bool _madeToOrder = false;
  bool _isSubmitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    final category = widget.categories.isEmpty ? 'Tarot' : widget.categories[0];
    _nameController = TextEditingController();
    _categoryController = TextEditingController(text: category);
    _shortDescriptionController = TextEditingController();
    _descriptionController = TextEditingController();
    _priceController = TextEditingController();
    _skuController = TextEditingController();
    _imageUrlController = TextEditingController();
    _badgeController = TextEditingController(text: 'Nuevo');
    _stockQuantityController = TextEditingController(text: '9');
    _tagsController = TextEditingController(text: 'nuevo, tienda');
  }

  @override
  void dispose() {
    _nameController.dispose();
    _categoryController.dispose();
    _shortDescriptionController.dispose();
    _descriptionController.dispose();
    _priceController.dispose();
    _skuController.dispose();
    _imageUrlController.dispose();
    _badgeController.dispose();
    _stockQuantityController.dispose();
    _tagsController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return _ShopSheetShell(
      title: l10n.ts('Nuevo producto'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          TextField(
            controller: _nameController,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              labelText: l10n.ts('Nombre'),
              hintText: 'Ej. Tarot Lunar Vision',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _categoryController,
            textCapitalization: TextCapitalization.words,
            decoration: InputDecoration(
              labelText: l10n.ts('Categoría'),
              hintText: 'Tarot, Velas, Cuadros',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _priceController,
            keyboardType: const TextInputType.numberWithOptions(decimal: true),
            decoration: InputDecoration(
              labelText: l10n.ts('Precio USD'),
              hintText: '39.00',
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _skuController,
            textCapitalization: TextCapitalization.characters,
            decoration: InputDecoration(
              labelText: l10n.ts('SKU'),
              hintText: 'TAROT-LUNAR-VISION',
            ),
          ),
          const SizedBox(height: 12),
          DropdownButtonFormField<String>(
            initialValue: _status,
            decoration: InputDecoration(
              labelText: l10n.ts('Estado comercial'),
            ),
            items: const [
              DropdownMenuItem(value: 'active', child: Text('Activo')),
              DropdownMenuItem(value: 'draft', child: Text('Borrador')),
              DropdownMenuItem(value: 'hidden', child: Text('Oculto')),
              DropdownMenuItem(value: 'archived', child: Text('Archivado')),
            ],
            onChanged: _isSubmitting
                ? null
                : (value) {
                    if (value == null) {
                      return;
                    }
                    setState(() {
                      _status = value;
                    });
                  },
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _shortDescriptionController,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: l10n.ts('Descripción corta'),
              hintText: l10n.ts('Una línea para la tarjeta del catálogo'),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _descriptionController,
            maxLines: 3,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: l10n.ts('Descripción completa'),
              hintText: l10n.ts('Detalles del producto, intención o uso'),
            ),
          ),
          const SizedBox(height: 12),
          TextField(
            controller: _imageUrlController,
            keyboardType: TextInputType.url,
            decoration: InputDecoration(
              labelText: l10n.ts('Foto del producto'),
              hintText: 'https://.../producto.jpg',
            ),
          ),
          const SizedBox(height: 12),
          Row(
            children: [
              Expanded(
                child: TextField(
                  controller: _badgeController,
                  textCapitalization: TextCapitalization.sentences,
                  decoration: InputDecoration(
                    labelText: l10n.ts('Badge'),
                    hintText: l10n.ts('Nuevo'),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: TextField(
                  controller: _stockQuantityController,
                  keyboardType: TextInputType.number,
                  decoration: InputDecoration(
                    labelText: l10n.ts('Unidades'),
                    hintText: '9',
                  ),
                ),
              ),
            ],
          ),
          const SizedBox(height: 12),
          SwitchListTile.adaptive(
            value: _madeToOrder,
            onChanged: (value) {
              setState(() {
                _madeToOrder = value;
              });
            },
            contentPadding: EdgeInsets.zero,
            title: Text(l10n.ts('Hecho a pedido')),
          ),
          const SizedBox(height: 8),
          TextField(
            controller: _tagsController,
            textCapitalization: TextCapitalization.sentences,
            decoration: InputDecoration(
              labelText: l10n.ts('Tags'),
              hintText: l10n.ts('Separados por coma'),
            ),
          ),
          const SizedBox(height: 8),
          SwitchListTile.adaptive(
            value: _featured,
            onChanged: (value) {
              setState(() {
                _featured = value;
              });
            },
            contentPadding: EdgeInsets.zero,
            title: Text(l10n.ts('Marcar como destacado')),
          ),
          if (_error != null) ...[
            const SizedBox(height: 8),
            Text(
              _error!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppPalette.berry,
                    fontWeight: FontWeight.w800,
                  ),
            ),
          ],
          const SizedBox(height: 16),
          SizedBox(
            width: double.infinity,
            child: FilledButton.icon(
              onPressed: _isSubmitting ? null : _submit,
              icon: _isSubmitting
                  ? const SizedBox(
                      width: 18,
                      height: 18,
                      child: CircularProgressIndicator(strokeWidth: 2),
                    )
                  : const Icon(Icons.add_box_outlined),
              label: Text(
                _isSubmitting
                    ? l10n.ts('Guardando...')
                    : l10n.ts('Crear producto'),
              ),
            ),
          ),
        ],
      ),
    );
  }

  Future<void> _submit() async {
    final name = _nameController.text.trim();
    final category = _categoryController.text.trim();
    final shortDescription = _shortDescriptionController.text.trim();
    final description = _descriptionController.text.trim();
    final price = double.tryParse(_priceController.text.trim());
    final sku = _skuController.text.trim();
    final imageUrl = _imageUrlController.text.trim();
    final badge = _badgeController.text.trim();
    final stockQuantity = int.tryParse(_stockQuantityController.text.trim());
    final tags = _tagsController.text
        .split(',')
        .map((tag) => tag.trim())
        .where((tag) => tag.isNotEmpty)
        .toList();

    if (name.length < 3 || category.length < 3 || price == null || price <= 0) {
      setState(() {
        _error = context.l10n.ts(
          'Completa nombre, categoría y precio válido.',
        );
      });
      return;
    }

    if (!_madeToOrder && (stockQuantity == null || stockQuantity < 0)) {
      setState(() {
        _error = context.l10n.ts('Ingresa un número de unidades válido.');
      });
      return;
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      final product = await widget.onSubmit(
        CreateShopProductInput(
          name: name,
          category: category,
          shortDescription: shortDescription.isEmpty
              ? context.l10n.ts('Producto agregado desde administración.')
              : shortDescription,
          description: description.isEmpty ? shortDescription : description,
          priceAmount: price,
          sku: sku,
          status: _status,
          imageUrl: imageUrl,
          badge: badge.isEmpty ? context.l10n.ts('Nuevo') : badge,
          stockQuantity: _madeToOrder ? 0 : stockQuantity ?? 0,
          madeToOrder: _madeToOrder,
          featured: _featured,
          tags: tags.isEmpty ? [context.l10n.ts('nuevo')] : tags,
        ),
      );
      if (!mounted) {
        return;
      }
      Navigator.of(context).pop(product);
    } catch (error) {
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }
}

class _StockManagerSheet extends StatefulWidget {
  const _StockManagerSheet({
    required this.products,
    required this.onUpdateProduct,
  });

  final List<ShopProduct> products;
  final Future<ShopProduct> Function(
    ShopProduct product,
    UpdateShopProductInput input,
  ) onUpdateProduct;

  @override
  State<_StockManagerSheet> createState() => _StockManagerSheetState();
}

class _StockManagerSheetState extends State<_StockManagerSheet> {
  late final Map<String, int> _quantityByProductId;
  late final Map<String, bool> _madeToOrderByProductId;
  late final Map<String, String> _statusByProductId;
  final Set<String> _updatingIds = <String>{};
  String _selectedFilter = 'all';
  String? _error;

  @override
  void initState() {
    super.initState();
    _quantityByProductId = {
      for (final product in widget.products) product.id: product.stockQuantity,
    };
    _madeToOrderByProductId = {
      for (final product in widget.products) product.id: product.madeToOrder,
    };
    _statusByProductId = {
      for (final product in widget.products) product.id: product.status,
    };
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return _ShopSheetShell(
      title: l10n.ts('Inventario'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_error != null) ...[
            Text(
              _error!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppPalette.berry,
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 12),
          ],
          Wrap(
            spacing: 8,
            runSpacing: 8,
            children: _inventoryFilterOptions(context).map((option) {
              final count = _visibleProductsFor(option.status).length;
              return FilterChip(
                label: Text('${option.label} ($count)'),
                selected: _selectedFilter == option.status,
                onSelected: (_) {
                  setState(() {
                    _selectedFilter = option.status;
                  });
                },
              );
            }).toList(),
          ),
          const SizedBox(height: 12),
          ..._visibleProductsFor(_selectedFilter).map(
            (product) => Padding(
              padding: const EdgeInsets.only(bottom: 12),
              child: _StockEditorRow(
                product: product,
                quantity:
                    _quantityByProductId[product.id] ?? product.stockQuantity,
                madeToOrder:
                    _madeToOrderByProductId[product.id] ?? product.madeToOrder,
                status: _statusByProductId[product.id] ?? product.status,
                updating: _updatingIds.contains(product.id),
                onDecrease: () {
                  final current =
                      _quantityByProductId[product.id] ?? product.stockQuantity;
                  _update(product,
                      stockQuantity: current - 1, madeToOrder: false);
                },
                onIncrease: () {
                  final current =
                      _quantityByProductId[product.id] ?? product.stockQuantity;
                  _update(product,
                      stockQuantity: current + 1, madeToOrder: false);
                },
                onToggleMadeToOrder: (value) {
                  final current =
                      _quantityByProductId[product.id] ?? product.stockQuantity;
                  _update(
                    product,
                    stockQuantity: value ? 0 : current,
                    madeToOrder: value,
                  );
                },
                onSelectStatus: (status) => _update(product, status: status),
              ),
            ),
          ),
        ],
      ),
    );
  }

  List<ShopProduct> _visibleProductsFor(String filter) {
    switch (filter) {
      case 'low_stock':
        return widget.products
            .where(
              (product) =>
                  !product.madeToOrder &&
                  product.stockQuantity > 0 &&
                  product.stockQuantity <= 3,
            )
            .toList();
      case 'made_to_order':
        return widget.products.where((product) => product.madeToOrder).toList();
      case 'draft':
      case 'hidden':
      case 'archived':
      case 'active':
        return widget.products
            .where((product) => product.status == filter)
            .toList();
      default:
        return widget.products;
    }
  }

  Future<void> _update(
    ShopProduct product, {
    int? stockQuantity,
    bool? madeToOrder,
    String? status,
  }) async {
    if (_updatingIds.contains(product.id)) {
      return;
    }

    final nextMadeToOrder = madeToOrder ??
        _madeToOrderByProductId[product.id] ??
        product.madeToOrder;
    final nextQuantity = nextMadeToOrder
        ? 0
        : (stockQuantity ??
                _quantityByProductId[product.id] ??
                product.stockQuantity)
            .clamp(0, 9999);
    final nextStatus =
        status ?? _statusByProductId[product.id] ?? product.status;

    setState(() {
      _updatingIds.add(product.id);
      _error = null;
    });

    try {
      final updated = await widget.onUpdateProduct(
        product,
        UpdateShopProductInput(
          stockQuantity: nextQuantity,
          madeToOrder: nextMadeToOrder,
          status: nextStatus,
        ),
      );
      if (!mounted) {
        return;
      }
      setState(() {
        _quantityByProductId[product.id] = updated.stockQuantity;
        _madeToOrderByProductId[product.id] = updated.madeToOrder;
        _statusByProductId[product.id] = updated.status;
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
          _updatingIds.remove(product.id);
        });
      }
    }
  }
}

class _StockEditorRow extends StatelessWidget {
  const _StockEditorRow({
    required this.product,
    required this.quantity,
    required this.madeToOrder,
    required this.status,
    required this.updating,
    required this.onDecrease,
    required this.onIncrease,
    required this.onToggleMadeToOrder,
    required this.onSelectStatus,
  });

  final ShopProduct product;
  final int quantity;
  final bool madeToOrder;
  final String status;
  final bool updating;
  final VoidCallback onDecrease;
  final VoidCallback onIncrease;
  final ValueChanged<bool> onToggleMadeToOrder;
  final ValueChanged<String> onSelectStatus;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final statusCopy = _productStatusCopy(context, status);
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppPalette.border),
      ),
      padding: const EdgeInsets.all(12),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Row(
                      children: [
                        Expanded(
                          child: Text(
                            product.name,
                            maxLines: 1,
                            overflow: TextOverflow.ellipsis,
                            style: Theme.of(context)
                                .textTheme
                                .titleSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w900,
                                ),
                          ),
                        ),
                        const SizedBox(width: 8),
                        PopupMenuButton<String>(
                          onSelected: updating ? null : onSelectStatus,
                          itemBuilder: (context) =>
                              _productStatusOptions(context)
                                  .map(
                                    (option) => PopupMenuItem<String>(
                                      value: option.status,
                                      child: Text(option.label),
                                    ),
                                  )
                                  .toList(),
                          child: _StatusPill(
                            label: statusCopy.label,
                            color: statusCopy.color,
                          ),
                        ),
                      ],
                    ),
                    const SizedBox(height: 4),
                    Text(
                      '${product.storeName} · ${product.sku.isEmpty ? context.l10n.ts('SKU automático') : product.sku}',
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppPalette.mutedLavender,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ],
                ),
              ),
              if (updating)
                const SizedBox(
                  width: 18,
                  height: 18,
                  child: CircularProgressIndicator(strokeWidth: 2),
                ),
            ],
          ),
          const SizedBox(height: 10),
          Row(
            children: [
              IconButton(
                onPressed: updating || madeToOrder || quantity <= 0
                    ? null
                    : onDecrease,
                icon: const Icon(Icons.remove_circle_outline_rounded),
              ),
              Expanded(
                child: Column(
                  children: [
                    Text(
                      madeToOrder
                          ? l10n.ts('Hecho a pedido')
                          : l10n.ts('{count} unidades', {'count': '$quantity'}),
                      style: Theme.of(context).textTheme.titleSmall?.copyWith(
                            fontWeight: FontWeight.w900,
                            color: _stockStateColor(quantity, madeToOrder),
                          ),
                    ),
                    const SizedBox(height: 2),
                    Text(
                      _stockStatusLabel(context, quantity, madeToOrder),
                      style: Theme.of(context).textTheme.bodySmall?.copyWith(
                            color: AppPalette.mutedLavender,
                            fontWeight: FontWeight.w700,
                          ),
                    ),
                  ],
                ),
              ),
              IconButton(
                onPressed: updating || madeToOrder ? null : onIncrease,
                icon: const Icon(Icons.add_circle_outline_rounded),
              ),
            ],
          ),
          const SizedBox(height: 8),
          Align(
            alignment: Alignment.centerLeft,
            child: Wrap(
              spacing: 8,
              runSpacing: 8,
              children: [
                FilterChip(
                  label: Text(l10n.ts('Hecho a pedido')),
                  selected: madeToOrder,
                  onSelected:
                      updating ? null : (value) => onToggleMadeToOrder(value),
                ),
                FilterChip(
                  label: Text(
                    l10n.ts(
                      'Visibilidad: {status}',
                      {'status': statusCopy.label},
                    ),
                  ),
                  selected: status == 'active',
                  onSelected: null,
                ),
              ],
            ),
          ),
        ],
      ),
    );
  }
}

class _FeaturedManagerSheet extends StatefulWidget {
  const _FeaturedManagerSheet({
    required this.products,
    required this.onUpdateFeatured,
  });

  final List<ShopProduct> products;
  final Future<ShopProduct> Function(ShopProduct product, bool featured)
      onUpdateFeatured;

  @override
  State<_FeaturedManagerSheet> createState() => _FeaturedManagerSheetState();
}

class _FeaturedManagerSheetState extends State<_FeaturedManagerSheet> {
  late final Map<String, bool> _featuredByProductId;
  final Set<String> _updatingIds = <String>{};
  String? _error;

  @override
  void initState() {
    super.initState();
    _featuredByProductId = {
      for (final product in widget.products) product.id: product.featured,
    };
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return _ShopSheetShell(
      title: l10n.ts('Destacados'),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          if (_error != null) ...[
            Text(
              _error!,
              style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                    color: AppPalette.berry,
                    fontWeight: FontWeight.w800,
                  ),
            ),
            const SizedBox(height: 12),
          ],
          ...widget.products.map(
            (product) {
              final updating = _updatingIds.contains(product.id);
              return Padding(
                padding: const EdgeInsets.only(bottom: 10),
                child: SwitchListTile.adaptive(
                  value: _featuredByProductId[product.id] ?? product.featured,
                  onChanged:
                      updating ? null : (value) => _update(product, value),
                  title: Text(
                    product.name,
                    style: Theme.of(context).textTheme.titleSmall?.copyWith(
                          fontWeight: FontWeight.w900,
                        ),
                  ),
                  subtitle: Text(
                    '${_categoryLabel(context, product.category)} · ${_stockStatusLabel(context, product.stockQuantity, product.madeToOrder)}',
                  ),
                  secondary: updating
                      ? const SizedBox(
                          width: 22,
                          height: 22,
                          child: CircularProgressIndicator(strokeWidth: 2),
                        )
                      : const Icon(Icons.auto_awesome_rounded),
                  tileColor: Colors.white,
                  shape: RoundedRectangleBorder(
                    borderRadius: BorderRadius.circular(20),
                    side: const BorderSide(color: AppPalette.border),
                  ),
                ),
              );
            },
          ),
        ],
      ),
    );
  }

  Future<void> _update(ShopProduct product, bool featured) async {
    if (_updatingIds.contains(product.id)) {
      return;
    }

    setState(() {
      _updatingIds.add(product.id);
      _error = null;
    });

    try {
      final updated = await widget.onUpdateFeatured(product, featured);
      if (!mounted) {
        return;
      }
      setState(() {
        _featuredByProductId[product.id] = updated.featured;
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
          _updatingIds.remove(product.id);
        });
      }
    }
  }
}

class _AdminOrderRow extends StatelessWidget {
  const _AdminOrderRow({
    required this.order,
    required this.expanded,
    required this.onToggle,
    required this.onUpdateStatus,
  });

  final ShopOrder order;
  final bool expanded;
  final VoidCallback onToggle;
  final Future<void> Function(String status) onUpdateStatus;

  @override
  Widget build(BuildContext context) {
    return _OrderCard(
      order: order,
      expanded: expanded,
      onToggle: onToggle,
      onUpdateStatus: onUpdateStatus,
    );
  }
}

class _ShopSheetShell extends StatelessWidget {
  const _ShopSheetShell({
    required this.title,
    required this.child,
  });

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: const BoxDecoration(
        color: AppPalette.petalSoft,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 18,
            bottom: 20 + MediaQuery.of(context).viewInsets.bottom,
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 54,
                    height: 5,
                    decoration: BoxDecoration(
                      color: AppPalette.borderSoft,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                Text(
                  title,
                  style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 18),
                child,
              ],
            ),
          ),
        ),
      ),
    );
  }
}

class _ProductDetailSheet extends StatefulWidget {
  const _ProductDetailSheet({
    required this.product,
    required this.quantity,
    required this.canAddToCart,
    required this.onAdd,
  });

  final ShopProduct product;
  final int quantity;
  final bool canAddToCart;
  final bool Function() onAdd;

  @override
  State<_ProductDetailSheet> createState() => _ProductDetailSheetState();
}

class _ProductDetailSheetState extends State<_ProductDetailSheet> {
  late int _quantity;
  int _selectedImageIndex = 0;

  @override
  void initState() {
    super.initState();
    _quantity = widget.quantity;
  }

  @override
  Widget build(BuildContext context) {
    final product = widget.product;
    final galleryImages = _productGalleryUrls(product);
    final activeImageIndex = _galleryIndexFor(galleryImages.length);
    final activeImageUrl =
        galleryImages.isEmpty ? null : galleryImages[activeImageIndex];
    final addEnabled = product.madeToOrder || _quantity < product.stockQuantity;
    final addLabel = !product.madeToOrder && product.stockQuantity <= 0
        ? context.l10n.ts('Agotado')
        : context.l10n.ts('Agregar al carrito');
    final description = product.description.trim().isNotEmpty
        ? product.description.trim()
        : product.shortDescription.trim();

    return Container(
      decoration: const BoxDecoration(
        color: AppPalette.petalSoft,
        borderRadius: BorderRadius.vertical(top: Radius.circular(34)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 14,
            bottom: 20 + MediaQuery.of(context).viewInsets.bottom,
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 54,
                    height: 5,
                    decoration: BoxDecoration(
                      color: AppPalette.border,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 16),
                AspectRatio(
                  aspectRatio: 1.08,
                  child: ClipRRect(
                    borderRadius: BorderRadius.circular(30),
                    child: Material(
                      color: Colors.transparent,
                      child: InkWell(
                        onTap: galleryImages.length > 1
                            ? () => _openGalleryViewer(
                                  product: product,
                                  galleryImages: galleryImages,
                                  initialIndex: activeImageIndex,
                                )
                            : null,
                        child: Stack(
                          fit: StackFit.expand,
                          children: [
                            _ProductArtwork(
                              product: product,
                              imageUrl: activeImageUrl,
                            ),
                            Positioned.fill(
                              child: DecoratedBox(
                                decoration: BoxDecoration(
                                  gradient: LinearGradient(
                                    begin: Alignment.topCenter,
                                    end: Alignment.bottomCenter,
                                    colors: [
                                      Colors.transparent,
                                      AppPalette.midnight
                                          .withValues(alpha: 0.64),
                                    ],
                                  ),
                                ),
                              ),
                            ),
                            Positioned(
                              left: 16,
                              top: 16,
                              child: _ProductBadge(label: product.badge),
                            ),
                            Positioned(
                              right: 16,
                              top: 16,
                              child: _StatusPill(
                                label: _stockStatusLabel(
                                  context,
                                  product.stockQuantity,
                                  product.madeToOrder,
                                ),
                                color: _stockStateColor(
                                  product.stockQuantity,
                                  product.madeToOrder,
                                ),
                              ),
                            ),
                            if (galleryImages.length > 1)
                              Positioned(
                                right: 16,
                                bottom: 16,
                                child: Container(
                                  padding: const EdgeInsets.symmetric(
                                    horizontal: 12,
                                    vertical: 8,
                                  ),
                                  decoration: BoxDecoration(
                                    color: AppPalette.midnight
                                        .withValues(alpha: 0.74),
                                    borderRadius: BorderRadius.circular(999),
                                    border: Border.all(
                                      color: Colors.white.withValues(
                                        alpha: 0.16,
                                      ),
                                    ),
                                  ),
                                  child: Row(
                                    mainAxisSize: MainAxisSize.min,
                                    children: [
                                      const Icon(
                                        Icons.photo_library_outlined,
                                        size: 16,
                                        color: Colors.white,
                                      ),
                                      const SizedBox(width: 6),
                                      Text(
                                        context.l10n.ts(
                                          '{count} vistas',
                                          {
                                            'count': '${galleryImages.length}',
                                          },
                                        ),
                                        style: Theme.of(context)
                                            .textTheme
                                            .labelSmall
                                            ?.copyWith(
                                              color: Colors.white,
                                              fontWeight: FontWeight.w900,
                                            ),
                                      ),
                                    ],
                                  ),
                                ),
                              ),
                            Positioned(
                              left: 18,
                              right: 18,
                              bottom: 18,
                              child: Column(
                                crossAxisAlignment: CrossAxisAlignment.start,
                                mainAxisSize: MainAxisSize.min,
                                children: [
                                  Text(
                                    product.name,
                                    maxLines: 2,
                                    overflow: TextOverflow.ellipsis,
                                    style: Theme.of(context)
                                        .textTheme
                                        .headlineSmall
                                        ?.copyWith(
                                          color: Colors.white,
                                          fontWeight: FontWeight.w900,
                                          height: 0.98,
                                        ),
                                  ),
                                  const SizedBox(height: 6),
                                  Text(
                                    product.storeName,
                                    style: Theme.of(context)
                                        .textTheme
                                        .labelLarge
                                        ?.copyWith(
                                          color: AppPalette.softLilac,
                                          fontWeight: FontWeight.w900,
                                        ),
                                  ),
                                ],
                              ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ),
                ),
                if (galleryImages.length > 1) ...[
                  const SizedBox(height: 12),
                  SizedBox(
                    height: 82,
                    child: ListView.separated(
                      scrollDirection: Axis.horizontal,
                      itemCount: galleryImages.length,
                      separatorBuilder: (_, __) => const SizedBox(width: 10),
                      itemBuilder: (context, index) {
                        final imageUrl = galleryImages[index];
                        final isActive = index == activeImageIndex;
                        return GestureDetector(
                          onTap: () {
                            if (isActive) {
                              _openGalleryViewer(
                                product: product,
                                galleryImages: galleryImages,
                                initialIndex: index,
                              );
                              return;
                            }
                            setState(() {
                              _selectedImageIndex = index;
                            });
                          },
                          child: AnimatedContainer(
                            duration: const Duration(milliseconds: 180),
                            width: 78,
                            padding: const EdgeInsets.all(4),
                            decoration: BoxDecoration(
                              color: Colors.white,
                              borderRadius: BorderRadius.circular(20),
                              border: Border.all(
                                color: isActive
                                    ? AppPalette.indigo
                                    : AppPalette.border,
                                width: isActive ? 2 : 1,
                              ),
                              boxShadow: [
                                BoxShadow(
                                  color: AppPalette.midnight.withValues(
                                    alpha: isActive ? 0.10 : 0.04,
                                  ),
                                  blurRadius: isActive ? 14 : 8,
                                  offset: const Offset(0, 6),
                                ),
                              ],
                            ),
                            child: ClipRRect(
                              borderRadius: BorderRadius.circular(16),
                              child: _ProductArtwork(
                                product: product,
                                imageUrl: imageUrl,
                                fit: BoxFit.cover,
                                scale: 1,
                              ),
                            ),
                          ),
                        );
                      },
                    ),
                  ),
                ],
                const SizedBox(height: 18),
                Row(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Expanded(
                      child: Column(
                        crossAxisAlignment: CrossAxisAlignment.start,
                        children: [
                          Text(
                            formatMoney(product.price),
                            style: Theme.of(context)
                                .textTheme
                                .headlineSmall
                                ?.copyWith(
                                  fontWeight: FontWeight.w900,
                                  color: AppPalette.midnight,
                                ),
                          ),
                          const SizedBox(height: 4),
                          Text(
                            _categoryLabel(context, product.category),
                            style: Theme.of(context)
                                .textTheme
                                .labelLarge
                                ?.copyWith(
                                  color: AppPalette.indigo,
                                  fontWeight: FontWeight.w900,
                                ),
                          ),
                        ],
                      ),
                    ),
                    FilledButton.tonalIcon(
                      onPressed: () => Navigator.of(context).pop(),
                      icon: const Icon(Icons.arrow_back_rounded, size: 18),
                      label: Text(context.l10n.ts('Volver')),
                    ),
                  ],
                ),
                const SizedBox(height: 16),
                if (description.isNotEmpty) ...[
                  _ProductDetailSection(
                    title: context.l10n.ts('Descripción'),
                    child: Text(
                      description,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppPalette.butterflyInk,
                            height: 1.48,
                            fontWeight: FontWeight.w600,
                          ),
                    ),
                  ),
                  const SizedBox(height: 12),
                ],
                _ProductDetailSection(
                  title: context.l10n.ts('Detalles'),
                  child: Column(
                    children: [
                      _SpecRow(
                        label: context.l10n.ts('Categoría'),
                        value: _categoryLabel(context, product.category),
                      ),
                      _SpecRow(
                        label: context.l10n.ts('Tienda'),
                        value: product.storeName,
                      ),
                      _SpecRow(
                        label: context.l10n.ts('Especialista'),
                        value: product.specialistName.trim().isEmpty
                            ? product.storeName
                            : product.specialistName,
                      ),
                      _SpecRow(
                        label: context.l10n.ts('Inventario'),
                        value: _stockSummary(context, product),
                      ),
                      _SpecRow(
                        label: context.l10n.ts('Modalidad'),
                        value: product.madeToOrder
                            ? context.l10n.ts('Hecho a pedido')
                            : context.l10n.ts('Stock disponible'),
                      ),
                      _SpecRow(
                        label: context.l10n.ts('Código'),
                        value: product.id,
                      ),
                    ],
                  ),
                ),
                if (widget.canAddToCart) ...[
                  const SizedBox(height: 16),
                  _ProductDetailCartButton(
                    quantity: _quantity,
                    addEnabled: addEnabled,
                    emptyLabel: addLabel,
                    onAdd: _handleAdd,
                  ),
                ],
              ],
            ),
          ),
        ),
      ),
    );
  }

  void _handleAdd() {
    final product = widget.product;
    if (!product.madeToOrder && _quantity >= product.stockQuantity) {
      return;
    }

    final added = widget.onAdd();
    if (!added) {
      return;
    }

    setState(() {
      _quantity += 1;
    });
  }

  int _galleryIndexFor(int length) {
    if (length <= 1) {
      return 0;
    }
    if (_selectedImageIndex < 0 || _selectedImageIndex >= length) {
      return 0;
    }
    return _selectedImageIndex;
  }

  Future<void> _openGalleryViewer({
    required ShopProduct product,
    required List<String> galleryImages,
    required int initialIndex,
  }) async {
    if (galleryImages.length <= 1) {
      return;
    }

    await showDialog<void>(
      context: context,
      barrierColor: AppPalette.midnight.withValues(alpha: 0.92),
      builder: (context) {
        return _ProductGalleryDialog(
          product: product,
          imageUrls: galleryImages,
          initialIndex: initialIndex,
        );
      },
    );
  }
}

class _ProductGalleryDialog extends StatefulWidget {
  const _ProductGalleryDialog({
    required this.product,
    required this.imageUrls,
    required this.initialIndex,
  });

  final ShopProduct product;
  final List<String> imageUrls;
  final int initialIndex;

  @override
  State<_ProductGalleryDialog> createState() => _ProductGalleryDialogState();
}

class _ProductGalleryDialogState extends State<_ProductGalleryDialog> {
  late final PageController _controller;
  late final List<TransformationController> _zoomControllers;
  late int _currentIndex;
  bool _isZoomed = false;

  @override
  void initState() {
    super.initState();
    _currentIndex = widget.initialIndex.clamp(0, widget.imageUrls.length - 1);
    _controller = PageController(initialPage: _currentIndex);
    _zoomControllers = List.generate(
      widget.imageUrls.length,
      (_) => TransformationController(),
    );
  }

  @override
  void dispose() {
    _controller.dispose();
    for (final controller in _zoomControllers) {
      controller.dispose();
    }
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final product = widget.product;

    return Material(
      color: AppPalette.midnight.withValues(alpha: 0.96),
      child: SafeArea(
        child: Column(
          children: [
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 10, 18, 6),
              child: Row(
                children: [
                  Expanded(
                    child: Column(
                      crossAxisAlignment: CrossAxisAlignment.start,
                      children: [
                        Text(
                          product.name,
                          maxLines: 1,
                          overflow: TextOverflow.ellipsis,
                          style:
                              Theme.of(context).textTheme.titleLarge?.copyWith(
                                    color: Colors.white,
                                    fontWeight: FontWeight.w900,
                                  ),
                        ),
                      ],
                    ),
                  ),
                  const SizedBox(width: 10),
                  FilledButton.tonalIcon(
                    style: FilledButton.styleFrom(
                      backgroundColor: Colors.white.withValues(alpha: 0.12),
                      foregroundColor: Colors.white,
                    ),
                    onPressed: () => Navigator.of(context).pop(),
                    icon: const Icon(Icons.arrow_back_rounded, size: 18),
                    label: Text(context.l10n.ts('Volver')),
                  ),
                ],
              ),
            ),
            Expanded(
              child: PageView.builder(
                controller: _controller,
                physics: _isZoomed
                    ? const NeverScrollableScrollPhysics()
                    : const BouncingScrollPhysics(),
                itemCount: widget.imageUrls.length,
                onPageChanged: (index) {
                  _resetZoom(_currentIndex);
                  setState(() {
                    _currentIndex = index;
                    _isZoomed = false;
                  });
                },
                itemBuilder: (context, index) {
                  final imageUrl = widget.imageUrls[index];
                  final zoomController = _zoomControllers[index];
                  return Padding(
                    padding: const EdgeInsets.fromLTRB(18, 10, 18, 16),
                    child: DecoratedBox(
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.04),
                        borderRadius: BorderRadius.circular(34),
                        border: Border.all(
                          color: Colors.white.withValues(alpha: 0.10),
                        ),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(34),
                        child: GestureDetector(
                          onDoubleTap: () => _toggleZoom(index),
                          child: InteractiveViewer(
                            transformationController: zoomController,
                            minScale: 1,
                            maxScale: 4,
                            panEnabled: _isZoomed && index == _currentIndex,
                            clipBehavior: Clip.hardEdge,
                            onInteractionStart: (_) => _syncZoomState(index),
                            onInteractionUpdate: (_) => _syncZoomState(index),
                            onInteractionEnd: (_) => _syncZoomState(index),
                            child: _ProductArtwork(
                              product: product,
                              imageUrl: imageUrl,
                              fit: BoxFit.contain,
                              scale: 1,
                            ),
                          ),
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
            Padding(
              padding: const EdgeInsets.fromLTRB(18, 0, 18, 10),
              child: Row(
                children: [
                  Text(
                    context.l10n.ts(
                      'Vista {current} de {total}',
                      {
                        'current': '${_currentIndex + 1}',
                        'total': '${widget.imageUrls.length}',
                      },
                    ),
                    style: Theme.of(context).textTheme.labelLarge?.copyWith(
                          color: Colors.white,
                          fontWeight: FontWeight.w800,
                        ),
                  ),
                ],
              ),
            ),
            SizedBox(
              height: 96,
              child: ListView.separated(
                padding: const EdgeInsets.fromLTRB(18, 0, 18, 22),
                scrollDirection: Axis.horizontal,
                itemCount: widget.imageUrls.length,
                separatorBuilder: (_, __) => const SizedBox(width: 12),
                itemBuilder: (context, index) {
                  final imageUrl = widget.imageUrls[index];
                  final isActive = index == _currentIndex;
                  return GestureDetector(
                    onTap: () {
                      _controller.animateToPage(
                        index,
                        duration: const Duration(milliseconds: 220),
                        curve: Curves.easeOutCubic,
                      );
                    },
                    child: AnimatedContainer(
                      duration: const Duration(milliseconds: 180),
                      width: 88,
                      padding: const EdgeInsets.all(4),
                      decoration: BoxDecoration(
                        color: Colors.white.withValues(alpha: 0.08),
                        borderRadius: BorderRadius.circular(22),
                        border: Border.all(
                          color: isActive
                              ? AppPalette.softLilac
                              : Colors.white.withValues(alpha: 0.08),
                          width: isActive ? 2 : 1,
                        ),
                      ),
                      child: ClipRRect(
                        borderRadius: BorderRadius.circular(18),
                        child: _ProductArtwork(
                          product: widget.product,
                          imageUrl: imageUrl,
                          fit: BoxFit.cover,
                          scale: 1,
                        ),
                      ),
                    ),
                  );
                },
              ),
            ),
          ],
        ),
      ),
    );
  }

  void _syncZoomState(int index) {
    if (index >= _zoomControllers.length) {
      return;
    }

    final nextZoomed = _zoomControllers[index].value.getMaxScaleOnAxis() > 1.01;
    if (nextZoomed == _isZoomed) {
      return;
    }

    setState(() {
      _isZoomed = nextZoomed;
    });
  }

  void _resetZoom(int index) {
    if (index < 0 || index >= _zoomControllers.length) {
      return;
    }
    _zoomControllers[index].value = Matrix4.identity();
  }

  void _toggleZoom(int index) {
    if (index < 0 || index >= _zoomControllers.length) {
      return;
    }

    final controller = _zoomControllers[index];
    final isZoomed = controller.value.getMaxScaleOnAxis() > 1.01;
    controller.value = isZoomed ? Matrix4.identity() : Matrix4.identity()
      ..scaleByDouble(2.2, 2.2, 1, 1);

    final nextZoomed = controller.value.getMaxScaleOnAxis() > 1.01;
    if (nextZoomed == _isZoomed) {
      return;
    }

    setState(() {
      _isZoomed = nextZoomed;
    });
  }
}

class _ProductDetailCartButton extends StatelessWidget {
  const _ProductDetailCartButton({
    required this.quantity,
    required this.addEnabled,
    required this.emptyLabel,
    required this.onAdd,
  });

  final int quantity;
  final bool addEnabled;
  final String emptyLabel;
  final VoidCallback onAdd;

  @override
  Widget build(BuildContext context) {
    final title = quantity > 0
        ? addEnabled
            ? context.l10n.ts('Agregar otro al carrito')
            : context.l10n.ts('En carrito')
        : emptyLabel;

    return AnimatedOpacity(
      duration: const Duration(milliseconds: 180),
      opacity: addEnabled ? 1 : 0.76,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(28),
          onTap: addEnabled ? onAdd : null,
          child: Ink(
            decoration: BoxDecoration(
              borderRadius: BorderRadius.circular(28),
              gradient: addEnabled
                  ? const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        AppPalette.midnight,
                        AppPalette.indigo,
                        AppPalette.royalViolet,
                      ],
                    )
                  : const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        AppPalette.borderSoft,
                        AppPalette.softLilac,
                      ],
                    ),
              boxShadow: [
                BoxShadow(
                  color: (addEnabled
                          ? AppPalette.indigo
                          : AppPalette.mutedLavender)
                      .withValues(alpha: addEnabled ? 0.28 : 0.12),
                  blurRadius: addEnabled ? 24 : 12,
                  offset: const Offset(0, 12),
                ),
              ],
            ),
            child: Padding(
              padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 18),
              child: Row(
                children: [
                  Container(
                    width: 52,
                    height: 52,
                    decoration: BoxDecoration(
                      color: Colors.white
                          .withValues(alpha: addEnabled ? 0.14 : 0.5),
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(
                        color: Colors.white
                            .withValues(alpha: addEnabled ? 0.14 : 0.6),
                      ),
                    ),
                    child: Icon(
                      addEnabled
                          ? Icons.add_shopping_cart_rounded
                          : Icons.remove_shopping_cart_rounded,
                      color:
                          addEnabled ? Colors.white : AppPalette.mutedLavender,
                      size: 24,
                    ),
                  ),
                  const SizedBox(width: 14),
                  Expanded(
                    child: Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: addEnabled
                                ? Colors.white
                                : AppPalette.mutedLavender,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                  ),
                  if (quantity > 0) ...[
                    const SizedBox(width: 12),
                    AnimatedSwitcher(
                      duration: const Duration(milliseconds: 180),
                      switchInCurve: Curves.easeOutCubic,
                      switchOutCurve: Curves.easeInCubic,
                      child: Container(
                        key: ValueKey(quantity),
                        padding: const EdgeInsets.symmetric(
                          horizontal: 12,
                          vertical: 10,
                        ),
                        decoration: BoxDecoration(
                          color: Colors.white.withValues(
                            alpha: addEnabled ? 0.16 : 0.52,
                          ),
                          borderRadius: BorderRadius.circular(18),
                          border: Border.all(
                            color: Colors.white.withValues(
                              alpha: addEnabled ? 0.16 : 0.62,
                            ),
                          ),
                        ),
                        child: Row(
                          mainAxisSize: MainAxisSize.min,
                          children: [
                            Icon(
                              Icons.shopping_bag_rounded,
                              size: 16,
                              color: addEnabled
                                  ? Colors.white
                                  : AppPalette.mutedLavender,
                            ),
                            const SizedBox(width: 6),
                            Text(
                              '$quantity',
                              style: Theme.of(context)
                                  .textTheme
                                  .labelLarge
                                  ?.copyWith(
                                    color: addEnabled
                                        ? Colors.white
                                        : AppPalette.mutedLavender,
                                    fontWeight: FontWeight.w900,
                                  ),
                            ),
                          ],
                        ),
                      ),
                    ),
                  ],
                  const SizedBox(width: 10),
                  Icon(
                    addEnabled ? Icons.north_east_rounded : Icons.block_rounded,
                    color: addEnabled ? Colors.white : AppPalette.mutedLavender,
                  ),
                ],
              ),
            ),
          ),
        ),
      ),
    );
  }
}

class _ProductDetailSection extends StatelessWidget {
  const _ProductDetailSection({
    required this.title,
    required this.child,
  });

  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: double.infinity,
      decoration: BoxDecoration(
        color: AppPalette.moonIvory,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppPalette.border),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  color: AppPalette.midnight,
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 12),
          child,
        ],
      ),
    );
  }
}

class _SpecRow extends StatelessWidget {
  const _SpecRow({
    required this.label,
    required this.value,
  });

  final String label;
  final String value;

  @override
  Widget build(BuildContext context) {
    return Padding(
      padding: const EdgeInsets.only(bottom: 10),
      child: Row(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Expanded(
            child: Text(
              label,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppPalette.mutedLavender,
                    fontWeight: FontWeight.w800,
                  ),
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            flex: 2,
            child: Text(
              value,
              textAlign: TextAlign.right,
              style: Theme.of(context).textTheme.bodySmall?.copyWith(
                    color: AppPalette.butterflyInk,
                    fontWeight: FontWeight.w900,
                    height: 1.25,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _InventoryRow extends StatelessWidget {
  const _InventoryRow({
    required this.product,
  });

  final ShopProduct product;

  @override
  Widget build(BuildContext context) {
    final status = _productStatusCopy(context, product.status);
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: AppPalette.border),
      ),
      padding: const EdgeInsets.all(12),
      child: Row(
        children: [
          SizedBox(
            width: 58,
            height: 66,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: _ProductArtwork(product: product),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Row(
                  children: [
                    Expanded(
                      child: Text(
                        product.name,
                        maxLines: 1,
                        overflow: TextOverflow.ellipsis,
                        style: Theme.of(context).textTheme.titleSmall?.copyWith(
                              fontWeight: FontWeight.w900,
                            ),
                      ),
                    ),
                    const SizedBox(width: 8),
                    _StatusPill(
                      label: status.label,
                      color: status.color,
                    ),
                  ],
                ),
                const SizedBox(height: 4),
                Text(
                  '${_categoryLabel(context, product.category)} · ${_stockStatusLabel(context, product.stockQuantity, product.madeToOrder)}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: _stockColor(product.stockLabel),
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 2),
                Text(
                  '${product.storeName} · ${product.sku.isEmpty ? context.l10n.ts('SKU automático') : product.sku}',
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: AppPalette.mutedLavender,
                        fontWeight: FontWeight.w700,
                      ),
                ),
              ],
            ),
          ),
          const SizedBox(width: 10),
          Column(
            crossAxisAlignment: CrossAxisAlignment.end,
            children: [
              Text(
                formatMoney(product.price),
                style: Theme.of(context).textTheme.labelLarge?.copyWith(
                      fontWeight: FontWeight.w900,
                    ),
              ),
              const SizedBox(height: 4),
              Text(
                _stockSummary(context, product),
                style: Theme.of(context).textTheme.labelSmall?.copyWith(
                      color: AppPalette.mutedLavender,
                      fontWeight: FontWeight.w700,
                    ),
              ),
            ],
          ),
        ],
      ),
    );
  }
}

class _ProductBadge extends StatelessWidget {
  const _ProductBadge({
    required this.label,
  });

  final String label;

  @override
  Widget build(BuildContext context) {
    final style = _productBadgeStyle(label);
    return Container(
      constraints: const BoxConstraints(maxWidth: 152),
      padding: const EdgeInsets.symmetric(horizontal: 11, vertical: 6),
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            style.fill,
            style.fillAccent,
          ],
        ),
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: style.border),
        boxShadow: [
          BoxShadow(
            color: style.shadow.withValues(alpha: 0.14),
            blurRadius: 10,
            offset: const Offset(0, 4),
          ),
        ],
      ),
      child: Text(
        label,
        maxLines: 1,
        overflow: TextOverflow.ellipsis,
        style: Theme.of(context).textTheme.labelSmall?.copyWith(
              color: Colors.white,
              fontWeight: FontWeight.w900,
              letterSpacing: 0.2,
            ),
      ),
    );
  }
}

class _StatusPill extends StatelessWidget {
  const _StatusPill({
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;

  @override
  Widget build(BuildContext context) {
    final background = Color.alphaBlend(
      color.withValues(alpha: 0.10),
      AppPalette.moonIvory,
    );
    return Container(
      constraints: const BoxConstraints(maxWidth: 152),
      padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 7),
      decoration: BoxDecoration(
        color: background,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(color: color.withValues(alpha: 0.18)),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          Container(
            width: 7,
            height: 7,
            decoration: BoxDecoration(
              color: color,
              borderRadius: BorderRadius.circular(999),
            ),
          ),
          const SizedBox(width: 8),
          Flexible(
            child: Text(
              label,
              maxLines: 1,
              overflow: TextOverflow.ellipsis,
              style: Theme.of(context).textTheme.labelSmall?.copyWith(
                    color: color,
                    fontWeight: FontWeight.w900,
                  ),
            ),
          ),
        ],
      ),
    );
  }
}

class _SectionTitle extends StatelessWidget {
  const _SectionTitle({
    required this.title,
  });

  final String title;

  @override
  Widget build(BuildContext context) {
    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Text(
          title,
          style: Theme.of(context).textTheme.titleLarge?.copyWith(
                fontWeight: FontWeight.w800,
              ),
        ),
      ],
    );
  }
}

class _CategoryChip extends StatelessWidget {
  const _CategoryChip({
    required this.label,
    required this.count,
    required this.selected,
    required this.onTap,
  });

  final String label;
  final int count;
  final bool selected;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final accent = _categoryAccentColor(label);

    return SizedBox(
      width: 138,
      child: Material(
        color: Colors.transparent,
        child: InkWell(
          borderRadius: BorderRadius.circular(24),
          onTap: onTap,
          child: AnimatedContainer(
            duration: const Duration(milliseconds: 180),
            padding: const EdgeInsets.symmetric(horizontal: 14, vertical: 12),
            decoration: BoxDecoration(
              gradient: selected
                  ? LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        accent,
                        Color.alphaBlend(
                          AppPalette.royalViolet.withValues(alpha: 0.22),
                          accent,
                        ),
                      ],
                    )
                  : const LinearGradient(
                      begin: Alignment.topLeft,
                      end: Alignment.bottomRight,
                      colors: [
                        Colors.white,
                        AppPalette.moonIvory,
                      ],
                    ),
              borderRadius: BorderRadius.circular(24),
              border: Border.all(
                color: selected
                    ? accent.withValues(alpha: 0.32)
                    : AppPalette.border,
              ),
              boxShadow: [
                BoxShadow(
                  color: (selected ? accent : AppPalette.midnight)
                      .withValues(alpha: selected ? 0.18 : 0.05),
                  blurRadius: selected ? 18 : 10,
                  offset: const Offset(0, 8),
                ),
              ],
            ),
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Container(
                  width: 34,
                  height: 34,
                  decoration: BoxDecoration(
                    color: selected
                        ? Colors.white.withValues(alpha: 0.16)
                        : accent.withValues(alpha: 0.12),
                    borderRadius: BorderRadius.circular(14),
                  ),
                  child: Icon(
                    _categoryIcon(label),
                    color: selected ? Colors.white : accent,
                    size: 18,
                  ),
                ),
                const Spacer(),
                Text(
                  _categoryLabel(context, label),
                  maxLines: 1,
                  overflow: TextOverflow.ellipsis,
                  style: Theme.of(context).textTheme.labelLarge?.copyWith(
                        color: selected ? Colors.white : AppPalette.midnight,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 3),
                Text(
                  context.l10n.ts('{count} piezas', {'count': '$count'}),
                  style: Theme.of(context).textTheme.bodySmall?.copyWith(
                        color: selected
                            ? Colors.white.withValues(alpha: 0.80)
                            : AppPalette.mutedLavender,
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

class _QuantityControl extends StatelessWidget {
  const _QuantityControl({
    required this.quantity,
    required this.addEnabled,
    required this.emptyLabel,
    required this.onAdd,
    required this.onRemove,
  });

  final int quantity;
  final bool addEnabled;
  final String emptyLabel;
  final VoidCallback onAdd;
  final VoidCallback onRemove;

  @override
  Widget build(BuildContext context) {
    if (quantity == 0) {
      return FilledButton.icon(
        onPressed: addEnabled ? onAdd : null,
        icon: const Icon(Icons.add_shopping_cart_rounded, size: 18),
        label: Text(emptyLabel),
      );
    }

    return Container(
      decoration: BoxDecoration(
        color: AppPalette.petal,
        borderRadius: BorderRadius.circular(999),
      ),
      child: Row(
        mainAxisSize: MainAxisSize.min,
        children: [
          IconButton(
            onPressed: onRemove,
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.remove_rounded),
          ),
          Text(
            '$quantity',
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
          IconButton(
            onPressed: addEnabled ? onAdd : null,
            visualDensity: VisualDensity.compact,
            icon: const Icon(Icons.add_rounded),
          ),
        ],
      ),
    );
  }
}

class _FloatingCartBar extends StatelessWidget {
  const _FloatingCartBar({
    required this.itemCount,
    required this.total,
    required this.onTap,
  });

  final int itemCount;
  final double total;
  final VoidCallback onTap;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Material(
      color: Colors.transparent,
      child: InkWell(
        borderRadius: BorderRadius.circular(999),
        onTap: onTap,
        child: Ink(
          decoration: BoxDecoration(
            borderRadius: BorderRadius.circular(999),
            gradient: const LinearGradient(
              colors: [
                AppPalette.midnight,
                AppPalette.indigo,
                AppPalette.royalViolet,
              ],
            ),
            boxShadow: [
              BoxShadow(
                color: AppPalette.indigo.withValues(alpha: 0.26),
                blurRadius: 20,
                offset: const Offset(0, 10),
              ),
            ],
          ),
          padding: const EdgeInsets.symmetric(horizontal: 18, vertical: 14),
          child: Row(
            children: [
              const Icon(
                Icons.shopping_bag_outlined,
                color: Colors.white,
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Text(
                  l10n.ts(
                    '{count} artículos en carrito',
                    {'count': '$itemCount'},
                  ),
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w800,
                      ),
                ),
              ),
              Text(
                _formatUsd(total),
                style: Theme.of(context).textTheme.titleMedium?.copyWith(
                      color: Colors.white,
                      fontWeight: FontWeight.w800,
                    ),
              ),
            ],
          ),
        ),
      ),
    );
  }
}

class _OrderCard extends StatelessWidget {
  const _OrderCard({
    required this.order,
    this.expanded = false,
    this.onToggle,
    this.onUpdateStatus,
  });

  final ShopOrder order;
  final bool expanded;
  final VoidCallback? onToggle;
  final Future<void> Function(String status)? onUpdateStatus;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final status = _statusCopy(context, order.status);
    final showToggle = onToggle != null;

    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppPalette.border),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            children: [
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      order.orderCode,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                    const SizedBox(height: 4),
                    Text(
                      l10n.ts(
                        '{date} · {count} artículos',
                        {
                          'date': formatSchedule(order.createdAt),
                          'count': '${order.itemCount}',
                        },
                      ),
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppPalette.mutedLavender,
                          ),
                    ),
                  ],
                ),
              ),
              const SizedBox(width: 12),
              if (onUpdateStatus != null)
                PopupMenuButton<String>(
                  onSelected: onUpdateStatus,
                  itemBuilder: (context) => _shopOrderStages(context)
                      .map(
                        (stage) => PopupMenuItem<String>(
                          value: stage.status,
                          child: Text(stage.label),
                        ),
                      )
                      .toList(),
                  child: _StatusPill(
                    label: status.label,
                    color: status.color,
                  ),
                ),
              if (onUpdateStatus == null)
                _StatusPill(
                  label: status.label,
                  color: status.color,
                ),
            ],
          ),
          const SizedBox(height: 12),
          _OrderProgressTimeline(status: order.status),
          const SizedBox(height: 10),
          Text(
            order.storeName,
            style: Theme.of(context).textTheme.bodySmall?.copyWith(
                  color: AppPalette.indigo,
                  fontWeight: FontWeight.w800,
                ),
          ),
          const SizedBox(height: 10),
          ...order.items.take(3).map(
                (item) => Padding(
                  padding: const EdgeInsets.only(bottom: 6),
                  child: Text(
                    l10n.ts(
                      '• {name} x{quantity}',
                      {
                        'name': item.productName,
                        'quantity': '${item.quantity}',
                      },
                    ),
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppPalette.butterflyInk,
                        ),
                  ),
                ),
              ),
          if (expanded) ...[
            const SizedBox(height: 10),
            Container(
              width: double.infinity,
              padding: const EdgeInsets.all(14),
              decoration: BoxDecoration(
                color: AppPalette.petal,
                borderRadius: BorderRadius.circular(18),
              ),
              child: Column(
                crossAxisAlignment: CrossAxisAlignment.start,
                children: [
                  Text(
                    l10n.ts(
                      'Entrega: {address}',
                      {'address': order.deliveryAddress},
                    ),
                    style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                          color: AppPalette.butterflyInk,
                          height: 1.4,
                        ),
                  ),
                  if (order.notes.trim().isNotEmpty) ...[
                    const SizedBox(height: 8),
                    Text(
                      l10n.ts('Notas: {notes}', {'notes': order.notes}),
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppPalette.mutedLavender,
                            height: 1.4,
                          ),
                    ),
                  ],
                  const SizedBox(height: 12),
                  _SummaryRow(
                    label: l10n.ts('Subtotal'),
                    value: formatMoney(order.subtotal),
                  ),
                  _SummaryRow(
                    label: l10n.ts('Envío'),
                    value: formatMoney(order.shipping),
                  ),
                  _SummaryRow(
                    label: l10n.ts('Total'),
                    value: formatMoney(order.total),
                    highlight: true,
                  ),
                ],
              ),
            ),
          ] else ...[
            const SizedBox(height: 10),
            _SummaryRow(
              label: l10n.ts('Total'),
              value: formatMoney(order.total),
              highlight: true,
            ),
          ],
          if (showToggle) ...[
            const SizedBox(height: 6),
            Align(
              alignment: Alignment.centerLeft,
              child: TextButton.icon(
                onPressed: onToggle,
                icon: Icon(
                  expanded
                      ? Icons.keyboard_arrow_up_rounded
                      : Icons.keyboard_arrow_down_rounded,
                ),
                label: Text(
                  expanded ? l10n.ts('Ocultar') : l10n.ts('Ver pedido'),
                ),
              ),
            ),
          ],
        ],
      ),
    );
  }
}

class _SummaryRow extends StatelessWidget {
  const _SummaryRow({
    required this.label,
    required this.value,
    this.highlight = false,
  });

  final String label;
  final String value;
  final bool highlight;

  @override
  Widget build(BuildContext context) {
    final color = highlight ? AppPalette.midnight : AppPalette.mutedLavender;

    return Row(
      children: [
        Expanded(
          child: Text(
            label,
            style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                  color: color,
                  fontWeight: highlight ? FontWeight.w700 : FontWeight.w500,
                ),
          ),
        ),
        Text(
          value,
          style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                color: color,
                fontWeight: FontWeight.w800,
              ),
        ),
      ],
    );
  }
}

class _OrderProgressTimeline extends StatelessWidget {
  const _OrderProgressTimeline({
    required this.status,
  });

  final String status;

  @override
  Widget build(BuildContext context) {
    final stages = _shopOrderStages(context);
    final activeIndex = _orderStageIndex(status);

    return Column(
      crossAxisAlignment: CrossAxisAlignment.start,
      children: [
        Row(
          children: [
            for (var index = 0; index < stages.length; index++) ...[
              _OrderStageDot(
                stage: stages[index],
                isCompleted: index <= activeIndex,
                isCurrent: index == activeIndex,
              ),
              if (index != stages.length - 1)
                Expanded(
                  child: Container(
                    height: 3,
                    margin: const EdgeInsets.symmetric(horizontal: 6),
                    decoration: BoxDecoration(
                      color: index < activeIndex
                          ? stages[index + 1].color.withValues(alpha: 0.65)
                          : AppPalette.borderSoft,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
            ],
          ],
        ),
        const SizedBox(height: 8),
        Row(
          children: [
            for (var index = 0; index < stages.length; index++)
              Expanded(
                child: Text(
                  stages[index].label,
                  textAlign: index == stages.length - 1
                      ? TextAlign.end
                      : TextAlign.start,
                  style: Theme.of(context).textTheme.labelSmall?.copyWith(
                        color: index <= activeIndex
                            ? AppPalette.butterflyInk
                            : AppPalette.mutedLavender,
                        fontWeight: index == activeIndex
                            ? FontWeight.w900
                            : FontWeight.w700,
                      ),
                ),
              ),
          ],
        ),
      ],
    );
  }
}

class _OrderStageDot extends StatelessWidget {
  const _OrderStageDot({
    required this.stage,
    required this.isCompleted,
    required this.isCurrent,
  });

  final _PipelineStage stage;
  final bool isCompleted;
  final bool isCurrent;

  @override
  Widget build(BuildContext context) {
    return AnimatedContainer(
      duration: const Duration(milliseconds: 220),
      width: isCurrent ? 28 : 22,
      height: isCurrent ? 28 : 22,
      decoration: BoxDecoration(
        color: isCompleted ? stage.color : Colors.white,
        borderRadius: BorderRadius.circular(999),
        border: Border.all(
          color: isCompleted ? stage.color : AppPalette.borderSoft,
          width: isCurrent ? 2.5 : 2,
        ),
        boxShadow: isCurrent
            ? [
                BoxShadow(
                  color: stage.color.withValues(alpha: 0.18),
                  blurRadius: 14,
                  offset: const Offset(0, 6),
                ),
              ]
            : null,
      ),
      child: Icon(
        isCompleted ? Icons.check_rounded : Icons.circle_outlined,
        color: isCompleted ? Colors.white : AppPalette.borderSoft,
        size: isCurrent ? 16 : 12,
      ),
    );
  }
}

class _MetricTile extends StatelessWidget {
  const _MetricTile({
    required this.title,
    required this.value,
    required this.icon,
    required this.color,
  });

  final String title;
  final String value;
  final IconData icon;
  final Color color;

  @override
  Widget build(BuildContext context) {
    return Container(
      width: 156,
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(22),
        border: Border.all(color: color.withValues(alpha: 0.18)),
      ),
      padding: const EdgeInsets.all(14),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Container(
            width: 38,
            height: 38,
            decoration: BoxDecoration(
              color: color.withValues(alpha: 0.12),
              borderRadius: BorderRadius.circular(14),
            ),
            child: Icon(icon, color: color),
          ),
          const Spacer(),
          Text(
            value,
            style: Theme.of(context).textTheme.headlineSmall?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
          const SizedBox(height: 2),
          Text(
            title,
            style: Theme.of(context).textTheme.labelLarge?.copyWith(
                  fontWeight: FontWeight.w900,
                ),
          ),
        ],
      ),
    );
  }
}

class _CheckoutSheet extends StatefulWidget {
  const _CheckoutSheet({
    required this.lines,
    required this.suggestedAddress,
    required this.onSubmit,
  });

  final List<_CartLine> lines;
  final String suggestedAddress;
  final Future<ShopOrder> Function(String deliveryAddress, String notes)
      onSubmit;

  @override
  State<_CheckoutSheet> createState() => _CheckoutSheetState();
}

class _CheckoutSheetState extends State<_CheckoutSheet> {
  late final TextEditingController _addressController;
  late final TextEditingController _notesController;
  bool _isSubmitting = false;
  String? _error;

  @override
  void initState() {
    super.initState();
    _addressController = TextEditingController(text: widget.suggestedAddress);
    _notesController = TextEditingController();
  }

  @override
  void dispose() {
    _addressController.dispose();
    _notesController.dispose();
    super.dispose();
  }

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    final subtotal = widget.lines.fold<double>(
      0,
      (sum, line) => sum + (line.product.price.amount * line.quantity),
    );
    final shipping = subtotal >= 120 ? 0.0 : 9.0;
    final total = subtotal + shipping;
    final itemCount = widget.lines.fold<int>(
      0,
      (sum, line) => sum + line.quantity,
    );

    return Container(
      decoration: const BoxDecoration(
        color: AppPalette.moonIvory,
        borderRadius: BorderRadius.vertical(top: Radius.circular(32)),
      ),
      child: SafeArea(
        top: false,
        child: Padding(
          padding: EdgeInsets.only(
            left: 20,
            right: 20,
            top: 18,
            bottom: 20 + MediaQuery.of(context).viewInsets.bottom,
          ),
          child: SingleChildScrollView(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Center(
                  child: Container(
                    width: 54,
                    height: 5,
                    decoration: BoxDecoration(
                      color: AppPalette.border,
                      borderRadius: BorderRadius.circular(999),
                    ),
                  ),
                ),
                const SizedBox(height: 20),
                _CheckoutHeroHeader(
                  itemCount: itemCount,
                  total: total,
                ),
                const SizedBox(height: 16),
                _CheckoutSectionCard(
                  step: '1',
                  title: l10n.ts('Productos del pedido'),
                  child: Column(
                    children: widget.lines
                        .map(
                          (line) => Padding(
                            padding: const EdgeInsets.only(bottom: 10),
                            child: _CheckoutLine(line: line),
                          ),
                        )
                        .toList(),
                  ),
                ),
                const SizedBox(height: 14),
                _CheckoutSectionCard(
                  step: '2',
                  title: l10n.ts('Entrega'),
                  child: TextField(
                    controller: _addressController,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: InputDecoration(
                      labelText: l10n.ts('Dirección de entrega'),
                      hintText: l10n.ts('Distrito, ciudad, referencia'),
                      prefixIcon: Icon(Icons.location_on_outlined),
                    ),
                  ),
                ),
                const SizedBox(height: 14),
                _CheckoutSectionCard(
                  step: '3',
                  title: l10n.ts('Notas'),
                  child: TextField(
                    controller: _notesController,
                    maxLines: 3,
                    textCapitalization: TextCapitalization.sentences,
                    decoration: InputDecoration(
                      labelText: l10n.ts('Notas para la orden'),
                      hintText: l10n.ts(
                        'Horario, referencia, pedido especial',
                      ),
                      prefixIcon: Icon(Icons.edit_note_outlined),
                    ),
                  ),
                ),
                if (_error != null) ...[
                  const SizedBox(height: 14),
                  Container(
                    width: double.infinity,
                    padding: const EdgeInsets.all(12),
                    decoration: BoxDecoration(
                      color: AppPalette.softLilac,
                      borderRadius: BorderRadius.circular(18),
                      border: Border.all(color: AppPalette.border),
                    ),
                    child: Text(
                      _error!,
                      style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                            color: AppPalette.berry,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ),
                ],
                const SizedBox(height: 14),
                _CheckoutTotalCard(
                  subtotal: subtotal,
                  shipping: shipping,
                  total: total,
                ),
                const SizedBox(height: 18),
                SizedBox(
                  width: double.infinity,
                  child: FilledButton.icon(
                    onPressed: _isSubmitting ? null : _submit,
                    icon: _isSubmitting
                        ? const SizedBox(
                            width: 18,
                            height: 18,
                            child: CircularProgressIndicator(strokeWidth: 2),
                          )
                        : const Icon(Icons.shopping_bag_rounded),
                    label: Text(
                      _isSubmitting
                          ? l10n.ts('Generando pedido...')
                          : l10n.ts(
                              'Crear pedido · {total}',
                              {'total': _formatUsd(total)},
                            ),
                    ),
                  ),
                ),
              ],
            ),
          ),
        ),
      ),
    );
  }

  Future<void> _submit() async {
    final deliveryAddress = _addressController.text.trim();
    if (deliveryAddress.isEmpty) {
      setState(() {
        _error = context.l10n.ts(
          'Ingresa una dirección o referencia de entrega.',
        );
      });
      return;
    }

    setState(() {
      _isSubmitting = true;
      _error = null;
    });

    try {
      final order = await widget.onSubmit(
        deliveryAddress,
        _notesController.text.trim(),
      );
      if (!mounted) {
        return;
      }
      Navigator.of(context).pop(order);
    } catch (error) {
      setState(() {
        _error = error.toString().replaceFirst('Exception: ', '');
      });
    } finally {
      if (mounted) {
        setState(() {
          _isSubmitting = false;
        });
      }
    }
  }
}

class _CheckoutHeroHeader extends StatelessWidget {
  const _CheckoutHeroHeader({
    required this.itemCount,
    required this.total,
  });

  final int itemCount;
  final double total;

  @override
  Widget build(BuildContext context) {
    final l10n = context.l10n;
    return Container(
      decoration: BoxDecoration(
        borderRadius: BorderRadius.circular(28),
        gradient: const LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            AppPalette.midnight,
            AppPalette.indigo,
            AppPalette.orchid,
          ],
        ),
        boxShadow: [
          BoxShadow(
            color: AppPalette.indigo.withValues(alpha: 0.20),
            blurRadius: 22,
            offset: const Offset(0, 12),
          ),
        ],
      ),
      padding: const EdgeInsets.all(18),
      child: Row(
        children: [
          Container(
            width: 56,
            height: 56,
            decoration: BoxDecoration(
              color: Colors.white.withValues(alpha: 0.14),
              borderRadius: BorderRadius.circular(20),
              border: Border.all(
                color: Colors.white.withValues(alpha: 0.16),
              ),
            ),
            child: const Icon(
              Icons.shopping_bag_rounded,
              color: AppPalette.moonIvory,
            ),
          ),
          const SizedBox(width: 14),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  l10n.ts('Pedido'),
                  style: Theme.of(context).textTheme.titleLarge?.copyWith(
                        color: Colors.white,
                        fontWeight: FontWeight.w900,
                      ),
                ),
                const SizedBox(height: 5),
                Text(
                  l10n.ts(
                    '{count} artículos · {total}',
                    {'count': '$itemCount', 'total': _formatUsd(total)},
                  ),
                  style: const TextStyle(
                    color: AppPalette.softLilac,
                    fontSize: 13,
                    fontWeight: FontWeight.w900,
                    decoration: TextDecoration.none,
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

class _CheckoutSectionCard extends StatelessWidget {
  const _CheckoutSectionCard({
    required this.step,
    required this.title,
    required this.child,
  });

  final String step;
  final String title;
  final Widget child;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppPalette.moonIvory,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppPalette.border),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Row(
            crossAxisAlignment: CrossAxisAlignment.start,
            children: [
              Container(
                width: 34,
                height: 34,
                decoration: BoxDecoration(
                  color: AppPalette.indigo,
                  borderRadius: BorderRadius.circular(14),
                ),
                child: Center(
                  child: Text(
                    step,
                    style: const TextStyle(
                      color: AppPalette.moonIvory,
                      fontWeight: FontWeight.w900,
                      decoration: TextDecoration.none,
                    ),
                  ),
                ),
              ),
              const SizedBox(width: 12),
              Expanded(
                child: Column(
                  crossAxisAlignment: CrossAxisAlignment.start,
                  children: [
                    Text(
                      title,
                      style: Theme.of(context).textTheme.titleMedium?.copyWith(
                            color: AppPalette.midnight,
                            fontWeight: FontWeight.w900,
                          ),
                    ),
                  ],
                ),
              ),
            ],
          ),
          const SizedBox(height: 14),
          child,
        ],
      ),
    );
  }
}

class _CheckoutTotalCard extends StatelessWidget {
  const _CheckoutTotalCard({
    required this.subtotal,
    required this.shipping,
    required this.total,
  });

  final double subtotal;
  final double shipping;
  final double total;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: AppPalette.mistLilac,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppPalette.border),
      ),
      padding: const EdgeInsets.all(16),
      child: Column(
        children: [
          _SummaryRow(
              label: context.l10n.ts('Subtotal'), value: _formatUsd(subtotal)),
          const SizedBox(height: 8),
          _SummaryRow(
              label: context.l10n.ts('Envío'), value: _formatUsd(shipping)),
          const SizedBox(height: 12),
          const Divider(height: 1),
          const SizedBox(height: 12),
          _SummaryRow(
            label: context.l10n.ts('Total del pedido'),
            value: _formatUsd(total),
            highlight: true,
          ),
        ],
      ),
    );
  }
}

class _CheckoutLine extends StatelessWidget {
  const _CheckoutLine({
    required this.line,
  });

  final _CartLine line;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(20),
        border: Border.all(color: AppPalette.border),
      ),
      padding: const EdgeInsets.all(14),
      child: Row(
        children: [
          SizedBox(
            width: 66,
            height: 82,
            child: ClipRRect(
              borderRadius: BorderRadius.circular(16),
              child: _ProductArtwork(product: line.product),
            ),
          ),
          const SizedBox(width: 12),
          Expanded(
            child: Column(
              crossAxisAlignment: CrossAxisAlignment.start,
              children: [
                Text(
                  line.product.name,
                  style: Theme.of(context).textTheme.titleSmall?.copyWith(
                        fontWeight: FontWeight.w800,
                      ),
                ),
                const SizedBox(height: 4),
                Text(
                  '${line.quantity} x ${formatMoney(line.product.price)}',
                  style: Theme.of(context).textTheme.bodyMedium?.copyWith(
                        color: AppPalette.mutedLavender,
                      ),
                ),
              ],
            ),
          ),
          Text(
            _formatUsd(line.product.price.amount * line.quantity),
            style: Theme.of(context).textTheme.titleSmall?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
        ],
      ),
    );
  }
}

List<String> _productGalleryUrls(ShopProduct product) {
  final urls = <String>[];
  final seen = <String>{};

  void addUrl(String value) {
    final trimmed = value.trim();
    if (trimmed.isEmpty || !seen.add(trimmed)) {
      return;
    }
    urls.add(trimmed);
  }

  addUrl(product.imageUrl);
  for (final imageUrl in product.imageUrls) {
    addUrl(imageUrl);
  }

  return urls;
}

class _ProductArtwork extends StatelessWidget {
  const _ProductArtwork({
    required this.product,
    this.imageUrl,
    this.fit = BoxFit.cover,
    this.scale,
  });

  final ShopProduct product;
  final String? imageUrl;
  final BoxFit fit;
  final double? scale;

  @override
  Widget build(BuildContext context) {
    final resolvedImageUrl = imageUrl?.trim().isNotEmpty ?? false
        ? imageUrl!.trim()
        : product.imageUrl.trim();
    final hasImage = resolvedImageUrl.isNotEmpty;
    final resolvedScale = scale ?? (hasImage && fit == BoxFit.cover ? 1.07 : 1);
    final primary = hasImage
        ? Image.network(
            resolvedImageUrl,
            fit: fit,
            filterQuality: FilterQuality.high,
            gaplessPlayback: true,
            loadingBuilder: (context, child, progress) {
              if (progress == null) {
                return child;
              }
              return _FallbackArtwork(product: product);
            },
            errorBuilder: (_, __, ___) => _FallbackArtwork(product: product),
          )
        : _FallbackArtwork(product: product);

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: [
            Colors.white,
            AppPalette.moonIvory,
            AppPalette.softLilac.withValues(alpha: 0.92),
          ],
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned(
            left: 10,
            right: 10,
            top: 12,
            bottom: 18,
            child: DecoratedBox(
              decoration: BoxDecoration(
                borderRadius: BorderRadius.circular(26),
                gradient: RadialGradient(
                  center: Alignment.topCenter,
                  radius: 1.0,
                  colors: [
                    Colors.white.withValues(alpha: hasImage ? 0.92 : 0.28),
                    AppPalette.roseQuartz
                        .withValues(alpha: hasImage ? 0.46 : 0.22),
                    Colors.transparent,
                  ],
                  stops: const [0.0, 0.62, 1.0],
                ),
                boxShadow: [
                  BoxShadow(
                    color: AppPalette.roseQuartz.withValues(alpha: 0.18),
                    blurRadius: 18,
                    offset: const Offset(0, 10),
                  ),
                ],
              ),
            ),
          ),
          Positioned.fill(
            child: Padding(
              padding: EdgeInsets.all(hasImage ? 4 : 0),
              child: Transform.scale(
                scale: resolvedScale,
                child: primary,
              ),
            ),
          ),
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.white.withValues(alpha: 0.18),
                    Colors.transparent,
                    AppPalette.midnight.withValues(alpha: 0.05),
                  ],
                  stops: const [0.0, 0.54, 1.0],
                ),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.24),
                ),
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _FallbackArtwork extends StatelessWidget {
  const _FallbackArtwork({
    required this.product,
  });

  final ShopProduct product;

  @override
  Widget build(BuildContext context) {
    final style = _artworkStyle(product.artwork);

    return DecoratedBox(
      decoration: BoxDecoration(
        gradient: LinearGradient(
          begin: Alignment.topLeft,
          end: Alignment.bottomRight,
          colors: style.colors,
        ),
      ),
      child: Stack(
        fit: StackFit.expand,
        children: [
          Positioned.fill(
            child: DecoratedBox(
              decoration: BoxDecoration(
                gradient: LinearGradient(
                  begin: Alignment.topCenter,
                  end: Alignment.bottomCenter,
                  colors: [
                    Colors.white.withValues(alpha: 0.08),
                    Colors.transparent,
                    Colors.black.withValues(alpha: 0.08),
                  ],
                ),
              ),
            ),
          ),
          Positioned(
            top: -18,
            right: -12,
            child: Icon(
              style.icon,
              size: 84,
              color: Colors.white.withValues(alpha: 0.12),
            ),
          ),
          Positioned(
            left: 12,
            right: 12,
            bottom: 12,
            child: Container(
              padding: const EdgeInsets.symmetric(horizontal: 10, vertical: 8),
              decoration: BoxDecoration(
                color: AppPalette.midnight.withValues(alpha: 0.22),
                borderRadius: BorderRadius.circular(14),
                border: Border.all(
                  color: Colors.white.withValues(alpha: 0.2),
                ),
              ),
              child: Row(
                children: [
                  Icon(style.icon, color: Colors.white, size: 18),
                  const SizedBox(width: 8),
                  Expanded(
                    child: Text(
                      product.category,
                      maxLines: 1,
                      overflow: TextOverflow.ellipsis,
                      style: Theme.of(context).textTheme.labelLarge?.copyWith(
                            color: Colors.white,
                            fontWeight: FontWeight.w800,
                          ),
                    ),
                  ),
                ],
              ),
            ),
          ),
        ],
      ),
    );
  }
}

class _EmptyState extends StatelessWidget {
  const _EmptyState({
    required this.title,
  });

  final String title;

  @override
  Widget build(BuildContext context) {
    return Container(
      decoration: BoxDecoration(
        color: Colors.white,
        borderRadius: BorderRadius.circular(24),
        border: Border.all(color: AppPalette.border),
      ),
      padding: const EdgeInsets.all(18),
      child: Column(
        crossAxisAlignment: CrossAxisAlignment.start,
        children: [
          Text(
            title,
            style: Theme.of(context).textTheme.titleMedium?.copyWith(
                  fontWeight: FontWeight.w800,
                ),
          ),
        ],
      ),
    );
  }
}

class _CartLine {
  const _CartLine({
    required this.product,
    required this.quantity,
  });

  final ShopProduct product;
  final int quantity;
}

class _PipelineStage {
  const _PipelineStage(this.label, this.status, this.color);

  final String label;
  final String status;
  final Color color;
}

class _FilterOption {
  const _FilterOption(this.label, this.status);

  final String label;
  final String status;
}

class _OrderStatusCopy {
  const _OrderStatusCopy({
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;
}

class _ProductStatusCopy {
  const _ProductStatusCopy({
    required this.label,
    required this.color,
  });

  final String label;
  final Color color;
}

class _ArtworkStyle {
  const _ArtworkStyle({
    required this.icon,
    required this.colors,
  });

  final IconData icon;
  final List<Color> colors;
}

class _ProductBadgeStyle {
  const _ProductBadgeStyle({
    required this.fill,
    required this.fillAccent,
    required this.border,
    required this.shadow,
  });

  final Color fill;
  final Color fillAccent;
  final Color border;
  final Color shadow;
}

String _sectionLabel(BuildContext context, _ShopSection section) {
  switch (section) {
    case _ShopSection.home:
      return context.l10n.ts('Inicio');
    case _ShopSection.catalog:
      return context.l10n.ts('Catálogo');
    case _ShopSection.cart:
      return context.l10n.ts('Carrito');
    case _ShopSection.orders:
      return context.l10n.ts('Órdenes');
    case _ShopSection.admin:
      return context.l10n.ts('Admin');
  }
}

IconData _sectionIcon(_ShopSection section) {
  switch (section) {
    case _ShopSection.home:
      return Icons.storefront_rounded;
    case _ShopSection.catalog:
      return Icons.grid_view_rounded;
    case _ShopSection.cart:
      return Icons.shopping_cart_rounded;
    case _ShopSection.orders:
      return Icons.receipt_long_rounded;
    case _ShopSection.admin:
      return Icons.admin_panel_settings_outlined;
  }
}

IconData _categoryIcon(String category) {
  switch (category) {
    case 'Todos':
      return Icons.storefront_rounded;
    case 'Velas':
      return Icons.local_fire_department_rounded;
    case 'Cuadros':
      return Icons.track_changes_rounded;
    case 'Estatuas':
      return Icons.self_improvement_rounded;
    case 'Símbolos':
      return Icons.auto_awesome_rounded;
    case 'Tarot':
      return Icons.style_rounded;
    default:
      return Icons.category_rounded;
  }
}

Color _categoryAccentColor(String category) {
  switch (category) {
    case 'Todos':
      return AppPalette.indigo;
    case 'Velas':
      return AppPalette.flameGold;
    case 'Cuadros':
      return AppPalette.berry;
    case 'Estatuas':
      return AppPalette.royalViolet;
    case 'Símbolos':
      return AppPalette.success;
    case 'Tarot':
      return AppPalette.indigo;
    default:
      return AppPalette.mutedLavender;
  }
}

String _categoryLabel(BuildContext context, String category) {
  switch (category) {
    case 'Velas':
      return context.l10n.ts('Velas');
    case 'Cuadros':
      return context.l10n.ts('Cuadros');
    case 'Estatuas':
      return context.l10n.ts('Estatuas');
    case 'Símbolos':
      return context.l10n.ts('Símbolos');
    case 'Tarot':
      return context.l10n.ts('Tarot');
    case 'Todos':
      return context.l10n.ts('Todos');
    default:
      return category;
  }
}

bool _isLowStockProduct(ShopProduct product) {
  return !product.madeToOrder &&
      product.stockQuantity > 0 &&
      product.stockQuantity <= 3;
}

bool _isCustomizableProduct(ShopProduct product) {
  final badge = product.badge.toLowerCase();
  final tags = product.tags.join(' ').toLowerCase();

  return product.madeToOrder ||
      badge.contains('personal') ||
      tags.contains('carta natal') ||
      tags.contains('foil');
}

List<ShopProduct> _promotionalProducts({
  required List<ShopProduct> featured,
  required List<ShopProduct> products,
}) {
  final selected = <ShopProduct>[];
  final seenIds = <String>{};

  void addProduct(ShopProduct product) {
    if (seenIds.add(product.id)) {
      selected.add(product);
    }
  }

  for (final product in featured) {
    addProduct(product);
  }

  for (final product in products.where(_isPromotionalProduct)) {
    addProduct(product);
  }

  return selected;
}

bool _isPromotionalProduct(ShopProduct product) {
  final badge = product.badge.toLowerCase();
  final tags = product.tags.join(' ').toLowerCase();

  return product.featured ||
      badge.contains('promo') ||
      badge.contains('oferta') ||
      badge.contains('descuento') ||
      badge.contains('ritual') ||
      badge.contains('protección') ||
      badge.contains('proteccion') ||
      badge.contains('nuevo') ||
      badge.contains('nueva') ||
      tags.contains('promo') ||
      tags.contains('oferta') ||
      tags.contains('regalo') ||
      tags.contains('ritual') ||
      tags.contains('protección') ||
      tags.contains('proteccion');
}

String _promotionLabel(BuildContext context, ShopProduct product) {
  final badge = product.badge.toLowerCase();
  final tags = product.tags.join(' ').toLowerCase();

  if (badge.contains('oferta') ||
      tags.contains('oferta') ||
      badge.contains('descuento') ||
      tags.contains('descuento')) {
    return context.l10n.ts('Oferta');
  }

  if (badge.contains('ritual') || tags.contains('ritual')) {
    return context.l10n.ts('Promo ritual');
  }

  if (product.featured) {
    return context.l10n.ts('Promo destacada');
  }

  return context.l10n.ts('Promoción');
}

String _promotionSubtitle(BuildContext context, ShopProduct product) {
  if (!product.madeToOrder &&
      product.stockQuantity > 0 &&
      product.stockQuantity <= 3) {
    return context.l10n.ts('Últimas unidades disponibles para esta selección.');
  }

  if (product.madeToOrder) {
    return context.l10n.ts(
      'Producto especial por encargo, ideal para coordinar detalles antes de preparar.',
    );
  }

  if (product.shortDescription.trim().isNotEmpty) {
    return product.shortDescription;
  }

  return context.l10n.ts(
    'Selección promocional disponible por tiempo limitado en la tienda.',
  );
}

String _stockSummary(BuildContext context, ShopProduct product) {
  if (product.madeToOrder) {
    return context.l10n.ts('Se prepara por encargo');
  }

  if (product.stockQuantity <= 0) {
    return context.l10n.ts('Sin unidades disponibles');
  }

  if (product.stockQuantity == 1) {
    return context.l10n.ts('1 unidad disponible');
  }

  return context.l10n.ts(
    '{count} unidades disponibles',
    {'count': '${product.stockQuantity}'},
  );
}

String _stockStatusLabel(BuildContext context, int quantity, bool madeToOrder) {
  if (madeToOrder) {
    return context.l10n.ts('Hecho a pedido');
  }
  if (quantity <= 0) {
    return context.l10n.ts('Agotado');
  }
  if (quantity <= 3) {
    return context.l10n.ts('Pocas unidades');
  }

  return context.l10n.ts('Disponible');
}

String? _catalogAvailabilityLabel(BuildContext context, ShopProduct product) {
  if (product.madeToOrder) {
    return context.l10n.ts('Por encargo');
  }
  if (product.stockQuantity <= 0) {
    return context.l10n.ts('Agotado');
  }
  if (product.stockQuantity <= 3) {
    return context.l10n.ts('Últimas');
  }
  return null;
}

Color _stockStateColor(int quantity, bool madeToOrder) {
  if (madeToOrder) {
    return AppPalette.flameGold;
  }
  if (quantity <= 0) {
    return AppPalette.berry;
  }
  if (quantity <= 3) {
    return AppPalette.berry;
  }
  return AppPalette.success;
}

Color _stockColor(String stockLabel) {
  final stock = stockLabel.toLowerCase();
  if (stock.contains('pocas') ||
      stock.contains('bajo') ||
      stock.contains('últimas')) {
    return AppPalette.berry;
  }
  if (stock.contains('pedido')) {
    return AppPalette.flameGold;
  }
  if (stock.contains('nueva')) {
    return AppPalette.indigo;
  }
  return AppPalette.success;
}

List<_PipelineStage> _shopOrderStages(BuildContext context) {
  return [
    _PipelineStage(context.l10n.ts('Pendiente'), 'pending', AppPalette.berry),
    _PipelineStage(
      context.l10n.ts('Confirmada'),
      'confirmed',
      AppPalette.success,
    ),
    _PipelineStage(
      context.l10n.ts('Preparando'),
      'preparing',
      AppPalette.flameGold,
    ),
    _PipelineStage(context.l10n.ts('Enviada'), 'shipped', AppPalette.indigo),
  ];
}

List<_FilterOption> _orderStatusFilterOptions(BuildContext context) {
  return [
    _FilterOption(context.l10n.ts('Todas'), 'all'),
    ..._shopOrderStages(context)
        .map((stage) => _FilterOption(stage.label, stage.status)),
  ];
}

List<_FilterOption> _inventoryFilterOptions(BuildContext context) {
  return [
    _FilterOption(context.l10n.ts('Todo'), 'all'),
    _FilterOption(context.l10n.ts('Stock bajo'), 'low_stock'),
    _FilterOption(context.l10n.ts('Hecho a pedido'), 'made_to_order'),
    ..._productStatusOptions(context),
  ];
}

List<_FilterOption> _productStatusOptions(BuildContext context) {
  return [
    _FilterOption(context.l10n.ts('Activo'), 'active'),
    _FilterOption(context.l10n.ts('Borrador'), 'draft'),
    _FilterOption(context.l10n.ts('Oculto'), 'hidden'),
    _FilterOption(context.l10n.ts('Archivado'), 'archived'),
  ];
}

int _orderStageIndex(String status) {
  switch (status) {
    case 'confirmed':
      return 1;
    case 'preparing':
      return 2;
    case 'shipped':
      return 3;
    default:
      return 0;
  }
}

_OrderStatusCopy _statusCopy(BuildContext context, String status) {
  switch (status) {
    case 'confirmed':
      return _OrderStatusCopy(
        label: context.l10n.ts('Confirmada'),
        color: AppPalette.success,
      );
    case 'preparing':
      return _OrderStatusCopy(
        label: context.l10n.ts('Preparando'),
        color: AppPalette.flameGold,
      );
    case 'shipped':
      return _OrderStatusCopy(
        label: context.l10n.ts('Enviada'),
        color: AppPalette.indigo,
      );
    default:
      return _OrderStatusCopy(
        label: context.l10n.ts('Pendiente'),
        color: AppPalette.berry,
      );
  }
}

_ProductStatusCopy _productStatusCopy(BuildContext context, String status) {
  switch (status) {
    case 'draft':
      return _ProductStatusCopy(
        label: context.l10n.ts('Borrador'),
        color: AppPalette.flameGold,
      );
    case 'hidden':
      return _ProductStatusCopy(
        label: context.l10n.ts('Oculto'),
        color: AppPalette.indigo,
      );
    case 'archived':
      return _ProductStatusCopy(
        label: context.l10n.ts('Archivado'),
        color: AppPalette.mutedLavender,
      );
    default:
      return _ProductStatusCopy(
        label: context.l10n.ts('Activo'),
        color: AppPalette.success,
      );
  }
}

_ArtworkStyle _artworkStyle(String artwork) {
  switch (artwork) {
    case 'candle-moon':
    case 'candle-obsidian':
      return const _ArtworkStyle(
        icon: Icons.local_fire_department_rounded,
        colors: [
          AppPalette.midnight,
          AppPalette.berry,
          AppPalette.flameGold,
        ],
      );
    case 'natal-gold':
    case 'natal-night':
      return const _ArtworkStyle(
        icon: Icons.track_changes_rounded,
        colors: [
          AppPalette.midnight,
          AppPalette.indigo,
          AppPalette.roseDust,
        ],
      );
    case 'statue-moon':
    case 'statue-buddha':
      return const _ArtworkStyle(
        icon: Icons.self_improvement_rounded,
        colors: [
          AppPalette.midnight,
          AppPalette.royalViolet,
          AppPalette.flameGold,
        ],
      );
    case 'symbol-flower':
    case 'symbol-pentacle':
      return const _ArtworkStyle(
        icon: Icons.auto_awesome_rounded,
        colors: [
          AppPalette.butterflyInk,
          AppPalette.indigo,
          AppPalette.roseDust,
        ],
      );
    default:
      return const _ArtworkStyle(
        icon: Icons.style_rounded,
        colors: [
          AppPalette.butterflyInk,
          AppPalette.royalViolet,
          AppPalette.flameGold,
        ],
      );
  }
}

_ProductBadgeStyle _productBadgeStyle(String label) {
  final normalized = label.toLowerCase();

  if (normalized.contains('protec')) {
    return const _ProductBadgeStyle(
      fill: AppPalette.berry,
      fillAccent: AppPalette.midnight,
      border: AppPalette.roseDust,
      shadow: AppPalette.berry,
    );
  }

  if (normalized.contains('clás') || normalized.contains('clasi')) {
    return const _ProductBadgeStyle(
      fill: AppPalette.butterflyInk,
      fillAccent: AppPalette.indigo,
      border: AppPalette.orchid,
      shadow: AppPalette.indigo,
    );
  }

  if (normalized.contains('person') || normalized.contains('edición estudio')) {
    return const _ProductBadgeStyle(
      fill: AppPalette.warning,
      fillAccent: AppPalette.flameGold,
      border: AppPalette.candleGlow,
      shadow: AppPalette.flameGold,
    );
  }

  if (normalized.contains('nuevo') ||
      normalized.contains('nueva') ||
      normalized.contains('ritual') ||
      normalized.contains('visual')) {
    return const _ProductBadgeStyle(
      fill: AppPalette.indigo,
      fillAccent: AppPalette.orchid,
      border: AppPalette.softLilac,
      shadow: AppPalette.royalViolet,
    );
  }

  return const _ProductBadgeStyle(
    fill: AppPalette.butterflyInk,
    fillAccent: AppPalette.royalViolet,
    border: AppPalette.roseQuartz,
    shadow: AppPalette.butterflyInk,
  );
}

String _formatUsd(double amount) {
  return formatMoney(
    Money(
      amount: amount,
      currency: 'USD',
    ),
  );
}
