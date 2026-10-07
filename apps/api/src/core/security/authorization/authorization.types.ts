export interface AuthorizationRule {
  anyOf?: readonly string[];
  allOf?: readonly string[];
}

export interface AuthorizationRegistry {
  routes: Record<string, AuthorizationRule>;
  resources: Record<string, AuthorizationRule>;
  actions: Record<string, AuthorizationRule>;
}
