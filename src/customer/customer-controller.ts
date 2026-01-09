import { Response } from 'express';
import CustomerService from './customer-service';
import {
	AddAddressRequest,
	AddContactRequest,
	Customer,
	DeleteAddressRequest,
	DeleteContactRequest,
	UpdateAddressRequest,
	UpdateContactRequest,
} from '../types/customer-types';
import logger from '../config/logger';
import { AuthRequest } from '../types';

class CustomerController {
	constructor(private readonly service: CustomerService) {
		this.service = service;
	}

	async getOrCreateCustomer(req: AuthRequest, res: Response) {
		logger.info('Entering getOrCreateCustomer of CustomerController');
		const customer: Customer = {
			userId: req.auth.sub,
			firstName: req.auth.firstName,
			lastName: req.auth.lastName,
			email: req.auth.email,
			Contact: [],
			address: [],
		};
		logger.debug(
			`Customer data prepared for getOrCreateCustomer: ${JSON.stringify(
				customer
			)}`
		);
		const newCustomer = await this.service.getOrCreateCustomer(customer);
		logger.debug(
			`Customer retrieved or created: ${JSON.stringify(newCustomer)}`
		);
		res.json({ customer: newCustomer });
		logger.info('Exiting getOrCreateCustomer of CustomerController');
	}

	async addAddress(req: AddAddressRequest, res: Response) {
		logger.info('Entering addAddress of CustomerController');
		const customerEmail = req.auth.email;
		const address = req.body;
		const result = await this.service.addAddress(customerEmail, address);
		res.json({ result });
		logger.info('Exiting addAddress of CustomerController');
	}

	async updateAddress(req: UpdateAddressRequest, res: Response) {
		logger.info('Entering updateAddress of CustomerController');
		const customerEmail = req.auth.email;
		const addressId = req.params.id;
		const address = req.body;
		const result = await this.service.updateAddress(
			customerEmail,
			addressId,
			address
		);
		res.json({ result });
		logger.info('Exiting updateAddress of CustomerController');
	}

	async deleteAddress(req: DeleteAddressRequest, res: Response) {
		logger.info('Entering deleteAddress of CustomerController');
		const customerEmail = req.auth.email;
		const addressId = req.params.id;
		const result = await this.service.deleteAddress(
			customerEmail,
			addressId
		);
		res.json({ result });
		logger.info('Exiting deleteAddress of CustomerController');
	}

	async addContact(req: AddContactRequest, res: Response) {
		logger.info('Entering addContact of CustomerController');
		const customerEmail = req.auth.email;
		const contact = req.body;
		const result = await this.service.addContact(customerEmail, contact);
		res.json({ result });
		logger.info('Exiting addContact of CustomerController');
	}

	async updateContact(req: UpdateContactRequest, res: Response) {
		logger.info('Entering updateContact of CustomerController');
		const customerEmail = req.auth.email;
		const contactId = req.params.id;
		const contact = req.body;
		const result = await this.service.updateContact(
			customerEmail,
			contactId,
			contact
		);
		res.json({ result });
		logger.info('Exiting updateContact of CustomerController');
	}

	async deleteContact(req: DeleteContactRequest, res: Response) {
		logger.info('Entering deleteContact of CustomerController');
		const customerEmail = req.auth.email;
		const contactId = req.params.id;
		const result = await this.service.deleteContact(
			customerEmail,
			contactId
		);
		res.json({ result });
		logger.info('Exiting deleteContact of CustomerController');
	}
}
export default CustomerController;
