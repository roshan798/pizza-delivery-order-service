import express from 'express';
import { PaymentController } from './paymentController';
import asyncRequestHandler from '../utils/asyncRequestHandler';

const router = express.Router();
const paymentController = new PaymentController();
router.post('/webhook', asyncRequestHandler(paymentController.handleWebhook));

export default router;
