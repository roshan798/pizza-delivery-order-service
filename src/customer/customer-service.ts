import logger from '../config/logger';
import customerModel from './customer-model';
import { Customer } from './customer-types';

class CustomerService {
	constructor(private readonly model: typeof customerModel) {
		this.model = model;
	}
	async getOrCreateCustomer(customerData: Customer) {
		logger.info('Entering getOrCreateCustomer of CustomerService');
		logger.debug(
			`Attempting to get or create customer with data: ${JSON.stringify(customerData)}`
		);
		const existingCustomer = await this.model.findOne({
			email: customerData.email,
		});
		logger.debug(
			`Checked for existing customer with email: ${customerData.email}`
		);
		if (existingCustomer) {
			logger.info(
				`Existing customer found with email: ${customerData.email}`
			);
			return existingCustomer;
		}
		logger.info(
			`No existing customer found, creating new customer with email: ${customerData.email}`
		);
		const newCustomer = await this.model.create(customerData);
		logger.debug(`New customer created: ${JSON.stringify(newCustomer)}`);
		logger.info('Exiting getOrCreateCustomer of CustomerService');
		return newCustomer;
	}
}
export default CustomerService;
