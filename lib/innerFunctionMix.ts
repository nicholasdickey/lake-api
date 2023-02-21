import { isReturnStatement } from "typescript";
import { l, chalk, js } from "./common";
import { Qwiket } from "./types/qwiket";

const getNewCount = async ({ newslineKey, forum, commentsKey, lastXid, tail, redis }: { newslineKey: string, forum: string, commentsKey: string, lastXid: number, tail: number, redis: any }) => {
    //l(chalk.green.bold(`ifm: getNewCount`, js({ lastXid, tail })))
    if (!lastXid)
        return {
            success: false,
            newItems: 0,
            msg: 'No lastid provided'
        }
    let lastTime = 0;
    if (tail) {
        const pJson = await getPJson({ qpostid: tail, forum, redis });
        if (pJson && pJson.createdat)
            lastTime = +pJson.createdat;
    }
    else {
        const ntJson = await getNtJson({ xid: lastXid, redis });
        // l(chalk.green.bold(`ifm: got last ntJson`, js(ntJson)))
        if (ntJson)
            lastTime = + ntJson.shared_time;
    }
    if (!lastTime)
        return {
            success: false,
            newItems: 0,
            msg: 'No lastTime derived'
        }
    const minTime = lastTime + 1;
    const newComments = await redis.zcount(commentsKey, minTime, '+inf');
    const newItems = await redis.zcount(newslineKey, minTime, '+inf');
    // l(chalk.green.bold(`ifm: got lasTime`, minTime, commentsKey, newslineKey, newItems, newComments))
    return {
        success: true,
        newItems: newItems + newComments
    }
}

const prependComments = async ({ commentsKey, lastCreatedAt, tail, forum, redis }: { commentsKey: string, lastCreatedAt: number, tail: number, forum: string, redis: any }) => {
    const comments = await redis.zrevrangebyscore(commentsKey, '+inf', lastCreatedAt, 'withscores');
    // l(chalk.green.bold("ifm: inside prependComments", tail,commentsKey, lastCreatedAt, comments))
    let trigger = tail > 0 ? false : true;
    let prepends: Array<{ item: Qwiket }> = [];
    for (let i = 0; i < comments.length; i++) {
        const qpostid = comments[i++];
        const createdAt = comments[i];
        if (!trigger) {
            // console.log("NO TRIGGER",tail,qpostid)
            if (tail == qpostid)
                trigger = true;
        }
        if (trigger) {
            const pJson = await getPJson({ qpostid, forum, redis });
            //l(chalk.yellow.bold(js({pJson})))
            if (pJson) {
                prepends.push({ item: pJson });
                // l(chalk.red.bold("CHECKING FOR NEW TAIL",tail,i,qpostid))
                if (!tail && i == 1) {
                    //l(chalk.whiteBright.bgBlue(`NEW TAIL`,tail,qpostid))
                    tail = qpostid;
                }
            }
        }
    }
    // l(`returning${js({tail})}`)
    return { tail, prepends };
}

const getPJson = async ({ qpostid, forum, redis }: { qpostid: number, forum: string, redis: any }) => {
    const commentKey = `pjson-${forum}-${qpostid}`;
    //l(chalk.yellow.bold(js({commentKey})))
    const pJsonRaw = await redis.get(commentKey);
    let pJson: Qwiket | null = null;
    if (!pJsonRaw) {
        /**
         * Get from DB
         */
    }
    else
        pJson = JSON.parse(pJsonRaw);
    //  l(chalk.cyan.bold(js({pJsonRaw,pJson})))    
    return pJson;
}
const getNtJson = async ({ xid, redis }: { xid: number, redis: any }) => {
    const ntJsonRaw = await redis.get(`ntjson-${xid}`);
    let ntJson: Qwiket | null = null;
    if (!ntJsonRaw) {
        /**
         * Get from DB
         */
    }
    else {
        ntJson = JSON.parse(ntJsonRaw);
    }
    return ntJson;
}

/**
 * *    Note that size is only for newsline items, 
 * *    comments will be mixed in as appropriate, increasing the size of the return
 * 
 * *    For now, we continue using lastid for mix, but once debugged, switch to lastXid
 * 
 * @param {newslineKey,lastid,forum,redis,page,size}:{newslineKey:string,lastid:string,forum:string,redis:any,page:number,size:number} 
 */
