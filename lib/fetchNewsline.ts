
import { l, chalk, js } from "./common";
import { getRedisClient } from "./redis"
import { getNewslineDefaultTags, getUserNewslineTags, getSessionNewslineTags, updateDefaultNewsline, getTagDefinition } from "./db/newsline"
import { RedisKey } from 'ioredis';
import { Newsline, NewslineDefinition, ExplorerPublication, Publications, NewslineDefinitionItem, TagDefinition } from "./types/newsline"


const fetchNewsline = async ({ redis, threadid,sessionid, userslug, newsline, update }: { redis:any,threadid:number,sessionid?: string, userslug?: string, newsline: string, update?: number }) => {
    const id = userslug || sessionid;
 

 
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
  //  l(chalk.cyan.bold("fetchNewsline start",js({ sessionid, userslug, newsline, update,defaultNewslineDefinitionKey,userNewslineKey })))
  
    let userNewslineModified = false;
    let newslineObjectRaw = await redis.get(userNewslineKey);


    let userNewsline: any;
    if (newslineObjectRaw) {
       // console.log("has User Newsline ",newslineObjectRaw)
        userNewsline = JSON.parse(newslineObjectRaw)
    }
    else {
        //get from db and populate redis
       // js(chalk.yellow("-- get from db"))
        if (userslug) {
            userNewsline = await getUserNewslineTags({ threadid, key: `${newsline}-${userslug}` })
            if (userNewsline){
                await redis.setex(userNewslineKey, 7 * 24 * 3600, JSON.stringify(userNewsline));
            }

        }
        else if (sessionid) {
           // l("get from sessionNewslineTags")
            userNewsline = await getSessionNewslineTags({ threadid, key: `${newsline}-${sessionid}` })
            l(chalk.green("from db:",js(userNewsline)));
            if (userNewsline){
                await redis.setex(userNewslineKey, 7 * 24 * 3600, JSON.stringify(userNewsline));
            }
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
        n.default=true;
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
    defaultOverlayNewslineDefinition.sort((a: ExplorerPublication, b: ExplorerPublication) => a.name && b.name && a.name > b.name ? 1 : a.name && b.name && a.name < b.name ? -1 : 0);


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
          //  console.log(chalk.red.bold("==========================================================filling in details", js(f), js(cat)));
           // f.icon = cat.icon;
            f.description = cat.description;
            //f.name = cat.text;
            return resolve(true);
        });
    });

    await Promise.all(promises);
   // l(chalk.magenta.bold("fetchNewslines end:",js(defaultOverlayNewslineDefinition)))
    return defaultOverlayNewslineDefinition;

}
export default fetchNewsline;