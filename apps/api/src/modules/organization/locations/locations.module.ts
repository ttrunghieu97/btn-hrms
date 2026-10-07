import { Module } from "@nestjs/common";
import { LocationsController } from "./locations.controller";
import { LocationsRepository } from "./repositories/locations.repository";
import { CreateLocationUseCase } from "./use-cases/create-location.usecase";
import { ListLocationsUseCase } from "./use-cases/list-locations.usecase";
import { ListLocationsFlatUseCase } from "./use-cases/list-locations-flat.usecase";
import { GetLocationUseCase } from "./use-cases/get-location.usecase";
import { UpdateLocationUseCase } from "./use-cases/update-location.usecase";
import { DeleteLocationUseCase } from "./use-cases/delete-location.usecase";

@Module({
  controllers: [LocationsController],
  providers: [
    LocationsRepository,
    CreateLocationUseCase,
    ListLocationsUseCase,
    ListLocationsFlatUseCase,
    GetLocationUseCase,
    UpdateLocationUseCase,
    DeleteLocationUseCase,
  ],
  exports: [
    LocationsRepository,
    CreateLocationUseCase,
    ListLocationsUseCase,
    ListLocationsFlatUseCase,
    GetLocationUseCase,
    UpdateLocationUseCase,
    DeleteLocationUseCase,
  ],
})
export class LocationsModule {}


