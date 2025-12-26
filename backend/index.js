import { XMLParser } from "fast-xml-parser";

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);

    // Simple routing based on path
    if (url.pathname === "/kv-test") {
      const key = "test:message";

      if (request.method === "POST") {
        const value = `Hello from KV at ${new Date().toISOString()}`;
        await env.MYCARETHREAD_KV.put(key, value);

        return new Response(
          JSON.stringify({
            ok: true,
            action: "write",
            key,
            value,
          }),
          {
            status: 200,
            headers: { "content-type": "application/json; charset=UTF-8" },
          },
        );
      }

      if (request.method === "GET") {
        const value = await env.MYCARETHREAD_KV.get(key);

        return new Response(
          JSON.stringify({
            ok: true,
            action: "read",
            key,
            value: value ?? null,
            message: value ? "found" : "no value set yet",
          }),
          {
            status: 200,
            headers: { "content-type": "application/json; charset=UTF-8" },
          },
        );
      }

      return new Response("Method not allowed", { status: 405 });
    }

    if (request.method === "POST" && url.pathname === "/import/metadata") {
      try {
        const content = await request.text();
        if (!content) {
          return new Response("Body empty", { status: 400 });
        }
        // Store the raw metadata XML
        await env.MYCARETHREAD_KV.put("cda:metadata", content);
        return new Response(
          JSON.stringify({ status: "ok", action: "import_metadata", size: content.length }),
          { status: 200, headers: { "content-type": "application/json; charset=UTF-8" } }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
      }
    }

    if (request.method === "POST" && url.pathname === "/import/cda") {
      try {
        const docId = url.searchParams.get("docId");
        if (!docId) {
          return new Response("Missing docId query parameter", { status: 400 });
        }
        const content = await request.text();
        if (!content) {
          return new Response("Body empty", { status: 400 });
        }
        
        // Store the raw CDA XML
        await env.MYCARETHREAD_KV.put(`cda:${docId}`, content);

        // Parse and extract clinical JSON
        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
        const INTERESTING_SECTIONS = {
          "48765-2": "Allergies",
          "10160-0": "Medications",
          "66149-6": "Prescriptions",
          "10183-2": "DischargeMeds",
          "11450-4": "ActiveProblems",
          "11348-0": "ResolvedProblems",
          "11369-6": "Immunizations",
          "8716-3":  "VitalSigns",
          "30954-2": "Results",
          "47519-4": "Procedures",
          "46240-8": "Encounters",
          "18776-5": "PlanOfTreatment",
          "51848-0": "VisitDiagnoses",
          "85847-2": "CareTeams",
          "29299-5": "ReasonForVisit",
          "10164-2": "ProgressNotes"
        };

        let clinicalJson = null;
        try {
          const json = parser.parse(content);
          const cda = json.ClinicalDocument;
          if (cda) {
            const docSummary = {
              id: `cda:${docId}`,
              title: cda.title,
              effectiveTime: cda.effectiveTime?.["@_value"],
              sections: {}
            };

            const structuredBody = cda.component?.structuredBody;
            if (structuredBody?.component) {
              const components = Array.isArray(structuredBody.component) 
                ? structuredBody.component 
                : [structuredBody.component];

              for (const comp of components) {
                if (comp.section && comp.section.code) {
                  const code = comp.section.code["@_code"];
                  const category = INTERESTING_SECTIONS[code];
                  if (category) {
                    docSummary.sections[category] = {
                      title: comp.section.title,
                      text: comp.section.text, 
                      entry: comp.section.entry
                    };
                  }
                }
              }
            }
            clinicalJson = docSummary;
          }
        } catch (parseErr) {
          console.error(`Failed to parse ${docId} for clinical extraction:`, parseErr);
        }

        // Store clinical JSON if extraction succeeded
        if (clinicalJson) {
          await env.MYCARETHREAD_KV.put(`json:${docId}`, JSON.stringify(clinicalJson));
        }

        return new Response(
          JSON.stringify({ 
            status: "ok", 
            action: "import_cda", 
            docId, 
            size: content.length,
            clinicalExtracted: !!clinicalJson,
            sectionCount: clinicalJson ? Object.keys(clinicalJson.sections).length : 0
          }),
          { status: 200, headers: { "content-type": "application/json; charset=UTF-8" } }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
      }
    }

    if (request.method === "POST" && url.pathname === "/build/full-json") {
      try {
        const limitParam = url.searchParams.get("limit");
        const limit = limitParam ? parseInt(limitParam, 10) : 5; // Default to 5 to avoid CPU timeout

        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
        const list = await env.MYCARETHREAD_KV.list({ prefix: "cda:DOC", limit: limit }); // Use KV list limit too
        const docs = [];
        let processedCount = 0;

        for (const key of list.keys) {
          // Double check if we hit the limit manually if pagination was tricky
          if (processedCount >= limit) break;

          const xml = await env.MYCARETHREAD_KV.get(key.name);
          if (xml) {
            try {
              const json = parser.parse(xml);
              docs.push({ id: key.name, data: json });
              processedCount++;
            } catch (parseErr) {
              console.error(`Failed to parse ${key.name}:`, parseErr);
              docs.push({ id: key.name, error: "Parse failed" });
            }
          }
        }

        const summary = {
          generatedAt: new Date().toISOString(),
          count: processedCount,
          totalAvailable: list.keys.length, // approximation if paginated
          documents: docs
        };

        const summaryKey = "summary:full:latest";
        await env.MYCARETHREAD_KV.put(summaryKey, JSON.stringify(summary));

        return new Response(
          JSON.stringify({ status: "ok", action: "build_full_json", count: processedCount, key: summaryKey }),
          { status: 200, headers: { "content-type": "application/json; charset=UTF-8" } }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
      }
    }

    if (request.method === "POST" && url.pathname === "/build/clinical-json") {
      try {
        const limitParam = url.searchParams.get("limit");
        const limit = limitParam ? parseInt(limitParam, 10) : 10;

        const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: "@_" });
        const list = await env.MYCARETHREAD_KV.list({ prefix: "cda:DOC", limit: limit });
        
        const clinicalDocs = [];
        let processedCount = 0;

        // LOINC codes to extract
        const INTERESTING_SECTIONS = {
          "48765-2": "Allergies",
          "10160-0": "Medications",
          "66149-6": "Prescriptions",
          "10183-2": "DischargeMeds",
          "11450-4": "ActiveProblems",
          "11348-0": "ResolvedProblems",
          "11369-6": "Immunizations",
          "8716-3":  "VitalSigns",
          "30954-2": "Results",
          "47519-4": "Procedures",
          "46240-8": "Encounters",
          "18776-5": "PlanOfTreatment",
          "51848-0": "VisitDiagnoses",
          "85847-2": "CareTeams",
          "29299-5": "ReasonForVisit",
          "10164-2": "ProgressNotes"
        };

        for (const key of list.keys) {
          if (processedCount >= limit) break;
          const xml = await env.MYCARETHREAD_KV.get(key.name);
          if (xml) {
            try {
              const json = parser.parse(xml);
              const cda = json.ClinicalDocument;
              if (cda) {
                const docSummary = {
                  id: key.name,
                  title: cda.title,
                  effectiveTime: cda.effectiveTime?.["@_value"],
                  sections: {}
                };

                // Extract sections
                const structuredBody = cda.component?.structuredBody;
                if (structuredBody?.component) {
                  const components = Array.isArray(structuredBody.component) 
                    ? structuredBody.component 
                    : [structuredBody.component];

                  for (const comp of components) {
                    if (comp.section && comp.section.code) {
                      const code = comp.section.code["@_code"];
                      const category = INTERESTING_SECTIONS[code];
                      if (category) {
                        // Keep text (narrative) and entries (structured data)
                        docSummary.sections[category] = {
                          title: comp.section.title,
                          text: comp.section.text, 
                          entry: comp.section.entry
                        };
                      }
                    }
                  }
                }
                clinicalDocs.push(docSummary);
                processedCount++;
              }
            } catch (parseErr) {
              console.error(`Failed to parse ${key.name} for clinical view:`, parseErr);
            }
          }
        }

        const summary = {
          generatedAt: new Date().toISOString(),
          count: processedCount,
          documents: clinicalDocs
        };

        const summaryKey = "summary:clinical:latest";
        await env.MYCARETHREAD_KV.put(summaryKey, JSON.stringify(summary));

        return new Response(
          JSON.stringify({ status: "ok", action: "build_clinical_json", count: processedCount, key: summaryKey }),
          { status: 200, headers: { "content-type": "application/json; charset=UTF-8" } }
        );

      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
      }
    }

    if (request.method === "GET" && url.pathname === "/summary/clinical") {
      try {
        const summary = await env.MYCARETHREAD_KV.get("summary:clinical:latest");
        if (!summary) {
          return new Response(JSON.stringify({ error: "No clinical summary found" }), { status: 404 });
        }
        return new Response(summary, {
          status: 200,
          headers: { "content-type": "application/json; charset=UTF-8" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
      }
    }

    if (request.method === "GET" && url.pathname === "/threads") {
      try {
        const topic = url.searchParams.get("topic");
        if (!topic) {
          return new Response(JSON.stringify({ error: "Missing topic parameter" }), { status: 400 });
        }

        const summaryJson = await env.MYCARETHREAD_KV.get("summary:clinical:latest");
        if (!summaryJson) {
          return new Response(JSON.stringify({ error: "No clinical summary found. Run /build/clinical-json first." }), { status: 404 });
        }

        const summary = JSON.parse(summaryJson);
        const threadEvents = [];
        const lowerTopic = topic.toLowerCase();

        for (const doc of summary.documents) {
          const docDate = doc.effectiveTime; // Fallback date if section specific date is missing
          
          if (doc.sections) {
            for (const [sectionName, sectionData] of Object.entries(doc.sections)) {
              // Naive search: stringify the section data and check for keyword
              const sectionString = JSON.stringify(sectionData).toLowerCase();
              if (sectionString.includes(lowerTopic)) {
                threadEvents.push({
                  date: docDate,
                  type: sectionName,
                  sourceDocId: doc.id,
                  title: doc.title,
                  snippet: sectionData.title, // The section title, e.g. "Allergies"
                  // In a real app, we'd extract specific entries, but for now return the whole section
                  // data: sectionData 
                });
              }
            }
          }
        }

        // Sort by date (descending or ascending? Let's do descending/newest first)
        threadEvents.sort((a, b) => {
          if (a.date < b.date) return 1;
          if (a.date > b.date) return -1;
          return 0;
        });

        return new Response(
          JSON.stringify({
            topic: topic,
            generatedAt: new Date().toISOString(),
            count: threadEvents.length,
            events: threadEvents
          }),
          { status: 200, headers: { "content-type": "application/json; charset=UTF-8" } }
        );

      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
      }
    }

    // --- SMART on FHIR Endpoints ---

    // 1. Launch Endpoint: Initiates the flow
    if (request.method === "GET" && url.pathname === "/launch") {
      const launch = url.searchParams.get("launch");
      const iss = url.searchParams.get("iss");

      if (!launch || !iss) {
        return new Response("Missing launch or iss parameters", { status: 400 });
      }

      // Client ID from env vars
      const CLIENT_ID = env.SMART_CLIENT_ID;
      if (!CLIENT_ID) {
        return new Response("Server configuration error: SMART_CLIENT_ID not set", { status: 500 });
      }

      const REDIRECT_URI = `${url.origin}/callback`;
      const SCOPE = "launch patient/*.read openid fhirUser";
      const STATE = crypto.randomUUID(); 

      // Store the ISS and Launch context in KV with a short expiration (e.g., 5 mins)
      // We use STATE as the key to retrieve this context in the callback
      await env.MYCARETHREAD_KV.put(`auth:state:${STATE}`, JSON.stringify({ iss, launch }), { expirationTtl: 300 });

      try {
         // Fetch metadata to discover authorize endpoint
         const metadataResp = await fetch(`${iss}/metadata?_format=json`);
         if (!metadataResp.ok) throw new Error(`Metadata fetch failed: ${metadataResp.status}`);
         
         const metadata = await metadataResp.json();
         const security = metadata.rest?.[0]?.security;
         const authorizeEndpoint = security?.extension?.find(e => e.url === "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris")?.extension?.find(e => e.url === "authorize")?.valueUri;
         
         if (!authorizeEndpoint) {
            return new Response("Could not find authorize endpoint in conformance statement", { status: 500 });
         }

         const redirectUrl = new URL(authorizeEndpoint);
         redirectUrl.searchParams.set("response_type", "code");
         redirectUrl.searchParams.set("client_id", CLIENT_ID);
         redirectUrl.searchParams.set("redirect_uri", REDIRECT_URI);
         redirectUrl.searchParams.set("launch", launch);
         redirectUrl.searchParams.set("scope", SCOPE);
         redirectUrl.searchParams.set("state", STATE);
         redirectUrl.searchParams.set("aud", iss);

         return Response.redirect(redirectUrl.toString(), 302);
      } catch (e) {
         return new Response(`Failed to initiate SMART launch: ${e.message}`, { status: 500 });
      }
    }

    // 2. Callback Endpoint: Exchanges code for token
    if (request.method === "GET" && url.pathname === "/callback") {
       const code = url.searchParams.get("code");
       const state = url.searchParams.get("state");
       const error = url.searchParams.get("error");
       
       if (error) {
         return new Response(`Auth error: ${error}`, { status: 400 });
       }
       if (!code || !state) {
         return new Response("Missing code or state", { status: 400 });
       }

       // Retrieve context (iss) using state
       const stateDataStr = await env.MYCARETHREAD_KV.get(`auth:state:${state}`);
       if (!stateDataStr) {
         return new Response("Invalid or expired state. Please try launching again.", { status: 400 });
       }
       const { iss } = JSON.parse(stateDataStr);

       // Clean up state
       await env.MYCARETHREAD_KV.delete(`auth:state:${state}`);

       const CLIENT_ID = env.SMART_CLIENT_ID;
       // For public clients (like SPA/mobile), no client_secret is used.
       // But if this is a confidential client (web app), we might need one.
       // Epic usually supports public client for SMART apps or requires a backend service to use private key jwt.
       // For this personal project, let's assume "confidential symmetric" or "public". 
       // If Epic requires a client_secret, we'll need to add it. 
       // Start with NO secret (Public Client) which is common for "Standalone Launch" or verify registration type.
       // NOTE: If you registered as a "Web Application" in Epic, it typically implies a Confidential Client.
       // We'll check env.SMART_CLIENT_SECRET.
       const CLIENT_SECRET = env.SMART_CLIENT_SECRET;

       try {
         // Discover token endpoint
         const metadataResp = await fetch(`${iss}/metadata?_format=json`);
         const metadata = await metadataResp.json();
         const security = metadata.rest?.[0]?.security;
         const tokenEndpoint = security?.extension?.find(e => e.url === "http://fhir-registry.smarthealthit.org/StructureDefinition/oauth-uris")?.extension?.find(e => e.url === "token")?.valueUri;

         if (!tokenEndpoint) {
           return new Response("Could not find token endpoint", { status: 500 });
         }

         // Exchange code for token
         const params = new URLSearchParams();
         params.set("grant_type", "authorization_code");
         params.set("code", code);
         params.set("redirect_uri", `${url.origin}/callback`);
         params.set("client_id", CLIENT_ID);
         if (CLIENT_SECRET) {
            params.set("client_secret", CLIENT_SECRET);
         }

         const tokenResp = await fetch(tokenEndpoint, {
           method: "POST",
           headers: {
             "Content-Type": "application/x-www-form-urlencoded"
           },
           body: params
         });

         const tokenData = await tokenResp.json();

         if (!tokenResp.ok) {
           return new Response(`Token exchange failed: ${JSON.stringify(tokenData)}`, { status: 500 });
         }

         // Store the access token securely in KV (associated with a session or just single user 'current')
         // Since this is single user, we'll just overwrite "auth:current" for now.
         await env.MYCARETHREAD_KV.put("auth:current", JSON.stringify({
            accessToken: tokenData.access_token,
            refreshToken: tokenData.refresh_token,
            patient: tokenData.patient,
            expiresAt: Date.now() + (tokenData.expires_in * 1000),
            iss: iss
         }));

         return new Response(JSON.stringify({ 
           status: "success", 
           patient: tokenData.patient, 
           message: "Token acquired and stored. You can now use the backend to fetch FHIR data." 
         }), { 
           status: 200, 
           headers: { "content-type": "application/json; charset=UTF-8" } 
         });

       } catch (e) {
         return new Response(`Token exchange error: ${e.message}`, { status: 500 });
       }
    }

    if (request.method === "GET" && url.pathname === "/summary/full") {
      try {
        const summary = await env.MYCARETHREAD_KV.get("summary:full:latest");
        if (!summary) {
          return new Response(JSON.stringify({ error: "No full summary found" }), { status: 404 });
        }
        return new Response(summary, {
          status: 200,
          headers: { "content-type": "application/json; charset=UTF-8" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
      }
    }

    // Get individual clinical JSON document
    if (request.method === "GET" && url.pathname.startsWith("/json/")) {
      try {
        const docId = url.pathname.replace("/json/", "");
        if (!docId || docId.includes("/") || docId.includes("\\")) {
          return new Response(JSON.stringify({ error: "Invalid docId" }), { status: 400 });
        }
        
        const jsonData = await env.MYCARETHREAD_KV.get(`json:${docId}`);
        if (!jsonData) {
          return new Response(JSON.stringify({ error: "Document not found" }), { status: 404 });
        }
        
        return new Response(jsonData, {
          status: 200,
          headers: { "content-type": "application/json; charset=UTF-8" }
        });
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
      }
    }

    // Debug endpoint to list keys and count documents (lightweight)
    if (request.method === "GET" && url.pathname === "/debug/keys") {
      try {
        const limit = parseInt(url.searchParams.get("limit") || "1000", 10);
        const prefix = url.searchParams.get("prefix") || "cda:DOC";
        
        const list = await env.MYCARETHREAD_KV.list({ prefix, limit });
        
        return new Response(
          JSON.stringify({
            status: "ok",
            count: list.keys.length,
            prefix: prefix,
            list_complete: list.list_complete,
            keys: list.keys.map(k => k.name)
          }),
          { status: 200, headers: { "content-type": "application/json; charset=UTF-8" } }
        );
      } catch (err) {
        return new Response(JSON.stringify({ error: String(err) }), { status: 500 });
      }
    }

    // Default root handler: simple alive check
    const body = {
      service: "MyCareThread backend",
      status: "alive",
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(body), {
      status: 200,
      headers: {
        "content-type": "application/json; charset=UTF-8",
      },
    });
  },
};
