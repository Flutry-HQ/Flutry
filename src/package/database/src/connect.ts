import { Sequelize } from 'sequelize';

import DatabaseFunctions from './function';
import Models from './models/models';
import { logger } from '../../common/logger.service';

export type DatabaseDialect = 'mysql' | 'mariadb';
export interface DatabaseOptions {
  database: string;
  username: string;
  password: string;
  host: string;
  port: number;
  dialect: DatabaseDialect;
}

export class Connect {
  public static sequelize: Sequelize;

  private static connected = false;

  private static readonly MAX_RETRIES = 5;
  private static readonly RETRY_DELAY = 5000;

  private readonly functions = new DatabaseFunctions();

  public constructor(private readonly options: DatabaseOptions) {
    void this.connect();
  }

  public static get isConnected(): boolean {
    return this.connected;
  }

  public async reconnect(): Promise<void> {
    await this.disconnect();
    await this.connectWithRetry();
  }

  private async connect(): Promise<void> {
    await this.connectWithRetry();
  }

  private async disconnect(): Promise<void> {
    try {
      await Connect.sequelize?.close();

      Connect.connected = false;
    } catch (error) {
      logger.error('Error closing database connection:', error);
    }
  }

  private async connectWithRetry(attempt = 1): Promise<void> {
    try {
      await this.createConnection();

      await Connect.sequelize.authenticate();
      logger.info('Database connection established');

      await new Models().init();

      Connect.connected = true;
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      logger.error(`Connection failed (${attempt}/${Connect.MAX_RETRIES}): ${message}`);

      if (attempt >= Connect.MAX_RETRIES) {
        logger.error('Max retries reached. Database connection failed.', error);
        process.exit(1);
      }
      logger.warn(`Retrying in ${Connect.RETRY_DELAY / 1000}s...`);

      await new Promise<void>((resolve) => setTimeout(resolve, Connect.RETRY_DELAY));

      return this.connectWithRetry(attempt + 1);
    }
  }

  private async createConnection(): Promise<void> {
    const { database, username, password, host, port, dialect } = this.options;

    Connect.sequelize = new Sequelize(database, username, password, {
      host,
      port,
      dialect,
      logging: false,
      timezone: await this.functions.getTimeZone(),
      dialectOptions: { connectTimeout: 15000 },
      pool: { max: 10, min: 2, acquire: 30000, idle: 10000 },
      retry: {
        match: [/ETIMEDOUT/, /EHOSTUNREACH/, /ECONNRESET/, /ECONNREFUSED/],
        max: 3,
      },
      define: {
        charset: 'utf8mb4',
        collate: 'utf8mb4_bin',
      },
    });
  }
}
