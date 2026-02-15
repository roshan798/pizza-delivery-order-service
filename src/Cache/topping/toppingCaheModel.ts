import mongoose, { Document } from 'mongoose';

export interface IToppingCache extends Document {
	toppingId: string;
	name: string;
	price: number;
	tenantId: string;
	createdAt: Date;
	updatedAt: Date;
}

const toppingSchema = new mongoose.Schema<IToppingCache>(
	{
		toppingId: { type: String, required: true },
		name: { type: String, required: true },
		price: { type: Number, required: true },
		tenantId: { type: String, required: true },
	},
	{
		timestamps: true,
	}
);

export default mongoose.model<IToppingCache>(
	'toppingCache',
	toppingSchema,
	'ToppingCache'
);

export interface ToppingMessage {
	toppingId: string;
	name: string;
	price: number;
	tenantId: string;
}
