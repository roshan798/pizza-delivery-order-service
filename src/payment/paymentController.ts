import { Request, Response } from 'express';
import logger from '../config/logger';
import { StripeGateway } from './stripe';
import orderModel from '../order/orderModel';
interface WebhookBody {
	type: string;
	data: {
		object: {
			id: string;
		};
	};
	[key: string]: unknown;
}

export class PaymentController {
	constructor(private readonly paymentGateway: StripeGateway) {
		this.paymentGateway = paymentGateway;
	}

	handleWebhook = async (req: Request, res: Response) => {
		const webhookBody = req.body as WebhookBody;
		if (webhookBody.type === 'checkout.session.completed') {
			const sessionId = webhookBody.data.object.id;
			try {
				const verifiedSession =
					await this.paymentGateway.getSession(sessionId);

				const updated_order = await orderModel.findByIdAndUpdate(
					verifiedSession.metadata.orderId,
					{ paymentStatus: verifiedSession.paymentStatus },
					{ new: true }
				);
				logger.debug(
					'order updated : ' + JSON.stringify(updated_order)
				);
				// TODO
				// send update to KAFKA broker
				res.json({ success: true });
			} catch (err) {
				if (err instanceof Error) {
					logger.error('error : ', err.message);
				} else {
					logger.error('some error occured');
				}
				res.json({ success: false });
			}
		}
	};
}
