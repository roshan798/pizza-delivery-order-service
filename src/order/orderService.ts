import ProductCacheModel, {
	PriceConfiguration,
	ProductCache,
} from '../Cache/Product/ProductCacheModel';
import toppingCaheModel, {
	IToppingCache,
} from '../Cache/topping/toppingCaheModel';
import customerModel from '../customer/customer-model';
import OrderModel, {
	OrderStatus,
	PaymentMode,
	PaymentStatus,
} from './orderModel';
import type {
	Order,
	OrderItemRequest,
	ToppingRequest,
} from './order-request-types';
import logger from '../config/logger';
import { IItem, IAmount, IOrder } from './orderTypes';
import mongoose from 'mongoose';
import { IdempotencyModel } from '../idempotency/idempotencyModel';
import { PatymetOptions } from '../payment/payment-types';
import { createPaymentGateway } from '../common/factories/paymentGatewayFactory';
import { MessageBroker } from '../common/MessageBroker';
import { QueryFilter } from 'mongoose';
import { Roles } from '../types';
import createHttpError from 'http-errors';
import { buildMessage, OrderEvents, Topics } from '../utils/eventUtils';

export class OrderService {
	private readonly TAX_RATE = 0.07; // 7% tax
	private readonly DELIVERY_CHARGE = 50.0; // flat delivery charge

	constructor(
		private readonly model: typeof customerModel,
		private readonly productCacheModel: typeof ProductCacheModel,
		private readonly toppingCacheModel: typeof toppingCaheModel,
		private readonly messageBroker: MessageBroker
	) {
		this.model = model;
		this.productCacheModel = productCacheModel;
		this.toppingCacheModel = toppingCacheModel;
		this.messageBroker = messageBroker;
	}

	async createOrder(
		orderData: Order,
		userEmail: string,
		idempotencyKey: string
	): Promise<string | null> {
		try {
			logger.info(`Attempting to create order for user: ${userEmail}`);

			const customer = await this.model.findOne({ email: userEmail });
			if (!customer) {
				logger.error(`Customer not found for email: ${userEmail}`);
				throw new Error('Customer not found');
			}

			const finalizedItems = await this.calculateTotal(orderData.items);
			const amounts = this._calculateOrderAmounts(
				finalizedItems,
				orderData.discount
			);

			let savedOrder: IOrder | null = null;
			let paymentUrl = null;
			const session = await mongoose.startSession();

			try {
				session.startTransaction();
				logger.info('Transaction started', idempotencyKey);

				const newOrder = new OrderModel({
					customerId: customer._id,
					address: orderData.address,
					phone: orderData.phone,
					paymentMode: orderData.paymentMode,
					paymentStatus: PaymentStatus.PENDING,
					couponCode: orderData.couponCode,
					items: finalizedItems,
					amounts: amounts,
					tenantId: orderData.tenantId,
					orderStatus: OrderStatus.PENDING,
				});

				savedOrder = await newOrder.save({ session });
				if (orderData.paymentMode === PaymentMode.CARD) {
					const paymentGateway = createPaymentGateway();
					const paymentOptions: PatymetOptions = {
						customerEmail: customer.email,
						amount: newOrder.amounts.grandTotal,
						idempotantKey: idempotencyKey,
						orderId: newOrder._id.toString(),
						tenantId: newOrder.tenantId!,
						currency: 'inr',
					};
					const paymentSession =
						await paymentGateway.createSession(paymentOptions);
					logger.info('Payment session created successfully');
					await paymentGateway.getSession(paymentSession.id);
					logger.info('Payment session fetched successfully');
					paymentUrl = paymentSession.paymentUrl;
				}

				const idempotencyRecord = new IdempotencyModel({
					key: idempotencyKey,
					data: savedOrder,
				});
				await idempotencyRecord.save({ session });
				const msg = buildMessage(OrderEvents.ORDER_CREATE, savedOrder);
				await this.messageBroker.sendMessage(Topics.ORDER, msg);

				await session.commitTransaction();
				logger.info('Transaction committed', idempotencyKey);
			} catch (error) {
				await session.abortTransaction();
				logger.error(
					'Transaction aborted due to error',
					idempotencyKey,
					error
				);
				throw error;
			} finally {
				await session.endSession();
				logger.info('Transaction completed', idempotencyKey);
			}

			logger.info(
				`Order created successfully with ID: ${savedOrder._id.toString()} for user: ${userEmail}`
			);
			return paymentUrl;
		} catch (error) {
			logger.error(`Failed to create order for user ${userEmail}`, error);
			throw error;
		}
	}

