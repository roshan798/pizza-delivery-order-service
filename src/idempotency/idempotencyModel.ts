import mongoose from 'mongoose';

const idempotencySchema = new mongoose.Schema(
	{
		key: { type: String, required: true, unique: true },
		data: { type: Object, required: true },
	},
	{ timestamps: true }
);
idempotencySchema.index({ createdAt: 1 }, { expireAfterSeconds: 3600 }); // for 1 hour expiration
idempotencySchema.index({ key: 1 }, { unique: true });

export const IdempotencyModel = mongoose.model(
	'Idempotency',
	idempotencySchema
);
