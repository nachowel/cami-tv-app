import type { AwqatSalahPrayerTimePayload } from "./awqatSalahClient.ts";
import { normalizeAwqatSearchText } from "./awqatSalahCityDiscovery.ts";

type InspectionValue = string | number | boolean | null | undefined;

const INSPECTION_CANDIDATE_GROUPS = [
  { label: "candidate date keys", patterns: ["DATE", "TARIH", "GREGORIAN", "HIJRI", "ISO"] },
  { label: "candidate fajr/sabah keys", patterns: ["FAJR", "SABAH", "IMSAK"] },
  { label: "candidate sunrise/gunes keys", patterns: ["SUNRISE", "GUNES"] },
  { label: "candidate dhuhr/ogle keys", patterns: ["DHUHR", "OGLE"] },
  { label: "candidate asr/ikindi keys", patterns: ["ASR", "IKINDI"] },
  { label: "candidate maghrib/aksam keys", patterns: ["MAGHRIB", "AKSAM"] },
  { label: "candidate isha/yatsi keys", patterns: ["ISHA", "YATSI"] },
] as const;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function describePayloadType(value: unknown) {
  if (Array.isArray(value)) {
    return "array";
  }

  if (isRecord(value)) {
    return "object";
  }

  if (value === null) {
    return "null";
  }

  return typeof value;
}

function toPrintableValue(value: unknown): string {
  if (
    typeof value === "string"
    || typeof value === "number"
    || typeof value === "boolean"
    || value == null
  ) {
    return String(value);
  }

  if (Array.isArray(value)) {
    return `[array:${value.length}]`;
  }

  if (isRecord(value)) {
    return "[object]";
  }

  return `[${typeof value}]`;
}

function toSampleEntry(key: string, value: InspectionValue | unknown) {
  return `${key}=${toPrintableValue(value)}`;
}

function getSampleRecord(payload: AwqatSalahPrayerTimePayload) {
  if (Array.isArray(payload)) {
    return payload.find((item) => isRecord(item)) ?? null;
  }

  return isRecord(payload) ? payload : null;
}

function findCandidateEntries(record: Record<string, unknown>, patterns: readonly string[]) {
  return Object.entries(record)
    .filter(([key]) => {
      const normalizedKey = normalizeAwqatSearchText(key);
      return patterns.some((pattern) => normalizedKey.includes(pattern));
    })
    .map(([key, value]) => toSampleEntry(key, value));
}

export function summarizeAwqatPrayerTimePayload(
  label: string,
  payload: AwqatSalahPrayerTimePayload,
) {
  const sampleRecord = getSampleRecord(payload);
  const lines = [
    `${label} response summary`,
    `payloadType: ${describePayloadType(payload)}`,
  ];

  if (Array.isArray(payload)) {
    lines.push(`itemCount: ${payload.length}`);
  }

  if (!sampleRecord) {
    lines.push("sampleRecordType: unavailable");
    return lines;
  }

  lines.push(`sampleRecordType: object`);
  lines.push(`sampleRecordKeyCount: ${Object.keys(sampleRecord).length}`);

  for (const group of INSPECTION_CANDIDATE_GROUPS) {
    const entries = findCandidateEntries(sampleRecord, group.patterns);
    lines.push(`${group.label}: ${entries.length > 0 ? entries.join(", ") : "none"}`);
  }

  return lines;
}
