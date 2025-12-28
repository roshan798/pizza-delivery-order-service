import config from 'config';

export const Config = {
	PORT: config.get<number>('server.port'),
	HOST: config.get<string>('server.host'),
	URL: `http://${config.get<string>('server.host')}:${config.get<number>('server.port')}`,
	NODE_ENV: config.get<string>('NODE_ENV'),
	CLIENT_URLS: config.get<string>('client.urls').split(','),
	DB_URL: config.get<string>('database.url'),
	DB_NAME: config.get<string>('database.name'),
	DB_USER: config.get<string>('database.user'),
	DB_PASSWORD: config.get<string>('database.password'),
	AUTH_JWKS_URI: config.get<string>('auth.jwksUri'),

};
