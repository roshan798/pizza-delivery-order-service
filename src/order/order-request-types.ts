import { AuthRequest } from '../types';
import { PaymentMode } from './orderModel';

export interface CreateOrderRequest extends AuthRequest {
	body: Order;
}

export interface Order {
	customerId: string;
	tenantId: string;
	address: string;
	phone: string;
	paymentMode: PaymentMode;
	couponCode?: string;
	subTotal: number;
	tax: number;
	deliveryCharge: number;
	delivery: number;
	discount: number;
	grandTotal: number;
	items: OrderItemRequest[];
}

export interface OrderItemRequest {
	productId: string;
	productName: string;
	quantity: number;
	base: {
		name: string;
		price: number;
	};
	toppings: ToppingRequest[];
	key: string;
}

export interface ToppingRequest {
	id: string;
	name: string;
	price: number;
}

// New interfaces for getAll orders
export interface GetAllOrdersQuery {
	paymentStatus?: string;
	orderStatus?: string;
	query?: string; // For searching product names within items
	page?: string; // Will be parsed to number
	limit?: string; // Will be parsed to number
	[key: string]: string | string[] | undefined;
}

export interface GetAllOrdersAuthRequest extends AuthRequest {
	query: GetAllOrdersQuery;
}
