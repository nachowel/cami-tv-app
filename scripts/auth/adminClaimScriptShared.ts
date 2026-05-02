export interface AdminClaimArguments {
  email: string | null;
  help: boolean;
  remove: boolean;
}

interface BuildAdminClaimUpdateOptions {
  existingClaims: Record<string, unknown> | undefined;
  remove: boolean;
}

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateAdminClaimEmail(email: string) {
  return emailPattern.test(email.trim());
}

export function parseAdminClaimArguments(args: string[]): AdminClaimArguments {
  const emailFlagIndex = args.findIndex((argument) => argument === "--email");
  const email =
    emailFlagIndex >= 0 && emailFlagIndex < args.length - 1
      ? args[emailFlagIndex + 1] ?? null
      : null;

  return {
    email,
    help: args.includes("--help"),
    remove: args.includes("--remove"),
  };
}

export function buildAdminClaimUpdate({
  existingClaims,
  remove,
}: BuildAdminClaimUpdateOptions) {
  const nextClaims: Record<string, unknown> = {
    ...(existingClaims ?? {}),
  };

  if (remove) {
    delete nextClaims.admin;
    return Object.keys(nextClaims).length > 0 ? nextClaims : null;
  }

  nextClaims.admin = true;
  return nextClaims;
}
