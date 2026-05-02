const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
export class AdminClaimFunctionError extends Error {
    code;
    constructor(code, message) {
        super(message);
        this.code = code;
    }
}
export function validateAdminEmail(email) {
    return emailPattern.test(email.trim());
}
export function buildNextAdminClaims(existingClaims, remove) {
    const nextClaims = {
        ...(existingClaims ?? {}),
    };
    if (remove) {
        delete nextClaims.admin;
        return Object.keys(nextClaims).length > 0 ? nextClaims : null;
    }
    nextClaims.admin = true;
    return nextClaims;
}
export function assertAdminCaller(auth) {
    if (auth?.token?.admin === true) {
        return;
    }
    throw new AdminClaimFunctionError("permission-denied", "Only admins can manage admin users.");
}
function mapGatewayError(error) {
    const code = typeof error === "object" && error !== null && "code" in error
        ? String(error.code)
        : null;
    if (code === "auth/user-not-found") {
        return new AdminClaimFunctionError("not-found", "No Firebase Auth user exists for that email.");
    }
    return new AdminClaimFunctionError("internal", "Unable to update the admin claim right now.");
}
export async function executeAdminClaimChange({ auth, email, gateway, remove, }) {
    assertAdminCaller(auth);
    const normalizedEmail = email.trim().toLowerCase();
    if (!validateAdminEmail(normalizedEmail)) {
        throw new AdminClaimFunctionError("invalid-argument", "Enter a valid email address.");
    }
    try {
        const user = await gateway.getUserByEmail(normalizedEmail);
        const nextClaims = buildNextAdminClaims(user.customClaims, remove);
        await gateway.setCustomUserClaims(user.uid, nextClaims);
        return {
            admin: !remove,
            email: user.email?.trim().toLowerCase() || normalizedEmail,
            ok: true,
        };
    }
    catch (error) {
        throw mapGatewayError(error);
    }
}
