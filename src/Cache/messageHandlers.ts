import logger from '../config/logger';
import { EventMessage } from '../utils/eventUtils';
import productCacheModel, { ProductMessage } from './Product/ProductCacheModel';
import toppingCacheModel, { ToppingMessage } from './topping/toppingCaheModel';

async function consumeProductMessageHandler(
	topic: string,
	partition: number,
	messageValue: string | undefined
): Promise<void> {
	logger.info({
		topic,
		partition,
		value: messageValue,
	});
	try {
		if (messageValue) {
			const { data: productMessage, event_type } = (await JSON.parse(
				messageValue
			)) as EventMessage<ProductMessage>;
			logger.info('Parsed Product Message:', productMessage, event_type);
			await productCacheModel.updateOne(
				{
					productId: productMessage.productId,
				},
				{
					$set: {
						tenantId: productMessage.tenantId,
						priceConfiguration: productMessage.priceConfiguration,
					},
				},
				{
					upsert: true,
				}
			);
			logger.info(
				'Product cache updated successfully for productId:',
				productMessage.productId
			);
		}
	} catch (error) {
		logger.error('Error processing product message', {
			error,
			topic,
			partition,
			messageValue,
		});
	}
}
async function consumeToppingMessageHandler(
	topic: string,
	partition: number,
	messageValue: string | undefined
): Promise<void> {
	logger.info({
		topic,
		partition,
		value: messageValue,
	});
	try {
		if (messageValue) {
			const { data: toppingMessage, event_type } = (await JSON.parse(
				messageValue
			)) as EventMessage<ToppingMessage>;
			logger.info('Parsed Topping Message:', toppingMessage, event_type);
			await toppingCacheModel.updateOne(
				{
					toppingId: toppingMessage.toppingId,
				},
				{
					$set: {
						name: toppingMessage.name,
						price: toppingMessage.price,
						tenantId: toppingMessage.tenantId,
					},
				},
				{
					upsert: true, // Create if it doesn't exist
				}
			);
			logger.info(
				'Topping cache updated successfully for toppingId:',
				toppingMessage.toppingId
			); // Log successful update
		}
	} catch (error) {
		logger.error('Error processing topping message', {
			error,
			topic,
			partition,
			messageValue,
		}); // Log any errors during processing
	}
}

export { consumeProductMessageHandler, consumeToppingMessageHandler };
