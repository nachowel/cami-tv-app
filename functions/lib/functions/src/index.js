import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { HttpsError, onCall } from "firebase-functions/https";
import { onSchedule } from "firebase-functions/v2/scheduler";
import { getFirestore } from "firebase-admin/firestore";
import { AdminClaimFunctionError, executeAdminClaimChange, } from "./adminClaimFunctions.js";
import { createScheduledPrayerTimeSyncHandler, SCHEDULED_PRAYER_TIME_SYNC_SCHEDULE, SCHEDULED_PRAYER_TIME_SYNC_TIME_ZONE, } from "./scheduledPrayerTimeSync.js";
const adminApp = getApps()[0] ?? initializeApp();
function createAuthGateway() {
    const auth = getAuth(adminApp);
    return {
        async getUserByEmail(email) {
            const userRecord = await auth.getUserByEmail(email);
            return {
                customClaims: userRecord.customClaims,
                email: userRecord.email ?? null,
                uid: userRecord.uid,
            };
        },
        setCustomUserClaims(uid, claims) {
            return auth.setCustomUserClaims(uid, claims);
        },
    };
}
function toCallableAuthContext(request) {
    if (!request.auth) {
        return null;
    }
    return {
        token: request.auth.token,
        uid: request.auth.uid,
    };
}
function getEmailFromRequest(request) {
    if (typeof request.data === "object" &&
        request.data !== null &&
        "email" in request.data &&
        typeof request.data.email === "string") {
        return request.data.email;
    }
    return "";
}
function toHttpsError(error) {
    if (error instanceof AdminClaimFunctionError) {
        return new HttpsError(error.code, error.message);
    }
    return new HttpsError("internal", "Unable to update the admin claim right now.");
}
async function handleAdminClaimChange(request, remove) {
    try {
        return await executeAdminClaimChange({
            auth: toCallableAuthContext(request),
            email: getEmailFromRequest(request),
            gateway: createAuthGateway(),
            remove,
        });
    }
    catch (error) {
        throw toHttpsError(error);
    }
}
export const grantAdminClaim = onCall(async (request) => {
    return handleAdminClaimChange(request, false);
});
export const removeAdminClaim = onCall(async (request) => {
    return handleAdminClaimChange(request, true);
});
export const scheduledPrayerTimeSync = onSchedule({
    schedule: SCHEDULED_PRAYER_TIME_SYNC_SCHEDULE,
    timeZone: SCHEDULED_PRAYER_TIME_SYNC_TIME_ZONE,
}, createScheduledPrayerTimeSyncHandler({
    db: getFirestore(adminApp),
}));
