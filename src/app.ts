import express, { NextFunction, Request, Response, RequestHandler } from 'express';
import { HttpError } from 'http-errors';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import logger from './config/logger';
import { Config } from './config';

const app = express();


// CORS configuration
const urls = Config.CLIENT_URLS;
const corsOptions: cors.CorsOptions = {
	origin: urls,
	credentials: true,
};
;
app.use(cors(corsOptions)as unknown as RequestHandler);


app.get('/', (req, res) => {
	res.json({ message: 'Welcome to Order-Service 👋' });
});
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser()); 

// routes


// globlal error handler

// eslint-disable-next-line @typescript-eslint/no-unused-vars
app.use((err: HttpError, req: Request, res: Response, next: NextFunction) => {
	logger.info('Global error handler triggered');
	logger.error('Error details:', { error: err.message });
	const status = err.status || 500;
	const message = err.message || 'Internal Server Error';
	res.status(status).json({
		errors: [
			{
				type: err.name || 'UnknownError',
				message: message,
				stack: '', // Config.NODE_ENV === 'development' ? err.stack : undefined,
				path: req.originalUrl,
			},
		],
	});
});
export default app;
