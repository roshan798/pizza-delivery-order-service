import { expressjwt } from 'express-jwt';
import jwksClient from 'jwks-rsa';
import { Request } from 'express';
import config from 'config';
import logger from '../../config/logger';
import { AuthCookie } from '../types';

export default expressjwt({
	secret: jwksClient.expressJwtSecret({
		jwksUri: config.get('auth.jwksUri'),
		cache: true,
		rateLimit: true,
	}),
	algorithms: ['RS256'],
	getToken(req: Request) {
		const authHeader = req.headers.authorization;
		if (authHeader?.split(' ')[1] !== undefined) {
			const token = authHeader.split(' ')[1];
			logger.debug(`📡 Token from header: ${token}`);
			return token;
		}
		const { accessToken: token } = req.cookies as AuthCookie;
		logger.debug(`🍪 Token from cookie: ${token}`);
		return token;
	},
});
