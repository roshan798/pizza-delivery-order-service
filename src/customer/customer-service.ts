import createHttpError from 'http-errors';
import logger from '../config/logger';
import customerModel from './customer-model';
import { Address, Contact, Customer } from '../types/customer-types';

class CustomerService {
	constructor(private readonly model: typeof customerModel) {
		this.model = model;
	}
	async getOrCreateCustomer(customerData: Customer) {
		logger.info('Entering getOrCreateCustomer of CustomerService');
		logger.debug(
			`Attempting to get or create customer with data: ${JSON.stringify(
				customerData
			)}`
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

	async addAddress(email: string, address: Address) {
		logger.info('Entering addAddress of CustomerService');
		logger.debug(
			`Attempting to add address for customer with email: ${email}`
		);
		const customer = await this.model.findOne({ email });
		if (customer == null) {
			logger.error(`Customer not found with email: ${email}`);
			throw new createHttpError.NotFound(
				`Customer not found with email: ${email}`
			);
		}
		logger.debug(`Customer found with email: ${email}`);
		logger.debug(`Input address: ${JSON.stringify(address)}`);
		if (!address || typeof address.address !== 'string') {
			throw new createHttpError.BadRequest(
				'Invalid address: missing required "address" string'
			);
		}
		if (address.isPrimary) {
			customer.address.forEach((addr) => (addr.isPrimary = false));
		}
		customer.address.push({
			address: address.address,
			isPrimary: !!address.isPrimary,
		});
		await customer.save();
		logger.debug(`Address added for customer with email: ${email}`);
		logger.info('Exiting addAddress of CustomerService');
		return customer;
	}

	async updateAddress(
		email: string,
		addressId: string,
		address: Partial<Address>
	) {
		logger.info('Entering updateAddress of CustomerService');
		logger.debug(
			`Attempting to update address for customer with email: ${email}`
		);
		if (address && address._id) {
			delete address._id;
		}
		const customer = await this.model.findOne({ email });
		if (customer == null) {
			logger.error(`Customer not found with email: ${email}`);
			throw new createHttpError.NotFound(
				`Customer not found with email: ${email}`
			);
		}

		if (address.isPrimary) {
			customer.address.forEach((addr) => (addr.isPrimary = false));
		}
		const targetAddress = customer.address.id(addressId);
		if (!targetAddress) {
			throw new createHttpError.NotFound('Address not found');
		}

		// Use .set() to update the fields
		// This merges the 'address' updates into the existing subdocument
		targetAddress.set(address);

		// Save the parent document
		await customer.save();

		logger.debug(`Address updated for customer with email: ${email}`);
		logger.info('Exiting updateAddress of CustomerService');
		return customer;
	}

	async deleteAddress(email: string, addressId: string) {
		logger.info('Entering deleteAddress of CustomerService');
		logger.debug(
			`Attempting to delete address for customer with email: ${email}`
		);
		const customer = await this.model.findOneAndUpdate(
			{ email },
			{
				$pull: {
					address: { _id: addressId },
				},
			},
			{ new: true }
		);
		if (customer == null) {
			logger.error(`Customer not found with email: ${email}`);
			throw new createHttpError.NotFound(
				`Customer not found with email: ${email}`
			);
		}
		logger.debug(`Address deleted for customer with email: ${email}`);
		logger.info('Exiting deleteAddress of CustomerService');
		return customer;
	}

	async addContact(email: string, contact: Contact) {
		logger.info('Entering addContact of CustomerService');
		logger.debug(
			`Attempting to add contact for customer with email: ${email}`
		);
		const customer = await this.model.findOne({ email });
		if (customer == null) {
			logger.error(`Customer not found with email: ${email}`);
			throw new createHttpError.NotFound(
				`Customer not found with email: ${email}`
			);
		}
		console.log(contact);
		logger.debug(`Customer found with email: ${email}`);
		if (contact.isPrimary) {
			customer.Contact.forEach((cont) => (cont.isPrimary = false));
		}
		customer.Contact.push(contact);
		await customer.save();
		logger.debug(`Contact added for customer with email: ${email}`);
		logger.info('Exiting addContact of CustomerService');
		return customer;
	}

	async updateContact(
		email: string,
		contactId: string,
		contact: Partial<Contact>
	) {
		logger.info('Entering updateContact of CustomerService');
		logger.debug(
			`Attempting to update contact for customer with email: ${email}`
		);
		const customer = await this.model.findOne({ email });
		if (customer == null) {
			logger.error(`Customer not found with email: ${email}`);
			throw new createHttpError.NotFound(
				`Customer not found with email: ${email}`
			);
		}
		if (contact && contact._id) {
			delete contact._id;
		}
		if (contact.isPrimary) {
			customer.Contact.forEach((cont) => (cont.isPrimary = false));
		}
		const targetContact = customer.Contact.id(contactId);
		if (!targetContact) {
			throw new createHttpError.NotFound('Contact not found');
		}
		targetContact.set(contact);
		await customer.save();
		logger.debug(`Contact updated for customer with email: ${email}`);
		logger.info('Exiting updateContact of CustomerService');
		return customer;
	}

	async deleteContact(email: string, contactId: string) {
		logger.info('Entering deleteContact of CustomerService');
		logger.debug(
			`Attempting to delete contact for customer with email: ${email}`
		);
		const customer = await this.model.findOneAndUpdate(
			{ email },
			{
				$pull: {
					Contact: { _id: contactId },
				},
			},
			{ new: true }
		);
		if (customer == null) {
			logger.error(`Customer not found with email: ${email}`);
			throw new createHttpError.NotFound(
				`Customer not found with email: ${email}`
			);
		}
		logger.debug(`Contact deleted for customer with email: ${email}`);
		logger.info('Exiting deleteContact of CustomerService');
		return customer;
	}
}
export default CustomerService;
