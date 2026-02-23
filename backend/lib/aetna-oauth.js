// Aetna Patient Access API OAuth Handler


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

  // Check authentication status and ensure we have a valid token
  const authStatusResponse = await checkAetnaAuthStatus(env);
  const authStatus = await authStatusResponse.json();
  
  if (!authStatus.authenticated) {
    return new Response("Failed to authenticate with Aetna", { status: 401 });
  }

  // Use the token from the cache (checkAetnaAuthStatus ensures it's valid)
  const token = tokenCache.accessToken;

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

// In-memory token cache (per worker instance)
let tokenCache = null;

/**
 * Check Aetna authentication status and auto-renew if needed
 * @param {Object} env - Cloudflare Workers environment
 * @returns {Promise<Response>} - Response with auth status and renewal attempts
 */
export async function checkAetnaAuthStatus(env) {
  const now = Date.now();
  
  // Case 1: No token in memory - try to get new one
  if (!tokenCache) {
    try {
      const tokenResponse = await getAetnaClientCredentialsToken(env);
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        tokenCache = {
          accessToken: tokenData.accessToken,
          expiresAt: now + (tokenData.expiresIn * 1000),
          tokenType: tokenData.tokenType,
          scope: tokenData.scope,
          acquiredAt: new Date().toISOString()
        };
        return new Response(JSON.stringify({ 
          authenticated: true,
          message: "Token retrieved successfully",
          action: "new_token_acquired",
          expiresAt: tokenCache.expiresAt,
          expiresIn: tokenCache.expiresIn
        }), {
          status: 200,
          headers: { "content-type": "application/json; charset=UTF-8" }
        });
      } else {
        // Return detailed error information for Aetna support
        const errorData = await tokenResponse.json();
        return new Response(JSON.stringify({ 
          authenticated: false,
          message: "Failed to retrieve new token",
          debug: {
            request: {
              endpoint: "https://api.aetna.com/oauth2/token/v2",
              method: "POST",
              headers: {
                "Authorization": "Basic [REDACTED_CREDENTIALS]",
                "Content-Type": "application/x-www-form-urlencoded",
                "Accept": "application/json"
              },
              body: "grant_type=client_credentials"
            },
            response: {
              status: tokenResponse.status,
              statusText: tokenResponse.statusText,
              body: errorData
            },
            timestamp: new Date().toISOString()
          }
        }), {
          status: 401,
          headers: { "content-type": "application/json; charset=UTF-8" }
        });
      }
    } catch (e) {
      return new Response(JSON.stringify({ 
        authenticated: false,
        message: "Error retrieving new token: " + e.message,
        debug: {
          error: e.message,
          timestamp: new Date().toISOString()
        }
      }), {
        status: 500,
        headers: { "content-type": "application/json; charset=UTF-8" }
      });
    }
  }

  // Case 2: Token exists - check if valid or about to expire
  const timeToExpiry = tokenCache.expiresAt - now;
  const oneMinute = 60 * 1000;
  
  // Token expired - get new one (same logic as no token)
  if (timeToExpiry <= 0) {
    try {
      const tokenResponse = await getAetnaClientCredentialsToken(env);
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        tokenCache = {
          accessToken: tokenData.access_token,
          expiresAt: now + (tokenData.expires_in * 1000),
          tokenType: tokenData.token_type,
          scope: tokenData.scope,
          acquiredAt: new Date().toISOString()
        };
        return new Response(JSON.stringify({ 
          authenticated: true,
          message: "Token retrieved successfully",
          action: "new_token_acquired"
        }), {
          status: 200,
          headers: { "content-type": "application/json; charset=UTF-8" }
        });
      } else {
        return new Response(JSON.stringify({ 
          authenticated: false,
          message: "Failed to retrieve new token"
        }), {
          status: 401,
          headers: { "content-type": "application/json; charset=UTF-8" }
        });
      }
    } catch (e) {
      return new Response(JSON.stringify({ 
        authenticated: false,
        message: "Error retrieving new token: " + e.message
      }), {
        status: 500,
        headers: { "content-type": "application/json; charset=UTF-8" }
      });
    }
  }
  
  // Token about to expire (within 1 minute) - proactively refresh
  if (timeToExpiry <= oneMinute) {
    try {
      const tokenResponse = await getAetnaClientCredentialsToken(env);
      if (tokenResponse.ok) {
        const tokenData = await tokenResponse.json();
        tokenCache = {
          accessToken: tokenData.access_token,
          expiresAt: now + (tokenData.expires_in * 1000),
          tokenType: tokenData.token_type,
          scope: tokenData.scope,
          acquiredAt: new Date().toISOString()
        };
        return new Response(JSON.stringify({ 
          authenticated: true,
          message: "Token renewed before expiry",
          action: "token_proactively_renewed"
        }), {
          status: 200,
          headers: { "content-type": "application/json; charset=UTF-8" }
        });
      } else {
        // Failed to renew, but current token still valid for now
        return new Response(JSON.stringify({
          authenticated: true,
          message: "Token is current and valid (renewal failed)",
          expiresAt: tokenCache.expiresAt,
          expiresIn: timeToExpiry,
          scope: tokenCache.scope,
          tokenType: tokenCache.tokenType,
          acquiredAt: tokenCache.acquiredAt,
          warning: "Renewal attempted but failed"
        }), {
          status: 200,
          headers: { "content-type": "application/json; charset=UTF-8" }
        });
      }
    } catch (e) {
      return new Response(JSON.stringify({
        authenticated: true,
        message: "Token is current and valid (renewal error)",
        expiresAt: tokenCache.expiresAt,
        expiresIn: timeToExpiry,
        scope: tokenCache.scope,
        tokenType: tokenCache.tokenType,
        acquiredAt: tokenCache.acquiredAt,
        warning: "Renewal error: " + e.message
      }), {
        status: 200,
        headers: { "content-type": "application/json; charset=UTF-8" }
      });
    }
  }
  
  // Token is valid and not about to expire
  return new Response(JSON.stringify({
    authenticated: true,
    message: "Token is current and valid",
    expiresAt: tokenCache.expiresAt,
    expiresIn: timeToExpiry,
    scope: tokenCache.scope,
    tokenType: tokenCache.tokenType,
    acquiredAt: tokenCache.acquiredAt
  }), {
    status: 200,
    headers: { "content-type": "application/json; charset=UTF-8" }
  });
}

