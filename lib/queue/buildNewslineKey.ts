import { getUserTags, getNewslineDefaultTags, getUserNewslineTags, getSessionNewslineTags, updateDefaultNewsline, getTagDefinition } from "../db/newsline"
import { RedisKey } from 'ioredis';
import { l, chalk, js } from "../common";

const buildNewslineKey = async ({ newsline, userslug, sessionid, redis, threadid }: { newsline: string, userslug?: string, sessionid?: string, redis: any, threadid: number }) => {
    if (newsline == 'usconservative')
        newsline = 'qwiket';
   // l(chalk.yellow("buildNewslineKey", js({ newsline, userslug, sessionid })))
    /**
     * *
     * * get User of Session newsline, depending on present ids, if missing -
     * * get default newsline, if not, create and set in redis, getuser or session definition, mix the two and store user or session newsline
     * 
     *  Should be able to get everything from DB and cache the results in redis
     */

    let newslineKey;
    let defaultNewsline: Set<String>;
    if (userslug || sessionid) {

        const id = userslug || sessionid;
        const type = userslug ? 'user' : 'session';
        const userNewslineKey = `newsline-${newsline}-${id}`;
        // l(chalk.cyan("Custom newsline",js({userslug,sessionid,id,type,userNewslineKey})))
        const newslineUnsortedSet = await redis.smembers(userNewslineKey)
        const newslineSet = newslineUnsortedSet.sort() as unknown as Set<String>;
       // l(chalk.cyan('got from redis', js({ newslineSet })))
        if (!newslineSet || !newslineSet.size) {
            // l(chalk.cyan("No custom newslineSet in redis"));
            //get definition from DB
            const userNewsline = await getUserTags({ type, threadid, key: `${newsline}-${id}` })
            const defaultNewslineKey: RedisKey = `newsline-${newsline}`;
            const defaultUnsortedNewsline = await redis.smembers(defaultNewslineKey);
            defaultNewsline = defaultUnsortedNewsline.sort() as unknown as Set<String>;
            // l(chalk.cyan("From DB:",js({userNewsline,defaultNewslineKey,defaultNewsline,type:typeof defaultNewsline})));
            if (!defaultNewsline || !defaultNewsline.size) {
                const defaultNewslineDefinition = await getNewslineDefaultTags({ threadid, newsline }); //sorted array of {name,tag,icon}
                // l(chalk.cyan.bold("got defaultNewslineDefinition from DB",js({defaultNewslineDefinition})))
                if (defaultNewslineDefinition) {
                    const defaultNewslineA = defaultNewslineDefinition.map(d => d.tag) as unknown as Set<string>;
                    defaultNewsline = new Set<String>(defaultNewslineA);
                    // Rebuild the default newsline (for fetching the queues)
                    //  l(chalk.cyan.bold("after map",js({defaultNewsline})))
                    await redis.sadd(defaultNewslineKey, defaultNewsline)
                }
                if (!defaultNewsline)
                    throw ('cant create a newsline');

                // now go through user newsline and modify defaultNewsline accordingly
                if (userNewsline) {
                    userNewsline.forEach(({ tag, switchParam }: { tag: string, switchParam: 'on' | 'off' }) => {
                        if (switchParam == 'on') {
                            defaultNewsline.add(tag); // safe for duplicates because set
                        }
                        else {
                            defaultNewsline.delete(tag);
                        }
                    })
                }
            }
            newslineKey = Array.from(defaultNewsline).join(':');
            await redis.sadd(userNewslineKey, ...Array.from(defaultNewsline));

        }
        else {
            newslineKey = Array.from(newslineSet).join(':');
            // l(chalk.cyan("got newslineKey", js({ newslineKey, newslineSet })))
        }

    }
    if (!newslineKey) {
        // console.log("No newsline key after userslug and sessionid")
        const defaultNewslineKey: RedisKey = `newsline-${newsline}`;
        const defaultUnsortedNewsline = await redis.smembers(defaultNewslineKey);

        defaultNewsline = defaultUnsortedNewsline.sort() as unknown as Set<string>;
        // l(chalk.cyan(js({defaultNewsline,defaultNewslineKey})))
        if (!defaultNewsline || !defaultNewsline.size) {
            const defaultNewslineDefinition = await getNewslineDefaultTags({ threadid, newsline }); //sorted array of {name,tag,icon}
            if (defaultNewslineDefinition) {
                defaultNewsline = defaultNewslineDefinition.map(d => d.tag) as unknown as Set<string>;
                // Rebuild the default newsline (for fetching the queues)
                await redis.sadd(defaultNewslineKey, defaultNewsline)
            }
            if (!defaultNewsline)
                throw ('cant create a newsline 2');
        }
        newslineKey = Array.from(defaultNewsline).join(':');

        if (!newslineKey)
            throw ('cant create a newsline 3');
        l(chalk.magenta.bold("##################  newslineKey",newslineKey))
    }
    return newslineKey;
}
export default buildNewslineKey;