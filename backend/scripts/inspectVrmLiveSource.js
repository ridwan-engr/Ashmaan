import "dotenv/config";

import vrmApiClient from "../services/vrm/apiClient.js";

const TARGET_SITE_ID = 18053;

const response = await vrmApiClient.get(
    `/users/${process.env.VRM_USER_ID}/installations`,
    {
        params: {
            extended: 1,
        },
    }
);

const payload = response.data;

const installations =
    Array.isArray(payload?.records)
        ? payload.records
        : Array.isArray(payload?.data?.records)
            ? payload.data.records
            : Array.isArray(payload?.installations)
                ? payload.installations
                : Array.isArray(payload)
                    ? payload
                    : [];

console.log("==============================================");
console.log("ASHMAAN VRM LIVE SOURCE DISCOVERY");
console.log("==============================================");
console.log("Target site:", TARGET_SITE_ID);
console.log("Installations returned:", installations.length);

const site = installations.find((installation) => {
    const candidate =
        installation.idSite ??
        installation.idsite ??
        installation.siteId ??
        installation.id;

    return Number(candidate) === TARGET_SITE_ID;
});

if (!site) {
    console.error(
        `FAIL: VRM site ${TARGET_SITE_ID} was not found in the extended installation list.`
    );

    process.exitCode = 1;
} else {
    const portalId =
        site.identifier ??
        site.portalId ??
        site.portal_id ??
        site.vrmPortalId ??
        site.vrm_portal_id ??
        null;

    const mqttHost =
        site.mqtt_host ??
        site.mqttHost ??
        null;

    const mqttWebHost =
        site.mqtt_webhost ??
        site.mqttWebhost ??
        null;

    console.log("");
    console.log("Site ID:", TARGET_SITE_ID);
    console.log(
        "Portal ID:",
        portalId ?? "NOT FOUND"
    );
    console.log(
        "MQTT host:",
        mqttHost ?? "NOT FOUND"
    );
    console.log(
        "MQTT web host:",
        mqttWebHost ?? "NOT FOUND"
    );

    console.log("");
    console.log(
        "Available non-sensitive keys:"
    );

    console.log(
        Object.keys(site)
            .filter(
                (key) =>
                    !/token|password|secret|credential|authorization/i.test(
                        key
                    )
            )
            .sort()
            .join("\n")
    );

    if (!portalId || !mqttHost) {
        console.error("");
        console.error(
            "FAIL: required live-source identity is incomplete."
        );

        process.exitCode = 1;
    } else {
        console.log("");
        console.log(
            "PASS: VRM live MQTT source identity discovered."
        );
    }
}
