import fs from 'fs/promises';
import path from 'path';
import { pathToFileURL } from 'url';
import DatabaseFunctions from '../function';
import { Connect } from '../connect';

export default class Models {
  private readonly functions = new DatabaseFunctions();
  private models: { [key: string]: any } = {};

  constructor() {}

  public async init(): Promise<void> {
    const sourceDir = path.join(process.cwd(), 'src/models');
    const buildDir = path.join(process.cwd(), 'dist/models');
    const modelsDir = (await this.directoryExists(sourceDir)) ? sourceDir : buildDir;
    // Load all models before configuring associations and syncing the schema.
    await this.initModels(modelsDir);

    // Associations must be configured after every model is loaded.
    for (const modelName of Object.keys(this.models)) {
      const model = this.models[modelName];
      if (typeof model.associate === 'function') {
        model.associate(this.models);
      }
    }

    try {
      // Alter sync is convenient in development but should be replaced by migrations.
      if (this.functions.isDevelopment()) {
        await Connect.sequelize.sync({ alter: true });
      } else {
        await Connect.sequelize.sync();
      }
      console.log('All models were synchronized successfully.');
    } catch (error) {
      console.error('Unable to synchronize models:', error);
      throw error;
    }
  }

  private async initModels(dir: string): Promise<void> {
    // Support both tsx development files and compiled production files.
    const files = await fs.readdir(dir, { withFileTypes: true });
    for (const file of files) {
      const filePath = path.join(dir, file.name);
      if (file.isDirectory()) {
        await this.initModels(filePath);
      } else if (/\.model\.(ts|js|mjs|cjs)$/.test(file.name)) {
        await this.loadModel(filePath);
      }
    }
  }

  private async directoryExists(dir: string): Promise<boolean> {
    try {
      return (await fs.stat(dir)).isDirectory();
    } catch {
      return false;
    }
  }

  private loadModel = async (filePath: string) => {
    try {
      const module = await import(pathToFileURL(filePath).href);
      const ModelClass = module.default;
      if (ModelClass && typeof ModelClass.initialize === 'function') {
        ModelClass.initialize(Connect.sequelize);
        this.models[ModelClass.name] = ModelClass;
      } else {
        console.log(`Model at ${filePath} does not have an initialize method.`);
      }
    } catch (error) {
      console.error(`Failed to load model at ${filePath}`, error);
    }
  };
}
