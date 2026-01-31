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
import { messageBrokerFactory } from '../common/factories/messageBroker';
import { Config } from '../config';
const router = express.Router();
const messageBroker = messageBrokerFactory('order-service', Config.BROKERS);
const orderService = new OrderService(
	customerModel,
	ProductCacheModel,
	toppingCaheModel,
	messageBroker
);
const orderController = new OrderController(orderService);
router.post(
	'/',
	authenticate,
	canAccess([Roles.CUSTOMER]),
	asyncRequestHandler(orderController.create)
);
export default router;
