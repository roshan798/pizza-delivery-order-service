import mongoose from 'mongoose';

const toppingSchema = new mongoose.Schema(
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

export default mongoose.model('toppingCache', toppingSchema, 'ToppingCache');

export interface ToppingMessage {
	toppingId: string;
	name: string;
	price: number;
	tenantId: string;
}
