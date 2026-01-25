import { KafkaMessageBroker } from '../../config/kafka';
import { MessageBroker } from '../MessageBroker';

let messageBroker: MessageBroker | null = null;
export const messageBrokerFactory = (
	clientId: string,
	brokers: string[]
): MessageBroker => {
	if (messageBroker == null) {
		messageBroker = new KafkaMessageBroker(clientId, brokers);
	}
	return messageBroker;
};
