/* eslint-disable no-unused-vars */
import mongoose, { Model } from 'mongoose';
import { IOrder } from './orderTypes';

export enum PaymentStatus {
	PAID = 'PAID',
	UNPAID = 'UNPAID',
	NO_PAYMENT_REQUIRED = 'NO_PAYMENT_REQUIRED',
	PENDING = 'PENDING',
}

export enum PaymentMode {
	CASH = 'CASH',
	CARD = 'CARD',
}

export enum OrderStatus {
	PENDING = 'pending',
	VERIFIED = 'verified',
	CONFIRMED = 'confirmed',
	PREPARING = 'preparing',
	OUT_FOR_DELIVERY = 'out-for-delivery',
	DELIVERED = 'delivered',
	CANCELLED = 'cancelled',
}

const amountSchema = new mongoose.Schema({
	subTotal: { type: Number, required: true },
	tax: { type: Number, default: 0 },
	deliveryCharge: { type: Number, required: true, default: 0 },
	discount: { type: Number, default: 0 },
	grandTotal: { type: Number, required: true },
});

const itemSchema = new mongoose.Schema({
	productId: { type: String, required: true },
	productName: String,
	quantity: { type: Number, required: true, min: 1 },
	base: {
		name: { type: String, required: true },
		price: { type: Number, required: true },
	},
	toppings: [
		{
			id: String,
			name: String,
			price: Number,
		},
	],
	itemTotal: Number,
});

const orderSchema = new mongoose.Schema<IOrder>(
	{
		customerId: { type: String, required: true },
		address: { type: String, required: true },
		phone: { type: String, required: true },
		paymentMode: {
			type: String,
			required: true,
			enum: [PaymentMode.CASH, PaymentMode.CARD],
		},
		paymentStatus: {
			type: String,
			required: true,
			default: PaymentStatus.UNPAID,
			enum: [
				PaymentStatus.PAID,
				PaymentStatus.UNPAID,
				PaymentStatus.NO_PAYMENT_REQUIRED,
				PaymentStatus.PENDING,
			],
		},
		couponCode: String,
		amounts: {
			type: amountSchema,
			required: true,
		},
		items: [itemSchema],
		orderStatus: {
			type: String,
			enum: [
				OrderStatus.PENDING,
				OrderStatus.VERIFIED,
				OrderStatus.CONFIRMED,
				OrderStatus.PREPARING,
				OrderStatus.OUT_FOR_DELIVERY,
				OrderStatus.DELIVERED,
				OrderStatus.CANCELLED,
			],
			default: OrderStatus.PENDING,
		},
		validation: {
			priceMatch: { type: Boolean, default: false },
			inventoryAvailable: { type: Boolean, default: false },
		},
		tenantId: {
			type: String,
			required: true,
		},
	},
	{
		timestamps: true,
	}
);

orderSchema.index({ customerId: 1, createdAt: -1 });
orderSchema.index({ status: 1, createdAt: -1 });
orderSchema.index({ tenantId: 1, createdAt: -1 });

const Order = mongoose.model<IOrder, Model<IOrder>>('Order', orderSchema);

export default Order;
