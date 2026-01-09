import express, { Request } from 'express';
import authenticate from '../common/middlewares/authenticate';
import asyncRequestHandler from '../utils/asyncRequestHandler';
import CustomerController from './customer-controller';
import CustomerService from './customer-service';
import customerModel from './customer-model';
import {
	AddAddressRequest,
	AddContactRequest,
	DeleteAddressRequest,
	DeleteContactRequest,
	UpdateAddressRequest,
	UpdateContactRequest,
} from '../types/customer-types';
import { AuthRequest } from '../types';

const router = express.Router();
const customerService = new CustomerService(customerModel);
const customerController = new CustomerController(customerService);
router.use(authenticate);

router.get(
	'/',
	asyncRequestHandler(
		async (req, res) =>
			await customerController.getOrCreateCustomer(
				req as unknown as AuthRequest,
				res
			)
	)
);

router.post(
	'/address',
	asyncRequestHandler(async (req, res) => {
		await customerController.addAddress(
			req as unknown as AddAddressRequest,
			res
		);
	})
);

router.put(
	'/address/:id',
	asyncRequestHandler(async (req: Request, res) => {
		await customerController.updateAddress(
			req as unknown as UpdateAddressRequest,
			res
		);
	})
);
router.delete(
	'/address/:id',
	asyncRequestHandler(async (req: Request, res) => {
		await customerController.deleteAddress(
			req as unknown as DeleteAddressRequest,
			res
		);
	})
);

router.post(
	'/contact',
	asyncRequestHandler(async (req: Request, res) => {
		await customerController.addContact(
			req as unknown as AddContactRequest,
			res
		);
	})
);

router.put(
	'/contact/:id',
	asyncRequestHandler(async (req: Request, res) => {
		await customerController.updateContact(
			req as unknown as UpdateContactRequest,
			res
		);
	})
);

router.delete(
	'/contact/:id',
	asyncRequestHandler(async (req: Request, res) => {
		await customerController.deleteContact(
			req as unknown as DeleteContactRequest,
			res
		);
	})
);

export default router;
