export interface Address {
	address: string;
	isPrimary: boolean;
}
export interface Contact {
	countryCode: string;
	contact: string;
	isPrimary: boolean;
}
export interface Customer {
	userId: string;
	firstName: string;
	lastName: string;
	email: string;
	Contact: Contact[];
	address: Address[];
	createdAt?: Date;
	updatedAt?: Date;
}
