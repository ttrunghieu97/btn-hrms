import { envClient, type AppEnv } from './env.client'

export type { AppEnv }

export const appEnv = envClient.appEnv
export const isDevAppEnv = envClient.isDevAppEnv
export const isProdAppEnv = envClient.isProdAppEnv
