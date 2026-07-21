import { Injectable } from "@nestjs/common";
import { ResourceLoaderRepository } from "./resource-loader.repository";
import type { ResourceEntityName } from "../../contracts/ports/resource-context-reader.port";

@Injectable()
export class ResourceLoaderService {
  constructor(private readonly resourceRepo: ResourceLoaderRepository) {}

  async load(entityName: ResourceEntityName, paramValue: string) {
    return this.resourceRepo.load(entityName, paramValue);
  }
}
