// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { getNewslineDefaultTags, getUserNewslineTags, getSessionNewslineTags, updateDefaultNewsline, getTagDefinition } from "../../../../lib/db/newsline"
import { dbLog, dbEnd } from "../../../../lib/db"
import { RedisKey } from 'ioredis';
import { stringify } from 'querystring';
import { Newsline, NewslineDefinition, ExplorerPublication, Publications, NewslineDefinitionItem, TagDefinition } from "../../../../lib/types/newsline"


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    await NextCors(req, res, {
        // Options
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
        origin: '*',
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });


    // console.log("inside fetchExplore handler",req.body)
    const body = req.body;
    let { sessionid, userslug, newsline, update }: { sessionid?: string, userslug?: string, newsline: string,  update?: number } = body;

    const id = userslug || sessionid;
    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});

    if (!redis)
        return res.status(500).json({ msg: "Unable to create redis" })
    try {

        const defaultNewslineDefinitionKey: RedisKey = `definition-newsline-${newsline}`;
        let defaultNewslineDefinitionRaw = await redis.get(defaultNewslineDefinitionKey);
        let defaultNewslineDefinition: NewslineDefinition | null = null;
        if (defaultNewslineDefinitionRaw)
            defaultNewslineDefinition = JSON.parse(defaultNewslineDefinitionRaw);

        if (!defaultNewslineDefinition) {
            //get from db and populate redis
            defaultNewslineDefinition = await getNewslineDefaultTags({ threadid, newsline }); //sorted array of {name,tag,icon}
            if (defaultNewslineDefinition) {
                defaultNewslineDefinitionRaw = JSON.stringify(defaultNewslineDefinition);

                // Set the stringified JSON defaut newsline definition (for Navigator)
                await redis.setex(defaultNewslineDefinitionKey, 365 * 24 * 3600, defaultNewslineDefinitionRaw);

                const defaultNewslineKey: RedisKey = `newsline-${newsline}`;
                const defaultNewsline: Newsline = defaultNewslineDefinition.map(d => d.tag);

                // Rebuild the default newsline (for fetching the queues)

                await redis.del(defaultNewslineKey);
                await redis.sadd(defaultNewslineKey, defaultNewsline)
            }
        }
        else if (update == 1) { // for migrating from existing channel newslines (V10)
            const defaultNewsline: Newsline = defaultNewslineDefinition.map(d => d.tag);
            await updateDefaultNewsline({ threadid, newsline, defaultNewsline }); // note, db has only default newslines, newslineDefinitions are derived by combining with publications
        }
        const userNewslineKey = id ? `user-definition-newsline-${newsline}-${id}` : `definition-newsline-${newsline}`;
        let userNewslineModified = false;
        let newslineObjectRaw = await redis.get(userNewslineKey);


        let userNewsline: any;
        if (newslineObjectRaw) {
            userNewsline = JSON.parse(newslineObjectRaw)
        }
        else {
            //get from db and populate redis

            if (userslug) {
                userNewsline = await getUserNewslineTags({ threadid, key: `${newsline}-${userslug}` })
                if (userNewsline)
                    await redis.setex(userNewslineKey, 7 * 24 * 3600, JSON.stringify(userNewsline));

            }
            else if (sessionid) {
                userNewsline = await getSessionNewslineTags({ threadid, key: `${newsline}-${sessionid}` })
                if (userNewsline)
                    await redis.setex(userNewslineKey, 7 * 24 * 3600, JSON.stringify(userNewsline));
            }

            if (!userNewsline) {
                return res.status(200).json({
                    success: false,
                    msg: "Can't get newsline"
                });
            }
            userNewslineModified = true;

        }


        // overlay private newsline over the default newsline



        const defaultOverlayNewslineDefinition: Publications = defaultNewslineDefinition?.map(n => {

            const f = userNewsline.find((f: any) => f.tag == n.tag && f.switch == 'off');
            if (f) {
                n.switch = 'off';
            }
            else {
                n.switch = 'on';

            }
            return n;
            // defaultNewsline[i] = n;
        });

        for (let i = 0; i < userNewsline.length; i++) {
            let n: NewslineDefinitionItem = userNewsline[i];
            let f: ExplorerPublication | undefined = defaultOverlayNewslineDefinition.find((f: any) => f.tag == n.tag);
            if (f)
                continue;
            f = { ...n };
            f.default = false;
            defaultOverlayNewslineDefinition.push(f);
        }
        defaultOverlayNewslineDefinition.sort((a: ExplorerPublication, b: ExplorerPublication) => a.name && b.name && a.name > b.name ? 1 : a.name && b.name && a.name < b.name ? 1 : 0);


        //fill-in the details from catJson

        const promises = defaultOverlayNewslineDefinition.map(f => {
            return new Promise(async (resolve, reject) => {
                const key: RedisKey = `catJson-${f.tag}`;
                let catJson = await redis.get(key);
                let cat: TagDefinition = catJson ? JSON.parse(catJson) : null;
                if (!cat) {
                    // fill-in from DB and update redis
                    cat = await getTagDefinition({ threadid, tag: f.tag });
                    catJson = JSON.stringify(cat);
                    await redis.set(key, catJson);
                }
                console.log(chalk.red.bold("==========================================================filling in details",js(f),js(cat)));
                f.icon = cat.icon;
                //f.description = cat.description;
                //f.name = cat.text;
                return resolve(true);
            });
        });

        await Promise.all(promises);

        return res.status(200).json({
            success: true,
            newsline: defaultOverlayNewslineDefinition
        })
    }
    catch (x) {
        l(chalk.red.bold("Exception in fetchExplore", x));
        return res.status(500).json({})
    }
    finally{
        dbEnd(threadid);
        redis.quit();
    }

}
