import { Request, Response } from 'express';
import { AuthRequest } from '../types';
import CustomerService from './customer-service';
import { Customer } from './customer-types';
import logger from '../config/logger';
class CustomerController {
	constructor(private readonly service: CustomerService) {
		this.service = service;
	}

	async getOrCreateCustomer(_req: Request, res: Response) {
		logger.info('Entering getOrCreateCustomer of CustomerController');
		const req = _req as unknown as AuthRequest;
		const customer: Customer = {
			userId: req.auth.sub,
			firstName: req.auth.firstName,
			lastName: req.auth.lastName,
			email: req.auth.email,
			Contact: [],
			address: [],
		};
		logger.debug(
			`Customer data prepared for getOrCreateCustomer: ${JSON.stringify(customer)}`
		);
		const newCustomer = await this.service.getOrCreateCustomer(customer);
		logger.debug(
			`Customer retrieved or created: ${JSON.stringify(newCustomer)}`
		);
		res.json({ customer: newCustomer });
		logger.info('Exiting getOrCreateCustomer of CustomerController');
	}
}
export default CustomerController;
