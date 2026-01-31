import { Response, Request } from 'express';
import { OrderService } from './orderService';
import { CreateOrderRequest, Order } from './order-request-types';
import logger from '../config/logger';
import { IdempotencyModel } from '../idempotency/idempotencyModel';

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
}
