import { AuthRequest } from '.';

export interface Address {
	_id?: string;
	address: string;
	isPrimary: boolean;
}
export interface Contact {
	_id?: string;
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

export type AddAddressRequest = AuthRequest & {
	body: Omit<Address, '_id'>;
};

export type UpdateAddressRequest = AuthRequest & {
	body: Partial<Omit<Address, '_id'>>;
	params: {
		id: string;
	};
};

export type DeleteAddressRequest = AuthRequest & {
	params: {
		id: string;
	};
};

export type AddContactRequest = AuthRequest & {
	body: Omit<Contact, '_id'>;
};

export type UpdateContactRequest = AuthRequest & {
	body: Partial<Omit<Contact, '_id'>>;
	params: {
		id: string;
	};
};

export type DeleteContactRequest = AuthRequest & {
	params: {
		id: string;
	};
};
