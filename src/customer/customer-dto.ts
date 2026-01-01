interface Address {
	address: string;
}

interface Contact {
	countryCode: string;
	contact: string;
	isPrimary?: boolean;
}

export class CustomerDTO {
	userId: string;
	firstName: string;
	lastName: string;
	email: string;
	Contact: Contact[];
	address: Address[];
	createdAt?: Date;
	updatedAt?: Date;

	constructor(customerData: {
		id: string;
		userId: string;
		firstName: string;
		lastName: string;
		email: string;
		Contact: Contact[];
		address: Address[];
		createdAt?: Date;
		updatedAt?: Date;
	}) {
		this.userId = customerData.userId;
		this.firstName = customerData.firstName;
		this.lastName = customerData.lastName;
		this.email = customerData.email;
		this.Contact = customerData.Contact;
		this.address = customerData.address;
		this.createdAt = customerData.createdAt;
		this.updatedAt = customerData.updatedAt;
	}
}
