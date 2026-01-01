import express from 'express';
import authenticate from '../common/middlewares/authenticate';
import asyncRequestHandler from '../utils/asyncRequestHandler';
import CustomerController from './customer-controller';
import CustomerService from './customer-service';
import customerModel from './customer-model';
const router = express.Router();
const customerService = new CustomerService(customerModel);
const customerController = new CustomerController(customerService);
router.use(authenticate);

router.get(
	'/',
	asyncRequestHandler((req, res) =>
		customerController.getOrCreateCustomer(req, res)
	)
);

export default router;
