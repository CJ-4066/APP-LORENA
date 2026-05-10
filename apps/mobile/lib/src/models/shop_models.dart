class CreateShopOrderInput {
  CreateShopOrderInput({
    required this.items,
    required this.deliveryAddress,
    required this.notes,
  });

  final List<CreateShopOrderItemInput> items;
  final String deliveryAddress;
  final String notes;

  Map<String, dynamic> toJson() {
    return {
      'items': items.map((item) => item.toJson()).toList(),
      'deliveryAddress': deliveryAddress,
      'notes': notes,
    };
  }
}

class CreateShopOrderItemInput {
  CreateShopOrderItemInput({
    required this.productId,
    required this.quantity,
  });

  final String productId;
  final int quantity;

  Map<String, dynamic> toJson() {
    return {
      'productId': productId,
      'quantity': quantity,
    };
  }
}

class CreateShopProductInput {
  CreateShopProductInput({
    required this.name,
    required this.category,
    required this.shortDescription,
    required this.description,
    required this.priceAmount,
    required this.sku,
    required this.status,
    required this.imageUrl,
    required this.badge,
    required this.stockQuantity,
    required this.madeToOrder,
    required this.featured,
    required this.tags,
  });

  final String name;
  final String category;
  final String shortDescription;
  final String description;
  final double priceAmount;
  final String sku;
  final String status;
  final String imageUrl;
  final String badge;
  final int stockQuantity;
  final bool madeToOrder;
  final bool featured;
  final List<String> tags;

  Map<String, dynamic> toJson() {
    return {
      'name': name,
      'category': category,
      'shortDescription': shortDescription,
      'description': description,
      'sku': sku,
      'status': status,
      'imageUrl': imageUrl,
      'price': {
        'amount': priceAmount,
        'currency': 'USD',
      },
      'badge': badge,
      'stockQuantity': stockQuantity,
      'madeToOrder': madeToOrder,
      'featured': featured,
      'tags': tags,
    };
  }
}

class UpdateShopProductInput {
  UpdateShopProductInput({
    this.name,
    this.category,
    this.shortDescription,
    this.description,
    this.priceAmount,
    this.sku,
    this.status,
    this.imageUrl,
    this.badge,
    this.stockQuantity,
    this.madeToOrder,
    this.featured,
    this.tags,
  });

  final String? name;
  final String? category;
  final String? shortDescription;
  final String? description;
  final double? priceAmount;
  final String? sku;
  final String? status;
  final String? imageUrl;
  final String? badge;
  final int? stockQuantity;
  final bool? madeToOrder;
  final bool? featured;
  final List<String>? tags;

  Map<String, dynamic> toJson() {
    return {
      if (name != null) 'name': name,
      if (category != null) 'category': category,
      if (shortDescription != null) 'shortDescription': shortDescription,
      if (description != null) 'description': description,
      if (sku != null) 'sku': sku,
      if (status != null) 'status': status,
      if (imageUrl != null) 'imageUrl': imageUrl,
      if (priceAmount != null)
        'price': {
          'amount': priceAmount,
          'currency': 'USD',
        },
      if (badge != null) 'badge': badge,
      if (stockQuantity != null) 'stockQuantity': stockQuantity,
      if (madeToOrder != null) 'madeToOrder': madeToOrder,
      if (featured != null) 'featured': featured,
      if (tags != null) 'tags': tags,
    };
  }
}

class UpdateShopOrderStatusInput {
  UpdateShopOrderStatusInput({
    required this.status,
  });

  final String status;

  Map<String, dynamic> toJson() {
    return {
      'status': status,
    };
  }
}
