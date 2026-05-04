# Awqat Salah Prayer Times Inspect

## Running the workflow

1. Open the repository `Actions` tab.
2. Select `Awqat Salah Prayer Times Inspect`.
3. Click `Run workflow`.
4. Wait for the manual job to finish.

This workflow is `workflow_dispatch` only. It is not scheduled.

## CLI usage

Daily inspection is always fetched for locked city `14096 / LONDRA`.

Optional monthly inspection:

```text
node --experimental-strip-types scripts/prayerTimes/inspectAwqatSalahPrayerTimes.ts --monthly
```

## Expected output

The script prints a short sanitized summary only:

- city id / city name
- Daily response summary
- optional Monthly response summary
- payload type and item count
- candidate date/prayer keys with sample values

It does not print credentials, tokens, or the full raw response payload.

## What to review manually

Use the output to identify the real Awqat field names for:

- date
- fajr / sabah
- sunrise / gunes
- dhuhr / ogle
- asr / ikindi
- maghrib / aksam
- isha / yatsi

This phase is inspection-only. It does not design or write the final Firestore mapper.
