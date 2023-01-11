import { getRedisClient } from "./redis.js"
const { l, chalk, apiUrl, logTime, logEnter, proxyParams } = require('./lib');


export async function fetchQueue({
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
}) {
    if (newsline == 'qwiket')
        newsline = 'usconservative';
    let size = type == 'hot' ? 9 : 3;
    let active = false;
    let prefix = "tids-";
    if (test) prefix = "test-tids-";

    const redis = await getRedisClient({});
    if (!redis)
        return {
            success: false,
            msg: "Unable to create redis"
        }

    try {
        let prefixThread = `${test ? "test-" : ''}ntjson-`;

        if (type == 'drafts')
            prefixThread = "draft-";

        let firstId = 0;
        let lastId = 0;
        let selectedId = 0;
        let originalLastid = +lastid;

        /**
         *
         * Translate from threadid to xid
         */

        if (lastid) {
            if (type == "reacts" || type == "mix") {
                //console.log("!!!")
                if (lastid == "0")
                    lastid = 0;
                const w = typeof lastid === "string" ? lastid.split(":") : [lastid];
                // console.log("111", w)
                if (w[1]) {
                    //console.log("pre-xl lastid:", w[1]);
                    /*  if (w[1] == homeChannel)
                          lastid = 17; //magic xid
                      else {*/

                    const nlastid = await redis.get("txid-" + w[1]);
                    if (nlastid)
                        lastid = nlastid;
                    // }
                    //console.log("post-xl lastid:", lastid);
                } else {
                    const kk = "pjson-" + lastid;
                    //console.log("key", { key: kk });
                    const pj = await redis.get("pjson-" + lastid);
                    //console.log("pj", { pj, lastid });
                    let lpj;
                    try {
                        lpj = JSON.parse(pj);
                    } catch (x) {
                        console.log(x);
                    }
                    // console.log("pre-xlpjl lastid:", lpj)
                    const nlastid = lpj ? lpj.xid : 0;
                    if (nlastid)
                        lastid = nlastid;
                    // console.log("post-lpj lastid:", lastid);
                }
                if (firstid) {
                    const w = typeof firstid === "string" ? firstid.split(":") : [firstid];
                    //  console.log("111")
                    if (w[1]) {
                        // console.log("pre-xl lastid:", w[1])
                        /* if (w[1] == homeChannel)
                             firstid = 17; //magic xid
                         else*/
                        firstid = await redis.get("txid-" + w[1]);
                        // console.log("post-xl lastid:", lastid);
                    } else {
                        const kk = "pjson-" + lastid;
                        // console.log("key", { key: kk })
                        const pj = await redis.get("pjson-" + firstid);
                        // console.log("pj", { pj, lastid })
                        let lpj;
                        try {
                            lpj = JSON.parse(pj);
                        } catch (x) {
                            console.log(x);
                        }
                        //   console.log("pre-xlpjl lastid:", lpj)
                        firstid = lpj ? lpj.xid : 0;
                        //  console.log("post-lpj lastid:", lastid)
                    }
                }
            } else {
                // console.log("pre-xl lastid:", lastid)
                /*if (lastid == homeChannel)
                    lastid = 17; //magic xid
                else*/
                lastid = +(await redis.get("txid-" + lastid));
                //console.log("post-xl lastid:", lastid);
                if (firstid) {
                    // console.log("pre-xl firstid:", firstid)
                    /*if (firstid == homeChannel)
                        firstid = 17; //magic xid
                    else*/
                    firstid = +(await redis.get("txid-" + firstid));
                    // console.log("post-xl firstid:", firstid)
                }
            }
        }

        //  console.log(chalk.green.bold("++++++++++++++++++++++++++++=================>"));

        /**
         * Legacy, default channel used to be usconservative
         */
        // if (channel == "qwiket") channel = "usconservative";
        /**
         *
         * Setup the keys
         *
         */
        let key = null;
        let tail;
        const identity = userslug || sessionid;
        //let sn = shortname ? shortname : homeChannel;
        let ss = tag || newsline;
        const empty = async () => {

            //  console.log("empty", { lastId, page })
            if (lastId || page)
                return {
                    success: true,
                    lastid: 0,
                    type,
                    items: []
                };
            const defaultTopic = {
                title: 'Nothing posted yet',
                description: 'This is a brand new feed',
                reshare: 109,
                published_time: 1672414397,
                shared_time: 1672414397,
                threadid: ss

            }
            return {
                success: true,
                type,
                lastid: ss,
                items: [{ item: defaultTopic }]
            }
        }
        //console.log(chalk.green.bold("###>>> ", JSON.stringify({ api, port, sn, type }, null, 4)))
        let cpath = await redis.get("cat-" + ss);
        //  console.log("cpath:", { cpath, ss });
        //console.log("lastid:", lastid)

        switch (type) {
            case "newsline":
                key = `tids-newsline-published-${newsline}`
                break;
            case "topics":
                key = `disq-tids-${forum}`;
                break;
            case "mix":
                key = `tids-news-views`;
               // console.log("MIX", key)
                break;
            case "hot":
                key = `tids-newsline-shared-${newsline}`;
                break;
            case "qwiket-comments":
                key = "qwiket-children-" + qwiketid;
                firstId = lastid;
                lastId = page;
                selectedId = size;
            // eslint-disable-line no-fallthrough
            case "tag":
                key = `tids-cat-published-${tag}`
                break;
            case "reacts":
                key = `lpxids-${forum}`;
                break;
        }
        //  console.log("KEY:", key)
        /**
         * Setup the newsline
         */
        switch (type) {
            case "hot":
            case "newsline":
            case "mix":
                try {
                    let channelCats = await redis.smembers("newsline-" + newsline);
                    if (!channelCats || channelCats.length == 0) {
                        console.log("DEBUG1")
                        return await empty();//return { success: true, lastid: "0", type, items: [] };
                    }
                    let personalNewslineKey = userslug ? `newsline-${newsline}-${userslug}` : sessionid ? `newsline-${newsline}-${sessionid}` : null;

                    let userCats
                    if (personalNewslineKey)
                        userCats = await redis.smembers(personalNewslineKey);
                    if (!userCats || userCats.length == 0 || type == "hot") {
                        userCats = channelCats;
                    }
                    userCats.sort();
                    let newslineKey = userCats.join(":");
                    if (!newslineKey || newslineKey == "") {
                        return { success: false, msg: "empty newsline1" };
                    }
                    await redis.zadd("2l-tids", (Date.now() / 1000) | 0, newslineKey);
                    redis.setex(newslineKey, 3600 * 24, 1);

                    let suffix = "-published";
                    if (type == "mix" || type == "hot") {
                        suffix = "-shared";
                    }
                    key = prefix + newslineKey + suffix;
                    // console.log("inside--- , key=", key)
                    let l2 = await redis.zcard(key);
                    //  console.log("card then")
                    l2 = 0; // to fix temporarity
                    if (!l2) {
                        // console.log("l2 0")
                        //create queue for this newsline for the first time by mergin all (userCats) and store it for the future use in a zset for one day
                        let rrr = userCats.map(d => {
                            return prefix + "cat" + suffix + "-" + d;
                        });
                        if (!rrr || rrr.length == 0) {
                            console.log("DEBUG2")
                            return await empty();// return { success: true, lastid: 0, type: type, items: [] };
                        }
                        await redis.zunionstore(key, rrr.length, rrr, "aggregate", "min");
                        //  console.log("zunionstore then3")
                        redis.expire(key, 3600 * 24);
                    }
                    if (type == "newsline" || type == "hot") {
                        return await innerFunctionNewsline(key, "", forum);
                    } else {
                        // console.log("l2")
                        return innerFunctionMix(key, "", forum);
                    }
                } catch (x) {
                    console.log("EXCEPTION", x);
                    return { success: false, msg: x };
                }
            case "reacts":
                if (!lastid) {
                    active = true;
                    lastid = 0;
                    // console.log(chalk.green.bold("+>"));

                    return innerFunctionReacts();
                } else {
                    //let p = cache.findRange(key, 0, lastid)
                    //console.log("CALLING FIND RANGE key ",key)
                    return innerFunctionReacts();
                }
            case "tag":
            case "topics":
                return await innerFunctionNewsline(key, "", forum);

        }


        async function innerFunctionMix(key, debugStr, forum) {
            let lastCommentTime = "+inf";
            size = 4;
            // console.log("innerFunctionMix entry", { key, active, size, forum, debugStr, lastCommentTime });

            let start = !lastid ? page * size : 0;

            if (!debugStr) debugStr = '"nodebug"';

            let chunkRange = async function (start, end, pt) {
                // console.log("ENTER CHUNK")
                let firstComment = true;
                if (pt) lastCommentTime = pt;
                else lastCommentTime = "+inf";
                const k5656 = key;
                // if (!homeChannel) homeChannel = channel;
                let range = await redis.zrevrange(k5656, start, end);
                //let tail = 0;
                let nolastid = +lastid ? false : true;
                // console.log("db21", { k5656, start, end, lastid, nolastid, range })
                lastid = lastid > 0 ? lastid : range[0] ? +range[0] : 0;
                // console.log("db2", { k5656, start, end, lastid })
                /**
                 * xlate back to threadid
                 **/
                if (lastid) {
                    const ntkey = "ntjson-" + lastid;
                    //  console.log({ ntkey });
                    const ntjson = await redis.get(ntkey);
                    if (ntjson) {
                        let nlastid;
                        try {
                            const o1 = JSON.parse(ntjson);
                            nlastid = o1.threadid;
                            //  console.log("reverse ntjson xlate lastid", { lastid, qwiketid: nlastid })

                        } catch (x) {
                            console.log(chalk.red.bold("EXCEPTION 029:"), x);
                        }
                        // console.log("reverse xlate lastid", { lastid, nlastid, nolastid, originalLastid })
                        if (nolastid) {
                            if (nlastid) lastid = nlastid;
                            lastid = `q:${lastid}`;
                        }
                        else {
                            if (originalLastid)
                                lastid = originalLastid;
                            else {
                                if (nlastid) lastid = nlastid;
                                lastid = `q:${lastid}`;
                            }
                        }
                        //   console.log("LAsT lastid", { lastid })

                    } else {
                        const pjson = await redis.get(`pjson-${forum}-${lastid}`);
                        if (pjson) {
                            // console.log("reverse pjson xlate lastid", { lastid, qwiketid: pjson.id })
                            lastid = pjson.id;
                        }
                    }
                }
                let keys = range.filter(k => k);
                // console.log("keys:", keys)
                keys = keys.map(k => {
                    let pre = prefixThread;
                    if (k.indexOf(":") > 0) {
                        const w = k.split(":");
                        if (w[0] == "postid") {
                            //this is id, not xid
                            pre = "pjson-";
                            k = w[1];
                        } else {
                            if (w[0] == "notif") {
                                //xid
                                pre = "notif-";
                                k = w[1];
                            }
                        }
                    }
                    return prefixThread + k;
                });
                if (!keys || keys.length == 0) {
                    // console.log("DEBUG3");
                    return await empty();
                    // console.log("RESOLVE 0");

                    return { success: true, lastid: 0, type, items: [] };
                }
                //  console.log("MKEYS:", keys);
                let jsons = await redis.mget(keys);
                let countKeys = range.map(k => "{c1ount}-" + forum + "-" + k);

                let countIdentityKeys = range.map(
                    k => "{c1ount}-" + forum + "-" + identity + "-" + k
                );
                let usernameKeys = range.map(k => "{tview}-username-" + k);
                // if(type.indexOf('qwiket-children')>=0)
                // console.log("usernameKeys,:", usernameKeys)
                let counts = await redis.mget(countKeys);
                let identityCounts = await redis.mget(countIdentityKeys);
                //  console.log("1counts", { countKeys, countIdentityKeys, counts, identityCounts })
                let usernames = await redis.mget(usernameKeys);
                //if(type.indexOf('qwiket-children')>=0)
                //  console.log("GOT USERNAMES", { usernames, usernameKeys });
                let d4statusesKeys = usernames.map(
                    k => "qwiket-d4Status-" + forum + "-" + k
                );
                let promises = [];
                usernames.forEach(username => {
                    const d4statusKey = "qwiket-{d4Status}-" + forum + "-" + username;
                    if (username && username != "null")
                        // if(type.indexOf('qwiket-children')>=0)
                        promises.push(
                            new Promise(async (resolve, reject) => {
                                let exists = await redis.exists(d4statusKey);
                                if (!exists) {
                                    // console.log("*** <><><><><><> ", d4statusKey)
                                    const url2 = `http://${api}:${port}/api?task=fetch_d4_status&forum=${forum}&username=${username}`;

                                    // console.log("CALLING API fetch_d4_status ", url2);

                                    let response = await fetch(url2);
                                    let status = await response.text();
                                    redis.setex(d4statusKey, 24 * 3600, status);
                                    return resolve(status);
                                } else {
                                    //  console.log("d4status exists", d4statusKey);
                                    let status = await redis.get(d4statusKey);
                                    //   console.log("d4status exists", { d4statusKey, status });
                                    return resolve(status);
                                }
                            })
                        );
                });
                let r = await Promise.all(promises);
                let d4statuses = await redis.mget(d4statusesKeys);
                let itemsStr = "[";
                let items = [];
                let v = 0;
                let good = true;
                let removes = [];
                // l(chalk.blue.bold('checkpoint'));
                var missingNtjsons = [];
                for (let j = 0; j < keys.length; j++) {
                    const strJson = jsons[j];
                    //console.log("strJson jsons["+j+"]",strJson);
                    if (!strJson || strJson == "null") {
                        //console.log("MISSING NTJSON",keys[j])
                        missingNtjsons.push(
                            new Promise(async (resolve, reject) => {
                                const n = j;
                                const url = type == `http://${api}:${port}/api?task=fetchNtjson&key=${keys[j]
                                    }`;
                                //console.log("CALLING API fetchNtjson ", url);
                                return fetch(url)
                                    .then(response => {
                                        return response.text();
                                    })
                                    .then(json => resolve({ j: n, json }));
                            })
                        );
                    }
                }
                let badjsons = await Promise.all(missingNtjsons);
                // l(chalk.green.bold('call badjsons'), { badjsons });
                // console.log("missing ntjson returned:",badjsons)
                badjsons.forEach(p => {
                    jsons[p.j] = p.json;
                });
                for (let j = 0; j < keys.length; j++) {
                    const strJson = jsons[j];
                    if (!strJson || strJson.length < 12) continue;
                    //console.log('{"count":' + (counts[j] ? counts[j] : 0) + ',"identity_count":' + (identityCounts[j] ? identityCounts[j] : 0) + '}')
                    let count = counts[j];
                    let thread_url = '""';
                    if (count) {
                        let w = count.split("|");
                        count = w[0];
                        thread_url = w[1];
                        if (!thread_url) thread_url = '""';
                    }
                    let identityCount = identityCounts[j];
                    if (identityCount) identityCount = identityCount.split("|")[0];
                    if (!identityCount) identityCount = 0;
                    if (!count) count = 0;
                    let d4status = d4statuses[j];
                    if (!d4status) d4status = '""';
                    if (d4status.indexOf("\n") === 0) d4status = d4status.split("\n")[1];
                    let ojson = JSON.parse(strJson);
                    //itemsStr += '{"thread_url":' + thread_url + ',"d4status":' + d4status + ',"count":' + count + ',"identity_count":' + identityCount + ',' + '"item":' + strJson + '}';
                    //v = 1;

                    let jsonParse = ojson;
                    /* try {
                                 jsonParse = JSON.parse(strJson);
                             }
                             catch (x) {
                                 console.log("EXCEPTION: ", x);
                                 continue;
                             }*/
                    const published_time = jsonParse.shared_time;
                    // console.log("pt:", { published_time, lastCommentTime });
                    let reacts = null;
                    try {
                        reacts = await redis.zrevrangebyscore(
                            "lpxids-" + forum,
                            lastCommentTime == "+inf" ? lastCommentTime : lastCommentTime,
                            published_time
                        );
                    } catch (x) {
                        l(chalk.red.bold("EXCEPTION:"), x);
                    }
                    // console.log("reacts:", { forum, reacts, published_time, lastCommentTime });
                    lastCommentTime = published_time;
                    let zeroCommentKey = 0;
                    let zeroCommentType = "";
                    if (reacts && reacts.length > 0) {
                        const keys = reacts.map((p, i) => {
                            let w;
                            if (p) {
                                w = p.split(":");
                                if (!w[1]) {
                                    const pkye = "pjson-" + forum + "-" + p;
                                    if (i == 0 && firstComment) {
                                        firstComment = false;
                                        zeroCommentKey = pkye;
                                        zeroCommentType = "pjson";
                                        /*
                                                          const pjsn = await redis.get(pkye);
                                                          // console.log("pjsn", { pkye, pjsn })
                                                          if (pjsn) {
                                                              const opj = JSON.parse(pjsn);
                                                              if (opj)
                                                                  tail = opj.createdat;
                        
                                                          } */
                                    }
                                    //  console.log("returning comment key", { pkye });
                                    return pkye;
                                } else {
                                    const pkye = "ntjson-" + w[1];
                                    if (i == 0) {
                                        zeroCommentKey = pkye;
                                        zeroCommentType = "ntjson";
                                        /*  const pjsn = await redis.get(pkye);
                                                            // console.log("ntjsn", { pkye, pjsn })
                                                            if (pjsn) {
                                                                const opj = JSON.parse(pjsn);
                                                                if (opj)
                                                                    tail = opj.published_time;
                                                            } */
                                    }
                                    return pkye;
                                }
                            }
                        });
                        if (zeroCommentKey) {
                            /* console.log(chalk.red.bold("zeroComment"), {
                               zeroCommentKey,
                               zeroCommentType
                             }); */
                            const pjsn = await redis.get(zeroCommentKey);
                            //  console.log("pjsn", { zeroCommentKey, page })
                            if (pjsn && !page) {
                                // console.log("pjsn2", { zeroCommentKey, page })

                                const opj = JSON.parse(pjsn);
                                // console.log("pjsn3", { zeroCommentKey, page })

                                if (opj) {
                                    if (zeroCommentType == "ntjson") tail = opj.shared_time;
                                    else tail = opj.createdat;
                                }
                            }
                        }
                        // console.log("reactKeys", keys);
                        let jsons = await redis.mget(keys);
                        //   console.log("reactJsons", jsons);
                        let countKeys = range.map(k => "{c1ount}-" + forum + "-" + k);

                        let countIdentityKeys = range.map(
                            k => "{c1ount}-" + forum + "-" + identity + "-" + k
                        );
                        let usernameKeys = range.map(k => "{tview}-username-" + k);
                        // if(type.indexOf('qwiket-children')>=0)
                        // console.log("usernameKeys,:",usernameKeys)
                        let counts = await redis.mget(countKeys);
                        let identityCounts = await redis.mget(countIdentityKeys);
                        //  console.log("counts", { counts, identityCounts })
                        let usernames = await redis.mget(usernameKeys);
                        //if(type.indexOf('qwiket-children')>=0)
                        //console.log("GOT USERNAMES",usernames);
                        let d4statusesKeys = usernames.map(
                            k => "qwiket-{d4Status}-" + forum + "-" + k
                        );
                        let promises = [];
                        usernames.forEach(username => {
                            const d4statusKey = "qwiket-{d4Status}-" + forum + "-" + username;
                            if (username && username != "null")
                                // if(type.indexOf('qwiket-children')>=0)
                                promises.push(
                                    new Promise(async (resolve, reject) => {
                                        let exists = await redis.exists(d4statusKey);
                                        if (!exists) {
                                            // console.log("*** <><><><><><> ", d4statusKey)
                                            const url2 = `http://${api}:${port}/api?task=fetch_d4_status&forum=${forum}&username=${username}`;

                                            // console.log("CALLING API fetch_d4_status ", url2);

                                            let response = await fetch(url2);
                                            let status = await response.text();
                                            await redis.setex(d4statusKey, 24 * 3600, status);
                                            return resolve(status);
                                        } else {
                                            let status = await redis.get(d4statusKey);
                                            // console.log("d4status exists", { d4statusKey, status });

                                            return resolve(status);
                                        }
                                    })
                                );
                        });
                        const r = await Promise.all(promises);
                        const d4statuses = await redis.mget(d4statusesKeys);
                        let good = true;
                        let removes = [];
                        let missingNtjsons = [];
                        for (var j1 = 0; j1 < keys.length; j1++) {
                            let strJson = jsons[j1];
                            //console.log("strJson jsons["+j+"]",strJson);
                            if (!strJson || strJson == "null") {
                                //console.log("MISSING NTJSON",keys[j])
                                missingNtjsons.push(
                                    new Promise((resolve, reject) => {
                                        const n = j1;
                                        const url = `http://${api}:${port}/api?task=fetchNtjson&key=${keys[j1]
                                            }&XDEBUG_SESSION_START=vscode`;
                                        console.log("MIX CALLING API fetchNtjson ", url);
                                        return fetch(url)
                                            .then(response => {
                                                return response.text();
                                            })
                                            .then(json => resolve({ j: n, json }));
                                    })
                                );
                            }
                        }
                        const badjsons = await Promise.all(missingNtjsons);
                        // console.log("missing ntjson returned:",badjsons)
                        badjsons.forEach(p => {
                            jsons[p.j] = p.json;
                        });
                        for (var jj = 0; jj < keys.length; jj++) {
                            String.prototype.replaceAll = function (search, replacement) {
                                var target = this;
                                return target.replace(new RegExp(search, "g"), replacement);
                            };
                            const strJson = jsons[jj]; //.replaceAll("http:","https:");
                            if (!strJson || strJson.length < 12) continue;
                            //console.log("strJson:", strJson)
                            //console.log('{"count":'+(counts[j]?counts[j]:0)+',"identity_count":'+(identityCounts[j]?identityCounts[j]:0)+'}')
                            let count = counts[jj];
                            let thread_url = '""';
                            if (count) {
                                let w = count.split("|");
                                count = w[0];
                                thread_url = w[1];
                                if (!thread_url) thread_url = '""';
                            }
                            let identityCount = identityCounts[jj];
                            if (identityCount) identityCount = identityCount.split("|")[0];
                            if (!identityCount) identityCount = 0;
                            if (!count) count = 0;
                            let d4status = d4statuses[jj];
                            if (!d4status) d4status = '""';
                            if (d4status.indexOf("\n") === 0)
                                d4status = d4status.split("\n")[1];

                            let ojson = JSON.parse(strJson);

                            // console.log(chalk.cyan.bold("adding comnt"), ojson.createdat)

                            // console.log("adding item, count=", count);
                            if (v == 1) itemsStr += ",";
                            items.push({
                                thread_url,
                                d4status: JSON.parse(d4status),
                                count,
                                identityCount,
                                item: ojson
                            });
                            itemsStr +=
                                '{"thread_url":' +
                                thread_url +
                                ',"d4status":' +
                                d4status +
                                ',"count":' +
                                count +
                                ',"identity_count":' +
                                identityCount +
                                "," +
                                '"item":' +
                                strJson +
                                "}";
                            v = 1;
                            //console.log("itemsStr:", itemsStr);
                        } //for jsons
                    } //if reacts
                    //   console.log(chalk.magenta.bold("adding story"), ojson.published_time)

                    // if (v == 1)
                    //    itemsStr += ',';
                    // console.log("adding item, j=", j);
                    ojson.body = "";
                    items.push({
                        thread_url,
                        d4status: JSON.parse(d4status),
                        count,
                        identityCount,
                        item: ojson
                    });

                    //  console.log("itemsStr:",itemsStr);
                }

                //   console.log("RRR", { lastid })
                itemsStr += "]";
                //  console.log("RESOLVE 1", itemsStr);
                if (type == "qwiket-comments") {
                    // l("\n", chalk.bold.blue("RESOLVE 2"), ":", JSON.parse(itemsStr));
                    return items;
                } else {
                    let length = 0;
                    let litems;
                    if (items.length > size) litems = items.slice(0, size);
                    else litems = items;
                    /*l("\n", chalk.bold.blue("RESOLVE 3"), {
                      items: litems.length,
                      lastid: originalLastid || lastid,
                      size,
                      tail
                    }); */
                    return {
                        type: "mix",
                        success: true,
                        lastid: lastid,
                        items: items,
                        tail
                    };
                }
            }; //chunk
            let pt = 0;

            if (!lastid || lastid == 0) {
                //console.log("RECURSE 1");
                if (countonly) {
                    return { success: true, newItems: 0 };
                }
                try {
                    if (page) {
                        const rg = await redis.zrevrange(key, start, start);
                        const xidkey = "ntjson-" + rg[0];
                        const json = await redis.get(xidkey);
                        // console.log("JSON FOR LASTID:", { json, xidkey, rg, start });
                        let pto = JSON.parse(json);
                        pt = pto ? +pto.shared_time : "+inf";
                        const b_l = lastid;
                        lastid = pto ? pto.xid : '';

                        if (!b_l && page) {
                            const rg = await redis.zrevrange(key, 0, 0);
                            const xidkey = "ntjson-" + rg[0];
                            const json = await redis.get(xidkey);
                            // console.log("JSON FOR LASTID:", { json, xidkey, rg, start });
                            pto = JSON.parse(json);
                        }
                        originalLastid = 'q:' + pto.threadid;
                    }
                    // l(chalk.green.bold("call chunkRange"), { start, size, pt, lastid });
                    return chunkRange(+start, +start + +size - 1, pt);
                } catch (x) {
                    l(chalk.red("EXCEPTION:"), x);
                    return { success: false };
                }
            } else {
                // console.log("inside recurse setup start=", { start, key });
                const range = await redis.zrevrange(key, +start, +start + 100);
                let i = 0;
                for (i = 0; i < 100; i++) {
                    //console.log("rrr", { r: +range[i], i, start, lastid })
                    if (+range[i] == lastid) {
                        console.log("LASTID FOUND", i);
                        /* if (countonly) {
                                       return { success: true, newItems: i };
                                   }*/
                        // lastid = originalLastid; //to return the original
                        break;
                    }
                }
                if (i == 100) {
                    start = 0;
                    lastid = 0;
                } else start = +start + i + (+page * +size);
                /* if (countonly) {
                           return { success: true, newItems: start };
                       } */
                // console.log("RECURSE 2, start=",start);
                const rg = await redis.zrevrange(key, start, start);
                const xidkey = "ntjson-" + rg[0];
                const json = await redis.get(xidkey);
                //  console.log("JSON FOR LASTID:", { xidkey, rg, start, tail });
                const pto = JSON.parse(json);
                // console.log("after parse", { published_time: pto ? pto.shared_time : '+inf' })
                pt = pto ? +pto.shared_time : "+inf";
                if (!+tail)
                    pt = "+inf";
                if (countonly) {
                    // console.log("LASTID pt=", { pt, tail });

                    if (pt != "+inf" && +tail + 1 > pt) pt = +tail + 1;
                    //  console.log("LASTID after tail pt=", { pt, tail });
                    const reacts = await redis.zrevrangebyscore(
                        "lpxids-" + forum,
                        "+inf",
                        pt == "+inf" ? pt : pt + 1
                    );
                    // console.log("+++++> COUNTONLY ", { start, reacts: reacts.length, newItems: start + reacts.length })
                    return { success: true, newItems: start + reacts.length };
                }
                console.log("CALLING CHUNG RANGE")
                return chunkRange(+start, +start + (+size - 1), pt);
            }
        }
        async function innerFunctionNewsline(key, debugStr, forum) {
            /*console.log("innerFunctionNewsline entry", {
                key,
                lastid,
                active,
                size,
                forum,
                debugStr,
                page,
                countonly
            });*/

            let start = page * size;
            let preKey = test ? "test-" : "";
            if (!debugStr) debugStr = '"nodebug"';

            let chunkRange = async function (start, end) {
                /* console.log(chalk.red.bold("Newsline:"), "ENTER chunkRange", {
                  key,
                  start,
                  end
                });*/
                const k5656 = key;

                let range = await redis.zrevrange(k5656, start, end);
                // console.log(chalk.red.bold("Newsline:"), "After chunkRange", { range });
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
                        console.log(chalk.red.bold("EXCEPTION 029:"), x);
                    }
                    //   console.log("reverse xlate lastid", { lastid, qwiketid: nlastid })

                    if (nlastid) lastid = nlastid;
                }
                let keys = range.filter(k => k);

                keys = keys.map(k => {
                    let pre = prefixThread;
                    if (k.indexOf(":") > 0) {
                        const w = k.split(":");
                        if (w[0] == "postid") {
                            //this is id, not xid
                            pre = test ? "test-pjson-" : "pjson-";
                            k = w[1];
                        } else {
                            if (w[0] == "notif") {
                                //xid
                                pre = test ? "test-notif-" : "notif-";
                                k = w[1];
                            }
                        }
                    }
                    return prefixThread + k;
                });
                //console.log({ keys });
                if (!keys || keys.length == 0) {
                    // console.log("RESOLVE 0");

                    return await empty();
                    //return { success: true, lastid: 0, type, items: [] };
                }
                //console.log("MKEYS:", keys);
                let jsons = await redis.mget(keys);
                let countKeys = range.map(k => "{c1ount}-" + forum + "-" + k);

                let countIdentityKeys = range.map(
                    k => "{c1ount}-" + forum + "-" + identity + "-" + k
                );
                let usernameKeys = range.map(k => "{tview}-username-" + k);
                // if(type.indexOf('qwiket-children')>=0)
                // console.log("usernameKeys,:",usernameKeys)
                let counts = await redis.mget(countKeys);
                let identityCounts = await redis.mget(countIdentityKeys);
                let usernames = await redis.mget(usernameKeys);

                let d4statusesKeys = usernames.map(
                    k => "qwiket-{d4Status}-" + forum + "-" + k
                );
                let promises = [];
                usernames.forEach(username => {
                    const d4statusKey = "qwiket-{d4Status}-" + forum + "-" + username;
                    if (username && username != "null")
                        // if(type.indexOf('qwiket-children')>=0)
                        promises.push(
                            new Promise(async (resolve, reject) => {
                                let exists = await redis.exists(d4statusKey);
                                if (!exists) {
                                    // console.log("*** <><><><><><> ", d4statusKey)
                                    const url2 = `http://${api}:${port}/api?task=fetch_d4_status&forum=${forum}&username=${username}`;

                                    //  console.log("CALLING API fetch_d4_status ", url2);

                                    let response = await fetch(url2);
                                    let status = await response.text();
                                    //  console.log("return API fetch_d4_status ", { status });
                                    await redis.setex(d4statusKey, 24 * 3600, status);
                                    return resolve(status);
                                } else {
                                    //  console.log("==>d4status exists", d4statusKey);
                                    let status = await redis.get(d4statusKey);
                                    if (status.indexOf("\n") === 0) status = status.split("\n")[1];
                                    // console.log("d4status exists1", { d4statusKey, status });
                                    return resolve(status);
                                }
                            })
                        );
                });
                let r = await Promise.all(promises);
                let d4statuses = await redis.mget(d4statusesKeys);
                let items = [];
                let itemsStr = "[";
                let v = 0;
                let good = true;
                let removes = [];

                var missingNtjsons = [];
                for (var j = 0; j < keys.length; j++) {
                    const strJson = jsons[j];
                    //console.log("strJson jsons["+j+"]",strJson);
                    if (!strJson || strJson == "null") {
                        //console.log("MISSING NTJSON",keys[j])
                        missingNtjsons.push(
                            new Promise(async (resolve, reject) => {
                                const n = j;
                                const url = type == 'drafts' ? `http://${api}:${port}/api?task=fetcDraft&key=${keys[j]
                                    }` : `http://${api}:${port}/api?task=fetchNtjson&key=${keys[j]
                                    }`;
                                // console.log("CALLING API fetchNtjson ", url);
                                let response = await fetch(url);
                                let json = await response.text();
                                // console.log("responsefetchNtjson ", json);

                                return resolve({ j: n, json });
                            })
                        );
                    }
                }
                let badjsons = await Promise.all(missingNtjsons);
                // console.log("missing ntjson returned:",badjsons)
                badjsons.forEach(p => {
                    // console.log("BADJSON reponse:", p);
                    jsons[p.j] = p.json;
                });
                for (let j = 0; j < keys.length; j++) {
                    if (v) itemsStr += ",";

                    const strJson = jsons[j];
                    if (!strJson || strJson.length < 16) continue;
                    //   console.log(chalk.green.bold("strJson:"), { strJson })
                    let count = counts[j];
                    let thread_url = '""';
                    if (count) {
                        let w = count.split("|");
                        count = w[0];
                        thread_url = w[1];
                        if (!thread_url) thread_url = '""';
                    }
                    let identityCount = identityCounts[j];
                    if (identityCount) identityCount = identityCount.split("|")[0];
                    if (!identityCount) identityCount = 0;
                    if (!count) count = 0;
                    let d4status = d4statuses[j];
                    if (!d4status) d4status = '""';
                    if (d4status.indexOf("\n") === 0) d4status = d4status.split("\n")[1];

                    let item = JSON.parse(strJson);
                    //let draft = item.reshare >= 50 && item.reshare <= 60 ? true : false;
                    item.body = '';
                    let isStickie = [0, 9, 100, 109].indexOf(item.reshare) >= 0 ? true : false;
                    if (!item.reshare)
                        isStickie = true;
                    if (item.reshare == 100)
                        isStickie = true;
                    //console.log(chalk.blue.bold("ADDING TOPIC"), { identityCount, d4status, thread_url, username: usernames[j], shortname, reshare: item.reshare, threadid: item.threadid, id: item.identity })
                    if (isStickie || item.identity == identity || type == 'drafts' || type == 'dq' || type == 'allq' || type == 'favs' || type == 'hot') {
                        // console.log("adding");
                        items.push({
                            thread_url,
                            d4status: JSON.parse(d4status),
                            count,
                            identityCount,
                            item
                        });
                    }

                    //console.log("adding item, count=",count);
                    itemsStr +=
                        '{"thread_url":' +
                        thread_url +
                        ',"d4status":' +
                        JSON.parse(d4status) +
                        ',"count":' +
                        count +
                        ',"identity_count":' +
                        identityCount +
                        "," +
                        '"item":' +
                        strJson +
                        "}";
                    v = 1;
                    //  console.log("itemsStr:",itemsStr);
                }

                itemsStr += "]";
                //console.log("RESOLVE 1",itemsStr);
                let litems;
                if (items.length > size) litems = items.slice(0, size);
                else litems = items;
                if (type == "qwiket-comments") {
                    l("\n", chalk.bold.blue("RESOLVE 2"), ":", JSON.parse(itemsStr));
                    return items;
                } else {
                    //console.log("RETURN ", lastid);
                    return { success: true, lastid: originalLastid || lastid, type, items: litems };
                }
            };

            if (!lastid || lastid == 0) {
                if (countonly) {
                    return { success: true, newItems: 0 };
                }
                //console.log("RECURSE 1");
                return chunkRange(+start, +start + +size - 1);
            } else {
                //console.log("inside recurse setup start=",start);
                try {
                    let range = await redis.zrevrange(key, +start, +start + 100);
                    for (var i = 0; i < 100; i++) {
                        if (+range[i] == lastid) {
                            if (countonly) {
                                // console.log("LASTID matched", { i, lastid })
                                return { success: true, newItems: i };
                            }
                            lastid = originalLastid; //to return the original
                            break;
                        }
                    }
                    if (i == 100) {
                        start = +page * +size;
                    } else {
                        start = +start + i + +page * +size;
                    }
                    // console.log("RECURSE 2, start=",start);
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

        async function innerFunctionReacts() {
            let start = 0; //index + page * size
            // let initialStart=start;

            /*if (!lastid) {
                  start = page * size;
                }*/
            // let end = start + (size - 1)
            let preKey = test ? "test-" : "";

            let chunkitems = [];
            let rs = "";
            let sizeConsumed = 0;
            let iters = 0;
            let rep = "";
            // let v = true;
            let s = "";
            l(chalk.red.bold("===:>"));
            let chunkRange = async function (start) {
                //if (start > 500)
                //    return reject(); 
                /*   console.log(
                     "pxids caling lrange key=",
                     key,
                     ";start=",
                     start,
                     ";end=",
                     start + 1
                   );*/
                let range = await redis.zrevrange(key, start, start);
                if ((!range || !range[0]) && !iters) {
                    // console.log("DEBUG ===> RETURN EMPTY RANGE ", key, start, range);
                    return await empty();
                    /*return {
              
              
                      success: true, lastid: originalLastid || lastid, type, items: []
                    };*/
                }
                //  console.log("DEBUG ===>GOR RANGE ", key, start, range[0]);
                // for (i = 0; i < 10; i++) {
                const codedId = range[0];
                let pType = "postid";
                let qpostid = null;
                let w;
                let item;
                let strJson;
                let threadid = "";
                if (codedId) {
                    w = codedId.split(":");
                    if (!w[1]) {
                        // console.log("DEBUG 67", { forum, codedId, active });
                        qpostid = codedId;
                        pType = "postid";
                        if (active) {
                            // console.log("key=", `pjson-${forum}-${codedId}`);
                            strJson = await redis.get(`${preKey}pjson-${forum}-${codedId}`);

                            // console.log("DEBUG 69");
                        }
                    } else {
                        // console.log("DEBUG 68");
                        pType = w[0];
                        qpostid = w[1];
                        if (active) {
                            //  console.log("DEBUG 71");
                            strJson = await redis.get(`${preKey}ntjson-${w[1]}`);
                            //  console.log("DEBUG 70");
                            if (!strJson) {
                                const url = `http://${api}:${port}/api?task=fetchNtjson&key=${codedId}&XDEBUG_SESSION_START=vscode`;
                                console.log("CALLING API fetchNtjson ", url);

                                let resp = await fetch(url);
                                strJson = await resp.text();
                                if (!strJson)
                                    strJson = '{}';
                                //console.log("FECHED JSON:", strJson);
                            }
                            else {
                                // console.log("GOOD JSON:", strJson);
                            }
                        }
                    }
                }
                /* if (!qpostid) {
                           //  console.log("DEBUG ===> partial assembled, resolve")
                           if (s) {
                               let item = JSON.parse(s);
                               lastid = item.xid
                               rep = '{"success":"true","lastid":"' + lastid + '","type":"' + type + '","items":['
                           }
                           if (!rep)
                               rep = '{"success":"true","f":1,"lastid":"' + lastid + '","type":"' + type + '","items":['
                           //   console.log("calling resolve")
                           resolve(rep + rs + ']}')
                           return;
                       }*/
                // console.log("calling on qpostid=",qpostid)
                //  return redis.get('tid-' + qpostid).then((threadXid) => {
                //  console.log("tid---->",qpostid,threadXid)
                // let threadXid = +range[0];
                // if (threadXid) {
                //return;
                /*
                      console.log("DEBUG ===> partial assembled, resolve")
                      if(s){
                        let item = JSON.parse(s);
                        lastid = item.xid
                        rep = '{"success":"true","lastid":"' + lastid + '","type":"' + type + '","items":['
                      }
                      if (!rep)
                        rep = '{"success":"true","f":1,"lastid":"' + lastid + '","type":"' + type + '","items":['
                      console.log("calling resolve")
                      resolve(rep + rs + ']}')
                      return;
                      */
                //
                if (active) {
                    //console.log(22222, { iters, lastid, originalLastid });
                    let item;
                    try {
                        item = JSON.parse(strJson);
                    } catch (x) {
                        console.log(chalk.red.bold("HANDLED EXCEPTION237:"), x, { strJson, codedId, preKey, forum });
                    }
                    //let strThreadXid = strItem.substr(0, 19).trim(); //this is a way to quickly read feed_xid without JSON.parse. See also feed_redis_service.php frs_pushOutputChannelThread

                    //  let prf = (pType == 'postid' ? ('pjson-' + forum + '-') : 'ntjson-');
                    // let strJson = await redis.get(prf + qpostid);
                    //  console.log(33333, w, pType, qpostid, strJson);
                    // s = strJson;
                    if (item.body && pType != "postid")
                        item.body = "";
                    // console.log({ strJson, item })
                    // let item = JSON.parse(strJson);

                    if (iters == 0 && lastid == 0) {
                        // console.log(3333)
                        if (item) {
                            if (pType == "postid") {
                                const it = JSON.parse(strJson);
                                lastid = it.id;
                            } else {
                                lastid = item ? `q:${item.threadid}` : 0;
                            }
                            if (countonly) {
                                return { success: true, newItems: iters };
                            }
                        }
                    }
                    if (!strJson) {
                        sizeConsumed += 1000;
                    } else {
                        let feed_xid = 0;

                        /* if (v)
                                       v = false;
                                   else
                                       rs += ',' */
                        // rs += '{"feed_xid":"' + f_xid + '","item":' + strJson + '}';
                        chunkitems.push({ feed_xid, item });
                    }
                    // console.log("consuming ", { sizeConsumed, size });
                    if (++sizeConsumed >= size) {
                        // if (!rep)
                        //    rep = '{"success":"true","lastid":"' + lastid + '","type":"' + type + '","items":['
                        /* console.log("DEBUG ===> fully assembled, resolve chunkitems=", {
                           chunkitems,
                           size,
                           originalLastid,
                           lastid: (originalLastid || lastid)
                         });*/

                        return {
                            success: true,
                            lastid: originalLastid || lastid,
                            type,
                            items: chunkitems.slice(0, size)
                        };
                        //return resolve(rep + rs + ']}')
                        //return;
                    }
                    //  break;

                    // }
                    //}
                    iters++;
                    //console.log('ITER ', iters, ' sizeConsumed=', sizeConsumed)
                    return chunkRange(start + 1);
                } else {
                    // console.log("comparing threadXid to lastid", qpostid, lastid)

                    if (qpostid == lastid) {
                        //console.log("LASTID found!", lastid);
                        /*if(type!='fspxid'){
                                    start = start + page * size;
                                  }
                                  else*/
                        if (countonly) {
                            return { success: true, newItems: start };
                        }
                        start = start + page * size;
                        //end = start + (size - 1)

                        // rep = '{"success":"true","lastid":"' + lastid + '","type":"' + type + '","items":['
                        active = true;
                    } else {
                        if (start > 100) {
                            if (countonly) {
                                return { success: true, newItems: 100 };
                            }
                        }
                    }
                    // console.log('ITER ', iters, ' sizeConsumed=', sizeConsumed)
                    return chunkRange(start + 1);

                    // }).catch(x=>reject(false))

                    // }
                    // console.log("DEBUG ===> RECURSION")
                }
            };
            return chunkRange(start);
        }
    }
    catch (x) {
        console.log(x)
    }
}

