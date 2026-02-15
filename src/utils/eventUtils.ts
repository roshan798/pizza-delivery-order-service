/* eslint-disable no-unused-vars */
export enum Topics {
	ORDER = 'order',
	PRODUCT = 'product',
	TOPPING = 'topping',
}

export enum OrderEvents {
	ORDER_CREATE = 'order_create',
	ORDER_UPDATE = 'order_update',
	ORDER_STATUS_UPDATE = 'order_status_update',
	ORDER_PAYMENT_STATUS_UPDATE = 'order_payment_status_update',
}

export enum ProductEvents {
	PRODUCT_CREATE = 'product_create',
	PRODUCT_UPDATE = 'product_update',
	PRODUCT_DELETE = 'product_delete',
}

export enum ToppingEvents {
	TOPPING_CREATE = 'topping_create',
	TOPPING_UPDATE = 'topping_update',
	TOPPING_DELETE = 'topping_delete',
}

type Event = OrderEvents | ProductEvents | ToppingEvents;

export interface EventMessage<T> {
	event_type: Event;
	data: T;
}

export function buildMessage(event: Event, data: unknown) {
	return JSON.stringify({
		event_type: event,
		data: data,
	});
}
