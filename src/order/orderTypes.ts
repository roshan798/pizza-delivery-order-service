import { Document, ObjectId } from 'mongoose';
import { PaymentMode, OrderStatus, PaymentStatus } from './orderModel';

// 1. Amount Sub-Schema Type
export interface IAmount {
	subTotal: number;
	tax: number;
	deliveryCharge: number;
	discount: number;
	grandTotal: number;
}

// 2. Item Sub-Schema Type
export interface IItem {
	productId: string;
	productName?: string;
	quantity: number;
	base: {
		name: string;
		price: number;
	};
	toppings: Array<{
		id: string;
		price: number;
	}>;
	itemTotal: number; // sum of base price and toppings price
}

// 3. Main Order Document Interface
export interface IOrder extends Document {
	customerId: ObjectId;
	address: string;
	phone: string;
	paymentMode: PaymentMode;
	paymentStatus: PaymentStatus;
	couponCode?: string;
	amounts: IAmount;
	items: IItem[];
	orderStatus: OrderStatus;
	validation: {
		priceMatch: boolean;
		inventoryAvailable: boolean;
	};
	tenantId?: string;
	createdAt: Date;
	updatedAt: Date;
}
