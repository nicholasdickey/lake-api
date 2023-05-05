//./lib/fetchQueue.js
import { getRedisClient } from "../redis"
import innerFunctionMix2 from "./inner-function-mix";
import scanReacts from "./scan-reacts";
import buildNewslineKey from "./build-newsline-key";
import { l, chalk, js } from '../common';
/*
type,
newsline,
forum,

tag,
firstid,
lastid,
page,
sessionid,
countonly,
userslug,
test
*/
const port = process.env.QWIKETAPIPORT ? process.env.QWIKETAPIPORT : "8088";
const api = process.env.QWIKETAPI ? process.env.QWIKETAPI : "dr.qwiket.com";
export async function fetchQueue({
    type,
    newsline,
    forum,
    tag,
    solo,
    firstid,
    lastid,
    page,
    debug,
    sessionid,
    userslug,
    countonly,
    qwiketid,
    size,
    tail,
    test,
    threadid,
    redis
}) {
    if (type == 'tag')
        type = 'feed';
    let channel = newsline || forum;
    let homeChannel = forum;
    const shortname = tag;
    const identity = userslug;

    if (newsline == 'qwiket')
        newsline = 'usconservative';
    if (!size)
        size = type == 'hot' ? 9 : type == 'newsline' ? 4 : 4;

    //  const redis = await getRedisClient({});
    if (!redis)
        return {
            success: false,
            msg: "Unable to create redis"
        }

    if (channel.indexOf("test") >= 0) {
        test = 1;
    }

    if (!forum) {
        forum = homeChannel;
        redis.set("homeChannel-forum-" + homeChannel, forum);
    }
   

    let active = false;
    let prefix = debug ? "atids-" : "tids-";
    let testPrefix = "";
    if (test) {
        testPrefix = 'test-';
        prefix = `test-${prefix}`;
    }

    let prefixThread = debug ? "{atjson}-" : `${test ? "" : ""}ntjson-`;

    if (type == "drafts") prefixThread = "draft-";
    let firstId = 0;
    let lastId = 0;
    let selectedId = 0;
    let originalLastid = +lastid;

    /**
     *
     * Translate from threadid to xid
     */
    // l("cont")
    if (lastid) {
        if (type == "reacts" || type == "mix") {
            //// console.log("!!!");
            if (lastid == "0") lastid = 0;
            const w = typeof lastid === "string" ? lastid.split(":") : [lastid];

            if (w[1]) {
                if (w[1] == homeChannel) lastid = 17;
                //magic xid
                else {
                    const nlastid = await redis.get("txid-" + w[1]);
                    if (nlastid) lastid = nlastid;
                }
            } else {
                const kk = "pjson-" + lastid;
                const pj = await redis.get("pjs{on-" + lastid);
                let lpj;
                try {
                    lpj = JSON.parse(pj);
                } catch (x) {
                    console.log(x);
                }
                const nlastid = lpj ? lpj.xid : 0;
                if (nlastid) lastid = nlastid;
            }
            if (firstid) {
                const w =
                    typeof firstid === "string"
                        ? firstid.split(":")
                        : [firstid];
                if (w[1]) {
                    if (w[1] == homeChannel) firstid = 17;
                    //magic xid
                    else firstid = await redis.get("txid-" + w[1]);

                } else {
                    const kk = "pjson-" + lastid;
                    const pj = await redis.get("pjson-" + firstid);

                    let lpj;
                    try {
                        lpj = JSON.parse(pj);
                    } catch (x) {
                        console.log(x);
                    }
                    firstid = lpj ? lpj.xid : 0;
                }
            }
        } else {
            if (lastid == homeChannel) lastid = 17;
            else lastid = +(await redis.get("txid-" + lastid));

            if (firstid) {

                if (firstid == homeChannel) firstid = 17;
                else firstid = +(await redis.get("txid-" + firstid));
            }
        }
    }

    /**
     * Legacy, default channel used to be usconservative
     */
    if (lastid == channel) lastid = 0;
    if (channel == "qwiket") channel = "usconservative";

    /**
     *
     * Setup the keys
     *
     */
    let key = null;
    let sn = shortname ? shortname : homeChannel;
    const empty = async () => {
        let ss = shortname || channel;
        if (lastId || page)
            return {
                success: true,
                lastid: 0,
                type,
                items: [],
            };

        const url = `http://${api}:${port}/api?task=fetch_default_topic&shortname=${ss}&XDEBUG_SESSION_START=1`;
        let response = await fetch(url);
        if (!response) {
            return {
                success: false,
                msg: `No newsline, feed or user exists:${ss}`,
            };
        }
        try {
            let json = await response.json();
            if (!json) {
                return {
                    success: false,
                    msg: `No newsline, feed or user exists:${ss}`,
                };
            }

            return {
                success: true,
                type,
                lastid: sn,
                items: [{ item: json.topic }],
            };
        } catch (x) {
            return {
                success: false,
                msg: `No newsline, feed or user exists:${sn}`,
            };
        }
    };
    let cpath = await redis.get("cat-" + sn);

    switch (type) {
        case "newsline":
            key = `${prefix}cat-published-${channel}`;
            break;
        case "topics":
            key = "disq-tids-" + forum;
            break;
        case "mix":
            key = `${prefix}news-views`;// debug ? "atids-news-views" : "tids-news-views";
            break;
        case "hot":
            key = `${prefix}newsline-shared-${channel}`//"tids-newsline-shared-" + channel;
            break;
        case "qwiket-comments":
            key = "qwiket-children-" + qwiketid;
            firstId = lastid;
            lastId = page;
            selectedId = size;
        // eslint-disable-line no-fallthrough
        case "feed":
            key = `${prefix}cat-published-${shortname}`;//"tids-cat-published-" + shortname;
            break;
        case "reacts":
            key = "lpxids-" + forum;
            break;
        case "dq":
            key = "dq-" + shortname;
            break;
        case "allq":
            key = "allq-" + shortname;
            break;
        case "drafts":
            key = "drafts-" + shortname;
            break;
        case "favs":
            key = "favs-" + shortname;
            break;
    }
    /**
     * Setup the newsline
     */
    switch (type) {
        case "hot":
        case "newsline":
        case "mix":
            try {
                if (solo == 1) {
                    key = `tids-cat-published-${tag}`;
                }
                else {
                    const newslineKey = await buildNewslineKey({ newsline, userslug, sessionid, redis, threadid });
                    if (!newslineKey || newslineKey == "") {
                        return { success: false, msg: "empty newsline1" };
                    }
                    await redis.zadd(
                        `${testPrefix}2l-tids`,
                        (Date.now() / 1000) | 0,
                        newslineKey
                    );
                    redis.setex(newslineKey, 3600 * 24, 1);
                    let suffix = "-published";
                    if (type == "mix" || type == "hot"||newsline.indexOf('rss-')>=0) {
                        suffix = "-shared";
                    }
                    key = `${prefix}${newslineKey}${suffix}`;
                    let l2 = await redis.zcard(key);

                    if (!l2) {
                        let rrr = newslineKey.split(':').map(d => {
                            return `${prefix}cat${suffix}-${d}`;
                        });
                        if (!rrr || rrr.length == 0) {
                            return await empty(); // return { success: true, lastid: 0, type: type, items: [] };
                        }
                        await redis.zunionstore(
                            key,
                            rrr.length,
                            rrr,
                            "aggregate",
                            "min"
                        );
                        redis.expire(key, 3600 * 24);
                    }
                }
                if (type == "newsline" || type == "hot") {
                    return await innerFunctionNewsline(key, "");
                } else {
                    return await innerFunctionMix2({ newslineKey: key, lastid, forum, redis, page, size, tail, countonly })
                }
            } catch (x) {
                console.log("EXCEPTION", x);
                return { success: false, msg: x };
            }
        case "reacts":
            if (!lastid || (+lastid == 0 && lastid.search(":") < 0)) {
                active = true;
                lastid = 0;
                return await scanReacts({ reactsKey: key, lastid, forum, redis, threadid, page, size, countonly })// innerFunctionReacts();
            } else {
                return await scanReacts({ reactsKey: key, lastid, forum, redis, threadid, page, size, countonly })///return innerFunctionReacts();
            }
        case "feed":
        case "topics":
        case "dq":
        case "allq":
        case "drafts":
        case "favs":
            return await innerFunctionNewsline(key, "");
        case "qwiket-comments": {
            let commentsCount = 0;
            let commentStack = [];
            let commentsActive = false;
            async function recurseQwiketComments(
                key,
                level,
                orTopic,
                rootId,
                dir,
                targetId
            ) {
                // eslint-disable-line no-inner-declarations
                if (level == 0 && !targetId) {
                    commentsActive = true;
                }

                let v = await redis.get("qwiket-nochildren-" + rootId);
                let promises = [];

                if (v == 1) {

                    return orTopic;
                }
                v = await redis.exists(key);

                if (!v) {
                    const url = `http://${api}:${port}/api?task=fetch_qwiket_children&qwiketid=${qwiketid}&channel=${channel}`;

                    let response = await fetch(url);
                    let json = await response.json();

                    v = await redis.exists(key);

                    if (!v) {
                        return orTopic;
                    }
                    promises.push(
                        new Promise(async (resolve, reject) => {
                            f(level, rootId);
                            l(">updating key", {
                                oldkey: key,
                                key: "qwiket-children-" + rootId,
                            });
                            return await innerFunctionNewsline(
                                "qwiket-children-" + rootId,
                                resolve,
                                reject,
                                "qwiket-children",
                                forum
                            );
                        })
                    );
                    let vls = await Promise.all(promises);
                    let promises2 = [];

                    vls.forEach(v => {
                        const parsedV = v; //JSON.parse(v);
                        parsedV.forEach(pp => {
                            const vo = pp.item;

                            promises2.push(
                                recurseQwiketComments(
                                    "qwiket-children-" + vo["threadid"],
                                    level + 1,
                                    vo,
                                    vo["threadid"],
                                    dir,
                                    targetId
                                )
                            );
                        });
                    });
                    let prs = await Promise.all(promises);
                    let comments = [];
                    prs.forEach(t => {
                        comments.push(t.rtopic);
                    });
                    orTopic.qcComments = comments;
                    return orTopic;
                }
                promises.push(
                    new Promise(async (resolve, reject) => {
                        return await innerFunctionNewsline(
                            "qwiket-children-" + rootId,
                            resolve,
                            reject,
                            "qwiket-children",
                            forum
                        );
                    })
                );
                let vls = await Promise.all(promises);
                let promises2 = [];
                vls.forEach(v => {
                    const parsedV = v;
                    parsedV.forEach(pp => {
                        const vo = pp.item;
                        promises2.push(
                            recurseQwiketComments(
                                "qwiket-children-" + vo["threadid"],
                                level + 1,
                                vo,
                                vo["threadid"],
                                dir,
                                targetId
                            )
                        );
                        // }
                    });
                });
                let prs = await Promise.all(promises2);
                let comments = [];
                prs.forEach(t => {
                    comments.push(t);
                });
                orTopic.qcChildren = comments;
                return orTopic;
            }

            const dir = +lastId != 0 ? 1 : +firstId != 0 ? -1 : 0;
            const targetId = +firstId || +lastId || +selectedId;
            let o = await recurseQwiketComments(
                key,
                0,
                {},
                qwiketid,
                dir,
                targetId
            );
            const ts = (new Date().getTime() / 1000) | 0;
            return {
                success: true,
                rootId: qwiketid,
                type: type,
                items: o.qcChildren,
                firstId: 0,
                lastId: 0,
                timestamp: ts,
            };
        }
    }

    async function innerFunctionNewsline(key, debugStr) {
        let start = page * size;
        let preKey = test ? "" : "";
        if (!debugStr) debugStr = '"nodebug"';
        let runThread = Math.random() * 1000000;
        let chunkRange = async function (start, end) {
            const k5656 = key;
            let range = await redis.zrevrange(k5656, start, end);
            lastid = lastid > 0 ? lastid : range[0] ? +range[0] : 0;
            /**
             * xlate back to threadid
             */
            if (lastid) {
                const ntjson = await redis.get(`${preKey}ntjson-${lastid}`);
                let nlastid;
                try {
                    const o1 = JSON.parse(ntjson);
                    nlastid = o1.threadid;
                } catch (x) {
                    console.log(chalk.green("HANDLED EXCEPTION 029:"), x);
                }

                if (nlastid) lastid = nlastid;
            }
            let keys = range.filter(k => k);
            keys = keys.map(k => {
                let pre = prefixThread;
                if (k.indexOf(":") > 0) {
                    const w = k.split(":");
                    if (w[0] == "postid") {
                        //this is id, not xid
                        pre = test ? "pjson-" : "pjson-";
                        k = w[1];
                    } else {
                        if (w[0] == "notif") {
                            pre = test ? "notif-" : "notif-";
                            k = w[1];
                        }
                    }
                }
                return prefixThread + k;
            });

            if (!keys || keys.length == 0) {
                return await empty();
            }

            let jsons = await redis.mget(keys);
            let items = [];
            let itemsStr = "[";
            let v = 0;
            let good = true;
            let removes = [];

            var missingNtjsons = [];
            for (var j = 0; j < keys.length; j++) {
                const strJson = jsons[j];
                if (!strJson || strJson == "null") {

                    missingNtjsons.push(
                        new Promise(async (resolve, reject) => {
                            const n = j;
                            const url =
                                type == "drafts"
                                    ? `http://${api}:${port}/api?task=fetcDraft&key=${keys[j]}`
                                    : `http://${api}:${port}/api?task=fetchNtjson&key=${keys[j]}`;

                            let response = await fetch(url);
                            let json = await response.text();
                            return resolve({ j: n, json });
                        })
                    );
                }
            }
            let badjsons = await Promise.all(missingNtjsons);
            badjsons.forEach(p => {
                jsons[p.j] = p.json;
            });
            for (let j = 0; j < keys.length; j++) {
                if (v) itemsStr += ",";

                const strJson = jsons[j];
                if (!strJson || strJson.length < 16) continue;
                let thread_url = '""';
                let item = JSON.parse(strJson);

                item.body = "";
                let isStickie =
                    [0, 9, 100, 109].indexOf(item.reshare) >= 0 ? true : false;
                if (!item.reshare) isStickie = true;
                if (item.reshare == 100) isStickie = true;

                if (
                    isStickie ||
                    item.identity == identity ||
                    type == "drafts" ||
                    type == "dq" ||
                    type == "allq" ||
                    type == "favs" ||
                    type == "hot"
                ) {
                    items.push({
                        thread_url,
                        item,
                    });
                }
                itemsStr +=
                    '{"thread_url":' +
                    thread_url +

                    "," +
                    '"item":' +
                    strJson +
                    "}";
                v = 1;
            }
            itemsStr += "]";
            let litems;
            if (items.length > size) litems = items.slice(0, size);
            else litems = items;
            if (type == "qwiket-comments") {
                return { success: true, type, items };
            } else {
                return {
                    success: true,
                    lastid: originalLastid || lastid,
                    type,
                    items: litems,
                };
            }
        };

        if (!lastid || lastid == 0) {
            if (countonly) {
                return { success: true, newItems: 0 };
            }
            return chunkRange(+start, +start + +size - 1);
        } else {

            try {
                let range = await redis.zrevrange(key, 0, 100);
                if (range && (range.length > 0)) {
                    for (var i = 0; i < 100; i++) {
                        if (+range[i] == lastid) {
                            if (countonly) {
                                return { success: true, newItems: i };
                            }
                            lastid = originalLastid; //to return the original
                            break;
                        }
                    }
                }
                if (i == 100) {
                    start = +page * +size;
                } else {
                    start = i + +page * +size;
                }
                if (countonly) {
                    return { success: true, newItems: start };
                }
                return chunkRange(+start, +start + +size - 1);
            } catch (x) {
                l(chalk.red.bold("EXCEPTION:"), x);
                return { success: false, msg: x };
            }
        }
    } // END: innerFunction
}
