// Next.js API route support: https://nextjs.org/docs/api-routes/introduction
import type { NextApiRequest, NextApiResponse } from 'next'

import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { getNewslineDefaultTags, getUserNewslineTags, getSessionNewslineTags, getNewslinePublications, updateDefaultNewsline, getTagDefinition } from "../../../../lib/db/newsline"
import { dbLog, dbEnd } from "../../../../lib/db"
import { RedisKey } from 'ioredis';
import { Newsline, NewslineDefinition, ExplorerPublication, Publications, NewslineDefinitionItem, TagDefinition } from "../../../../lib/types/newsline"


export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse
) {
    if (req.method !== 'POST') {
        res.status(405).send({ message: 'Only POST requests allowed' });
        return;
    }

    // console.log("inside fetchExplore handler",req.body)
    const body = req.body;
    let { sessionid, userslug, newsline, filter, q }: { sessionid?: string, userslug?: string, newsline: string, filter: string[], q?: string} = body;

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
                res.status(200).json({
                    success: false,
                    msg: "Can't get newsline"
                });
            }
            userNewslineModified = true;

        }

        let allPublicationsRaw: string | null = null, allPublications: Publications;
        let newslineCategoriesKey: RedisKey = `all-publications-${newsline}`
        if (!filter && !q) { //for the vasdt majority of default page loads, filter and q only when actively exploring feeds and setting the newsline, goes to db only
            allPublicationsRaw = await redis.get(newslineCategoriesKey);
        }

        if (allPublicationsRaw) {
            allPublications = JSON.parse(allPublicationsRaw);
        }
        else {
            //get from db
            allPublications = await getNewslinePublications({ threadid, newsline, filter, q }); //array of {name, icon,tag, description, category_tag, category_name}
            if (allPublications) {
                if (!filter && !q) {
                    allPublicationsRaw = JSON.stringify(allPublications);
                    await redis.setex(newslineCategoriesKey, 7 * 24 * 3600, allPublicationsRaw);
                }
            }
            else {
                return res.status(200).json({
                    success: false,
                    msg: "Can't get publications for newsline and filter"
                })
            }
        }

        // overlay private newsline over the default newsline

        //  for (let i = 0; i < defaultNewsline.length; i++) {

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


        //overlay combined newsline over selection of publications for explore tab
        for (let i = 0; i < allPublications.length; i++) {
            let n = allPublications[i];
            const f = defaultOverlayNewslineDefinition.find((f: any) => f.tag == n.tag);
            if (f) {
                n.default = f.default;
                n.switch = f.switch;
            }
            else {
                n.default = false;
                n.switch = 'off';
            }
        }
        //fill in the details from catJson.

        //fill-in the details from catJson

        const promises = allPublications.map(f => {
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
                f.icon = cat.icon;
                f.description = cat.description;
                f.name = cat.name;
                return resolve(true);
            });
        });

        await Promise.all(promises);

        return res.status(200).json({
            success: true,
            publications: allPublications,
        })

    }
    catch (x) {
        l(chalk.red.bold("Exception in fetchExplore", x));
        return res.status(500).json({})
    }
    finally {
        dbEnd(threadid);
        redis.quit();
    }
}