interface CommentsBefore {
    qpostid: number,
    createdAt: number
}
interface SecondaryCacheItem {
    xid: number,
    shared_time: number,
    commentsBefore?: Array<CommentsBefore>
}
const innerFunctionMix = async ({ newslineKey, lastid, forum, redis, page, size, tail, countonly }: { newslineKey: string, lastid: string, forum: string, redis: any, page: number, size: number, tail: number, countonly: number }) => {
    const t1 = Date.now();
    const commentsKey = `lpxids-${forum}`;
    //  const noLastid = !(lastid && lastid != '' && lastid.length > 5);
    let lastXid = + lastid;
    if (countonly == 1)
        return await getNewCount({ newslineKey, forum, commentsKey, lastXid, tail, redis })

    //l(99999)
    /**
     * * If lastid=0 need to find actual lastxid, and compare it to lastXidKey
     * * If still current, can reuse secondaryCache for that lastid
     * * Otherwise, set new lastid. 
     */
    if (!lastXid) {
        const lastIdFromCache = await redis.zrevrange(newslineKey, 0, 0);

        lastXid = lastIdFromCache[0];
        //  l(chalk.yellow.bold('ifm: ', js({ lastIdFromCache, newslineKey, lastXid })));

        /* let ntJson = await getNtJson({ xid: lastXid, redis });
         if (ntJson)
             lastid = ntJson.slug; */
        //  l(chalk.green.bold("ifm: NOLASTID, got the latest", js({ lastid, lastXid })));
    }
    else {
        // lastXid = lastid ? await redis.get(`txids-${lastid}`) : 0;
        // l(chalk.green.bold("ifm: HAS LASTID, got the latest", js({ lastid, lastXid })));
    }

    /**
     * * ok, now we have lastXid
     */

    let pageJson = [];
    const pageKey = `2ndCache-mix-page-${page}-${newslineKey}-${lastXid}`;
    let pageJsonRaw = await redis.get(pageKey);
   // l(chalk.green.bold("ifm: pageJsonRaw", pageKey, pageJsonRaw, page, size))
    if (pageJsonRaw) {  //already in cache, just if page==0 prepend comments to tail (or end if no tail)
        redis.expire(pageKey, 600);
        pageJson = JSON.parse(pageJsonRaw);
        if (page == 0) {// will need to prepend fresh comments from tail  
           // l(chalk.yellow.bold("6684",js(pageJson[0])))      
            const { shared_time } = pageJson[0].item||{shared_time:''};
            const { tail: newTail, prepends } = await prependComments({ commentsKey, lastCreatedAt: shared_time, tail, forum, redis });
            tail = newTail;
            pageJson.unshift(...prepends); // prepend all the new comments in the descending order
            // console.log("ifm: adding prepends existing page:", js({ newTail,prepends }))
        }
       /* console.log({
            success: true,
            items: pageJson,
            tail,
            lastid: lastXid //switching to xid
        })*/
    
        return {
            success: true,
            items: pageJson,
            tail,
            lastid: lastXid //switching to xid
        }
    }

    // const secondaryCacheKey = `2ndCache-mix-${newslineKey}-${lastXid}`; // will start the queue on lastid, then  prepend later comments to the first page when returning
    // const secondaryCacheRaw = null;//await redis.get(secondaryCacheKey);
    // l(chalk.green.bold("ifm: secondaryCache", js({ secondaryCacheKey, secondaryCacheRaw })))
    //let secondaryCache: Array<SecondaryCacheItem> | null = null;

    /*if (secondaryCacheRaw) {
        redis.expire(secondaryCacheKey, 600); // keep it for another 10 minutes, expire after a minute of no use
        secondaryCache = JSON.parse(secondaryCacheRaw);
        console.log("ifm: parsed secondaryCache")
    }
    else {
        secondaryCache = [];*/
    //Build a combined set of newsline items (sorted by shared time) and comments.
    //Remember the last comment time as a tail.'
    //  l(chalk.cyan.bold("ifm: fresh secondary cache"))


    let trigger = false;
    let triggerPosition = 0;
    let prevCreatedAt = 0;
    while (!trigger) {
        const [xid, createdAt] = await redis.zrevrange(newslineKey, triggerPosition, triggerPosition);
        if (xid == lastXid) {
            trigger = true;
            // l(chalk.green.bold('ifm: lastXid trigger ON!!!', triggerPosition))
        }
        else {
            triggerPosition++;
            prevCreatedAt = createdAt;
        }
    }
   // l(987672626)
    const start = triggerPosition + page * size;
    const end = triggerPosition + (page + 1) * size - 1;
    // console.log('t6 Time:',Date.now()-t1)
    let newslineAll = await redis.zrevrange(newslineKey, start, end, "withscores");
    // l(chalk.magenta.bold("ifm:got all newslines", start, end, newslineAll.length, newslineAll))
    if (page > 0) {
        const [xid, createdAt] = await redis.zrevrange(newslineKey, triggerPosition + (page + 1) * size, triggerPosition + (page + 1) * size, 'withscores');
        // l(chalk.blue.bold("`ifm: page>0, looking for the prevCreatedAt",newslineKey,triggerPosition-1+page*size,triggerPosition - 1 + page * size,createdAt))
        prevCreatedAt = createdAt;
    }
    //  let xids = new Array<{ xid: number, shared_time: number }>;
    let lastCreatedAt = prevCreatedAt; // 0 when page==0 and no lastid or lastid still first item;
    // l(chalk.cyan.bold("ifm: lastCreatedAt", lastCreatedAt))
    // console.log('t7 Time:',Date.now()-t1)
    for (let i = 0; i < newslineAll.length; i++) {
        const xid = newslineAll[i++];

        const shared_time = newslineAll[i];
        // console.log("ifn: inside newslineAll loop", i, shared_time)
        /**
         * First item (lastid) is left without commentsBefore, those will be filled out for each call depending on tail and current comments
         */

        let commentsBefore = [];
        if (lastCreatedAt) {
            commentsBefore = await redis.zrevrangebyscore(commentsKey, lastCreatedAt, shared_time);
            //  console.log(`t5-${i} Time:`,Date.now()-t1)
            //  l(chalk.yellow(`ifm: commentsBefore`, js({ commentsKey, lastCreatedAt, shared_time, commentsBefore })))
        }

        lastCreatedAt = shared_time;//i == 0 ? shared_time : commentsBefore[1]; //0 is id, q - createdat

        if (commentsBefore) {
           // l(chalk.yellow("commentsBefore",js(commentsBefore)))  
            for (let j = 0; j < commentsBefore.length; j++) {
                const qpostid = commentsBefore[j];
               // console.log('2213',qpostid)
                const pJson = await getPJson({ qpostid, forum, redis });
               // console.log('8235',pJson)
                // console.log(`t4-${i} Time:`,Date.now()-t1)
                pageJson.push({ item: pJson });
            }
        }
        const ntJson = await getNtJson({ xid, redis });
        pageJson.push({ item: ntJson });
    }
    /*
    // SecondaryCache is now ready
    const secondaryCacheRaw = JSON.stringify(secondaryCache);
    l(chalk.green("ifn: secondaryCacheRaw", secondaryCacheRaw))
    await redis.setex(secondaryCacheKey, 600, secondaryCacheRaw);
    */
    /* }
     if (!secondaryCache) {
         return {
             success: false,
             msg: 'Unable to create secondary cache for mix queue'
         }
     }*/
    // locate the page
    /*const start = page * size;
 
     for (let i = 0; i < size; i++) {
         const { xid, commentsBefore } = secondaryCache[start + i];
         console.log("build page", xid, i)
         if (commentsBefore) {
             for (let j = 0; j < commentsBefore.length; j++) {
                 const { qpostid } = commentsBefore[j];
                 const pJson = await getPJson({ qpostid, forum, redis });
                 pageJson.push(pJson);
             }
             const ntJson = await getNtJson({ xid, redis });
             pageJson.push(ntJson);
         }
     }*/
    pageJsonRaw = JSON.stringify(pageJson);
    await redis.setex(pageKey, 600, pageJsonRaw); // cahce for the next 10 mins;
    /* const times=pageJson.map(it=>{
        // console.log(it)
         const {item}=it;
         if(!item){
             l(chalk.redBright("NO ITEM"))
             return null;
         }
         if(item.createdat){
             l(`returning createdAt`,item.createdat)
             return item.createdat;
         }
         l(`returning shared_time`,item.shared_time)
         return item.shared_time;
     })
     l(chalk.bgBlue.whiteBright(`times: ${js(times)}`))*/
    // console.log('End Time:',Date.now()-t1)
    console.log(93939)
    if (page == 0 && pageJson[0]) {// will need to prepend fresh comments from tail   
        const item = pageJson[0].item;
        if (item) {
            // console.log(chalk.magenta("ifm: adding prepend comments for fresh page:", js({ page, pageJson: item, tail })))
            const { shared_time } = item;

            const { tail: newTail, prepends } = await prependComments({ commentsKey, lastCreatedAt: +(shared_time ? shared_time : 0), tail, forum, redis });
            tail = newTail;
            //console.log(chalk.blue("ifm: adding prepends page:", js({ prepends })))
            pageJson.unshift(...prepends); // prepend all the new comments in the descending order
        }
    }
    console.log(88111)
    //   console.log('End Time:',Date.now()-t1)
    const ret = {
        success: true,
        type: "mix",
        items: pageJson,
        tail,
        lastid: lastXid
    };
     console.log("ifm: returning", js(ret));
    /*return {
                    type: "mix",
                    success: true,
                    lastid: lastid,
                    items: items,
                    tail: tail,
                };*/
    try {
        return ret;
    }
    catch (x) {
        l(chalk.yellow.bold(x))
    }
}
export default innerFunctionMix;