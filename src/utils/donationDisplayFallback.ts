export interface TitleFallbackInput {
  titleLine1?: string | null;
  titleLine2?: string | null;
  headline?: string | null;
}

export function resolveDonationTitleLines(input: TitleFallbackInput): { titleLine1: string; titleLine2: string } {
  const headlineTrimmed = input.headline?.trim() ?? "";
  const titleLine1 = (input.titleLine1 || "DONATE").toUpperCase();
  const titleLine2 = (
    input.titleLine2
    || (headlineTrimmed && headlineTrimmed.toUpperCase() !== "DONATE" ? headlineTrimmed : "")
    || "HERE TODAY"
  ).toUpperCase();
  return { titleLine1, titleLine2 };
}
