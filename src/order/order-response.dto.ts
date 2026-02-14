import { IOrder, IAmount, IItem } from './orderTypes';
import { PaymentMode, PaymentStatus, OrderStatus } from './orderModel';

export class OrderResponseDto {
	id: string;
	customerId: string;
	address: string;
	phone: string;
	paymentMode: PaymentMode;
	paymentStatus: PaymentStatus;
	couponCode?: string;
	amounts: IAmount;
	items: IItem[];
	orderStatus: OrderStatus;
	tenantId: string;
	createdAt: Date;
	updatedAt: Date;

	constructor(order: IOrder) {
		this.id = order._id.toString();
		this.customerId = order.customerId;
		this.address = order.address;
		this.phone = order.phone;
		this.paymentMode = order.paymentMode;
		this.paymentStatus = order.paymentStatus;
		this.couponCode = order.couponCode;
		this.amounts = order.amounts;
		this.items = order.items;
		this.orderStatus = order.orderStatus;
		this.tenantId = order.tenantId!;
		this.createdAt = order.createdAt;
		this.updatedAt = order.updatedAt;
	}
}
