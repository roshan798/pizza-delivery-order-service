import { PaymentGateway } from '../payment/payment-types';
import { StripeGateway } from '../payment/stripe';

let paymentGateway: PaymentGateway | null = null;
export const createPaymentGateway = (): PaymentGateway => {
	if (paymentGateway === null) {
		paymentGateway = new StripeGateway();
	}
	return paymentGateway;
};
