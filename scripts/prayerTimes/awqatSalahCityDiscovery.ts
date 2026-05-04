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

function normalizeText(value: string) {
  return value
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .trim();
}

function compareNames(left: string, right: string) {
  return left.localeCompare(right, "en-GB", { numeric: true });
}

function getCountryMatchScore(country: AwqatSalahPlace) {
  const name = normalizeText(country.name);

  if (name === "united kingdom") {
    return 400;
  }

  if (name === "uk") {
    return 350;
  }

  if (name === "england") {
    return 300;
  }

  if (name.includes("united kingdom")) {
    return 250;
  }

  if (name.includes("england")) {
    return 200;
  }

  return 0;
}

function getCityCandidateTier(candidate: AwqatCityCandidate) {
  const cityName = normalizeText(candidate.city.name);

  if (cityName === "london") {
    return 0;
  }

  if (cityName.includes("london")) {
    return 1;
  }

  if (cityName.includes("bexley")) {
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
