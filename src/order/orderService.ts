import ProductCacheModel, {
	PriceConfiguration,
	ProductCache,
} from '../Cache/Product/ProductCacheModel';
import toppingCaheModel, {
	IToppingCache,
} from '../Cache/topping/toppingCaheModel';
import customerModel from '../customer/customer-model';
import OrderModel, { OrderStatus, PaymentMode } from './orderModel';
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
import { createPaymentGateway } from '../factory/paymentGatewayFactory';

export class OrderService {
	private readonly TAX_RATE = 0.07; // 7% tax
	private readonly DELIVERY_CHARGE = 50.0; // flat delivery charge

	constructor(
		private readonly model: typeof customerModel,
		private readonly productCacheModel: typeof ProductCacheModel,
		private readonly toppingCacheModel: typeof toppingCaheModel
	) {
		this.model = model;
		this.productCacheModel = productCacheModel;
		this.toppingCacheModel = toppingCacheModel;
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
