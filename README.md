# n8n-nodes-attestify

**[Attestify](https://attestify.novadyne.ai) is an API to create verifiable certificates with a
public verify page** — and this verified [n8n](https://n8n.io) community node issues them from any
workflow. Each certificate gets a **permanent, tamper-evident public verification page** that
anyone — an employer, a licensing board, the recipient themselves — can check in two clicks,
with no account and no app.

Unlike PDF or image certificate generators, whose output anyone can edit or photoshop, an
Attestify certificate is backed by an **Ed25519-signed server-side record**: change one character
and verification fails.

- **Free, no signup, no API key** — the node ships with zero credentials.
- **Permanent public verify page** per certificate (`verify_url` in the node output).
- **Ed25519-signed record** (`signed_record_url`) verifiable against Attestify's published public key.
- **Recipient PII stays on your side** — email is never stored in the signed record or shown publicly.

Use it to turn any completion event in your workflow (a course finished, a webinar attended, a
CEU earned) into a real certificate plus a verify URL you can drop into your completion emails,
LMS, or spreadsheet.

[n8n community nodes documentation »](https://docs.n8n.io/integrations/community-nodes/)

## Which kind of "certificates"? (not SSL/TLS)

"Certificates" in n8n can mean two unrelated things:

- **SSL/TLS (X.509) certificates** — securing servers. This node does **not** issue those; n8n has
  no ACME/CA issuance node, and TLS issuance is normally handled outside n8n (Let's Encrypt via
  Traefik/Caddy/certbot, or a private CA such as step-ca).
- **Completion / award / credential certificates** — course completions, CE credits, webinar
  attendance, achievements. **That is what this node issues**: a verifiable certificate with a
  permanent public verify page.

n8n's template library also has certificate-generator workflows (Google Slides, PDF services,
image APIs). Those produce a **static PDF/PNG** — fine as a keepsake, but anyone can edit one.
Use this node when the certificate needs to be **checkable**: it returns a permanent `verify_url`
backed by an Ed25519-signed server record, instead of (or alongside) a static file.

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

## New to Attestify? How to vet this node (trust & provenance)

A fair question for any young community node. Every trust fact below is independently checkable —
none requires taking our word for it:

- **n8n-verified node.** This is not just an install-by-name npm package: it passed the n8n team's
  verification review and is listed in the in-app node browser (including n8n Cloud) as a
  [verified community node](https://docs.n8n.io/integrations/community-nodes/).
- **npm build provenance.** Releases are published from GitHub Actions via npm Trusted Publishing
  (OIDC), so every version on [npm](https://www.npmjs.com/package/n8n-nodes-attestify) carries a
  **provenance attestation** tying it to the exact public source commit and build run. No
  maintainer-held publish token exists.
- **Open source.** This repo is the entire node (MIT); the API it wraps is plain, documented HTTP.
- **You don't have to trust Attestify's server.** Each certificate's `signed_record_url` returns
  the canonical record and its Ed25519 signature; the public key is published at
  [`/.well-known/attestation-key`](https://attestify.novadyne.ai/.well-known/attestation-key).
  Verify any certificate yourself, offline:

  ```python
  import json, base64, urllib.request
  from cryptography.hazmat.primitives.asymmetric.ed25519 import Ed25519PublicKey

  def fetch(url):
      req = urllib.request.Request(url, headers={"User-Agent": "cert-verify-example"})
      return json.load(urllib.request.urlopen(req))

  rec = fetch("https://attestify.novadyne.ai/cert/c/<CERT_ID>.json")   # signed_record_url
  key = fetch("https://attestify.novadyne.ai/.well-known/attestation-key")
  pub = Ed25519PublicKey.from_public_bytes(base64.b64decode(key["public_key_base64"]))
  pub.verify(base64.b64decode(rec["signature_b64"]), rec["canonical"].encode())
  print("valid")  # raises InvalidSignature if even one character was altered
  ```

  This is the difference between **cryptographic tamper-evidence** and a hosted lookup page that
  merely says "found": a lookup only proves a record exists in the vendor's database; a signature
  proves the record's *content* is exactly what was issued, checkable by anyone, forever.

## Example

`Schedule/Webhook → (your LMS "course completed" rows) → Attestify (Issue) → Gmail (send verify_url)`

## Tutorial

Step-by-step walkthrough of the underlying API (works with or without n8n — plain HTTP, curl/Python/JS):
**[How to issue verifiable completion certificates programmatically — free API + public verify page](https://dev.to/novadynehq/how-to-issue-verifiable-completion-certificates-programmatically-free-api-public-verify-page-4j4l)**

## License

[MIT](LICENSE) · Built by [Novadyne](https://novadyne.ai). Feedback welcome — it's early.
