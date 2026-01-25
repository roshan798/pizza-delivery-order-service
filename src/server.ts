import app from './app';
import logger from './config/logger';
import initDB from './config/db';
import { Config } from './config';
import { messageBrokerFactory } from './common/factories/messageBroker';

const startServer = async () => {
	const port = Config.PORT;
	await initDB();

	let messageBroker = null;
	try {
		messageBroker = messageBrokerFactory('order-service', Config.BROKERS);
		await messageBroker.connectConsumer();
		await messageBroker.consumeMessages(['product', 'topping']);

		app.listen(port, () => {
			logger.info(`Server is running on ${port}`);
		});
	} catch (error) {
		logger.error('Error starting the server:', error);
		process.exit(1);
	}
};

(async () => {
	await startServer();
})().catch((error) => {
	logger.error('Fatal error starting server:', error);
	process.exit(1);
});
