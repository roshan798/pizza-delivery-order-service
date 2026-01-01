import mongoose from 'mongoose';
const AddressSchema = new mongoose.Schema({
	address: {
		type: String,
		required: true,
	},
	isPrimary: {
		type: Boolean,
		default: false,
	},
});

const ContactSchema = new mongoose.Schema({
	countryCode: {
		type: String,
		default: '+91',
		required: true,
	},
	contact: {
		type: String,
		required: true,
		validate: {
			validator: function (v: string) {
				return /^\d{10}$/.test(v); // Validates for exactly 10 digits, typical for Indian mobile numbers
			},
			message: (props: { value: string }) =>
				`${props.value} is not a valid 10-digit mobile number!`,
		},
	},
	isPrimary: {
		type: Boolean,
		default: false,
	},
});

const CustomerSchema = new mongoose.Schema(
	{
		userId: {
			type: String,
			required: true,
			unique: true,
		},
		firstName: {
			type: String,
			required: true,
		},
		lastName: {
			type: String,
			required: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			index: true,
		},
		Contact: {
			type: [ContactSchema],
			required: true,
		},
		address: {
			type: [AddressSchema],
			required: true,
		},
	},
	{
		timestamps: true,
	}
);

export default mongoose.model('customers', CustomerSchema);
