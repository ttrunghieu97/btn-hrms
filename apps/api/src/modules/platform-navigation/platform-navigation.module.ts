import { Module } from "@nestjs/common";
import { PlatformNavigationController } from "./platform-navigation.controller";
import { NavigationRegistry } from "./nav.registry";
import { NavService } from "./services/nav.service";
import { NavSetupService } from "./nav-setup.service";
import { RequestContextModule } from "../../shared/context/request-context.module";

@Module({
  imports: [RequestContextModule],
  controllers: [PlatformNavigationController],
  providers: [NavigationRegistry, NavService, NavSetupService],
  exports: [NavigationRegistry],
})
export class PlatformNavigationModule {}
