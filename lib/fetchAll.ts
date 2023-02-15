import { l, chalk, js } from "./common";
import { getRedisClient } from "./redis"
import { getNewslineDefaultTags, getUserNewslineTags, getSessionNewslineTags, getNewslinePublications, updateDefaultNewsline, getTagDefinition } from "./db/newsline"
import { dbLog, dbEnd } from "./db"
import { RedisKey } from 'ioredis';
import { Newsline, NewslineDefinition, ExplorerPublication, Publications, NewslineDefinitionItem, TagDefinition } from "./types/newsline"
const fetchPublications = async ({ redis, threadid, sessionid, userslug, newsline, filters, q }: { redis: any, threadid: number, sessionid?: string, userslug?: string, newsline: string, filters: string[], q?: string }) => {

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

    const userNewslineKey = id ? `user-definition-newsline-${newsline}-${id}` : `definition-newsline-${newsline}`;
    let userNewslineModified = false;
    let newslineObjectRaw = await redis.get(userNewslineKey);
   // l(chalk.blue.bold("fetchAll",js({userNewslineKey,newslineObjectRaw})))

    let userNewsline: any;
    if (newslineObjectRaw) {
        userNewsline = JSON.parse(newslineObjectRaw)
    }
    if(!userNewsline||!userNewsline.length) {
        //get from db and populate redis
       
        if (userslug) {
            userNewsline = await getUserNewslineTags({ threadid, key: `${newsline}-${userslug}` })
            if (userNewsline&&userNewsline.length)
                await redis.setex(userNewslineKey, 7 * 24 * 3600, JSON.stringify(userNewsline));

        }
        else if (sessionid) {
            userNewsline = await getSessionNewslineTags({ threadid, key: `${newsline}-${sessionid}` })
          //  l(chalk.red("got session newsline from db",js({userNewsline}),"key:",js({userNewslineKey})))
            if (userNewsline&&userNewsline.length)
                await redis.setex(userNewslineKey, 7 * 24 * 3600, JSON.stringify(userNewsline));
        }

        
        userNewslineModified = true;

    }

    let allPublicationsRaw: string | null = null, allPublications: Publications;
    let newslineCategoriesKey: RedisKey = `all-publications-${newsline}${filters&&filters.length>0?`-${filters.join('-')}`:''}`
    //console.log(chalk.red(newslineCategoriesKey,filters,q))
    if (!q) { //for the vasdt majority of default page loads, filter and q only when actively exploring feeds and setting the newsline, goes to db only
        allPublicationsRaw = await redis.get(newslineCategoriesKey);
    }

    if (allPublicationsRaw) {
        allPublications = JSON.parse(allPublicationsRaw);
    }
    else {
        //get from db
        allPublications = await getNewslinePublications({ threadid, newsline, filters, q }); //array of {name, icon,tag, description, category_tag, category_name}
        if (allPublications) {
            if (!q) {
                allPublicationsRaw = JSON.stringify(allPublications);
                await redis.setex(newslineCategoriesKey, 7 * 24 * 3600, allPublicationsRaw);
            }
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
           // f.icon = cat.icon;
            if(!f.description)
             f.description =  cat.description;
            //f.name = cat.text;
            return resolve(true);
        });
    });

    await Promise.all(promises);
    return allPublications;
}
export default fetchPublications;
