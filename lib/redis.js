// ./redis.js
import { l, chalk, js } from "./common.js";
import Redis from 'ioredis';
import { dbLog } from "./db.js";

const redisServer = process.env.REDIS_HOST;
const redisPort = process.env.REDIS_PORT;
const redisNodes = process.env.REDIS_NODES;
let cluster=process.env.REDIS_CLUSTER;
if(!cluster)
cluster=0;
const startupNodes=[
    {
        host:'192.168.1.16',
        port:6379
    },
    {
        host:'192.168.1.30',
        port:6379
    },
    {
        host:'192.168.1.31',
        port:6379
    }
]

/**
 * 
 * server, port - single redis server
 * nodes - cluster, comma separated list of host:port
 * 
 * if missing, overriden by env defaults, cluster has priority
 * Each client is cached based on connection string
 * 
 *  
 */
const getRedisClient = async ({ server = redisServer, port = redisPort, nodes = redisNodes, x = false }) => {
    console.log("REDIS:",redisServer,redisPort)
try{
    if (!x)
        x = false;
    nodes = nodes || redisNodes;
    let clusterConnectionStrings = nodes ? nodes.split(',') : [];

    let rootNodes = [];

    for (let i = 0; i < clusterConnectionStrings.length; i++) {
        rootNodes.push(`redis://${clusterConnectionStrings[i]}`);
    }
    server = server || redisServer;
    port = port || redisPort;

    let client;
    l("getRedisClient cluster=",cluster)
    if (!x&&cluster==1) {
        l("connectCluster",rootNodes)
        client = new Redis.Cluster(startupNodes, {
            retryDelayOnFailover: 100,
            enableAutoPipelining: true,
            slotsRefreshTimeout: 100000,
        })
    }
    else {
        l(chalk.yellow.bold("X REDIS, ", port, server))
        client = new Redis(port, server) //redis.createClient(port, server);
    }
    client.on("error", (error) => {
        console.error("Redis Error", error);
      });
      client.on("connected", (error) => {
        console.error("Redis connected", error);
      });
      client.on("node error", (error, node) => {
        console.error(`Redis error in node ${node}`, error);
      });
    //client.connect();
    return client;
}
catch(error){
    l(chalk.red.bold(error))

}
    
};
const resultToObject = result => {
    if (!result) return [];
    let numObjects = result[0];
    let results = [];
    // l(111, numObjects)
    for (var i = 0; i < numObjects; i++) {
        //  l(112, i)
        let slug = result[1 + 2 * i];
        if (!slug) break;
        let fields = result[2 + 2 * i];
        // l(113, fields)
        let object = {};
        for (var j = 0; j < fields.length; j++) {
            let name = fields[j];
            let value = fields[++j];
            object[name] = value;
        }
        results.push(object);
    }
    return results;
};
const resultInfoToObject = result => {
    if (!result) return [];
    let numObjects = result.length;
    let results = {};
    // l(111, numObjects)
    for (var i = 0; i < numObjects; i++) {
        //  l(112, i)
        let name = result[i];

        let value = result[++i];

        results[name] = value;
    }
    return results;
};
const redisC = {
    end: async ({
        server,
        port,
        logContext: { sessionid, threadid, username },
    }) => {
        let redisClient = await getRedisClient({ server, port, remove: true });
        /*return redisClient.end(true, async (err, res) => {
            if (err) {
                l(chalk.red.bold("REDIS ERROR:", err));
                await dbLog({
                    type: "REDIS.ERROR",
                    body: err,
                    threadid,
                    sessionid,
                    username,
                });
                return resolve(err);
            }
            l(chalk.cyan(`REDIS:END =${res}`));
            await dbLog({
                type: "REDIS.END RESULTS",
                body: JSON.stringify(res),
                threadid,
                sessionid,
                username,
            });
            return resolve(res);
        });*/
        return redisClient.quit();
    },
    set: async ({
        key,
        value,
        server,
        port,
        expire,
        logContext: { sessionid, threadid, username },
    }) => {
        let redisClient = await getRedisClient({ server, port });
        try {
            if (!value) {
                throw "NO VALUE REDIS SET";
            }
            return new Promise(async (resolve, reject) => {
                if (expire) {
                    /* l(
                        chalk.yellow(
                            "REDIS SET",
                            "value:",
                            typeof value,
    
                            "expire:",
                            typeof expire,
                            "key:",
                            typeof key,
                            key
                        )
                    );*/
                    return redisClient.setex(
                        key,
                        expire,
                        value,
                        async (err, res) => {
                            if (err) {
                                l(
                                    chalk.red.bold(
                                        "REDIS.SET ERROR:",
                                        js({ key, expire, value }),
                                        err
                                    )
                                );
                                await dbLog({
                                    type: "REDIS.SET.ERROR",
                                    body: err,
                                    threadid,
                                    sessionid,
                                    username,
                                });
                                return resolve(err);
                            }
                            /*  l(
                                    chalk.cyan(
                                        `REDIS: SETEX[${key},${value}]=${res},expire:${expire}`
                                    )
                                );*/
                            await dbLog({
                                type: "REDIS.SET RESULTS",
                                body: `key=${key},value=${value},result=${res}`,
                                threadid,
                                sessionid,
                                username,
                            });
                            return resolve(res);
                        }
                    );
                } else {
                    return redisClient.set(key, value, async (err, res) => {
                        if (err) {
                            l(chalk.red.bold("REDIS ERROR:", err));
                            await dbLog({
                                type: "REDIS.ERROR",
                                body: err,
                                threadid,
                                sessionid,
                                username,
                            });
                            return resolve(err);
                        }
                        //  l(chalk.cyan(`REDIS: SET[${key},${value}]=${res}`));
                        await dbLog({
                            type: "REDIS.SET RESULTS",
                            body: JSON.stringify(res),
                            threadid,
                            sessionid,
                            username,
                        });
                        return resolve(res);
                    });
                }
            });
        }
        finally {
            await redisClient.quit()
        }
    },
    get: async ({
        key,
        server,
        port,
        logContext: { sessionid, threadid, username },
    }) => {
        let redisClient = await getRedisClient({ server, port });
        try {
            return new Promise(async (resolve, reject) => {
                return redisClient.get(key, async (err, res) => {
                    if (err) {
                        l(chalk.red.bold("REDIS ERROR:", err));
                        await dbLog({
                            type: "REDIS.ERROR",
                            body: err,
                            threadid,
                            sessionid,
                            username,
                        });
                        return resolve(err);
                    }
                    // l(chalk.cyan(`REDIS: GET[${key}]=${res}`));
                    await dbLog({
                        type: "REDIS.GET",
                        body: `get(${key})=> (${res})`,
                        threadid,
                        sessionid,
                        username,
                    });
                    return resolve(res);
                });
            });
        }
        finally {
            await redisClient.quit()
        }
    },

    lpush: async ({
        key,
        value,
        server,
        port,
        logContext: { sessionid, threadid, username },
    }) => {
        let redisClient = await getRedisClient({ server, port });
        try {
            return new Promise(async (resolve, reject) => {
                //  l("LPUSH", js({ key, value }));
                return redisClient.lpush(key, value, async (err, res) => {
                    if (err) {
                        l(chalk.red.bold("REDIS ERROR:", err));
                        await dbLog({
                            type: "REDIS.ERROR",
                            body: `LPUSH(${key},${value})|||${err}`,
                            threadid,
                            sessionid,
                            username,
                        });
                        return resolve(err);
                    }
                    // l(chalk.cyan(`REDIS: LPUSH[${key}]=${value}`));
                    await dbLog({
                        type: "REDIS.LPUSH",
                        body: `lpush("${key}","${value}")=>(${res})`,
                        threadid,
                        sessionid,
                        username,
                    });
                    return resolve(res);
                });
            });
        }
        finally {
            await redisClient.quit()
        }
    },
    zadd: async ({
        key,
        score,
        value,
        server,
        port,
        logContext: { sessionid, threadid, username },
    }) => {
        //l("zadd:", js({ key, score, value }));
        let redisClient = await getRedisClient({ server, port });
        try {
            return new Promise(async (resolve, reject) => {
                return redisClient.zadd(key, score, value, async (err, res) => {
                    if (err) {
                        l(chalk.red.bold("REDIS.ZADD ERROR:", err, value));
                        await dbLog({
                            type: "REDIS.ZADD.ERROR",
                            body: `key=${key},value=${value},score=${score},err=${err}`,
                            threadid,
                            sessionid,
                            username,
                        });
                        return reject(err);
                    }
                    // l(chalk.cyan(`REDIS: ZADD[${key}]=${res}`));
                    await dbLog({
                        type: "REDIS.ZADD RESULTS",
                        body: `key=${key},value=${value},score=${score},res=${res}`,
                        threadid,
                        sessionid,
                        username,
                    });
                    return resolve(res);
                });
            });
        }
        finally {
            await redisClient.quit()
        }
    },
    zrem: async ({
        key,
        value,
        server,
        port,
        logContext: { sessionid, threadid, username },
    }) => {
        l("zrem:", js({ key, value }));
        let redisClient = await getRedisClient({ server, port });
        try {
            return new Promise(async (resolve, reject) => {
                return redisClient.zrem(key, value, async (err, res) => {
                    if (err) {
                        l(chalk.red.bold("REDIS.REM ERROR:", err, value));
                        await dbLog({
                            type: "REDIS.REM.ERROR",
                            body: `key=${key},value=${value},err=${err}`,
                            threadid,
                            sessionid,
                            username,
                        });
                        return resolve(err);
                    }
                    // l(chalk.cyan(`REDIS: ZADD[${key}]=${res}`));
                    await dbLog({
                        type: "REDIS.REM RESULTS",
                        body: `key=${key},value=${value},res=${res}`,
                        threadid,
                        sessionid,
                        username,
                    });
                    return resolve(res);
                });
            });
        }
        finally {
            await redisClient.quit()
        }
    },
    zrevrange: async ({
        key,
        start,
        stop,
        withscores,
        server,
        port,
        logContext: { sessionid, threadid, username },
    }) => {
        console.log('zz',logContext)
        l("zrevrange", JSON.stringify({ sessionid, threadid, username }));
        let redisClient = await getRedisClient({ server, port });
        try {
            if (withscores) {
               l("withscores");
                return new Promise(async (resolve, reject) => {
                    return redisClient.zrevrange(
                        key,
                        start,
                        stop,
                        "withscores",
                        async (err, res) => {
                            if (err) {
                                l(chalk.red.bold("REDIS.ZREVRANGE ERROR:", err));
                                await dbLog({
                                    type: "REDIS.ZREVRANGE.ERROR",
                                    body: err,
                                    threadid,
                                    sessionid,
                                    username,
                                });
                                return resolve(err);
                            }
                            //  l(chalk.cyan(`REDIS: ZREVRANGE[${key}]=${res}`));
                            await dbLog({
                                type: "REDIS.ZREVRANGE WITHSCORE RESULTS",
                                body: JSON.stringify(res),
                                threadid,
                                sessionid,
                                username,
                            });
                            let result = [];
                            for (var i = 0; i < res.length; i++) {
                                result.push({ value: res[i], score: res[++i] });
                            }
                            return resolve(result);
                        }
                    );
                });
            } else {
                return new Promise(async (resolve, reject) => {
                    return redisClient.zrevrange(
                        key,
                        start,
                        stop,
                        async (err, res) => {
                            if (err) {
                                l(chalk.red.bold("REDIS ERROR:", err));
                                await dbLog({
                                    type: "REDIS.ERROR",
                                    body: err,
                                    threadid,
                                    sessionid,
                                    username,
                                });
                                return resolve(err);
                            }
                            // l(chalk.cyan(`REDIS: ZREVRANGE[${key}]=${res}`));
                            await dbLog({
                                type: "REDIS.ZREVRANGE RESULTS",
                                body: JSON.stringify(res),
                                threadid,
                                sessionid,
                                username,
                            });
                            return resolve(res);
                        }
                    );
                });
            }
        }
        finally {
            await redisClient.quit()
        }
    },
    zscore: async ({
        key,
        member,
        server,
        port,
        logContext: { sessionid, threadid, username },
    }) => {
        let redisClient = await getRedisClient({ server, port });
        try {
            return new Promise(async (resolve, reject) => {
                return redisClient.zscore(key, member, async (err, res) => {
                    if (err) {
                        l(chalk.red.bold("REDIS.ZSCORE ERROR:", err));
                        await dbLog({
                            type: "REDIS.ZSCORE.ERROR",
                            body: err,
                            threadid,
                            sessionid,
                            username,
                        });
                        return resolve(err);
                    }
                    // l(chalk.cyan(`REDIS: ZSCORE [${key}]=${res}`));
                    await dbLog({
                        type: "REDIS.ZSCORE RESULTS",
                        body: JSON.stringify(res),
                        threadid,
                        sessionid,
                        username,
                    });
                    return resolve(res);
                });
            });
        }
        finally {
            await redisClient.quit()
        }
    },
    del: async ({
        key,
        server,
        port,
        logContext: { sessionid, threadid, username },
    }) => {
        let redisClient = await getRedisClient({ server, port });
        try {
            return new Promise(async (resolve, reject) => {
                return redisClient.del(key, async (err, res) => {
                    if (err) {
                        l(chalk.red.bold("REDIS.DEL ERROR:", err));
                        await dbLog({
                            type: "REDIS.DEL.ERROR",
                            body: err,
                            threadid,
                            sessionid,
                            username,
                        });
                        return resolve(err);
                    }
                    /* l(
                        chalk.cyan(
                            `REDIS: DEL[${key}]=${res}`,
                            JSON.stringify({ server, port, err })
                        )
                    );*/
                    await dbLog({
                        type: "REDIS.DEL",
                        body: JSON.stringify(res),
                        threadid,
                        sessionid,
                        username,
                    });
                    return resolve(res);
                });
            });
        }
        finally {
            await redisClient.quit()
        }
    },
    ft_create: async ({
        index,
        schema,
        prefix,
        server,
        port,
        logContext: { sessionid, threadid, username },
    }) => {
        let redisClient = await getRedisClient({ server, port });
        l('got redis client ft_create')
        try {
            let res = await redisClient.call("FT.CREATE", index,
                "PREFIX",
                "1",
                prefix,
                ...schema)
            return res;
        }
        catch (x) {
            l(chalk.red.bold(x))
        }
        finally {
            await redisClient.quit()
        }
    },
    ft_drop: async ({
        index,
        server,
        port,
        logContext: { sessionid, threadid, username },
    }) => {
        let redisClient = await getRedisClient({ server, port });
        try {
            const res = await redisClient.call(
                'FT.DROPINDEX',
                index

            )
            /* return new Promise(async (resolve, reject) => {
                return redisClient.ft_drop(index, async (err, res) => {
                    if (err) {
                        l(
                            chalk.blue.bold(
                                "REDIS ERROR:",
                                err,
                                threadid,
                                sessionid,
                                username
                            )
                        );
                        await dbLog({
                            show: true,
                            type: "REDIS.ERROR",
                            body: err,
                            threadid,
                            sessionid,
                            username,
                        });
                    }
                    l(
                        chalk.cyan(
                            `REDIS: server:${server} port:${port} FT.DROP[${index}]=${res}`
                        )
                    );
                    await dbLog({
                        type: "REDIS.FTDROP RESULTS",
                        body: JSON.stringify(res),
                        threadid,
                        sessionid,
                        username,
                    });
                    return resolve(res);
                });
                
            }); */
            return res;
        }
        catch (x) {
            l(chalk.red.bold(x))
        }
        finally {
            await redisClient.quit()
        }
    },
    ft_del: async ({
        index,
        slug,
        server,
        port,
        logContext: { sessionid, threadid, username },
    }) => {
        let redisClient = await getRedisClient({ server, port });
        try {
            return new Promise(async (resolve, reject) => {
                // l(chalk.cyan(`REDIS: FT.DEL `, index, slug));
                return redisClient.ft_del(index, slug, async (err, res) => {
                    if (err) {
                        l(chalk.red.bold("REDIS ERROR:", err));
                        await dbLog({
                            type: "REDIS.ERROR",
                            body: err,
                            threadid,
                            sessionid,
                            username,
                        });
                        return resolve(err);
                    }
                    // l(chalk.cyan(`REDIS: FT.DEL[${index}]=${res}`));
                    await dbLog({
                        type: "REDIS.FT_DEL RESULTS",
                        body: JSON.stringify(res),
                        threadid,
                        sessionid,
                        username,
                    });
                    return resolve(res);
                });
            });
        }
        finally {
            await redisClient.quit()
        }
    },
    hset: async ({
        slug,
        fields,
        server,
        port,
        logContext: { sessionid, threadid, username },
    }) => {
        // l(`fields:`, JSON.stringify(fields));
        let fieldsArray = [];
        let keys = Object.keys(fields);
        keys.forEach(key => {
            // l(`pushing key:${key}, value:${fields[key]}`);
            fieldsArray.push(key);
            fieldsArray.push(
                typeof fields[key] !== "undefined"
                    ? typeof fields[key] === "number"
                        ? `${fields[key]}`
                        : fields[key]
                            ? fields[key]
                            : ""
                    : ""
            );
        });
        /* l(
                chalk.green.bold(
                    "REDIS hset:",
                    server,
                    port,
                    ,
                    slug,
                    fieldsArray
                )
            );*/

        let redisClient = await getRedisClient({ server, port });
        try {
            return new Promise(async (resolve, reject) => {
                await dbLog({
                    show: false,
                    type: "REDIS.HSET",
                    body: JSON.stringify({
                        slug,
                        fields,
                        server,
                        port,
                    }),
                    threadid,
                    sessionid,
                    username,
                });
                /* l(
                        chalk.cyan(
                            "FT.ADD",
                            index,
                            slug,
                            1,
                            replace ? "REPLACE" : "",
                            "PAYLOAD {a1}",
                            "FIELDS",
                            JSON.stringify({ ...fieldsArray })
                        )
                    );*/
                return redisClient.hset(
                    slug,
                    1,
                    ...fieldsArray,
                    async (err, res) => {
                        if (err) {
                            l(
                                chalk.red.bold("REDIS ERROR:", err),
                                chalk.green(slug, fieldsArray)
                            );
                            await dbLog({
                                type: "REDIS.ERROR",
                                body: err,
                                threadid,
                                sessionid,
                                username,
                            });
                            l("RETRYING ON ERROR");
                            redisClient = getRedisClient({
                                remove: true,
                                server,
                                port,
                            });
                            await redisClient.end(true, async (err, res) => {
                                if (err) {
                                    l(chalk.red.bold("REDIS ERROR:", err));
                                    await dbLog({
                                        type: "REDIS.ERROR",
                                        body: err,
                                        threadid,
                                        sessionid,
                                        username,
                                    });
                                    return resolve(err);
                                }
                                l(chalk.cyan(`REDIS:END =${res}`));
                                await dbLog({
                                    type: "REDIS.END RESULTS",
                                    body: JSON.stringify(res),
                                    threadid,
                                    sessionid,
                                    username,
                                });
                                return resolve(res);
                            });
                            l("CLOSED REDIS CONNECTION");
                            redisClient = getRedisClient({ server, port });
                            return redisClient.hset(
                                slug,

                                ...fieldsArray,
                                async (err, res) => {
                                    if (err) {
                                        l(
                                            chalk.red.bold("REDIS ERROR:", err),
                                            chalk.green(slug, fieldsArray)
                                        );
                                        await dbLog({
                                            type: "REDIS.ERROR",
                                            body: err,
                                            threadid,
                                            sessionid,
                                            username,
                                        });
                                        return resolve(err);
                                    }
                                    /* l(
                            chalk.cyan(
                                `REDIS: HSET[${slug},${JSON.stringify({
                                    fields,
                                })},${JSON.stringify({ fieldsArray })}]=${res}`
                            )
                        );*/
                                    await dbLog({
                                        show: true,
                                        type: "REDIS.HSET RESULTS",
                                        body: JSON.stringify(res),
                                        threadid,
                                        sessionid,
                                        username,
                                    });
                                    return resolve(res);
                                }
                            );
                        }
                        /* l(
                                chalk.cyan(
                                    `REDIS: FT.ADD[${index},${slug},${JSON.stringify({
                                        fields,
                                    })},${JSON.stringify({ fieldsArray })}]=${res}`
                                )
                            );*/
                        await dbLog({
                            show: true,
                            type: "REDIS.HSET RESULTS",
                            body: JSON.stringify(res),
                            threadid,
                            sessionid,
                            username,
                        });
                        return resolve(res);
                    }
                );
            });
        }
        finally {
            await redisClient.quit()
        }
    },
    hgetall: async ({
        slug,
        server,
        port,
        logContext: { sessionid, threadid, username },
    }) => {
        // l(`fields:`, JSON.stringify(fields));

        let redisClient = await getRedisClient({ server, port });
        try {
            return new Promise(async (resolve, reject) => {
                await dbLog({
                    show: false,
                    type: "REDIS.HGETALL",
                    body: JSON.stringify({
                        slug,
                        server,
                        port,
                    }),
                    threadid,
                    sessionid,
                    username,
                });

                return redisClient.hgetall(slug, async (err, res) => {
                    if (err) {
                        l(chalk.red.bold("REDIS ERROR:", err), chalk.green(slugy));
                        await dbLog({
                            type: "REDIS.ERROR",
                            body: err,
                            threadid,
                            sessionid,
                            username,
                        });
                        l("RETRYING ON ERROR");
                        redisClient = getRedisClient({
                            remove: true,
                            server,
                            port,
                        });
                        await redisClient.end(true, async (err, res) => {
                            if (err) {
                                l(chalk.red.bold("REDIS ERROR:", err));
                                await dbLog({
                                    type: "REDIS.ERROR",
                                    body: err,
                                    threadid,
                                    sessionid,
                                    username,
                                });
                                return resolve(err);
                            }
                            l(chalk.cyan(`REDIS:END =${res}`));
                            await dbLog({
                                type: "REDIS.END RESULTS",
                                body: JSON.stringify(res),
                                threadid,
                                sessionid,
                                username,
                            });
                            return resolve(res);
                        });
                        l("CLOSED REDIS CONNECTION");
                        redisClient = getRedisClient({ server, port });
                        return redisClient.hgetall(slug, async (err, res) => {
                            if (err) {
                                l(
                                    chalk.red.bold("REDIS ERROR:", err),
                                    chalk.green(slug)
                                );
                                await dbLog({
                                    type: "REDIS.ERROR",
                                    body: err,
                                    threadid,
                                    sessionid,
                                    username,
                                });
                                return resolve(err);
                            }
                            /* l(
                            chalk.cyan(
                                `REDIS: HSET[${slug},${JSON.stringify({
                                    fields,
                                })},${JSON.stringify({ fieldsArray })}]=${res}`
                            )
                        );*/
                            await dbLog({
                                show: true,
                                type: "REDIS.HGET RESULTS",
                                body: JSON.stringify(res),
                                threadid,
                                sessionid,
                                username,
                            });
                            return resolve(res);
                        });
                    }

                    await dbLog({
                        show: true,
                        type: "REDIS.HGETALL RESULTS",
                        body: JSON.stringify(res),
                        threadid,
                        sessionid,
                        username,
                    });
                    return resolve(res);
                });
            });
        }
        finally {
            await redisClient.quit()
        }
    },
    ft_add: async ({
        index,
        slug,
        fields,
        replace,
        server,
        port,
        logContext: { sessionid, threadid, username },
    }) => {
        // l(`fields:`, JSON.stringify(fields));
        let fieldsArray = [];
        let keys = Object.keys(fields);
        keys.forEach(key => {
            // l(`pushing key:${key}, value:${fields[key]}`);
            fieldsArray.push(key);
            fieldsArray.push(
                typeof fields[key] !== "undefined"
                    ? typeof fields[key] === "number"
                        ? `${fields[key]}`
                        : fields[key]
                            ? fields[key]
                            : ""
                    : ""
            );
        });
        /* l(
             chalk.green.bold(
                 "REDIS ft_add:",
                 server,
                 port,
                 index,
                 slug,
                 fieldsArray
             )
         );*/
        l("call getRedisClient")
        let redisClient = await getRedisClient({ server, port });
        l("after getRedisClient", js(fieldsArray))
        try {







            const slot = `{${index}}`
            const key = `${slot}::${slug}`;
            l(chalk.yellow('FT_ADD',
                index,
                js([key,
                    1,
                    replace ? "REPLACE" : "",

                    "FIELDS",
                    ...fieldsArray])))

            let res = await redisClient.call(
                'FT.ADD',
                index,
                key,
                1,
                replace ? "REPLACE" : "",

                "FIELDS",
                ...fieldsArray)
            return res;


        }
        catch (x) {
            l(chalk.red.bold(x))

        }
        finally {
            l("finally,quit")
            await redisClient.quit()
            l("after quit")
        }
    },
    ft_mget: async ({
        index,
        ids,
        server,
        port,
        logContext: { sessionid, threadid, username },
    }) => {
        let redisClient = await getRedisClient({ server, port });
        try {
            return new Promise(async (resolve, reject) => {
                //l("calling mget", index, ...ids);
                return redisClient.ft_mget(index, ...ids, async (err, res) => {
                    if (err) {
                        l(chalk.red.bold("REDIS ERROR:", err));
                        await dbLog({
                            type: "REDIS.ERROR",
                            body: err,
                            threadid,
                            sessionid,
                            username,
                        });
                        return resolve(err);
                    }
                    let results = [];
                    if (res) {
                        for (var i = 0; i < res.length; i++) {
                            let r = res[i];
                            let rr = resultInfoToObject(r);
                            results.push(rr);
                            // l("out:", r, rr);
                        }
                    }

                    // l(chalk.cyan(`REDIS: GET[${key}]=${res}`));
                    await dbLog({
                        type: "REDIS FT.MGET",
                        body: js(results),
                        threadid,
                        sessionid,
                        username,
                    });
                    return resolve(results);
                });
            });
        }
        finally {
            await redisClient.quit()
        }
    },
    ft_info: async ({
        index,
        server,
        port,
        logContext: { sessionid, threadid, username },
    }) => {
        let redisClient = await getRedisClient({ server, port });
        try {

            return new Promise(async (resolve, reject) => {
                await dbLog({
                    show: false,
                    type: "REDIS.FT_INFO",
                    body: JSON.stringify({
                        index,
                        server,
                        port,
                    }),
                    threadid,
                    sessionid,
                    username,
                });
                return redisClient.ft_info(index, index, async (err, res) => {
                    if (err) {
                        l(chalk.red.bold("REDIS FT.INFO ERROR:", err));
                        await dbLog({
                            show: true,
                            type: "REDIS.FT_INFO.ERROR",
                            body: err,
                            threadid,
                            sessionid,
                            username,
                        });
                        return resolve(err);
                    } else {
                        //  l("ft.info results", JSON.stringify(res));
                        let results = resultInfoToObject(res);
                        await dbLog({
                            show: false,
                            type: "REDIS.FT_INFO RESULTS",
                            body: JSON.stringify(results),
                            threadid,
                            sessionid,
                            username,
                        });
                        return resolve(results);
                    }
                });
            });
        }
        finally {
            await redisClient.quit()
        }
    },
    ft_search: async ({
        index,
        query,
        page,
        size,
        orderBy,
        orderDir,
        server,
        port,
        supressLog,
        nocontent,
        logContext: { sessionid, threadid, username },
    }) => {
        supressLog = true;
        let redisClient = await getRedisClient({ server, port });
        try {
            //  l("FT_SEARCH query 1:", query);
            query = query.replace(/-/g, "\\-");
            // query += " NOCONTENT";
            // l("FT_SEARCH query 2:", query);

            let start = page * size;
            let res;
            if (orderBy) {
                if (nocontent) {
                    res = await redisClient.call('FT.SEARCH',
                        index,
                        query,
                        "NOCONTENT",
                        "SORTBY",
                        orderBy,
                        orderDir,
                        "LIMIT",
                        start,
                        size)

                    if (!supressLog) {
                        l(
                            chalk.cyan(
                                `REDIS: FT.SEARCH[${index}, ${`"${query}"`},SORTBY,${orderBy}, $orderDir, ${page}, ${size}]=${res}`
                            )
                        );
                    }
                    //  console.log("returning", results);
                    if (sessionid != "replicate") {
                        await dbLog({
                            type: "REDIS.FT_SEARCH RESULTS",
                            body: JSON.stringify(res),
                            threadid,
                            sessionid,
                            username,
                        });
                    }
                }
                else {
                    res = await redisClient.call('FT.SEARCH',
                        index,
                        query,
                        "SORTBY",
                        orderBy,
                        orderDir,
                        "LIMIT",
                        start,
                        size
                    )

                    if (!supressLog)
                        l(
                            chalk.cyan(
                                `REDIS: FT.SEARCH[${index}, ${`"${query}"`},SORTBY,${orderBy}, $orderDir, ${page}, ${size}]=${res}`
                            )
                        );
                    //  console.log("returning", results);
                    await dbLog({
                        type: "REDIS.FT_SEARCH RESULTS",
                        body: JSON.stringify(res),
                        threadid,
                        sessionid,
                        username,
                    });

                }

            } else {
                if (nocontent) {
                    res = await redisClient.call('FT.SEARCH',
                        index,
                        query,
                        nocontent ? "NOCONTENT" : "",
                        "LIMIT",
                        start,
                        size,
                    )
                    // let results = resultToObject(res);

                    if (sessionid != "replicate")
                        await dbLog({
                            type: "REDIS.FT_SEARCH RESULTS",
                            body: JSON.stringify(res),
                            threadid,
                            sessionid,
                            username,
                        });
                }
                else {
                    res = await redisClient.call('FT.SEARCH',
                        index,
                        query,
                        "LIMIT",
                        start,
                        size);
                    // let results = resultToObject(res);
                    if (sessionid != "replicate")
                        await dbLog({
                            type: "REDIS.FT_SEARCH RESULTS",
                            body: JSON.stringify(res),
                            threadid,
                            sessionid,
                            username,
                        });
                }

            }
            return (
                nocontent ? res : resultToObject(res)
            );
        }
        catch(x){
            l(chalk.red.bold(x))
        }
        finally {
            await redisClient.quit()
        }
    },

};
const push = async ({ index, type, slug, block, logContext, supressLog }) => {
    const { sessionid, threadid, username } = logContext;
    let { micros, session_id } = block;
    slug = slug || session_id; // for sessions - no slug
    const record = {
        index,
        slug,
        fields: {
            block: JSON.stringify(block),
            slug,
            type,
            micros,
            state: 0,
        },
        replace: true,
        logContext,
    };
    if (!supressLog)
        l(chalk.magenta("sync.push:", JSON.stringify({ record }, null, 4)));
    await dbLog({
        type: "replicate.push",
        body: JSON.stringify(record),
        threadid,
        sessionid,
        username,
    });
    await redisC.ft_add(record);
};


export { getRedisClient, redisC as redis, push,resultToObject };
