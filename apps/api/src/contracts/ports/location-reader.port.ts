export const LOCATION_READER_PORT = "LOCATION_READER_PORT";

export interface ILocationReader {
  findById(id: string): Promise<unknown>;
}
