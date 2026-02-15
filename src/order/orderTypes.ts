import { Document } from 'mongoose';
import { PaymentMode, OrderStatus, PaymentStatus } from './orderModel';
import { AuthRequest } from '../types';

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
		name: string;
		price: number;
	}>;
	itemTotal: number;
}

// 3. Main Order Document Interface
export interface IOrder extends Document {
	customerId: string;
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

export type GetOrderByIDAuthRequest = AuthRequest & {
	params: {
		id: string;
	};
};

export type UpdateOrderByIdRequest = AuthRequest & {
	body: {
		status: OrderStatus;
	};
	params: {
		id: string;
	};
};
