module.exports = {
  apps: [{
    name: 'questify-staging',
    cwd: '/opt/questify-staging',
    script: 'node_modules/.bin/next',
    args: 'start',
    env: {
      PORT: '3001',
      NEXT_PUBLIC_SUPABASE_URL: 'https://irmihumjlbckwygtnvfi.supabase.co',
      NEXT_PUBLIC_SUPABASE_ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImlybWlodW1qbGJja3d5Z3RudmZpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIxNDgzMTEsImV4cCI6MjA5NzcyNDMxMX0.5BqCxAjfJKRUHJkPE3OiwouuI1JxvyoD9SW2eVcDrMw',
      TELEGRAM_BOT_TOKEN: '8864949400:AAFMtqDhqdWQDBoR0Lk0ufu0aqYuHVIAMDY',
      SUPABASE_SERVICE_ROLE_KEY: process.env.STAGING_SERVICE_ROLE_KEY || '',
    }
  }]
}
