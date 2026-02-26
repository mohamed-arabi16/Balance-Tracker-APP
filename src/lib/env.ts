type RequiredClientEnvKey = 'VITE_SUPABASE_URL' | 'VITE_SUPABASE_PUBLISHABLE_KEY';

const REQUIRED_CLIENT_ENV_KEYS: RequiredClientEnvKey[] = [
  'VITE_SUPABASE_URL',
  'VITE_SUPABASE_PUBLISHABLE_KEY',
];

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === 'string' && value.trim().length > 0;

export const getMissingClientEnvKeys = (
  env: ImportMetaEnv = import.meta.env,
): RequiredClientEnvKey[] =>
  REQUIRED_CLIENT_ENV_KEYS.filter((key) => !isNonEmptyString(env[key]));

export const getClientEnv = (env: ImportMetaEnv = import.meta.env) => {
  return {
    supabaseUrl: (env.VITE_SUPABASE_URL as string) ?? '',
    supabaseAnonKey: (env.VITE_SUPABASE_PUBLISHABLE_KEY as string) ?? '',
    metalPriceApiKey: env.VITE_METALPRICEAPI_API_KEY,
    analyticsEndpoint: env.VITE_ANALYTICS_ENDPOINT,
  };
};
