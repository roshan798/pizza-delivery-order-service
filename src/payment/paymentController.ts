import { Request, Response } from 'express';
import logger from '../config/logger';
import orderModel from '../order/orderModel';
import { createPaymentGateway } from '../factory/paymentGatewayFactory';
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
	handleWebhook = async (req: Request, res: Response) => {
		const webhookBody = req.body as WebhookBody;
		if (webhookBody.type === 'checkout.session.completed') {
			const sessionId = webhookBody.data.object.id;
			const paymentGateway = createPaymentGateway();
			try {
				const verifiedSession =
					await paymentGateway.getSession(sessionId);

				const updated_order = await orderModel.findByIdAndUpdate(
					verifiedSession.metadata.orderId,
					{ paymentStatus: verifiedSession.paymentStatus },
					{ new: true }
				);
				logger.debug(
					'order updated : ' + JSON.stringify(updated_order)
				);
				// TODO
				// const kafka = createMessa
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