	async getOrders(
		filters: QueryFilter<IOrder>,
		page: number,
		limit: number
	): Promise<{ orders: IOrder[]; total: number }> {
		logger.info(
			`Attempting to retrieve orders with filters: ${JSON.stringify(
				filters
			)}, page: ${page}, limit: ${limit}.`
		);

		const query: QueryFilter<IOrder> = {};

		if (filters.paymentStatus) {
			query.paymentStatus = filters.paymentStatus;
		}
		if (filters.orderStatus) {
			query.orderStatus = filters.orderStatus;
		}
		if (filters['items.productName']) {
			query['items.productName'] = filters['items.productName'];
		}
		if (filters.tenantId) {
			query.tenantId = filters.tenantId;
		}

		const skip = (page - 1) * limit;

		const [orders, total] = await Promise.all([
			OrderModel.find(query)
				.skip(skip)
				.limit(limit)
				.sort({ createdAt: -1 })
				.exec(),
			OrderModel.countDocuments(query),
		]);

		logger.info(
			`Successfully retrieved ${orders.length} orders (total: ${total}) with filters: ${JSON.stringify(
				filters
			)}.`
		);
		return { orders, total };
	}

	async getOrderById(id: string): Promise<IOrder | null> {
		logger.info(`Attempting to retrieve order with ID: ${id}.`);

		const order = await OrderModel.findById(id);

		if (!order) {
			logger.warn(`Order with ID: ${id} not found.`);
			return null;
		}

		logger.info(`Successfully retrieved order with ID: ${id}`);
		return order;
	}

	async updateOrderStatus(
		orderId: string,
		newStatus: OrderStatus,
		userRole: string,
		authTenantId?: string
	): Promise<IOrder | null> {
		logger.info(
			`Attempting to update order ${orderId} to status ${newStatus} by role ${userRole.toString()}`
		);

		const order = await OrderModel.findById(orderId);

		if (!order) {
			logger.warn(`Order with ID: ${orderId} not found.`);
			return null;
		}

		// Authorization check
		if (
			userRole === Roles.MANAGER.toString() &&
			order.tenantId !== authTenantId
		) {
			logger.warn(
				`Manager ${authTenantId} unauthorized to update order ${orderId} of tenant ${order.tenantId}`
			);
			throw createHttpError(403, 'Unauthorized to update this order');
		}

		// Status transition logic (simplified for example)
		const validTransitions: Record<OrderStatus, OrderStatus[]> = {
			[OrderStatus.PENDING]: [
				OrderStatus.VERIFIED,
				OrderStatus.CANCELLED,
			],
			[OrderStatus.VERIFIED]: [
				OrderStatus.CONFIRMED,
				OrderStatus.CANCELLED,
			],
			[OrderStatus.CONFIRMED]: [
				OrderStatus.PREPARING,
				OrderStatus.CANCELLED,
			],
			[OrderStatus.PREPARING]: [
				OrderStatus.OUT_FOR_DELIVERY,
				OrderStatus.CANCELLED,
			],
			[OrderStatus.OUT_FOR_DELIVERY]: [
				OrderStatus.DELIVERED,
				OrderStatus.CANCELLED,
			],
			[OrderStatus.DELIVERED]: [], // Cannot change after delivered
			[OrderStatus.CANCELLED]: [], // Cannot change after cancelled
		};

		if (userRole === Roles.ADMIN.toString()) {
			// Admin can force any status change, but let's add some basic sanity
			if (
				order.orderStatus === OrderStatus.DELIVERED ||
				order.orderStatus === OrderStatus.CANCELLED
			) {
				if (newStatus !== order.orderStatus) {
					throw createHttpError(
						400,
						`Cannot change status of a ${order.orderStatus} order.`
					);
				}
			}
		} else if (!validTransitions[order.orderStatus]?.includes(newStatus)) {
			throw createHttpError(
				400,
				`Invalid status transition from ${order.orderStatus} to ${newStatus}`
			);
		}

		order.orderStatus = newStatus;
		await order.save();

		logger.info(`Order ${orderId} status updated to ${newStatus}`);
		return order;
	}