/**
 * Get Aetna access token using Client Credentials Flow
 * @param {Object} env - Cloudflare Workers environment
 * @returns {Promise<Response>} - Response with token data or error
 */
export async function getAetnaClientCredentialsToken(env) {
  const CLIENT_ID = env.AETNA_CLIENT_ID;
  const CLIENT_SECRET = env.AETNA_CLIENT_SECRET;
  const APP_NAME = env.AETNA_APP_NAME;

  if (!CLIENT_ID || !CLIENT_SECRET || !APP_NAME) {
    return new Response(JSON.stringify({
      status: "error",
      message: "Aetna credentials not configured. Missing: " + 
        (!CLIENT_ID ? "CLIENT_ID " : "") + 
        (!CLIENT_SECRET ? "CLIENT_SECRET " : "") + 
        (!APP_NAME ? "APP_NAME" : "")
    }), { status: 500 });
  }

  try {
    // Get access token using client credentials flow
    const tokenEndpoint = "https://apif1.aetna.com/fhir/v1/fhirserver_auth/oauth2/token";
    
    // Try Basic Auth approach without scope first
    const params = new URLSearchParams();
    params.set("grant_type", "client_credentials");
    params.set("application_name", APP_NAME); // Add app name
    // Try without scope - some APIs don't require it for client credentials
    // params.set("scope", "patient/Patient.read patient/MedicationRequest.read patient/Condition.read patient/ExplanationOfBenefit.read patient/Coverage.read patient/DocumentReference.read");

    const basicAuth = btoa(`${CLIENT_ID}:${CLIENT_SECRET}`);
    // For debugging, create a properly redacted version
    const redactedBasicAuth = "Basic [REDACTED_CREDENTIALS]"; // Don't even encode the redacted version

    console.log("Attempting token exchange with Basic Auth:", {
      endpoint: tokenEndpoint,
      grant_type: "client_credentials",
      client_id: CLIENT_ID.substring(0, 8) + "...",
      client_secret_length: CLIENT_SECRET.length,
      scope: "patient/Patient.read patient/MedicationRequest.read..."
    });

    console.log("Request body:", params.toString());

    const tokenResp = await fetch(tokenEndpoint, {
      method: "POST",
      headers: {
        "Authorization": `Basic ${basicAuth}`,
        "Content-Type": "application/x-www-form-urlencoded",
        "Accept": "application/json"
      },
      body: params
    });

    const responseText = await tokenResp.text();
    console.log("Token response status:", tokenResp.status);
    console.log("Token response body:", responseText);

    let tokenData;
    try {
      tokenData = JSON.parse(responseText);
    } catch (e) {
      // Return detailed error info for debugging
      return new Response(JSON.stringify({
        status: "error",
        message: "Invalid JSON response from Aetna",
        debug: {
          request: {
            endpoint: tokenEndpoint,
            method: "POST",
            headers: {
              "Authorization": `Basic ${redactedBasicAuth}`,
              "Content-Type": "application/x-www-form-urlencoded",
              "Accept": "application/json"
            },
            body: params.toString()
          },
          response: {
            status: tokenResp.status,
            statusText: tokenResp.statusText,
            body: responseText
          },
          timestamp: new Date().toISOString()
        }
      }), { status: 500 });
    }

    if (!tokenResp.ok) {
      // Return detailed error info for Aetna support
      return new Response(JSON.stringify({
        status: "error",
        message: "Aetna token exchange failed",
        debug: {
          request: {
            endpoint: tokenEndpoint,
            method: "POST",
            headers: {
              "Authorization": `Basic ${redactedBasicAuth}`,
              "Content-Type": "application/x-www-form-urlencoded",
              "Accept": "application/json"
            },
            body: params.toString()
          },
          response: {
            status: tokenResp.status,
            statusText: tokenResp.statusText,
            body: tokenData
          },
          timestamp: new Date().toISOString()
        }
      }), { status: 500 });
    }

    // Return token data (caller will handle caching)
    return new Response(JSON.stringify({ 
      status: "success", 
      message: "Aetna client credentials token acquired.",
      accessToken: tokenData.access_token,
      refreshToken: tokenData.refresh_token || null,
      expiresIn: tokenData.expires_in,
      scope: tokenData.scope,
      tokenType: tokenData.token_type
    }), { 
      status: 200, 
      headers: { "content-type": "application/json; charset=UTF-8" } 
    });

  } catch (e) {
    console.log("Token exchange error:", e.message);
    return new Response(JSON.stringify({
      status: "error",
      message: "Aetna client credentials token error: " + e.message
    }), { status: 500 });
  }
}
