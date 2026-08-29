import { Connect, DatabaseDialect } from '@flutry/database-sequlize';
import { HttpServer } from '@flutry/server';
import 'dotenv/config';

async function bootstrap() {
  const server = new HttpServer({
    trustProxy: true,
    logger: false,
    compression: true,
    helmet: true,
    prefix: process.env.PREFIX_API ?? '',
  });
  if (process.env.DB === 'true') {
    await new Connect({
      host: process.env.DB_HOST ?? 'localhost',
      port: Number(process.env.DB_PORT ?? 3306),
      database: process.env.DB_NAME ?? 'flutry',
      username: process.env.DB_USER ?? 'root',
      password: process.env.DB_PASS ?? '',
      dialect: (process.env.DB_DIALECT as DatabaseDialect) ?? 'mariadb',
    });
  }
  await server.listen(Number(process.env.PORT ?? 1337), process.env.HOST ?? '0.0.0.0');
}

bootstrap();
