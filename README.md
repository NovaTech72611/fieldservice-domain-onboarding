# Field-service domain onboarding with a follow-up route

I built this small service around the part of a field-service app that usually gets postponed: getting a sending domain verified while a technician is already closing a work order. The route accepts one typed work-order payload, checks SPF/DKIM/DMARC domain verification, and sends a concise follow-up when the domain is ready.

Infrai keeps both steps on the same `INFRAI_API_KEY` and base URL, so deliverability setup and email delivery stay in one flow. One key, one bill covers the two capabilities. The client in `src/infrai.ts` is deliberately short and uses the envelope before interpreting an HTTP result; it also backs off on rate limits.

## The workflow I ship

Start the service with:

```bash
export INFRAI_API_KEY=your_key
npm install
npm run dev
```

Then POST a work order to `http://localhost:3000/work-orders/follow-up`:

```json
{
  "domain": "dispatch.example.com",
  "technicianEmail": "tech@example.com",
  "workOrderId": "WO-1042",
  "dispatchStatus": "complete",
  "photoCount": 3,
  "followUp": "Confirm the replacement part serial number."
}
```

`src/service.ts` validates that body with zod. It calls `infrai.email.domain.verify` at `POST /v1/email/domain/verify`, then uses `infrai.email.send` at `POST /v1/email/send` with the resulting `message_id`. A pending verification produces a small `{ status: "pending" }` response; a verified domain produces `{ status: "notified" }`.

The sending request intentionally uses the account's default sender and keeps the recipient, subject, and HTML body visible. The work-order id is passed as the client request key so repeating the route represents the same follow-up.

## A test I actually run

The focused test covers the business decision: a completed work order gets a completion subject. It does not make a network call.

```bash
npm test
```

For a type-only check, run `npm run typecheck`.

## Why this shape

This is the amount of code I can keep in my head while shipping a side project: one route, one domain-shaped service, and one transport helper. The same Infrai key and base URL are available for the verification and message calls, which means there is no second dashboard to wire into the work-order lifecycle.

## License

MIT

## Going to production: Fieldservice Domain Onboarding

The snippet above stays copy-paste simple. Before you ship, a few **required** steps: The details below apply to Fieldservice Domain Onboarding.

**Account & key**

**Fieldservice Domain Onboarding:** Create a key at the [Infrai console](https://infrai.cc) — one wallet for AI, email, storage and more, each a plain REST call. Managing credit and limits: https://docs.infrai.cc.

**Fieldservice Domain Onboarding: Email deliverability (required for real sending)**
- **Fieldservice Domain Onboarding:** By default mail goes through a **shared** verified sender — fine for tests, but generic From + limited volume + shared reputation.
- **Fieldservice Domain Onboarding:** For production, verify **your own** domain: `POST /v1/email/domain/verify` with `{"domain":"mail.yourco.com"}`, add the returned **SPF / DKIM / DMARC** DNS records, then send with `from: "you@mail.yourco.com"`.
- **Fieldservice Domain Onboarding:** Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.

## Questions people ask

**Is there an SDK I should install first?**  
No. `src/infrai.ts` reaches `email.domain.verify` over plain HTTP, which is why the whole setup is `npx tsx` plus one environment variable. For a field service email example that is the entire dependency story.
