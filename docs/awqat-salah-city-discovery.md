# Awqat Salah City Discovery

## Running the workflow

1. Open the repository `Actions` tab.
2. Select `Awqat Salah City Discovery`.
3. Click `Run workflow`.
4. Wait for the manual job to finish.

This workflow is `workflow_dispatch` only. It is not scheduled.

## Expected output

The workflow prints a safe shortlist only:

- best match first when a London/Bexley candidate is found
- then up to 10 fallback candidates
- each candidate includes `cityId`, `cityName`, `stateId`, `stateName`, `countryId`, and `countryName`

If no UK/England country candidate is found, the workflow fails with a clear safe error.

If login succeeds but no London/Bexley candidate is found, the workflow prints fallback candidates and states that no preferred match was found.

The workflow must never print credentials, tokens, or raw auth responses.

## Choosing the final cityId

Use the shortlist for human review only. Prefer:

1. Exact `London`
2. City names containing `London`
3. `Bexley`-related candidates
4. Remaining same-country/state fallbacks

Do not auto-save or auto-select the `cityId` from this phase. The chosen value should be recorded manually for the next implementation phase.
