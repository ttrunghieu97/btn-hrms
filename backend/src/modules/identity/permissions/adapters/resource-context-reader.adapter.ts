import { Injectable } from "@nestjs/common";
import type {
  IResourceContextReader,
  ResourceEntityName,
} from "../../../../contracts/ports/resource-context-reader.port";
import { ResourceLoaderRepository } from "../../../../infrastructure/security/resource-loader.repository";

@Injectable()
export class ResourceContextReaderAdapter implements IResourceContextReader {
  constructor(private readonly resourceLoaderRepository: ResourceLoaderRepository) {}

  async load(entityName: ResourceEntityName, paramValue: string): Promise<unknown> {
    return this.resourceLoaderRepository.load(entityName, paramValue);
  }
}