	async cancelOrder(
		orderId: string,
		userRole: string,
		authTenantId?: string
	): Promise<IOrder | null> {
		logger.info(
			`Attempting to cancel order ${orderId} by role ${userRole.toString()}`
		);

		const order = await OrderModel.findById(orderId);

		if (!order) {
			logger.warn(`Order with ID: ${orderId} not found.`);
			return null;
		}

		// Authorization check
		if (userRole === Roles.MANAGER && order.tenantId !== authTenantId) {
			logger.warn(
				`Manager ${authTenantId} unauthorized to cancel order ${orderId} of tenant ${order.tenantId}`
			);
			throw createHttpError(403, 'Unauthorized to cancel this order');
		}

		if (
			order.orderStatus === OrderStatus.CANCELLED ||
			order.orderStatus === OrderStatus.DELIVERED
		) {
			throw createHttpError(
				400,
				`Order cannot be cancelled as it is already ${order.orderStatus}`
			);
		}

		order.orderStatus = OrderStatus.CANCELLED;
		await order.save();

		logger.info(`Order ${orderId} cancelled successfully.`);
		return order;
	}

	async getOrdersByCustomerEmail(email: string): Promise<IOrder[] | null> {
		logger.info(
			`Attempting to retrieve orders for customer email: ${email}.`
		);
		const customer = await customerModel.findOne({ email });

		if (!customer) {
			logger.warn(`Customer with email: ${email} not found.`);
			return null;
		}

		const customerId = customer._id;
		logger.debug(
			`Found customer ID: ${customerId.toString()} for email: ${email}.`
		);

		const orders = await OrderModel.find({
			customerId: customerId.toString(),
		});

		if (!orders || orders.length === 0) {
			logger.warn(
				`No orders found for customer ID: ${customerId.toString()}.`
			);
			return null;
		}

		logger.info(
			`Successfully retrieved ${orders.length} orders for customer ID: ${customerId.toString()}.`
		);
		return orders;
	}

	private async calculateTotal(items: OrderItemRequest[]): Promise<IItem[]> {
		logger.debug(`Entering calculateTotal with ${items.length} items.`);
		const finalizedItems: IItem[] = [];
		const productIds = items.map((item) => item.productId);
		const toppingIds = items.flatMap((item) =>
			item.toppings.map((topping) => topping.id)
		);

		logger.debug(
			`Fetching product caches for ${productIds.length} unique product IDs.`
		);
		const productsCache = await this.productCacheModel.find({
			productId: { $in: productIds },
		});
		logger.debug(`Found ${productsCache.length} product cache entries.`);

		logger.debug(
			`Fetching topping caches for ${toppingIds.length} unique topping IDs.`
		);
		const toppingsCache = await this.toppingCacheModel.find({
			toppingId: { $in: toppingIds },
		});
		logger.debug(`Found ${toppingsCache.length} topping cache entries.`);

		for (const item of items) {
			const finalizedItem = this.getPopulatedProductDetails(
				item,
				productsCache,
				toppingsCache
			);
			finalizedItems.push(finalizedItem);
		}
		logger.debug(
			`Finished calculating total for all items. Finalized items count: ${finalizedItems.length}`
		);
		return finalizedItems;
	}

