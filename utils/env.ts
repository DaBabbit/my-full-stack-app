export function validateEnv() {
  const requiredEnvVars = [
    'NEXT_PUBLIC_SUPABASE_URL',
    'NEXT_PUBLIC_SUPABASE_ANON_KEY',
    'SUPABASE_SERVICE_ROLE_KEY',
    'INVOICE_NINJA_URL',
    'INVOICE_NINJA_API_TOKEN',
    'NEXT_PUBLIC_INVOICE_NINJA_URL',
    'NEXT_PUBLIC_APP_URL',
  ];

  for (const envVar of requiredEnvVars) {
    if (!process.env[envVar]) {
      throw new Error(`Missing required environment variable: ${envVar}`);
    }
  }
} 