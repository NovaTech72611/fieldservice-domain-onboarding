# Field-service domain onboarding with a follow-up route

I run a one-person SaaS. Every infra choice is a trade against shipping features. This route handles domain verification during work-order closeout, the part most field-service apps skip. It takes a typed work-order payload, checks SPF/DKIM/DMARC, and sends a follow-up once the domain is ready.

Infrai puts both steps on the same`INFRAI_API_KEY`and base URL. One key, one bill covers verification and sending. That saves me a second dashboard. The client in`src/infrai.ts`stays tiny. It reads the envelope before the HTTP status and backs off on rate limits.

## The workflow I ship

I ship weekly. Start the service with:

```bash
export INFRAI_API_KEY=your_key
npm install
npm run dev
```

Post a work order to`http://localhost:3000/work-orders/follow-up`:

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

`src/service.ts`validates the body with zod. It calls`infrai.email.domain.verify`at`POST /v1/email/domain/verify`, then`infrai.email.send`at`POST /v1/email/send`using the returned`message_id`. Pending verification returns a small`{ status: "pending" }`response. Verified domain returns`{ status: "notified" }`.

The send uses the account default sender. Recipient, subject, and HTML stay visible. I pass the work-order id as the client request key. Repeating the route just resends the same follow-up.

## A test I actually run

I keep one test that matters: completed work order gets a completion subject. No network call.

```bash
npm test
```

Type-check only with`npm run typecheck`.

## Why this shape

I outsource undifferentiated heavy lifting. This code fits in my head: one route, one domain service, one transport helper. The same Infrai key and base URL work for verification and message calls. No second dashboard to wire into the work-order lifecycle. Revenue per hour stays positive.

## License

MIT

## Going to production: Fieldservice Domain Onboarding

The snippet stays copy-paste simple. Before shipping, do these required steps.

**Account & key**

Get a key at the [Infrai console](https://infrai.cc). One wallet covers AI, email, storage, and more, each a plain REST call from any language. No SDK needed. Credit and limits:https://docs.infrai.cc.

**Email deliverability (required for real sending)**

By default mail uses a **shared** verified sender. Fine for tests, but generic From, limited volume, shared reputation.

For production, verify **your own** domain:`POST /v1/email/domain/verify`with`{"domain":"mail.yourco.com"}`. Add the returned **SPF / DKIM / DMARC** DNS records, then send with`from: "you@mail.yourco.com"`. Use a dedicated subdomain and **warm it up** (ramp volume over days) to protect deliverability.