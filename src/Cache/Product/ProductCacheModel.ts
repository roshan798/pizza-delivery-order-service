import mongoose from 'mongoose';

const PriceConfigurationSchema = new mongoose.Schema({
	priceType: {
		type: String,
		enum: ['base', 'additional'],
	},
	availableOptions: {
		type: Map,
		of: Number,
	},
});

const ProductCacheModel = new mongoose.Schema(
	{
		productId: { type: String, required: true, unique: true },
		priceConfiguration: {
			type: Object,
			of: PriceConfigurationSchema,
		},
		tenantId: { type: String, required: true },
	},
	{
		timestamps: true,
	}
);

export default mongoose.model(
	'productCache',
	ProductCacheModel,
	'ProductPricingCache'
);

// move to types file

export interface PriceConfiguration {
	priceType: 'base' | 'additional';
	availableOptions: Map<string, number>;
}

export interface ProductCache {
	productId: string;
	priceConfiguration: Map<string, PriceConfiguration>;
	tenantId: string;
}
export interface ProductMessage {
	productId: string;
	priceConfiguration: Map<string, PriceConfiguration>;
	tenantId: string;
}
