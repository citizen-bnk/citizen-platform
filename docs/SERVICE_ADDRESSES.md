# One place to maintain Citizen service addresses

Edit only `config/services.production.json` for routine address changes. It contains public addresses and Vercel project IDs, never credentials.

`node scripts/publish-service-addresses.mjs` validates and previews every derived setting. `node scripts/publish-service-addresses.mjs --apply` synchronises all five Vercel projects using a securely supplied `VERCEL_TOKEN`. An authorised operator can apply the same generated plan through the connected Vercel API. Then publish the reviewed commits for all affected projects; Next.js public settings and API rewrites are build-time values.

This publisher stops on errors. It does not silently publish applications with partially updated settings. The mapping retains service paths, the separate Core API and Hub-owned profile/identity services. New trust domains, signing-key changes, authentication issuer changes and passkey origins need separate review. Existing enrolled passkeys are bound to their original domain and cannot be moved by changing a URL.

## Target runtime architecture

Move this same public services object into one team-owned Vercel Global Config store and connect every application using `@vercel/global-config`. Server-side `serviceURL(name,path)` and a safe public configuration endpoint/context should read it at runtime. Replace static Core rewrites with a streaming server proxy so Core address updates also take effect without rebuilds. Never expose the configuration read credential, database addresses or signing secrets in the browser. Validate approved owned origins, preserve paths, use a short bounded cache and retain the last validated configuration on transient read failures.

Global Config is not provisioned or connected by this change. The current versioned registry/publisher makes updates a single edit plus a coordinated release. The runtime upgrade removes that release requirement once all consumers are converted. A shared package or NEXT_PUBLIC variables alone cannot make already deployed static bundles update at runtime.

Website: https://citizenbank.co.ls
Hub: https://hub.citizenbank.co.ls
Internet Banking: https://banking.citizenbank.co.ls
Mobile App: https://app.citizenbank.co.ls
Core: https://citizenbankcore-demo.vercel.app (no custom Core domain is assigned in Vercel).
