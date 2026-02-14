import { Response, Request } from 'express';
import { OrderService } from './orderService';
import { CreateOrderRequest, Order } from './order-request-types';
import logger from '../config/logger';
import { IdempotencyModel } from '../idempotency/idempotencyModel';
import { GetOrderByIDAuthRequest } from './orderTypes';
import { OrderResponseDto } from './order-response.dto';
export class OrderController {
	constructor(private readonly service: OrderService) {
		this.service = service;
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
		const redirectUrl = await this.service.createOrder(
			orderData,
			userEmail,
			idompotencyKey
		);

		res.json({ paymentUrl: redirectUrl });
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
		// if (role === 'customer' && order) {
		// 	// If the role is customer, restrict by customerId
		// 	const dbCustomerID = order.customerId.toString();
		// 	const authCustomerID = req.auth.id;
		// 	console.log(req.auth)
		// 	console.log(dbCustomerID, authCustomerID)
		// 	if (dbCustomerID !== authCustomerID) {
		// 		logger.warn(`Unauthorized access for role: ${role}`);
		// 		res.status(403).json({ message: 'Unauthorized' });
		// 		return;
		// 	}
		// }
		if (!order) {
			logger.warn(
				`Order with ID: ${id} not found or unauthorized access for role: ${role}`
			);
			res.status(404).json({ message: 'Order not found' });
			return;
		}
		res.json(new OrderResponseDto(order));
	};

	getAllByCustomer = async (_req: Request, res: Response) => {
		const req = _req as GetOrderByIDAuthRequest;
		const cuatomerEmail = req.auth.email;
		const role = req.auth.role;
		logger.info(
			`Received request to get all orders for customer ID: ${cuatomerEmail} for role: ${role}`
		);

		try {
			const orders =
				await this.service.getOrdersByCustomerEmail(cuatomerEmail);
			if (!orders) {
				logger.warn(
					`No orders found for customer ID: ${cuatomerEmail} or unauthorized access for role: ${role}`
				);
				res.json([]);
				return;
			}
			const respOrders = orders?.map(
				(order) => new OrderResponseDto(order)
			);
			res.json(respOrders);
		} catch (error) {
			logger.error(
				`Error retrieving orders for customer ID: ${cuatomerEmail}`,
				error
			);
			res.status(500).json({ message: 'Error retrieving orders' });
		}
	};
}
