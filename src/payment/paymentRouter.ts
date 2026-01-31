import express from 'express';
import { PaymentController } from './paymentController';
import asyncRequestHandler from '../utils/asyncRequestHandler';
import { StripeGateway } from './stripe';

const router = express.Router();
const payementGateway = new StripeGateway();
const paymentController = new PaymentController(payementGateway);
router.post('/webhook', asyncRequestHandler(paymentController.handleWebhook));

export default router;
