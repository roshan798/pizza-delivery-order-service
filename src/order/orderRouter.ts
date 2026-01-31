import express from 'express';
import asyncRequestHandler from '../utils/asyncRequestHandler';
import { OrderController } from './orderController';
import { OrderService } from './orderService';
import authenticate from '../common/middlewares/authenticate';
import customerModel from '../customer/customer-model';
import ProductCacheModel from '../Cache/Product/ProductCacheModel';
import toppingCaheModel from '../Cache/topping/toppingCaheModel';
import canAccess from '../common/middlewares/canAccess';
import { Roles } from '../types';
import { StripeGateway } from '../payment/stripe';
const router = express.Router();
const paymentGateway = new StripeGateway();
const orderService = new OrderService(
	customerModel,
	ProductCacheModel,
	toppingCaheModel,
	paymentGateway
);
const orderController = new OrderController(orderService);
router.post(
	'/',
	authenticate,
	canAccess([Roles.CUSTOMER]),
	asyncRequestHandler(orderController.create)
);
export default router;
