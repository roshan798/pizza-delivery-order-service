export const Roles = {
    ADMIN: 'admin',
    CUSTOMER: 'customer',
    MANAGER: 'manager',
} as const;

export type AuthCookie = {
    accessToken: string;
    refreshToken: string;
};

export interface AuthRequest extends Request {
    auth: {
        id?: string;
        sub: string;
        role: string;
        tenantId?: string;
        iat?: number;
        exp?: number;
        iss?: string;
        jti?: string;
    };
}