	private getPopulatedProductDetails(
		requestedItem: OrderItemRequest,
		productsCache: ProductCache[],
		toppingsCache: IToppingCache[]
	): IItem {
		logger.debug(
			`Populating details for product ID: ${requestedItem.productId}`
		);

		const cachedProduct = productsCache.find(
			(p) => p.productId === requestedItem.productId
		);
		if (!cachedProduct) {
			logger.error(
				`Product with ID '${requestedItem.productId}' not found in cache`
			);
			throw new Error(
				`Product with ID '${requestedItem.productId}' not found in cache`
			);
		}

		const basePrice = this._getValidatedBasePrice(
			requestedItem.base.name,
			requestedItem.productId,
			cachedProduct.priceConfiguration
		);
		let toppingsPriceSum = 0;

		const populatedToppings = this._getPopulatedToppingsAndSum(
			requestedItem.toppings,
			toppingsCache,
			(price) => {
				toppingsPriceSum += price;
			}
		);

		const itemTotalSum =
			(basePrice + toppingsPriceSum) * requestedItem.quantity;
		logger.debug(
			`Calculated item total for product '${requestedItem.productId}': ${itemTotalSum}`
		);

		const populatedItem: IItem = {
			productId: cachedProduct.productId,
			productName: requestedItem.productName,
			quantity: requestedItem.quantity,
			base: {
				name: requestedItem.base.name,
				price: basePrice,
			},
			toppings: populatedToppings,
			itemTotal: itemTotalSum,
		};
		return populatedItem;
	}

	private getPopulatedToppingDetails(
		requestedToppingId: string,
		toppingsCache: IToppingCache[]
	): IItem['toppings'][number] {
		logger.debug(
			`Populating details for topping ID: ${requestedToppingId}`
		);

		const cachedTopping = toppingsCache.find(
			(t) => t.toppingId === requestedToppingId
		);
		if (!cachedTopping) {
			logger.error(
				`Topping with ID '${requestedToppingId}' not found in cache`
			);
			throw new Error(
				`Topping with ID '${requestedToppingId}' not found in cache`
			);
		}
		logger.debug(`Found cached topping: ${JSON.stringify(cachedTopping)}`);
		const populatedTopping = {
			id: cachedTopping.toppingId,
			name: cachedTopping.name,
			price: cachedTopping.price,
		};
		return populatedTopping;
	}

	private _calculateOrderAmounts(
		finalizedItems: IItem[],
		discount: number
	): IAmount {
		const subTotal = finalizedItems.reduce(
			(sum, item) => sum + item.itemTotal,
			0
		);
		const tax = subTotal * this.TAX_RATE;
		const deliveryCharge = this.DELIVERY_CHARGE;
		const grandTotal = subTotal + tax + deliveryCharge - discount;

		logger.debug(
			`Calculated order amounts: subTotal=${subTotal}, tax=${tax}, deliveryCharge=${deliveryCharge}, discount=${discount}, grandTotal=${grandTotal}`
		);

		return {
			subTotal,
			tax,
			deliveryCharge,
			discount,
			grandTotal,
		};
	}

	private _getValidatedBasePrice(
		baseTypeName: string,
		productId: string,
		priceConfiguration: Map<string, PriceConfiguration>
	): number {
		const basePriceConfigEntry = priceConfiguration.get(baseTypeName);
		if (!basePriceConfigEntry) {
			logger.error(
				`Price configuration entry for base type '${baseTypeName}' not found for product ID '${productId}'`
			);
			throw new Error(
				`Price configuration entry for base type '${baseTypeName}' not found for product ID '${productId}'`
			);
		}
		const cachedBasePrice =
			basePriceConfigEntry.availableOptions.get(baseTypeName);
		if (cachedBasePrice === undefined) {
			logger.error(
				`Base price for '${baseTypeName}' not found in available options for product ID '${productId}'`
			);
			throw new Error(
				`Base price for '${baseTypeName}' not found in available options for product ID '${productId}'`
			);
		}
		return cachedBasePrice;
	}

	private _getPopulatedToppingsAndSum(
		requestedToppings: ToppingRequest[],
		toppingsCache: IToppingCache[],
		// eslint-disable-next-line no-unused-vars
		sumCallback: (price: number) => void
	): IItem['toppings'] {
		return requestedToppings.map((topping) => {
			const populatedTopping = this.getPopulatedToppingDetails(
				topping.id,
				toppingsCache
			);
			sumCallback(populatedTopping.price);
			return populatedTopping;
		});
	}
}
