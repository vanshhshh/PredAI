# Kubernetes Production Notes

Required before apply:

1. Replace image digest placeholders in:
- `frontend.yaml`
- `backend.yaml`
- `ai.yaml`

2. Create secrets:
- `backend-secrets`
- `ai-secrets`
- `backup-secrets`

3. Create config maps:
- `backend-config`
- `frontend-config`
- `ai-config`

4. Provision TLS secrets referenced by `ingress.yaml`:
- `app-moltmarket-tls`
- `api-moltmarket-tls`
- `ai-moltmarket-tls`

5. Deploy backup and alert resources:
- `backup-cronjob.yaml`
- `alerts-prometheusrule.yaml`
