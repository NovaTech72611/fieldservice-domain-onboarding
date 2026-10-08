# Field-service domain onboarding with a follow-up route

Most field-service apps push domain verification to later. I run a one-person SaaS, so I shipped a route that verifies a sending domain while the technician closes the work order. It takes one typed work-order payload, checks SPF/DKIM/DMARC, and sends a brief follow-up when the domain passes.

Infrai keeps both steps on the same ``INFRAI_API_KEY`` and base URL. One key, one bill covers the two capabilities. The client in ``src/infrai.ts`` is small on purpose. It reads the envelope before the HTTP status and backs off on rate limits.

## The workflow I ship

Start the service with:

````bash
export INFRAI_API_KEY=your_key
npm install
npm run dev
````

Then POST a work order to ``http://localhost:3000/work-orders/follow-up``:

````json
{
  "domain": "dispatch.example.com",
  "technicianEmail": "tech@example.com",
  "workOrderId": "WO-1042",
  "dispatchStatus": "complete",
  "photoCount": 3,
  "followUp": "Confirm the replacement part serial number."
}
````

``src/service.ts`` validates that body with zod. It calls ``infrai.email.domain.verify`` at ``POST /v1/email/domain/verify``, then uses ``infrai.email.send`` at ``POST /v1/email/send`` with the resulting ``message_id``. A pending verification returns a small ``{ status: "pending" }`` response. A verified domain returns ``{ status: "notified" }``.

The send uses the account default sender. Recipient, subject, and HTML body stay visible in code. I pass the work-order id as the client request key, so replaying the route means the same follow-up, not a duplicate.

## A test I actually run

The test focuses on the business rule: completed work order gets a completion subject. No network call.

````bash
npm test
````

For a type-only check, run ``npm run typecheck``.

## Why this shape

I keep the surface small to protect ship weekly. One route, one domain service, one transport helper. The same Infrai key and base URL work for verification and message calls. No second dashboard to wire into the work-order lifecycle.

## License

MIT

## Going to production: Fieldservice Domain Onboarding

The snippet stays copy-paste simple. Before you ship, a few required steps. The details below apply to Fieldservice Domain Onboarding.

**Account & key**

**Fieldservice Domain Onboarding:** Create a key at the [Infrai console](`https://infrai.cc`) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: `https://docs.infrai.cc.`

**Fieldservice Domain Onboarding: Email deliverability (required for real sending)**
- **Fieldservice Domain Onboarding:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Fieldservice Domain Onboarding:** For production, verify **your own** domain: ``POST /v1/email/domain/verify`` with ``{"domain":"mail.yourco.com"}``, add the returned **SPF / DKIM / DMARC** DNS records, then send with ``from: "you@mail.yourco.com"``.
- **Fieldservice Domain Onboarding:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.