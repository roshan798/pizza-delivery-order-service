import express from 'express';
import { PaymentController } from './paymentController';
import asyncRequestHandler from '../utils/asyncRequestHandler';
import { messageBrokerFactory } from '../common/factories/messageBroker';
import { Config } from '../config';

const router = express.Router();
const messageBroker = messageBrokerFactory('order-service', Config.BROKERS);
const paymentController = new PaymentController(messageBroker);
router.post('/webhook', asyncRequestHandler(paymentController.handleWebhook));

export default router;
