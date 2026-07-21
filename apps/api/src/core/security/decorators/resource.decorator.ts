import { SetMetadata } from "@nestjs/common";
import type { ResourceEntityName } from "../../../contracts/ports/resource-context-reader.port";

export const RESOURCE_KEY = "resource";

export interface ResourceToken {
  readonly resourceName: ResourceEntityName;
}

export interface ResourceMetadata {
  entityName: ResourceEntityName;
  param: string;
}

/**
 * @Resource(Employee)              — loads entity by :id param
 * @Resource(Employee, "username")  — loads entity by :username param
 */
export const Resource = (entity: ResourceToken, param = "id") =>
  SetMetadata(RESOURCE_KEY, {
    entityName: entity.resourceName,
    param,
  } satisfies ResourceMetadata);
