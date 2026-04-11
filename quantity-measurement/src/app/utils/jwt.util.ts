/**
 * Decode JWT token and extract claims
 * JWT format: header.payload.signature
 */
export function decodeJwt(token: string): Record<string, any> | null {
  try {
    if (!token || typeof token !== 'string') return null;

    const parts = token.split('.');
    if (parts.length !== 3) return null;

    // Decode payload (2nd part)
    const payload = parts[1];
    const decoded = atob(payload);
    const parsed = JSON.parse(decoded);
    console.log('JWT decoded claims:', parsed);
    return parsed;
  } catch (err) {
    console.error('Failed to decode JWT:', err);
    return null;
  }
}

/**
 * Extract user name from JWT claims
 * Tries multiple common claim names: name, given_name, family_name, preferred_username, email
 */
export function extractNameFromJwt(token: string): string | null {
  const claims = decodeJwt(token);
  if (!claims) {
    console.warn('No JWT claims found');
    return null;
  }

  // Try common claims in order of preference
  const name =
    claims['name'] ||
    (claims['given_name'] && claims['family_name'] ? `${claims['given_name']} ${claims['family_name']}` : null) ||
    claims['given_name'] ||
    claims['family_name'] ||
    claims['preferred_username'] ||
    null;

  if (name) {
    console.log('Extracted name from JWT:', name);
    return name;
  }

  // Try to extract from email
  if (claims['email'] && typeof claims['email'] === 'string') {
    const namePart = claims['email'].split('@')[0];
    console.log('Extracted name from email:', namePart);
    return namePart;
  }

  console.warn('Could not extract any name from JWT');
  return null;
}

/**
 * Extract email from JWT claims
 */
export function extractEmailFromJwt(token: string): string | null {
  const claims = decodeJwt(token);
  if (claims && claims['email']) {
    console.log('Extracted email from JWT:', claims['email']);
    return claims['email'];
  }
  return null;
}
