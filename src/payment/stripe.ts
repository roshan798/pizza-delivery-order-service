import { Config } from '../config';
import {
	PatymetOptions,
	PaymentGateway,
	PaymentSession,
	VerifiedSession,
} from './payment-types';
import { Stripe } from 'stripe';
import logger from '../config/logger';
import createHttpError from 'http-errors';
import {
	PaymentStatus as OrderPaymentStatus,
	PaymentStatus,
} from '../order/orderModel';
export class StripeGateway implements PaymentGateway {
	private readonly stripe: Stripe;
	constructor() {
		this.stripe = new Stripe(Config.STRIPE_SECRET_KEY);
	}
	async createSession(options: PatymetOptions): Promise<PaymentSession> {
		try {
			const session = await this.stripe.checkout.sessions.create(
				{
					mode: 'payment',
					customer_email: options.customerEmail,
					billing_address_collection: 'required',
					line_items: [
						{
							price_data: {
								currency: options.currency || 'inr',
								unit_amount: options.amount * 100,
								product_data: {
									name: 'Online Pizza Order',
									description:
										'Your delicious pizza order from our app!',
									images: [
										'https://placehold.jp/150x150.png',
									], // Placeholder image
								},
							},
							quantity: 1,
						},
					],
					metadata: {
						orderId: options.orderId,
						tenantId: options.tenantId,
					} as Record<string, string>,
					success_url: `${Config.APPLICATION_URL}/payment?success=true&order_id=${options.orderId}&}`,
					cancel_url: `${Config.APPLICATION_URL}/payment/cancel?order_id=${options.orderId}`,
				},
				{
					idempotencyKey: options.idempotantKey,
				}
			);
			logger.info(
				`Stripe checkout session created successfully with ID: ${session.id}`
			);
			logger.debug(`Stripe session object: ${JSON.stringify(session)}`);

			return {
				id: session.id,
				paymentUrl: session.url as string,
				paymentStatus: PaymentStatus.UNPAID,
			};
		} catch (error) {
			if (error instanceof Error) {
				logger.error(
					`Failed to create Stripe checkout session for orderId: ${options.orderId}. Error: ${error.message}`
				);
			} else {
				logger.error(
					`Failed to create Stripe checkout session for orderId: ${options.orderId}. Unknown error occurred.`
				);
			}
			const err = createHttpError(
				500,
				'Failed to create Stripe checkout session'
			);
			throw err;
		}
	}

	async getSession(id: string): Promise<VerifiedSession> {
		const session = await this.stripe.checkout.sessions.retrieve(id);

		let paymentStatus: OrderPaymentStatus;
		if (session.payment_status === 'paid') {
			logger.info(`Stripe session ID: ${id} is paid.`);
			paymentStatus = OrderPaymentStatus.PAID;
		} else if (
			session.status === 'open' ||
			(session.status === 'complete' &&
				session.payment_status === 'unpaid')
		) {
			logger.info(
				`Stripe session ID: ${id} is open or complete but unpaid.`
			);
			paymentStatus = OrderPaymentStatus.UNPAID;
		} else {
			logger.warn(
				`Stripe session ID: ${id} has an unexpected status: ${session.status} and payment_status: ${session.payment_status}. Defaulting to unpaid.`
			);
			paymentStatus = OrderPaymentStatus.UNPAID;
		}

		// Ensure metadata is present and correctly typed
		if (!session.metadata) {
			logger.error(`Missing metadata object for session ID: ${id}`);
			throw new Error(`Missing metadata object for session ID: ${id}`);
		}

		const orderId = session.metadata.orderId;
		const tenantId = session.metadata.tenantId;

		if (typeof orderId !== 'string' || typeof tenantId !== 'string') {
			logger.error(
				`Invalid or missing metadata fields (orderId: ${orderId}, tenantId: ${tenantId} for session ID: ${id}`
			);
			throw new Error(
				`Invalid or missing metadata fields (orderId, tenantId, or idempotantKey) for session ID: ${id}`
			);
		}

		const verifiedSession: VerifiedSession = {
			id: session.id,
			metadata: {
				orderId: orderId,
				tenantId: tenantId,
			},
			paymentStatus: paymentStatus,
		};
		logger.info(
			`Successfully retrieved and verified session ID: ${id}. Payment Status: ${paymentStatus}`
		);
		return verifiedSession;
	}
}
