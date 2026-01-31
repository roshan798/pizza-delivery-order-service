import { PaymentStatus } from '../order/orderModel';

export interface PatymetOptions {
	currency?: 'inr';
	customerEmail: string;
	amount: number;
	orderId: string;
	tenantId: string;
	idempotantKey: string;
}
export interface PaymentSession {
	id: string;
	paymentUrl: string;
	paymentStatus: PaymentStatus;
}
export interface VerifiedSession {
	id: string;
	metadata: CustomMetaData;
	paymentStatus: PaymentStatus;
}
export interface CustomMetaData {
	orderId: string;
	tenantId: string;
}

export interface PaymentGateway {
	createSession(options: PatymetOptions): Promise<PaymentSession>;
	getSession(id: string): Promise<VerifiedSession>;
}
