import { Response, Request } from 'express';
import { OrderService } from './orderService';
import {
	CreateOrderRequest,
	GetAllOrdersAuthRequest,
	Order,
} from './order-request-types';
import logger from '../config/logger';
import { IdempotencyModel } from '../idempotency/idempotencyModel'; // Assuming this is correct path
import {
	GetOrderByIDAuthRequest,
	IOrder,
	UpdateOrderByIdRequest,
} from './orderTypes';
import { OrderResponseDto } from './order-response.dto';
import { Roles } from '../types';
import { QueryFilter } from 'mongoose';
import createHttpError from 'http-errors';
import { OrderStatus } from './orderModel';
import customerModel from '../customer/customer-model';
import { buildMessage, OrderEvents, Topics } from '../utils/eventUtils';
import { MessageBroker } from '../common/MessageBroker';
export class OrderController {
	private readonly messageBroker: MessageBroker;
	constructor(
		private readonly service: OrderService,
		messageBroker: MessageBroker
	) {
		this.service = service;
		this.messageBroker = messageBroker;
	}

	create = async (_req: Request, res: Response) => {
		const req = _req as CreateOrderRequest;
		logger.info('Processing create order request');
		const idompotencyKey = req.header('idempotency-key');

		logger.info(`Received Idempotency-Key: ${idompotencyKey}`);
		if (!idompotencyKey) {
			res.status(400).json({
				message: 'Idempotency-Key header is required',
			});
			return;
		}
		const existingIdempotentResponse = await IdempotencyModel.findOne({
			key: idompotencyKey,
		});
		if (existingIdempotentResponse) {
			logger.info('Idempotent response found, returning cached data');
			res.json({
				message: 'Order created successfully!',
				// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
				newOrder: existingIdempotentResponse.data,
			});
			return;
		}
		const orderData: Order = req.body;
		const userEmail = req.auth.email;
		const result = await this.service.createOrder(
			orderData,
			userEmail,
			idompotencyKey
		);
		if (!result || !result.savedOrder) {
			logger.error('Failed to create order');
			res.status(500).json({ message: 'Failed to create order' });
			return;
		}
		const msg = buildMessage(
			OrderEvents.ORDER_CREATE,
			new OrderResponseDto(result?.savedOrder)
		);
		await this.messageBroker.sendMessage(Topics.ORDER, msg);
		res.json({ paymentUrl: result.paymentUrl });
		return;
	};

	getById = async (_req: Request, res: Response) => {
		const req = _req as GetOrderByIDAuthRequest;
		const id = req.params.id;
		const role = req.auth.role;
		logger.info(
			`Received request to get order by ID: ${id} for role: ${role}`
		);

		const order = await this.service.getOrderById(id);
		if (!order) {
			logger.warn(
				`Order with ID: ${id} not found or unauthorized access for role: ${role}`
			);
			res.status(404).json({ message: 'Order not found' });
			return;
		}
		if (role === Roles.CUSTOMER) {
			// If the role is customer, restrict by customerId
			const dbCustomerID = order.customerId.toString();
			const email = req.auth.email;
			const customer = await customerModel.findOne({ email: email });
			if (!customer) {
				throw createHttpError(404, 'Customer not found');
			}

			console.log(req.auth);
			console.log(dbCustomerID, customer._id.toString());
			if (dbCustomerID !== customer._id.toString()) {
				logger.warn(`Unauthorized access for role: ${role}`);
				res.status(403).json({ message: 'Unauthorized' });
				return;
			}
		}
		if (role === Roles.MANAGER) {
			const tenantId = order.tenantId;
			const authTenantId = req.auth.tenantId;
			if (tenantId !== authTenantId) {
				logger.warn(`Unauthorized access for role: ${role}`);
				res.status(403).json({ message: 'Unauthorized' });
				return;
			}
		}

		res.json(new OrderResponseDto(order));
	};

	getAllByCustomer = async (_req: Request, res: Response) => {
		const req = _req as GetOrderByIDAuthRequest;
		const customerEmail = req.auth.email;
		const role = req.auth.role;
		logger.info(
			`Received request to get all orders for customer ID: ${customerEmail} for role: ${role}`
		);

		try {
			const orders =
				await this.service.getOrdersByCustomerEmail(customerEmail);
			if (!orders) {
				logger.warn(
					`No orders found for customer ID: ${customerEmail} or unauthorized access for role: ${role}`
				);
				res.json([]);
				return;
			}
			const respOrders = orders?.map(
				(order) => new OrderResponseDto(order, false)
			);
			res.json(respOrders);
		} catch (error) {
			logger.error(
				`Error retrieving orders for customer ID: ${customerEmail}`,
				error
			);
			res.status(500).json({ message: 'Error retrieving orders' });
		}
	};

	// get All orders for Manegers and ADMIN`
	getAll = async (_req: Request, res: Response) => {
		const req = _req as GetAllOrdersAuthRequest;
		const { paymentStatus, orderStatus, query, page, limit } = req.query;
		const role = req.auth.role;
		const authTenantId = req.auth.tenantId;

		logger.info(`Received request to get all orders for role: ${role}`);

		const filters: QueryFilter<IOrder> = {};

		if (paymentStatus) {
			filters.paymentStatus = paymentStatus;
		}
		if (orderStatus) {
			filters.orderStatus = orderStatus;
		}
		if (query) {
			filters['items.productName'] = { $regex: query, $options: 'i' };
		}

		// Apply tenantId filter for Managers
		if (role === Roles.MANAGER && authTenantId) {
			filters.tenantId = authTenantId;
		}

		const pageNumber = parseInt(page || '1', 10);
		const limitNumber = parseInt(limit || '10', 10);

		try {
			const { orders, total } = await this.service.getOrders(
				filters,
				pageNumber,
				limitNumber
			);

			const respOrders = orders.map(
				(order) => new OrderResponseDto(order)
			);

			res.json({
				data: respOrders,
				total,
				page: pageNumber,
				limit: limitNumber,
			});
		} catch (error) {
			logger.error(`Error retrieving all orders:`, error);
			res.status(500).json({ message: 'Error retrieving orders' });
		}
	};

	updateOrderStatus = async (_req: Request, res: Response) => {
		const req = _req as UpdateOrderByIdRequest;
		const id = req.params.id;
		const { orderStatus } = req.body as { orderStatus: OrderStatus };
		const role = req.auth.role;
		const authTenantId = req.auth.tenantId;
		logger.info(
			`Received request to update order ${id} to status ${orderStatus} by role ${role}`
		);
		const updatedOrder = await this.service.updateOrderStatus(
			id,
			orderStatus,
			role,
			authTenantId
		);

		if (!updatedOrder) {
			throw createHttpError(404, `Order not found!`);
		}
		const resDto = new OrderResponseDto(updatedOrder);
		const msg = buildMessage(OrderEvents.ORDER_STATUS_UPDATE, resDto);
		await this.messageBroker.sendMessage(Topics.ORDER, msg);
		res.json(resDto);
	};

	// cancelOrder = async (_req: Request, res: Response) => {

	// }
}
