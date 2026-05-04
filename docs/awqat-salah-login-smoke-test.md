# Awqat Salah Login Smoke Test

## GitHub secrets

Add these repository secrets before running the smoke test workflow:

- `AWQAT_SALAH_USERNAME`
- `AWQAT_SALAH_PASSWORD`

In GitHub:

1. Open the repository.
2. Go to `Settings` > `Secrets and variables` > `Actions`.
3. Add both secrets with the credentials issued for the Awqat Salah API account.

## Running the workflow

1. Open the repository `Actions` tab.
2. Select `Awqat Salah Login Smoke Test`.
3. Click `Run workflow`.
4. Wait for the single manual job to finish.

This workflow is `workflow_dispatch` only. It is not scheduled.

## Expected successful output

The workflow logs should include only safe confirmation lines:

```text
Awqat Salah login succeeded
Token received: yes
Refresh token received: yes
```

`Refresh token received: no` is also valid if the API returns only an access token.

The workflow must never print the username, password, access token, refresh token, or the full raw authentication response.
