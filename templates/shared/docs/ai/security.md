# Security

Use this file as the canonical security guidance for AI-assisted work.

## Baseline Rules

- Never commit secrets, credentials, tokens, or private keys.
- Treat user input, external data, and generated content as untrusted.
- Prefer established security libraries over custom implementations.
- Avoid logging sensitive data.
- Preserve existing access control checks unless explicitly changing authorization behavior.

## Review Focus

When reviewing or changing code, check for:

- Injection risks.
- Unsafe deserialization.
- Missing authorization checks.
- Overly broad permissions.
- Secret exposure in code, logs, configs, or tests.
- Insecure defaults.
