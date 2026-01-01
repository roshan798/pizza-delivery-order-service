import { expressjwt, Params } from 'express-jwt';
import jwksClient from 'jwks-rsa';
import { Request } from 'express';
import logger from '../../config/logger';
import { Config } from '../../config';
import { AuthCookie } from '../../types';

const options: Params = {
	secret: jwksClient.expressJwtSecret({
		jwksUri: Config.AUTH_JWKS_URI,
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
};

export default expressjwt(options);
