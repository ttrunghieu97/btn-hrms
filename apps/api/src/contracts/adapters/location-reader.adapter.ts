import { Injectable } from "@nestjs/common";
import { ILocationReader } from "../ports/location-reader.port";
import { LocationsRepository } from "../../modules/organization/locations/repositories/locations.repository";

@Injectable()
export class LocationReaderAdapter implements ILocationReader {
  constructor(private readonly repo: LocationsRepository) {}

  async findById(id: string): Promise<unknown> {
    return this.repo.findById(id);
  }
}
