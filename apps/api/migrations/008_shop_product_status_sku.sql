alter table shop_product_overrides
  add column if not exists sku text not null default '',
  add column if not exists status text not null default 'active';

update shop_product_overrides
set sku = upper(
  regexp_replace(
    trim(
      case
        when length(product_id) > 0 then product_id
        else name
      end
    ),
    '[^a-zA-Z0-9]+',
    '-',
    'g'
  )
)
where trim(sku) = '';

update shop_product_overrides
set status = 'active'
where trim(status) = '';

create index if not exists shop_product_overrides_status_idx
  on shop_product_overrides (status, specialist_id, featured);
