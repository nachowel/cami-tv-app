import type { AwqatSalahCityDetail, AwqatSalahPlace } from "./awqatSalahClient.ts";

export interface AwqatCityCandidate {
  city: AwqatSalahPlace;
  country: AwqatSalahPlace;
  detail?: AwqatSalahCityDetail;
  state?: AwqatSalahPlace;
}

export interface AwqatCityDiscoveryShortlist {
  bestMatch: AwqatCityCandidate | null;
  fallbackCandidates: AwqatCityCandidate[];
  preferredMatchFound: boolean;
}

const EXACT_LONDON_TARGETS = new Set(["LONDON", "LONDRA"]);
const WORD_BOUNDARY_LONDON_TARGETS = new Set(["LONDON", "LONDRA"]);
const PREFERRED_BEXLEY_TARGETS = new Set(["BEXLEY"]);

export function normalizeAwqatSearchText(value: string) {
  return value
    .trim()
    .toLocaleUpperCase("tr-TR")
    .replace(/İ/g, "I")
    .replace(/I/g, "I")
    .replace(/Ğ/g, "G")
    .replace(/Ü/g, "U")
    .replace(/Ş/g, "S")
    .replace(/Ö/g, "O")
    .replace(/Ç/g, "C")
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .replace(/[^A-Z0-9]+/g, " ")
    .trim();
}

function normalizeText(value: string) {
  return normalizeAwqatSearchText(value);
}

function getNormalizedWordTokens(value: string) {
  const normalized = normalizeText(value);

  return normalized.length > 0
    ? normalized.split(/\s+/)
    : [];
}

function compareNames(left: string, right: string) {
  return left.localeCompare(right, "en-GB", { numeric: true });
}

function getCountryMatchScore(country: AwqatSalahPlace) {
  const name = normalizeText(country.name);

  if (name === "INGILTERE") {
    return 450;
  }

  if (name === "INGILIZTERE") {
    return 430;
  }

  if (name === "UNITED KINGDOM") {
    return 400;
  }

  if (name === "GREAT BRITAIN") {
    return 375;
  }

  if (name === "UK") {
    return 350;
  }

  if (name === "ENGLAND") {
    return 300;
  }

  if (name.includes("UNITED KINGDOM")) {
    return 250;
  }

  if (name.includes("GREAT BRITAIN")) {
    return 225;
  }

  if (name.includes("INGILTERE") || name.includes("INGILIZTERE")) {
    return 215;
  }

  if (name.includes("ENGLAND")) {
    return 200;
  }

  return 0;
}

function getCityCandidateTier(candidate: AwqatCityCandidate) {
  const cityName = normalizeText(candidate.city.name);
  const tokens = getNormalizedWordTokens(candidate.city.name);

  if (EXACT_LONDON_TARGETS.has(cityName)) {
    return 0;
  }

  if (tokens.some((token) => WORD_BOUNDARY_LONDON_TARGETS.has(token))) {
    return 1;
  }

  if (tokens.some((token) => PREFERRED_BEXLEY_TARGETS.has(token))) {
    return 2;
  }

  return 3;
}

function compareCandidates(left: AwqatCityCandidate, right: AwqatCityCandidate) {
  const leftTier = getCityCandidateTier(left);
  const rightTier = getCityCandidateTier(right);

  if (leftTier !== rightTier) {
    return leftTier - rightTier;
  }

  const cityNameComparison = compareNames(left.city.name, right.city.name);

  if (cityNameComparison !== 0) {
    return cityNameComparison;
  }

  const leftStateName = left.state?.name ?? "";
  const rightStateName = right.state?.name ?? "";
  const stateComparison = compareNames(leftStateName, rightStateName);

  if (stateComparison !== 0) {
    return stateComparison;
  }

  return left.city.id - right.city.id;
}

export function matchAwqatCountryCandidates(countries: AwqatSalahPlace[]) {
  return countries
    .map((country) => ({
      country,
      score: getCountryMatchScore(country),
    }))
    .filter((entry) => entry.score > 0)
    .sort((left, right) => {
      if (left.score !== right.score) {
        return right.score - left.score;
      }

      return compareNames(left.country.name, right.country.name);
    })
    .map((entry) => entry.country);
}

export function buildAwqatCityDiscoveryShortlist(
  candidates: AwqatCityCandidate[],
  maxFallbackCandidates = 10,
): AwqatCityDiscoveryShortlist {
  const sorted = [...candidates].sort(compareCandidates);
  const preferredCandidates = sorted.filter((candidate) => getCityCandidateTier(candidate) < 3);

  if (preferredCandidates.length === 0) {
    return {
      bestMatch: null,
      fallbackCandidates: sorted.slice(0, maxFallbackCandidates),
      preferredMatchFound: false,
    };
  }

  return {
    bestMatch: preferredCandidates[0] ?? null,
    fallbackCandidates: sorted
      .filter((candidate) => candidate !== preferredCandidates[0])
      .slice(0, maxFallbackCandidates),
    preferredMatchFound: true,
  };
}

export function filterAwqatCityCandidatesForDebugSearch(
  candidates: AwqatCityCandidate[],
  patterns: string[],
) {
  const normalizedPatterns = patterns
    .map((pattern) => normalizeText(pattern))
    .filter((pattern) => pattern.length > 0);

  return candidates.filter((candidate) => {
    const normalizedCityName = normalizeText(candidate.city.name);
    return normalizedPatterns.some((pattern) => normalizedCityName.includes(pattern));
  });
}
