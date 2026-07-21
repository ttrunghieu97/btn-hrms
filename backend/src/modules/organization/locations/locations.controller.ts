import {
  Controller,
  Get,
  Post,
  Body,
  Put,
  Param,
  Delete,
  ParseUUIDPipe,
  Query,
} from "@nestjs/common";
import { ApiTags, ApiBearerAuth, ApiOperation } from "@nestjs/swagger";
import { CreateLocationDto } from "./dto/create-location.dto";
import { UpdateLocationDto } from "./dto/update-location.dto";
import { LocationQueryDto } from "./dto/location-query.dto";
import { ListLocationsFlatUseCase } from "./use-cases/list-locations-flat.usecase";
import { ListLocationsUseCase } from "./use-cases/list-locations.usecase";
import { GetLocationUseCase } from "./use-cases/get-location.usecase";
import { CreateLocationUseCase } from "./use-cases/create-location.usecase";
import { UpdateLocationUseCase } from "./use-cases/update-location.usecase";
import { DeleteLocationUseCase } from "./use-cases/delete-location.usecase";
import { AuditLog } from "../../../shared/decorators/audit-log.decorator";
import { RequirePermission } from "../../../core/security/decorators/require-permission.decorator";
import { Permissions } from "../../../core/security/permissions/permissions.registry";

@ApiTags("Location Management")
@ApiBearerAuth()
@Controller()
export class LocationsController {
  constructor(
    private readonly listLocationsFlat: ListLocationsFlatUseCase,
    private readonly listLocations: ListLocationsUseCase,
    private readonly getLocation: GetLocationUseCase,
    private readonly createLocation: CreateLocationUseCase,
    private readonly updateLocation: UpdateLocationUseCase,
    private readonly deleteLocation: DeleteLocationUseCase,
  ) {}

  @Get("list")
  @RequirePermission(Permissions.LOCATIONS_VIEW)
  @ApiOperation({ summary: "Get flat list of all locations (no pagination)" })
  findList(@Query() query: LocationQueryDto) {
    return this.listLocationsFlat.execute(query);
  }

  @Get()
  @RequirePermission(Permissions.LOCATIONS_VIEW)
  @ApiOperation({ summary: "List locations with filtering and pagination" })
  findAll(@Query() query: LocationQueryDto) {
    return this.listLocations.execute(query);
  }

  @Get(":id")
  @RequirePermission(Permissions.LOCATIONS_VIEW)
  @ApiOperation({ summary: "Get location details by ID" })
  findOne(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Query() query: LocationQueryDto,
  ) {
    return this.getLocation.execute(id, query);
  }

  @Post()
  @RequirePermission(Permissions.LOCATIONS_CREATE)
  @AuditLog({ action: "location_create", entity: "location" })
  @ApiOperation({ summary: "Create a new location" })
  create(@Body() createLocationDto: CreateLocationDto) {
    return this.createLocation.execute(createLocationDto);
  }

  @Put(":id")
  @RequirePermission(Permissions.LOCATIONS_EDIT)
  @AuditLog({ action: "location_update", entity: "location" })
  @ApiOperation({ summary: "Update location details" })
  update(
    @Param("id", new ParseUUIDPipe()) id: string,
    @Body() updateLocationDto: UpdateLocationDto,
  ) {
    return this.updateLocation.execute(id, updateLocationDto);
  }

  @Delete(":id")
  @RequirePermission(Permissions.LOCATIONS_DELETE)
  @AuditLog({ action: "location_delete", entity: "location" })
  @ApiOperation({ summary: "Remove a location" })
  remove(@Param("id", new ParseUUIDPipe()) id: string) {
    return this.deleteLocation.execute(id);
  }
}


