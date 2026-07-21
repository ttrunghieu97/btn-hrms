import { Module } from "@nestjs/common";
import { RouterModule } from "@nestjs/core";
import { DepartmentsModule } from "./departments/departments.module";
import { PositionsModule } from "./positions/positions.module";
import { LocationsModule } from "./locations/locations.module";

@Module({
  imports: [
    DepartmentsModule,
    PositionsModule,
    LocationsModule,
    RouterModule.register([
      { path: "departments", module: DepartmentsModule },
      { path: "positions", module: PositionsModule },
      { path: "workforce/locations", module: LocationsModule },
    ]),
  ],
  exports: [DepartmentsModule, PositionsModule, LocationsModule],
})
export class OrganizationDomainModule {}
