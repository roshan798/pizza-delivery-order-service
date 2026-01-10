import mongoose from 'mongoose';
const AddressSchema = new mongoose.Schema({
	address: {
		type: String,
		required: true,
		minLength: 10,
		maxLength: 255,
		trim: true,
	},
	city: {
		type: String,
		required: true,
		minLength: 2,
		maxLength: 50,
		trim: true,
	},
	zipCode: {
		type: String,
		required: true,
		minLength: 6,
		maxLength: 6,
		trim: true,
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
		minLength: 2,
		maxLength: 4,
		trim: true,
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
			trim: true,
		},
		firstName: {
			type: String,
			required: true,
			minLength: 2,
			maxLength: 50,
			trim: true,
		},
		lastName: {
			type: String,
			required: true,
			minLength: 2,
			maxLength: 50,
			trim: true,
		},
		email: {
			type: String,
			required: true,
			unique: true,
			index: true,
			match: [
				/^[a-zA-Z0-9_+&*-]+(?:\.[a-zA-Z0-9_+&*-]+)*@(?:[a-zA-Z0-9-]+\.)+[a-zA-Z]{2,7}$/,
				'Please fill a valid email address',
			],
			trim: true,
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
