// Aetna Patient Access API OAuth Handler

/**
 * Handle Aetna OAuth callback - exchange authorization code for access token
 * @param {URL} url - Request URL containing code and state parameters
 * @param {Object} env - Cloudflare Workers environment (KV, secrets)
 * @returns {Promise<Response>} - Response with token data or error
 */
export async function handleAetnaCallback(url, env) {
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const error = url.searchParams.get("error");
  
  if (error) {
    return new Response(`Aetna auth error: ${error}`, { status: 400 });
  }
  if (!code || !state) {
    return new Response("Missing code or state parameter", { status: 400 });
  }

  // Retrieve context using state (if you stored it)
  const stateDataStr = await env.MYCARETHREAD_KV.get(`aetna:state:${state}`);
  if (stateDataStr) {
    await env.MYCARETHREAD_KV.delete(`aetna:state:${state}`);
  }

  const CLIENT_ID = env.AETNA_CLIENT_ID;
  const CLIENT_SECRET = env.AETNA_CLIENT_SECRET;
  const REDIRECT_URI = `${url.origin}/aetna-callback`;

  if (!CLIENT_ID || !CLIENT_SECRET) {
    return new Response("Aetna credentials not configured", { status: 500 });
  }

  try {
    // Exchange authorization code for access token
    const tokenEndpoint = "https://api.aetna.com/oauth2/token/v2";
    
    const params = new URLSearchParams();
    params.set("grant_type", "authorization_code");
    params.set("code", code);
    params.set("redirect_uri", REDIRECT_URI);
    params.set("client_id", CLIENT_ID);
    params.set("client_secret", CLIENT_SECRET);

    const tokenResp = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: params
    });

    const tokenData = await tokenResp.json();

    if (!tokenResp.ok) {
      return new Response(`Aetna token exchange failed: ${JSON.stringify(tokenData)}`, { status: 500 });
    }

    // Store Aetna tokens securely
    await env.MYCARETHREAD_KV.put("aetna:auth:current", JSON.stringify({
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token,
      expiresAt: Date.now() + (tokenData.expires_in * 1000),
      tokenType: tokenData.token_type,
      scope: tokenData.scope,
      acquiredAt: new Date().toISOString()
    }));

    return new Response(JSON.stringify({ 
      status: "success", 
      message: "Aetna token acquired and stored. You can now fetch patient data.",
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope
    }), { 
      status: 200, 
      headers: { "content-type": "application/json; charset=UTF-8" } 
    });

  } catch (e) {
    return new Response(`Aetna token exchange error: ${e.message}`, { status: 500 });
  }
}

/**
 * Fetch patient data from Aetna API
 * @param {URL} url - Request URL with resource and id parameters
 * @param {Object} env - Cloudflare Workers environment
 * @returns {Promise<Response>} - Response with FHIR data or error
 */
export async function fetchAetnaData(url, env) {
  const resourceType = url.searchParams.get("resource");
  const resourceId = url.searchParams.get("id");

  if (!resourceType) {
    return new Response("Missing resource parameter (e.g., ?resource=MedicationRequest)", { status: 400 });
  }

  // Get stored Aetna token
  const authDataStr = await env.MYCARETHREAD_KV.get("aetna:auth:current");
  if (!authDataStr) {
    return new Response("No Aetna authentication found. Please complete OAuth flow first.", { status: 401 });
  }

  const authData = JSON.parse(authDataStr);
  
  // Check if token expired
  if (Date.now() > authData.expiresAt) {
    return new Response("Aetna token expired. Please re-authenticate.", { status: 401 });
  }

  try {
    const baseUrl = "https://api.aetna.com/v2/patientaccess";
    const apiUrl = resourceId 
      ? `${baseUrl}/${resourceType}/${resourceId}`
      : `${baseUrl}/${resourceType}`;

    const response = await fetch(apiUrl, {
      method: "GET",
      headers: {
        "Authorization": `Bearer ${authData.accessToken}`,
        "Accept": "application/fhir+json",
        "Content-Type": "application/fhir+json"
      }
    });

    if (!response.ok) {
      const errorText = await response.text();
      return new Response(`Aetna API error (${response.status}): ${errorText}`, { status: response.status });
    }

    const data = await response.json();
    
    // Store the fetched data
    const storageKey = resourceId 
      ? `aetna:${resourceType}:${resourceId}`
      : `aetna:${resourceType}:all`;
    
    await env.MYCARETHREAD_KV.put(storageKey, JSON.stringify({
      fetchedAt: new Date().toISOString(),
      resourceType,
      resourceId: resourceId || null,
      data: data
    }));

    return new Response(JSON.stringify({
      status: "success",
      resourceType,
      resourceId: resourceId || "all",
      fetchedAt: new Date().toISOString(),
      totalResults: data.total || (Array.isArray(data.entry) ? data.entry.length : 1),
      storedAt: storageKey,
      data: data
    }), {
      status: 200,
      headers: { "content-type": "application/json; charset=UTF-8" }
    });

  } catch (e) {
    return new Response(`Aetna data fetch error: ${e.message}`, { status: 500 });
  }
}

/**
 * Check Aetna authentication status
 * @param {Object} env - Cloudflare Workers environment
 * @returns {Promise<Response>} - Response with auth status
 */
export async function checkAetnaAuthStatus(env) {
  const authDataStr = await env.MYCARETHREAD_KV.get("aetna:auth:current");
  
  if (!authDataStr) {
    return new Response(JSON.stringify({ 
      authenticated: false,
      message: "No Aetna authentication found"
    }), {
      status: 200,
      headers: { "content-type": "application/json; charset=UTF-8" }
    });
  }

  const authData = JSON.parse(authDataStr);
  const isExpired = Date.now() > authData.expiresAt;
  
  return new Response(JSON.stringify({
    authenticated: !isExpired,
    expiresAt: authData.expiresAt,
    expiresIn: Math.max(0, authData.expiresAt - Date.now()),
    scope: authData.scope,
    tokenType: authData.tokenType,
    acquiredAt: authData.acquiredAt
  }), {
    status: 200,
    headers: { "content-type": "application/json; charset=UTF-8" }
  });
}

/**
 * Initiate Aetna OAuth flow (if needed for standalone launch)
 * @param {URL} url - Request URL
 * @param {Object} env - Cloudflare Workers environment
 * @returns {Promise<Response>} - Redirect to Aetna authorization
 */
export async function initiateAetnaAuth(url, env) {
  const CLIENT_ID = env.AETNA_CLIENT_ID;
  const REDIRECT_URI = `${url.origin}/aetna-callback`;
  const SCOPE = "patient/Patient.read patient/MedicationRequest.read patient/Condition.read patient/ExplanationOfBenefit.read patient/Coverage.read patient/DocumentReference.read";
  const STATE = crypto.randomUUID();

  // Store state for callback validation
  await env.MYCARETHREAD_KV.put(`aetna:state:${STATE}`, JSON.stringify({ 
    initiatedAt: new Date().toISOString() 
  }), { expirationTtl: 300 });

  const authUrl = new URL("https://api.aetna.com/oauth2/auth/v2");
  authUrl.searchParams.set("response_type", "code");
  authUrl.searchParams.set("client_id", CLIENT_ID);
  authUrl.searchParams.set("redirect_uri", REDIRECT_URI);
  authUrl.searchParams.set("scope", SCOPE);
  authUrl.searchParams.set("state", STATE);

  return Response.redirect(authUrl.toString(), 302);
}
