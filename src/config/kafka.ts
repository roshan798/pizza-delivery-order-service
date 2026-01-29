import { Consumer, Kafka, Producer } from 'kafkajs';
import { MessageBroker } from '../common/MessageBroker';
import {
	consumeProductMessageHandler,
	consumeToppingMessageHandler,
} from '../Cache/messageHandlers';
import logger from './logger';

export class KafkaMessageBroker implements MessageBroker {
	private producer: Producer;
	private consumer: Consumer;
	private kafka: Kafka;
	constructor(clientId: string, brokers: string[]) {
		this.kafka = new Kafka({
			clientId: clientId,
			brokers: brokers,
		});
		this.producer = this.kafka.producer();
		this.consumer = this.kafka.consumer({ groupId: `${clientId}-group` });
	}
	async connectProducer(): Promise<void> {
		await this.producer.connect();
	}
	async disconnectProducer(): Promise<void> {
		await this.producer.disconnect();
	}
	async sendMessage(topic: string, message: string): Promise<void> {
		await this.producer.send({
			topic: topic,
			messages: [{ value: message }],
		});
	}

	async connectConsumer(): Promise<void> {
		await this.consumer.connect();
	}
	async disconnectConsumer(): Promise<void> {
		await this.consumer.disconnect();
	}
	async consumeMessages(
		topic: string[],
		fromBeginning: boolean = true
	): Promise<void> {
		await this.consumer.subscribe({
			topics: topic,
			fromBeginning: fromBeginning,
		});
		await this.consumer.run({
			eachMessage: async ({ topic, partition, message }) => {
				switch (topic) {
					case 'product':
						await consumeProductMessageHandler(
							topic,
							partition,
							message.value?.toString()
						);
						break;
					case 'topping':
						await consumeToppingMessageHandler(
							topic,
							partition,
							message.value?.toString()
						);
						break;
					default:
						logger.warn(`No handler for topic: ${topic}`);
				}
			},
		});
	}
}
