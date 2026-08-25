import Fastify, { type FastifyInstance, type FastifyServerOptions } from 'fastify';

import path from 'node:path';
import { registerPlugins } from './plugins';
import { registerLifecycle } from './lifecycle';
import type { HttpOptions } from './types';
import { RouteLoader } from '../../router';

export class HttpServer {
  private readonly startTime = performance.now();

  private readonly routeLoader: RouteLoader;

  public readonly app: FastifyInstance;

  public constructor(options: HttpOptions = {}) {
    const fastifyOptions: FastifyServerOptions = {
      trustProxy: options.trustProxy ?? true,
      logger: options.logger ?? false,
    };

    this.app = Fastify(fastifyOptions);

    this.routeLoader = new RouteLoader(this.app, {
      directory: path.resolve(process.cwd(), 'src', 'routes'),

      prefix: options.prefix,
    });

    registerPlugins(this.app, options);

    registerLifecycle(this.app, options);
  }

  public async listen(port: number, host = '0.0.0.0'): Promise<string> {
    /*
     * Routes must be registered before
     * Fastify starts accepting requests.
     */
    await this.routeLoader.load();

    const address = await this.app.listen({
      port,
      host,
    });

    const startupTime = performance.now() - this.startTime;

    console.log(`Started in ${startupTime.toFixed(2)}ms`);

    console.log(`Running on ${address}`);

    return address;
  }

  public async close(): Promise<void> {
    await this.app.close();
  }
}
