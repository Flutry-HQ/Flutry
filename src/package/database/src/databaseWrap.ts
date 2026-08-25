import { CreateOptions, DestroyOptions, FindOptions, Model, ModelStatic, Sequelize, Transaction, UpdateOptions, Utils } from 'sequelize';

export class Database {
  static async findAll<T extends Model>(model: ModelStatic<T>, options?: FindOptions<T['_attributes']>): Promise<object[]> {
    const results = await model.findAll(options);

    return results.map((row) => row.get({ plain: true }));
  }

  static async findOne<T extends Model>(model: ModelStatic<T>, options?: FindOptions<T['_attributes']>): Promise<object | null> {
    const result = await model.findOne(options);

    return result ? result.get({ plain: true }) : null;
  }

  static async findByPk<T extends Model>(
    model: ModelStatic<T>,
    identifier: string | number,
    options?: Omit<FindOptions<T['_attributes']>, 'where'>,
  ): Promise<object | null> {
    const result = await model.findByPk(identifier, options);

    return result ? result.get({ plain: true }) : null;
  }

  static async exists<T extends Model>(model: ModelStatic<T>, options: FindOptions<T['_attributes']>): Promise<boolean> {
    return (
      (await model.findOne({
        ...options,
        attributes: ['*'],
      })) !== null
    );
  }

  static async create<T extends Model>(
    model: ModelStatic<T>,
    values: Utils.MakeNullishOptional<T['_creationAttributes']>,
    options?: CreateOptions<T['_creationAttributes']>,
  ): Promise<object> {
    const result = await model.create(values, options);

    return result.get({ plain: true });
  }

  static async update<T extends Model>(
    model: ModelStatic<T>,
    values: Partial<T['_creationAttributes']>,
    options: UpdateOptions<T['_creationAttributes']>,
  ): Promise<object[]> {
    const result = await model.update(values, {
      ...options,
      returning: true,
    });

    if (Array.isArray(result)) {
      const [_count, updatedRows] = result;

      if (Array.isArray(updatedRows)) {
        return updatedRows.map((row) => row.get({ plain: true }));
      }
    }

    return [];
  }

  static async destroy<T extends Model>(model: ModelStatic<T>, options: DestroyOptions<T['_creationAttributes']>): Promise<number> {
    return model.destroy(options);
  }

  static async count<T extends Model>(model: ModelStatic<T>, options?: FindOptions): Promise<number> {
    return model.count(options);
  }

  static async transaction<T>(sequelize: Sequelize, callback: (transaction: Transaction) => Promise<T>): Promise<T> {
    return sequelize.transaction(callback);
  }
}

export const { findOne, findAll, findByPk, exists, create, update, destroy, count, transaction } = Database;
