import { chromium, FullConfig } from '@playwright/test';

async function globalSetup(config: FullConfig) {
  const apiURL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost/api/v1';

  try {
    const res = await fetch(`${apiURL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email:              'e2e_user@test.elyra.app',
        password:           'E2eTest123!',
        display_name:       'E2E Test User',
        age:                25,
        gender_identity:    'non-binary',
        sexual_orientation: 'queer',
        intent:             'exploring',
        city:               'Mumbai',
      }),
    });
    const data = await res.json();
    if (data.access_token) {
      process.env.E2E_ACCESS_TOKEN = data.access_token;
    }
  } catch {
    // Already registered or server not up
  }
}

export default globalSetup;