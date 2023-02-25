
import { getRedisClient } from "../redis.js"
import innerFunctionMix2 from "./innerFunctionMix";
import scanReacts from "./scanReacts";
import buildNewslineKey from "./buildNewslineKey";
import  { l, chalk,js } from '../common';
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
    if(!size)    
    size = type == 'hot' ? 9 : type == 'newsline' ? 4 : 4;
    console.log("fetchQueue size:",size,type)
    //  const redis = await getRedisClient({});
    if (!redis)
        return {
            success: false,
            msg: "Unable to create redis"
        }
    /* console.log(chalk.yellow.bold("fetchQueue:"), {
      type,
      channel,
      homeChannel,
      shortname,
      solo,
      lastid,
      page,
      debug,
      identity,
      countonly,
      qwiketid,
      size,
      test
    });*/
    if (channel.indexOf("test") >= 0) {
        test = 1;
    }
    //let entities = await getEntities(identity);
    //let forum = await redis.get("homeChannel-forum-" + homeChannel);
    if (!forum) {
        forum = homeChannel;
        redis.set("homeChannel-forum-" + homeChannel, forum);
    }
    // console.log(chalk.yellow.bold("fetchQueue forum:"), forum);

    let active = false;
    let prefix = debug ? "atids-" : "tids-";
    let testPrefix = "";
    if (test) {
        testPrefix = 'test-';
        prefix = `test-${prefix}`;
    }
    // let prefixThread = debug ? "{atjson}-" : `${test ? "test-" : ""}ntjson-`;
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
            //console.log("111", w);
            if (w[1]) {
                //console.log("pre-xl lastid:", w[1]);
                if (w[1] == homeChannel) lastid = 17;
                //magic xid
                else {
                    const nlastid = await redis.get("txid-" + w[1]);
                    if (nlastid) lastid = nlastid;
                }
                //  console.log("post-xl lastid:", lastid);
            } else {
                const kk = "pjson-" + lastid;
                // console.log("key", { key: kk });
                const pj = await redis.get("pjs{on-" + lastid);
                //console.log("pj", { kk, pj, lastid });
                let lpj;
                try {
                    lpj = JSON.parse(pj);
                } catch (x) {
                    console.log(x);
                }
                // console.log("pre-xlpjl lastid:", lpj)
                const nlastid = lpj ? lpj.xid : 0;
                if (nlastid) lastid = nlastid;
                // console.log("post-lpj lastid:", lastid);
            }
            if (firstid) {
                const w =
                    typeof firstid === "string"
                        ? firstid.split(":")
                        : [firstid];
                //  console.log("111")
                if (w[1]) {
                    // console.log("pre-xl lastid:", w[1])
                    if (w[1] == homeChannel) firstid = 17;
                    //magic xid
                    else firstid = await redis.get("txid-" + w[1]);
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
            if (lastid == homeChannel) lastid = 17;
            //magic xid
            else lastid = +(await redis.get("txid-" + lastid));
            //console.log("post-xl lastid:", lastid);
            if (firstid) {
                // console.log("pre-xl firstid:", firstid)
                if (firstid == homeChannel) firstid = 17;
                //magic xid
                else firstid = +(await redis.get("txid-" + firstid));
                // console.log("post-xl firstid:", firstid)
            }
        }
    }

    //console.log(chalk.green.bold("++++++++++++++++++++++++++++=================>"));

    /**
     * Legacy, default channel used to be usconservative
     */
    if (lastid == channel) lastid = 0;
    if (channel == "qwiket") channel = "usconservative";
    //if (channel == "test-channel-1") channel = "usright";
    //if (channel == "escape") channel = "pointofviewworld";

    // console.log("NEW CODE channel:", channel, forum);
    /**
     *
     * Setup the keys
     *
     */
    let key = null;
    let sn = shortname ? shortname : homeChannel;
    const empty = async () => {
        let ss = shortname || channel;
        // console.log("empty", { lastId, page });
        if (lastId || page)
            return {
                success: true,
                lastid: 0,
                type,
                items: [],
            };

        const url = `http://${api}:${port}/api?task=fetch_default_topic&shortname=${ss}&XDEBUG_SESSION_START=1`;
        console.log("CALLING API fetch_default_topic ", url);
        let response = await fetch(url);
        if (!response) {
            /*  console.log("NO RESPONSE"); */
            return {
                success: false,
                msg: `No newsline, feed or user exists:${ss}`,
            };
        }
        // console.log("ATTEMPT JSON")
        try {
            let json = await response.json();
            // console.log('json:', json)
            if (!json) {
                return {
                    success: false,
                    msg: `No newsline, feed or user exists:${ss}`,
                };
            }
            //let j = JSON.parse(json);

            return {
                success: true,
                type,
                lastid: sn,
                items: [{ item: json.topic }],
            };
        } catch (x) {
            // console.log(chalk.bold.red("handled exeption"), x);
            return {
                success: false,
                msg: `No newsline, feed or user exists:${sn}`,
            };
        }
    };
    // console.log(chalk.green.bold("###>>> ", JSON.stringify({ api, port, sn, type }, null, 4)))
    let cpath = await redis.get("cat-" + sn);
    // console.log("cpath:", { cpath, sn });
    //console.log("lastid:", lastid)

    switch (type) {
        case "newsline":
            /*  if (solo) {
                  channel = shortname;
                  console.log(chalk.red.bold("SOLO"), {
                      channel,
                      shortname,
                      solo,
                  });
                  key =
                      //(debug ? "atids-cat-published" : "tids-cat-published") +
                      `${prefix}cat-published-${shortname}`;
                  //"-" +
                  //shortname;
  
                  //  console.log("redis.get cat-" + shortname, cpath);
                  let iter = 0;
                  let children = [];
                  let full_me = cpath + ":" + shortname;
                  async function innerGetCategories(iter) {
                      // eslint-disable-line no-inner-declarations
                      if (page == 0 && lastid == 0) active = true;
                      // console.log("innerGetCategories(", iter, ")");
                      let vals = await redis.sscan("categories", iter);
                      // console.log('categories sscan', vals)
                      iter = vals[0];
                      let keys = vals[1];
                      let promises = [];
                      for (var i = 0; i < keys.length; i++) {
                          // console.log("pushing Promise");
                          promises.push(
                              new Promise(async (resolve, reject) => {
                                  let tk = keys[i];
                                  console.log("calling catJson-", keys[i])
                                  let js = await redis.get("catJson-" + keys[i]);
                                  // console.log("inside catJson.then");
                                  let target = JSON.parse(js);
                                  if (!target) {
                                      console.log("EMPTY TARGET return")
                                      return resolve(false);
                                  }
  
                                  let target_key =
                                      target.path + ":" + target.shortname;
                                  let shortname = target.shortname;
                                  console.log('comparing target_key ', target_key, ' with full_me=', full_me);
                                  if (target_key.indexOf(full_me) >= 0) {
                                      let targetStr = JSON.stringify(target);
                                      console.log("children.push", shortname, "; targetStr=", target)
                                      children.push(shortname);
                                  }
                                  return resolve(true);
                              })
                          );
                      }
                      let vls = await Promise.all(promises);
                      // console.log("Promise.all", vls)
                      if (iter > 0) {
                          // console.log("iterating down")
                          return innerGetCategories(iter);
                      } else {
                          let newslineKey = children.join(":");
                          if (!newslineKey || newslineKey == "") {
                              //  console.log(' 11 rejecting empty newslineKey')
                              return {
                                  success: true,
                                  lastid: 0,
                                  type,
                                  items: [],
                              };
                          }
                          // console.log("11 newslineKey=", newslineKey)
                          redis.zadd(
                              "2l-tids",
                              (Date.now() / 1000) | 0,
                              newslineKey
                          );
                          //  console.log("11 added to 2kl-tids")
                          redis.setex(newslineKey, 3600 * 24, 1);
  
                          let suffix = "-published";
                          if (type.indexOf("shared") >= 0) {
                              suffix = "-shared";
                          }
                          key = `${prefix}${newslineKey}${suffix}`;
                          // console.log("inside--- , key=", key)
                          let l2 = await redis.zcard(key);
                          // console.log("11 card then")
                          if (!l2) {
                              console.log("11 l2 0")
                              //create queue for this newsline for the first time by mergin all (userCats) and store it for the future use in a zset for one day
                              let rrr = children.map(d => {
                                  return prefix + "cat" + suffix + "-" + d;
                              });
                              // console.log('11 calling zuinon rrr=', rrr, rrr.length)
                              if (!rrr || rrr.length == 0) {
                                  // console.log('11 rejecting')
                                 
                              }
                              if (rrr.length == 1) {
                                  key = `${prefix}cat-published-${shortname};//` + shortname;
                              } else {
                                  await redis.zunionstore(
                                      key,
                                      rrr.length,
                                      rrr,
                                      "aggregate",
                                      "min"
                                  );
                                  // console.log("11 zunionstore then2", { key, rrr })
                                  redis.expire(key, 3600 * 24);
                              }
                              return await innerFunctionNewsline(key, "", forum);
                          } else {
                              // console.log("11 l2 >0")
                              return await innerFunctionNewsline(key, "", forum);
                          }
                      }
                  }
                  const catreturn = await innerGetCategories(iter);
                  //  console.log("SOLO ", { catreturn });
                  return catreturn;
              }*/
            key = `${prefix}cat-published-${channel}`;

            break;
        case "topics":
            key = "disq-tids-" + forum;
            break;
        case "mix":
            key = `${prefix}news-views`;// debug ? "atids-news-views" : "tids-news-views";
            // console.log("MIX", key);
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
            //if (test) key = "test-tids-cat-published-" + shortname;
            // console.log("fetchQueue:", { test, key });
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
    // console.log("KEY:", key);
    /**
     * Setup the newsline
     */
    switch (type) {
        case "hot":
        case "newsline":
        case "mix":
            try {
                /*
                let channelCats = await redis.smembers("newsline-" + channel);
                 l(chalk.blue.bold("channelCats:", channelCats, channel))
                let personalNewslineKey =
                    "newsline-" + channel + "-" + identity;
                let userCats = await redis.smembers(personalNewslineKey);
                // l(chalk.blue.bold("userCats:", personalNewslineKey, userCats, identity))
                if (!userCats || userCats.length == 0 || (type == "hot" && channelCats && channelCats.length > 0)) {
                    userCats = channelCats;
                }
                userCats.sort();
                let newslineKey = userCats.join(":");
                */
                if (solo == 1) {
                  //  l(chalk.red.bold(">>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>>               SOLO             <<<<<<<<<<<<<<<<<<<<<<<<<<",solo,tag,newsline))
                    key = `tids-cat-published-${tag}`;
                  //  l('key=', key);
                }
                else {
                    const newslineKey = await buildNewslineKey({ newsline, userslug, sessionid, redis, threadid });
                   // l(chalk.yellow.bold("nnk12:", JSON.stringify({ newslineKey })))
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
                    if (type == "mix" || type == "hot") {
                        suffix = "-shared";
                    }
                    key = `${prefix}${newslineKey}${suffix}`;

                   // console.log("inside--- , key=", key);
                    let l2  = await redis.zcard(key);
                    // console.log("card then")
                    // l2 = 0; // to fix temporarity
                    if (!l2) {
                        // console.log("l2 0")
                        //create queue for this newsline for the first time by mergin all (userCats) and store it for the future use in a zset for one day
                        let rrr = newslineKey.split(':').map(d => {
                            return `${prefix}cat${suffix}-${d}`;
                        });
                        if (!rrr || rrr.length == 0) {
                            // console.log("DEBUG2");
                            return await empty(); // return { success: true, lastid: 0, type: type, items: [] };
                        }
                        //  l(chalk.yellow.bold("rrr:", JSON.stringify(rrr)))
                        await redis.zunionstore(
                            key,
                            rrr.length,
                            rrr,
                            "aggregate",
                            "min"
                        );
                        /* console.log(
                            "zunionstore then3",
                            JSON.stringify({ key, rrr }, null, 4)
                        );*/
                        redis.expire(key, 3600 * 24);
                    }
                }
                if (type == "newsline" || type == "hot") {
                    return await innerFunctionNewsline(key, "", forum);
                } else {
                    console.log("l2",size)
                    return await innerFunctionMix2({ newslineKey: key, lastid, forum, redis, page, size, tail, countonly })
                    //return innerFunctionMix(key, "", forum);
                }
            } catch (x) {
                console.log("EXCEPTION", x);
                return { success: false, msg: x };
            }
        case "reacts":
            if (!lastid || (+lastid == 0 && lastid.search(":") < 0)) {
                //console.log("NO LASTID", lastid);
                active = true;
                lastid = 0;
                console.log(chalk.green.bold("+>", key));
 
                return await scanReacts({reactsKey:key,lastid,forum,redis,threadid,page,size,countonly})// innerFunctionReacts();
            } else {
                //let p = cache.findRange(key, 0, lastid)
                console.log("CALLING innerFunctionReacts key ", key, active);
                return await scanReacts({reactsKey:key,lastid,forum,redis,threadid,page,size,countonly})///return innerFunctionReacts();
            }
        case "feed":
        case "topics":
        case "dq":
        case "allq":
        case "drafts":
        case "favs":
            return await innerFunctionNewsline(key, "", forum);
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
                    //f(level, rootId);
                    //l("qwiket-comments activate on start", { key, level, orTopic, rootId, dir, targetId });
                }

                let v = await redis.get("qwiket-nochildren-" + rootId);
                let promises = [];
                // f(level, rootId);
                //l("qwiket-comments entry key", { key, level, orTopic, rootId, dir, targetId });

                // console.log("qwiket-nochildren-"+value,v);
                if (v == 1) {
                    // f(level, rootId);
                    // l(chalk.red.bold("qwiket-comments return v=1"));
                    return orTopic; //resolve( {"success":"true","lastid":"0","type":type,"items":[]});
                }
                v = await redis.exists(key);
                // f(level, rootId);
                //l("key exists return ", v);
                if (!v) {
                    const url = `http://${api}:${port}/api?task=fetch_qwiket_children&qwiketid=${qwiketid}&channel=${channel}`;
                    // console.log("CALLING API fetch_qwiket_children ",url);
                    let response = await fetch(url);
                    let json = await response.json();
                    // console.log("RETURNED API fetch_qwiket_children",json);
                    v = await redis.exists(key);
                    // console.log("retesting key",key,v);
                    if (!v) {
                        // f(level, rootId);
                        // l(chalk.bold.red(">RETURN on false test", type));
                        return orTopic;
                    }
                    // console.log("CALLING INNER FUNCTION ",forum)
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
                    //f(level, rootId);
                    //l(">inside promises.all.then level:", level)

                    vls.forEach(v => {
                        //f(level, rootId);
                        //l(">inside vls.forEach", v);
                        const parsedV = v; //JSON.parse(v);
                        parsedV.forEach(pp => {
                            const vo = pp.item;
                            // if (level < 0) {
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
                    let prs = await Promise.all(promises);
                    let comments = [];
                    prs.forEach(t => {
                        comments.push(t.rtopic);
                    });
                    orTopic.qcComments = comments;
                    //f(level, rootId);
                    // l(chalk.red.bold(">return resolve outer"), orTopic);

                    return orTopic;
                }
                promises.push(
                    new Promise(async (resolve, reject) => {
                        // f(level, rootId);
                        // l("inside promise 1");
                        return await innerFunctionNewsline(
                            "qwiket-children-" + rootId,
                            resolve,
                            reject,
                            "qwiket-children",
                            forum
                        );
                    })
                );
                // f(level, rootId);
                // l("calling promises.all");
                let vls = await Promise.all(promises);
                // f(level, rootId);
                // l("inside promises.all.then:", vls)
                let promises2 = [];
                vls.forEach(v => {
                    // f(level, rootId);
                    const parsedV = v; //JSON.parse(v);
                    // l("inside vls.forEach:", parsedV);

                    parsedV.forEach(pp => {
                        // f(level, rootId);
                        const vo = pp.item;
                        // l("inside parsedV.forEach:", vo);

                        // if (level < 0) {
                        // f(level, rootId);
                        // l("push recursing", chalk.bold.yellow(vo['threadid']));
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
                // f(level, rootId);
                // l("calling promises2.all")
                let prs = await Promise.all(promises2);
                // f(level, rootId);
                //l(chalk.bold.green("inside promises2.all.then"));
                let comments = [];
                prs.forEach(t => {
                    // f(level, rootId);
                    // l("inside prs.forEach")
                    comments.push(t);
                });
                orTopic.qcChildren = comments;
                // f(level, rootId);
                // l("resolving outer Promise", orTopic);
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
            //console.log("qwiket-comments top level return ", o);
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

    async function innerFunctionMix(key, debugStr, forum) {
        /**
         * New code
         */



        let lastCommentTime = "+inf";
        size = 14;
        let start = !lastid ? page * size : 0;
        console.log("innerFunctionMix entry", {
            key,
            lastid,
            start,
            active,
            size,
            forum,
            debugStr,
            tail,
            countonly,
            lastCommentTime,
        });

        if (!debugStr) debugStr = '"nodebug"';

        let chunkRange = async function (start, end, pt) {
            // console.log("ENTER CHUNK", { start, end, pt });
            let firstComment = true;
            if (pt) lastCommentTime = pt;
            else lastCommentTime = "+inf";
            const k5656 = key;
            if (!homeChannel) homeChannel = channel;
            let rrange = await redis.zrevrange(k5656, start, end, "withscores");
            let range = [];
            let scores = [];
            for (var kl = 0; kl < rrange.length; kl++) {
                range.push(rrange[kl++]);
                scores.push(rrange[kl]);
            }
            //let tail = 0;
            let nolastid = +lastid ? false : true;
            // console.log("db21", { k5656, start, end, lastid, nolastid, range })
            let origLastId = lastid;
            lastid = lastid > 0 ? lastid : range[0] ? +range[0] : 0;
            /* console.log("db2", {
                k5656,
                start,
                end,
                lastid,
                range,
                length: range.length,
            });*/
            /**
             * xlate back to threadid
             **/
            let prevTime = 0;
            if (lastid) {
                const ntkey = "ntjson-" + lastid;
                //  console.log({ ntkey });
                const ntjson = await redis.get(ntkey);
                if (ntjson) {
                    let nlastid;
                    try {
                        const o1 = JSON.parse(ntjson);
                        nlastid = o1.threadid;
                        // console.log("assing prevTime", lastid);
                        if (origLastId) prevTime = o1.shared_time;
                        //  console.log("reverse ntjson xlate lastid", { lastid, qwiketid: nlastid })
                    } catch (x) {
                        console.log(chalk.red.bold("EXCEPTION 029:"), x);
                    }
                    // console.log("reverse xlate lastid", { lastid, nlastid, nolastid, originalLastid })
                    if (nolastid) {
                        if (nlastid) lastid = nlastid;
                        lastid = `q:${lastid}`;
                    } else {
                        if (originalLastid) lastid = originalLastid;
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
            // console.log("MKEYS:", keys);
            let jsons = await redis.mget(keys);
            let countKeys = range.map(k => "c1ount-" + forum + "-" + k);

            let countIdentityKeys = range.map(
                k => "c1ount-" + forum + "-" + identity + "-" + k
            );
            let usernameKeys = range.map(k => "tview-username-" + k);
            // if(type.indexOf('qwiket-children')>=0)
            // console.log("usernameKeys,:", usernameKeys);
            let counts = await redis.mget(countKeys);
            let identityCounts = await redis.mget(countIdentityKeys);
            /* console.log("1counts", {
                countKeys,
                countIdentityKeys,
                counts,
                identityCounts,
            });*/
            let usernames = await redis.mget(usernameKeys);
            //if(type.indexOf('qwiket-children')>=0)
            //  console.log("GOT USERNAMES", { usernames, usernameKeys });
            let d4statusesKeys = usernames.map(
                k => "qwiket-d4Status-" + forum + "-" + k
            );
            let promises = [];
            /* DBG LAKE   usernames.forEach(username => {
                   const d4statusKey = "qwiket-d4Status-" + forum + "-" + username;
                   if (username && username != "null")
                       // if(type.indexOf('qwiket-children')>=0)
                       promises.push(
                           new Promise(async (resolve, reject) => {
                               let exists = await redis.exists(d4statusKey);
                               if (!exists) {
                                   // console.log("*** <><><><><><> ", d4statusKey);
                                   const url2 = `http://${api}:${port}/api?task=fetch_d4_status&forum=${forum}&username=${username}`;
   
                                   // console.log("CALLING API fetch_d4_status ", url2);
   
                                   let response = await fetch(url2);
                                   let status = await response.text();
                                   redis.setex(d4statusKey, 24 * 3600, status);
                                   return resolve(status);
                               } else {
                                   //console.log("d4status exists", d4statusKey);
                                   let status = await redis.get(d4statusKey);
                                  
                                   return resolve(status);
                               }
                           })
                       );
               });*/
            let r = await Promise.all(promises);
            let d4statuses = await redis.mget(d4statusesKeys);
            let itemsStr = "[";
            let items = [];
            let v = 0;
            let good = true;
            let removes = [];
            // l(chalk.blue.bold("checkpoint"));
            var missingNtjsons = [];
            /*DBG LAKE for (let j = 0; j < keys.length; j++) {
                 const strJson = jsons[j];
                 //  console.log("strJson jsons[" + j + "]", strJson);
                 if (!strJson || strJson == "null") {
                     // console.log("MISSING NTJSON", keys[j]);
                     missingNtjsons.push(
                         new Promise(async (resolve, reject) => {
                             const n = j;
                             const url = `http://${api}:${port}/api?task=fetchNtjson&key=${keys[j]}`;
                             //console.log("CALLING API fetchNtjson ", url);
                             return fetch(url)
                                 .then(response => {
                                     return response.text();
                                 })
                                 .then(json => resolve({ j: n, json }));
                         })
                     );
                 }
             } */
            let badjsons = await Promise.all(missingNtjsons);
            // l(chalk.green.bold('call badjsons'), { badjsons });
            // console.log("missing ntjson returned:", badjsons);
            badjsons.forEach(p => {
                jsons[p.j] = p.json;
            });
            let now = (Date.now() / 1000) | 0;
            /* console.log(
                "prevTime:",
                prevTime,
                "now",
                now,
                "lastId",
                origLastId
            );*/
            if (!prevTime) prevTime = now;
            //console.log("after prevTime", prevTime);
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
                if (d4status.indexOf("\n") === 0)
                    d4status = d4status.split("\n")[1];
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
                const published_time = scores[j]; //jsonParse.shared_time;
                /* console.log(
                    "COMPARING:",
                    prevTime,
                    published_time,
                    prevTime - published_time
                );*/
                // if (prevTime - sonParse.shared_time > 5 * 3600) continue;
                prevTime = published_time;
                // console.log("pt:", { published_time, lastCommentTime });
                let reacts = null;
                try {
                    reacts = await redis.zrevrangebyscore(
                        "lpxids-" + forum,
                        lastCommentTime == "+inf"
                            ? lastCommentTime
                            : lastCommentTime,
                        published_time
                    );
                } catch (x) {
                    l(chalk.red.bold("EXCEPTION:"), x);
                }
                /*  console.log("reacts:", {
                    forum,
                    reacts,
                    published_time,
                    lastCommentTime,
                });*/
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
                        // console.log("pjsn", { zeroCommentKey, page })
                        if (pjsn && !page) {
                            // console.log("pjsn2", { zeroCommentKey, page })

                            const opj = JSON.parse(pjsn);
                            //  console.log("pjsn3", { zeroCommentKey, page })

                            if (opj) {
                                if (zeroCommentType == "ntjson")
                                    tail = opj.shared_time;
                                else tail = opj.createdat;
                            }
                        }
                    }
                    // console.log("reactKeys", keys);
                    let jsons = await redis.mget(keys);
                    //   console.log("reactJsons", jsons);
                    let countKeys = range.map(k => "c1ount-" + forum + "-" + k);

                    let countIdentityKeys = range.map(
                        k => "c1ount-" + forum + "-" + identity + "-" + k
                    );
                    let usernameKeys = range.map(k => testPrefix + "tview-username-" + k);
                    // if(type.indexOf('qwiket-children')>=0)
                    // console.log("usernameKeys,:",usernameKeys)
                    let counts = await redis.mget(countKeys);
                    let identityCounts = await redis.mget(countIdentityKeys);
                    //  console.log("counts", { counts, identityCounts })
                    let usernames = await redis.mget(usernameKeys);
                    //if(type.indexOf('qwiket-children')>=0)
                    //console.log("GOT USERNAMES",usernames);
                    let d4statusesKeys = usernames.map(
                        k => "qwiket-d4Status-" + forum + "-" + k
                    );
                    let promises = [];
                    usernames.forEach(username => {
                        const d4statusKey =
                            "qwiket-d4Status-" + forum + "-" + username;
                        if (username && username != "null")
                            // if(type.indexOf('qwiket-children')>=0)
                            promises.push(
                                new Promise(async (resolve, reject) => {
                                    let exists = await redis.exists(
                                        d4statusKey
                                    );
                                    if (!exists) {
                                        // console.log("*** <><><><><><> ", d4statusKey)
                                        const url2 = `http://${api}:${port}/api?task=fetch_d4_status&forum=${forum}&username=${username}`;

                                        // console.log("CALLING API fetch_d4_status ", url2);

                                        let response = await fetch(url2);
                                        let status = await response.text();
                                        await redis.setex(
                                            d4statusKey,
                                            24 * 3600,
                                            status
                                        );
                                        return resolve(status);
                                    } else {
                                        let status = await redis.get(
                                            d4statusKey
                                        );
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
                                    const url = `http://${api}:${port}/api?task=fetchNtjson&key=${keys[j1]}&XDEBUG_SESSION_START=vscode`;
                                    console.log(
                                        "MIX CALLING API fetchNtjson ",
                                        url
                                    );
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
                        String.prototype.replaceAll = function (
                            search,
                            replacement
                        ) {
                            var target = this;
                            return target.replace(
                                new RegExp(search, "g"),
                                replacement
                            );
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
                        if (identityCount)
                            identityCount = identityCount.split("|")[0];
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
                            d4status: "", //JSON.parse(d4status),
                            count,
                            identityCount,
                            item: ojson,
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
                    d4status: "", // JSON.parse(d4status),
                    count,
                    identityCount,
                    item: ojson,
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
                if (!tail)
                    tail = '0';
                /*  l("\n", chalk.bold.blue("RESOLVE 3"), {
                      items: litems.length,
                      lastid: originalLastid || lastid,
                      size,
                      tail
                  });*/
                return {
                    type: "mix",
                    success: true,
                    lastid: lastid,
                    items: items,
                    tail: tail,
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
                    lastid = pto ? pto.xid : "";

                    if (!b_l && page) {
                        const rg = await redis.zrevrange(key, 0, 0);
                        const xidkey = "ntjson-" + rg[0];
                        const json = await redis.get(xidkey);
                        // console.log("JSON FOR LASTID:", { json, xidkey, rg, start });
                        pto = JSON.parse(json);
                    }
                    originalLastid = "q:" + pto.threadid;
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
                    // console.log("LASTID FOUND", i);
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
            } else start = +start + i + +page * +size;
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
            if (!+tail) pt = "+inf";
            if (countonly) {
                // console.log("LASTID pt=", { pt, tail });

                if (pt != "+inf" && +tail + 1 > pt) pt = +tail + 1;
                //  console.log("LASTID after tail pt=", { pt, tail });
                const reacts = await redis.zrevrangebyscore(
                    "lpxids-" + forum,
                    "+inf",
                    pt == "+inf" ? pt : pt + 1
                );
                // console.log("+++++> COUNTONLY ", { start, reacts: reacts?.length, newItems: start + reacts?.length })
                return { success: true, newItems: start + reacts.length };
            }
            // console.log("CALLING CHUNG RANGE");
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
            countonly,
        });*/

        let start = page * size;
        let preKey = test ? "" : "";
        if (!debugStr) debugStr = '"nodebug"';
        let runThread = Math.random() * 1000000;
        // let t0 = new Date().getTime() | 0;
        /*   if (key.search("disq") >= 0)
            console.log("innerFunctionNewsline entry", {
                key,
                lastid,
                active,
                size,
                forum,
                debugStr,
                page,
                countonly,
                runThread,
            }); */
        let chunkRange = async function (start, end) {
            /* if (key.search("disq") >= 0)
                console.log(chalk.red.bold("Newsline:"), "ENTER chunkRange", {
                    key,
                    start,
                    end,
                    runThread,
                    time: (new Date().getTime() | 0) - t0,
                }); */
            /* console.log(chalk.red.bold("Newsline:"), "ENTER chunkRange", {
                 key,
                 start,
                 end,
                 runThread,
                 // time: (new Date().getTime() | 0) - t0,
             })*/
            const k5656 = key;

            let range = await redis.zrevrange(k5656, start, end);
          //  console.log(chalk.red.bold("Newsline:"), "After chunkRange", { key,range });
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
                        pre = test ? "pjson-" : "pjson-";
                        k = w[1];
                    } else {
                        if (w[0] == "notif") {
                            //xid
                            pre = test ? "notif-" : "notif-";
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
            //   if (key.search("disq") >= 0)
            // console.log("MKEYS:", keys);
            let jsons = await redis.mget(keys);
            let countKeys = range.map(k => "c1ount-" + forum + "-" + k);

            let countIdentityKeys = range.map(
                k => "c1ount-" + forum + "-" + identity + "-" + k
            );
            let usernameKeys = range.map(k => testPrefix + "tview-username-" + k);
            // if(type.indexOf('qwiket-children')>=0)
            // console.log("usernameKeys,:",usernameKeys)
            let counts = await redis.mget(countKeys);
            let identityCounts = await redis.mget(countIdentityKeys);
            let usernames = await redis.mget(usernameKeys);

            let d4statusesKeys = usernames.map(
                k => "qwiket-d4Status-" + forum + "-" + k
            );
            let promises = [];
            usernames.forEach(username => {
                const d4statusKey = "qwiket-d4Status-" + forum + "-" + username;
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
                                /*  if (key.search("disq") >= 0)
                                    console.log("return API fetch_d4_status ", {
                                        status,
                                        runThread,
                                        time: (new Date().getTime() | 0) - t0,
                                    }); */
                                await redis.setex(
                                    d4statusKey,
                                    24 * 3600,
                                    status
                                );
                                return resolve(status);
                            } else {
                                //  console.log("==>d4status exists", d4statusKey);
                                let status = await redis.get(d4statusKey);
                                if (status.indexOf("\n") === 0)
                                    status = status.split("\n")[1];
                                // console.log("d4status exists1", { d4statusKey, status });
                                return resolve(status);
                            }
                        })
                    );
            });
            /*  if (key.search("disq") >= 0)
                console.log(chalk.blue.bold("Before Promise.all 111"), {
                    key,
                    runThread,
                    time: (new Date().getTime() | 0) - t0,
                }); */
            let r = await Promise.all(promises);
            /* if (key.search("disq") >= 0)
                console.log(chalk.blue.bold("After Promise.all 111"), {
                    key,
                    runThread,
                    time: (new Date().getTime() | 0) - t0,
                }); */
            let d4statuses = await redis.mget(d4statusesKeys);
            /* if (key.search("disq") >= 0)
                console.log(chalk.blue.bold("Afterd4statuses"), {
                    key,
                    runThread,
                    time: (new Date().getTime() | 0) - t0,
                }); */
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
                    /*  if (key.search("disq") >= 0)
                        console.log("MISSING NTJSON", keys[j], {
                            runThread,
                            time: (new Date().getTime() | 0) - t0,
                        }); */
                    missingNtjsons.push(
                        new Promise(async (resolve, reject) => {
                            const n = j;
                            const url =
                                type == "drafts"
                                    ? `http://${api}:${port}/api?task=fetcDraft&key=${keys[j]}`
                                    : `http://${api}:${port}/api?task=fetchNtjson&key=${keys[j]}`;
                            /*  if (key.search("disq") >= 0)
                                console.log(
                                    `CALLING API fetchNtjson ${n}`,
                                    url,
                                    {
                                        key,
                                        runThread,
                                        time: (new Date().getTime() | 0) - t0,
                                    }
                                ); */
                            let response = await fetch(url);
                            let json = await response.text();
                            /*  if (key.search("disq") >= 0)
                                console.log(`responsefetchNtjson ${n}`, {
                                    json,
                                    key,
                                    runThread,
                                    time: (new Date().getTime() | 0) - t0,
                                }); */

                            return resolve({ j: n, json });
                        })
                    );
                }
            }
            /* if (key.search("disq") >= 0)
                console.log(chalk.blue.bold("Before missingNTjsons"), {
                    key,
                    runThread,
                    time: (new Date().getTime() | 0) - t0,
                });*/
            let badjsons = await Promise.all(missingNtjsons);
            /* if (key.search("disq") >= 0)
                console.log(
                    chalk.blue.bold("******************* After missingNTjsons"),
                    {
                        key,
                        runThread,
                        time: (new Date().getTime() | 0) - t0,
                    }
                );*/
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
                if (d4status.indexOf("\n") === 0)
                    d4status = d4status.split("\n")[1];

                let item = JSON.parse(strJson);
                //let draft = item.reshare >= 50 && item.reshare <= 60 ? true : false;
                item.body = "";
                let isStickie =
                    [0, 9, 100, 109].indexOf(item.reshare) >= 0 ? true : false;
                if (!item.reshare) isStickie = true;
                if (item.reshare == 100) isStickie = true;
                if (key.search("disq") >= 0 && false)
                    console.log(chalk.blue.bold("ADDING TOPIC"), {
                        identityCount,
                        d4status,
                        thread_url,
                        username: usernames[j],
                        shortname,
                        reshare: item.reshare,
                        threadid: item.threadid,
                        id: item.identity,
                        runThread,
                        time: (new Date().getTime() | 0) - t0,
                    });
                if (
                    isStickie ||
                    item.identity == identity ||
                    type == "drafts" ||
                    type == "dq" ||
                    type == "allq" ||
                    type == "favs" ||
                    type == "hot"
                ) {
                    // console.log("adding");
                    items.push({
                        thread_url,
                        d4status: "", //JSON.parse(d4status),
                        count,
                        identityCount,
                        item,
                    });
                }

                //console.log("adding item, count=",count);
                itemsStr +=
                    '{"thread_url":' +
                    thread_url +
                    ',"d4status":""' +
                    //JSON.parse(d4status) +
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
            /* if (key.search("disq") >= 0)
                console.log("RESOLVE 1", {
                    key,
                    runThread,
                    time: (new Date().getTime() | 0) - t0,
                }); */
            let litems;
            if (items.length > size) litems = items.slice(0, size);
            else litems = items;
            if (type == "qwiket-comments") {
                /* l(
                    "\n",
                    chalk.bold.blue("RESOLVE 2"),
                    ":",
                    JSON.parse(itemsStr)
                );*/
                return items;
            } else {
                //console.log("RETURN ", lastid);
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
            /*  if (key.search("disq") >= 0) console.log("RECURSE 1"); */
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
                /*  if (key.search("disq") >= 0)
                    console.log("RECURSE 2, start=", start); */
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
        let preKey = test ? "" : "";

        let chunkitems = [];
        let rs = "";
        let sizeConsumed = 0;
        let iters = 0;
        let rep = "";
        // let v = true;
        let s = "";
        //l(chalk.red.bold("===:>", active));
        let chunkRange = async function (start) {
            //if (start > 500)
            //    return reject();
            /*  console.log(
                  "pxids caling lrange key=",
                  key,
                  ";start=",
                  start,
                  ";end=",
                  start + 1
              );*/
            let range = await redis.zrevrange(key, start, start);
            l(chalk.yellow("range:",js(range)))
            if ((!range || !range[0]) && !iters) {
                /* console.log(
                     "DEBUG ===> RETURN EMPTY RANGE ",
                     key,
                     start,
                     range
                 );*/
                return await empty();
                /*return {
     
     
          success: true, lastid: originalLastid || lastid, type, items: []
        };*/
            }
            //  console.log("DEBUG ===>GOR RANGE ", key, start, range[0]);
            // for (i = 0; i < 10; i++) {
            if (range.length < size) {
                // l("setting active on range.length",range.length,size)
                // active = true
            }
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
                    console.log("DEBUG 67", { forum, codedId, active });
                    qpostid = codedId;
                    pType = "postid";
                    if (active) {
                        //console.log("key=", `pjson-${forum}-${codedId}`);
                        strJson = await redis.get(
                            `${preKey}pjson-${forum}-${codedId}`
                        );

                         console.log(
                             "DEBUG 69",
                             `key:${preKey}pjson-${forum}-${codedId}`,
                             { preKey, forum, strJson }
                         );
                    }
                } else {
                    // console.log("DEBUG 68");
                    pType = w[0];
                    qpostid = w[1];
                    if (active) {
                        // console.log("DEBUG 71");
                        strJson = await redis.get(`${preKey}ntjson-${w[1]}`);
                        // console.log("DEBUG 70");
                        if (!strJson) {
                            const url = `http://${api}:${port}/api?task=fetchNtjson&key=${codedId}&XDEBUG_SESSION_START=vscode`;
                            // console.log("CALLING API fetchNtjson ", url);

                            let resp = await fetch(url);
                            strJson = await resp.text();
                            if (!strJson) strJson = "{}";
                              console.log("FECHED JSON:", strJson);
                        } else {
                             console.log("GOOD JSON:", strJson);
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
                // console.log(22222, { iters, lastid, originalLastid, strJson });
                let item;
                try {
                    item = JSON.parse(strJson);
                } catch (x) {
                     console.log(chalk.red.bold("HANDLED EXCEPTION237:"), x, {
                        strJson,
                        codedId,
                        preKey,
                        forum,
                    });
                }
                //let strThreadXid = strItem.substr(0, 19).trim(); //this is a way to quickly read feed_xid without JSON.parse. See also feed_redis_service.php frs_pushOutputChannelThread

                //  let prf = (pType == 'postid' ? ('pjson-' + forum + '-') : 'ntjson-');
                // let strJson = await redis.get(prf + qpostid);
                //  console.log(33333, w, pType, qpostid, strJson);
                // s = strJson;

                if (item && item.body && pType != "postid") item.body = "";
                // console.log({ strJson, item })
                // let item = JSON.parse(strJson);

                if (iters == 0 && lastid == 0) {
                    console.log(3333);
                    if (item) {
                        if (pType == "postid") {
                            const it = JSON.parse(strJson);
                            l(chalk.magenta.bold("SET LASTID FOR REACTS", it.qpostid))
                            lastid = it.qpostid;
                        } else {
                            lastid = item ? `q:${item.threadid}` : 0;
                        }
                        if (countonly) {
                            console.log("RETURN COUNTOUN");
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
                    if (countonly) {
                        // console.log("RETURN COUNTOUN FI::",start);
                        return { success: true, newItems: 0 };
                    }
                    console.log(
                        "DEBUG ===> fully assembled, resolve chunkitems=",
                        {
                            chunkitems,
                            size,
                            originalLastid,
                            lastid: originalLastid || lastid,
                        }
                    );

                    return {
                        success: true,
                        lastid: originalLastid || lastid,
                        type,
                        items: chunkitems.slice(0, size),
                    };
                    //return resolve(rep + rs + ']}')
                    //return;
                }
                //  break;

                // }
                //}
                iters++;
                //  console.log("ITER ", iters, " sizeConsumed=", sizeConsumed);
                return chunkRange(start + 1);
            } else {
                // console.log("comparing threadXid to lastid", qpostid, lastid)

                if (qpostid == lastid) {
                   // console.log("LASTID found!", lastid);
                    /*if(type!='fspxid'){
                      start = start + page * size;
                    }
                    else*/
                    if (countonly) {
                        // console.log("return countonly 212")
                        return { success: true, newItems: start };
                    }
                    start = start + page * size;
                    //end = start + (size - 1)

                    // rep = '{"success":"true","lastid":"' + lastid + '","type":"' + type + '","items":['
                    //  console.log("going active")
                    active = true;
                } else {
                    //console.log("no match",qpostid,lastid)
                    if (start > 100) {
                        if (countonly) {
                            console.log("return 100 countonly")
                            return { success: true, newItems: 100 };
                        }
                    }
                }
                // console.log('ITER ', iters, ' sizeConsumed=', sizeConsumed)
                return chunkRange(start + 1);

                // }).catch(x=>reject(false))

                // }
                console.log("DEBUG ===> RECURSION")
            }
        };
        return chunkRange(start);
    }
}
