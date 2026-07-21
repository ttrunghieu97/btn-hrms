export type FindOptions<TEntity> = {
  where?: unknown;
  limit?: number;
  offset?: number;
  orderBy?: unknown;
  columns?: Partial<Record<keyof TEntity, boolean>>;
  with?: Record<string, unknown>;
};

export abstract class BaseRepository<
  TEntity,
  TCreate = Partial<TEntity>,
  TUpdate = Partial<TEntity>,
  TId extends string = string,
  TFindOptions = FindOptions<TEntity>,
  TResult = TEntity,
> {
  abstract findById(id: TId, options?: TFindOptions): Promise<TResult | null>;
  abstract findMany(options?: TFindOptions): Promise<TResult[]>;
  abstract create(data: TCreate): Promise<TResult | null>;
  abstract update(id: TId, data: TUpdate): Promise<TResult | null>;
  abstract delete(id: TId): Promise<void>;
}
