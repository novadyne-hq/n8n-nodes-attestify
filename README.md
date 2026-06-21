# n8n-nodes-attestify

An [n8n](https://n8n.io) community node that issues **verifiable certificates** with
[Attestify](https://attestify.novadyne.ai). Each certificate gets a permanent,
cryptographically-signed **public verify page** that anyone — an employer, a licensing board,
the recipient themselves — can check, without trusting a PDF that could have been edited.

Use it to turn any completion event in your workflow (a course finished, a webinar attended, a
CEU earned) into a real certificate plus a verify URL you can drop into your completion emails,
LMS, or spreadsheet.

[n8n community nodes documentation »](https://docs.n8n.io/integrations/community-nodes/)

## Installation

Follow the [community-nodes install guide](https://docs.n8n.io/integrations/community-nodes/installation/),
then enter the package name:

```
n8n-nodes-attestify
```

(Self-hosted n8n → **Settings → Community nodes → Install**.)

## Operation

**Certificate → Issue Certificate** — issues one verifiable certificate per input item.

| Field | Description |
|---|---|
| **Organization / Issuer** | Who is issuing the certificate (shown on the cert + verify page). |
| **Course / Credential** | What was completed. |
| **Recipient Name** | The recipient. Defaults to `{{ $json.name }}` so it maps straight from an incoming row. |
| **Recipient Email** *(optional)* | Echoed back so you can join it to the verify URL for a mail-merge. **Never stored in the signed record and never shown on the public verify page** — recipient PII stays on your side. |
| **Options → API Base URL** | Defaults to `https://attestify.novadyne.ai`. Change only for self-hosting/testing. |

### Output (per item)

```json
{
  "cert_id": "…",
  "recipient_name": "Jane Doe",
  "recipient_email": "jane@example.com",
  "course": "4-Hour CE — Ethics",
  "issuer": "Acme Real Estate Academy",
  "verify_url": "https://attestify.novadyne.ai/cert/verify/…",
  "cert_image_url": "https://attestify.novadyne.ai/cert/c/….svg",
  "signed_record_url": "https://attestify.novadyne.ai/cert/c/….json"
}
```

Wire the output into a **Send Email** / Gmail / LMS node to deliver each recipient their
`verify_url`. The `signed_record_url` is the Ed25519-signed record anyone can verify against
Attestify's published public key — change one character in the certificate and verification fails.

## No account, no key

The free Attestify service requires no signup and no API key, so this node ships with no
credentials. A modest per-IP daily issuance cap applies (anti-abuse).

## Example

`Schedule/Webhook → (your LMS "course completed" rows) → Attestify (Issue) → Gmail (send verify_url)`

## License

[MIT](LICENSE) · Built by [Novadyne](https://novadyne.ai). Feedback welcome — it's early.
