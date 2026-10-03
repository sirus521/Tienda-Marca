PRAGMA foreign_keys=OFF;--> statement-breakpoint
CREATE TABLE `__new_product_variants` (
	`id` text PRIMARY KEY NOT NULL,
	`product_id` text NOT NULL,
	`sku` text NOT NULL,
	`option_values` text DEFAULT '{}' NOT NULL,
	`price_cents` integer NOT NULL,
	`compare_at_price_cents` integer,
	`stock` integer DEFAULT 0 NOT NULL,
	`weight_grams` integer,
	`image_id` text,
	FOREIGN KEY (`product_id`) REFERENCES `products`(`id`) ON UPDATE no action ON DELETE cascade,
	CONSTRAINT "product_variants_stock_nonneg" CHECK("__new_product_variants"."stock" >= 0)
);
--> statement-breakpoint
INSERT INTO `__new_product_variants`("id", "product_id", "sku", "option_values", "price_cents", "compare_at_price_cents", "stock", "weight_grams", "image_id") SELECT "id", "product_id", "sku", "option_values", "price_cents", "compare_at_price_cents", "stock", "weight_grams", "image_id" FROM `product_variants`;--> statement-breakpoint
DROP TABLE `product_variants`;--> statement-breakpoint
ALTER TABLE `__new_product_variants` RENAME TO `product_variants`;--> statement-breakpoint
PRAGMA foreign_keys=ON;--> statement-breakpoint
CREATE UNIQUE INDEX `product_variants_sku_unique` ON `product_variants` (`sku`);--> statement-breakpoint
CREATE INDEX `product_variants_product_id_idx` ON `product_variants` (`product_id`);