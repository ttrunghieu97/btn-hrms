import { Test, type TestingModule } from "@nestjs/testing";
import { NavigationRegistry } from "../../../modules/platform-navigation/nav.registry";
import { NavSetupService } from "../../../modules/platform-navigation/nav-setup.service";
import { AUTHORIZATION } from "./authorization.registry";

describe("Backend Authorization Registry CI Sync Test", () => {
  let navRegistry: NavigationRegistry;
  let navSetupService: NavSetupService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [NavigationRegistry, NavSetupService],
    }).compile();

    navRegistry = module.get<NavigationRegistry>(NavigationRegistry);
    navSetupService = module.get<NavSetupService>(NavSetupService);

    navSetupService.onApplicationBootstrap();
  });

  it("every route registered in NavSetupService must exist in Backend AUTHORIZATION.routes", () => {
    const allGroups = navRegistry.getAllGroups();
    const navHrefs: string[] = [];

    const collectHrefs = (items: { href?: string; children?: any[] }[]) => {
      for (const item of items) {
        if (item.href) {
          navHrefs.push(item.href);
        }
        if (item.children?.length) {
          collectHrefs(item.children);
        }
      }
    };

    for (const group of allGroups) {
      collectHrefs(group.items);
    }

    const registeredBackendRoutes = Object.keys(AUTHORIZATION.routes);

    const missingHrefs = navHrefs.filter(
      (href) => !registeredBackendRoutes.includes(href),
    );

    expect(missingHrefs).toEqual([]);
  });
});
