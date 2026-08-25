import { Router } from '../package/router';

export default class IndexRoute extends Router {
  constructor() {
    super();
    this.get('/', (ctx) => {
      return ctx.send(
        {
          status: 200,
          message: 'Hello from Flutry!',
        },
        200,
      );
    });
  }
}
