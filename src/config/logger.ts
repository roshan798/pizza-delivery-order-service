import winston from 'winston';
import config from 'config';
const logger = winston.createLogger({
	level: 'info',
	defaultMeta: {
		service: 'order-service',
	},
	format: winston.format.combine(
		winston.format.timestamp(),
		winston.format.json(),
		winston.format.prettyPrint()
	),
	transports: [
		new winston.transports.Console({
			level: 'debug',
			format: winston.format.combine(
				winston.format.colorize(),
				winston.format.simple()
			),
			silent: config.get('NODE_ENV') === 'test',
		}),
		new winston.transports.File({
			filename: 'logs/error.log',
			level: 'error',
			format: winston.format.combine(
				winston.format.timestamp(),
				winston.format.json()
			),
			silent: config.get('NODE_ENV') === 'test',
		}),
		new winston.transports.File({
			filename: 'logs/combined.log',
			format: winston.format.combine(
				winston.format.timestamp(),
				winston.format.json()
			),
			silent: config.get('NODE_ENV') === 'test',
		}),
	],
});

export default logger;
