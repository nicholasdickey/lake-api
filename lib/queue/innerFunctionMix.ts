import { l, chalk, js } from "../common";
import { Qwiket, React } from "../types/qwiket";
import {getPJson,getNtJson} from './fetchQwiket';

const getNewCount = async ({ threadid,newslineKey, forum, commentsKey, lastXid, tail, redis }: { threadid:number,newslineKey: string, forum: string, commentsKey: string, lastXid: number, tail: number, redis: any }) => {
    //l(chalk.green.bold(`ifm: getNewCount`, js({ lastXid, tail })))
    if (!lastXid)
        return {
            success: false,
            newItems: 0,
            msg: 'No lastid provided'
        }
    let lastTime = 0;
    if (tail) {
        const pJson = await getPJson({ threadid,qpostid: tail, forum, redis });
        if (pJson && pJson.createdat)
            lastTime = +pJson.createdat;
    }
    else {
        const ntJson = await getNtJson({ threadid,xid: lastXid, redis });
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

const prependComments = async ({ threadid,commentsKey, lastCreatedAt, tail, forum, redis }: { threadid:number,commentsKey: string, lastCreatedAt: number, tail: number, forum: string, redis: any }) => {
    const comments = await redis.zrevrangebyscore(commentsKey, '+inf', lastCreatedAt, 'withscores');
    // l(chalk.green.bold("ifm: inside prependComments", tail,commentsKey, lastCreatedAt, comments))
    let trigger = tail > 0 ? false : true;
    let prepends: Array<{ item: Qwiket | React }> = [];
    for (let i = 0; i < comments.length; i++) {
        const qpostid = comments[i++];
        const createdAt = comments[i];
        if (!trigger) {
            // console.log("NO TRIGGER",tail,qpostid)
            if (tail == qpostid)
                trigger = true;
        }
        if (trigger) {
            const pJson = await getPJson({ threadid,qpostid, forum, redis });
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
const innerFunctionMix = async ({ threadid,newslineKey, lastid, forum, redis, page, size, tail, countonly }: { threadid:number,newslineKey: string, lastid: string, forum: string, redis: any, page: number, size: number, tail: number, countonly: number }) => {
    const t1 = Date.now();
    const commentsKey = `lpxids-${forum}`;

    let lastXid = + lastid;
    if (countonly == 1)
        return await getNewCount({ threadid,newslineKey, forum, commentsKey, lastXid, tail, redis })
    l("DBG:innerFunctionMix", js({ lastid, page, size }))

    /**
     * * If lastid=0 need to find actual lastxid, and compare it to lastXidKey
     * * If still current, can reuse secondaryCache for that lastid
     * * Otherwise, set new lastid. 
     */

    /**
     * * ok, now we have lastXid
     */

    let pageJson = [];
    let pageJsonRaw;
    if (page > 0) {
        const pageKey = `2ndCache-mix-page-${page}-${newslineKey}-${lastXid}`;
        pageJsonRaw = await redis.get(pageKey);
        l(chalk.green.bold("ifm: pageJsonRaw", pageKey, pageJsonRaw, page, size))
        if (pageJsonRaw) {  //already in cache, just if page==0 prepend comments to tail (or end if no tail)
            redis.expire(pageKey, 600);
            pageJson = JSON.parse(pageJsonRaw);
            if (page == 0) {// will need to prepend fresh comments from tail  
                // l(chalk.yellow.bold("6684",js(pageJson[0])))      
                const { shared_time } = pageJson[0].item || { shared_time: '' };
                const { tail: newTail, prepends } = await prependComments({ threadid,commentsKey, lastCreatedAt: shared_time, tail, forum, redis });
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
                type: "mix",
                lastid: lastXid //switching to xid
            }
        }
    }


    let trigger = false;
    let triggerPosition = 0;
    let prevCreatedAt = 0;
    let count=0;
    if (page > 0) {
        while (!trigger) {
            const [xid, createdAt] = await redis.zrevrange(newslineKey, triggerPosition, triggerPosition, "withscores");
            l("looking for lastid",xid,lastXid)
            if (xid == lastXid) {
                trigger = true;
                prevCreatedAt = createdAt + 100000; // only used for page0, otherwise overriden
                l(chalk.green.bold('ifm: lastXid trigger ON!!!', triggerPosition, createdAt))
            }
            else {
                triggerPosition++;
                prevCreatedAt = createdAt;
            }
            if(count++>1000)
            break;
        }
    }

    const start = page == 0 ? 0 : triggerPosition + page * size + 1;
    const end = page == 0 ? size - 1 : triggerPosition + (page + 1) * size;

    l(`await redis.zrevrange(prevCreatedAt,newslineKey, start, end, "withscores")`, js({ prevCreatedAt, newslineKey, start, end }))
    // console.log('t6 Time:',Date.now()-t1)
    let newslineAll = await redis.zrevrange(newslineKey, start, end, "withscores");
    l(chalk.magenta.bold("ifm:got all newslines", start, end, newslineAll.length, newslineAll))
    if (page > 0) {
        const [xid, createdAt] = await redis.zrevrange(newslineKey, start - 1, start - 1, 'withscores');
        l(chalk.blue.bold("`ifm: page>0, looking for the prevCreatedAt", js({ newslineKey, start: start - 1, end: start - 1, xid, createdAt })));
        prevCreatedAt = createdAt;
    }
    else {
        prevCreatedAt = 9999999999999999999;
    }



    let lastCreatedAt = prevCreatedAt; // 0 when page==0 and no lastid or lastid still first item;
    // l(chalk.cyan.bold("ifm: lastCreatedAt", lastCreatedAt))
    // console.log('t7 Time:',Date.now()-t1)
    for (let i = 0; i < newslineAll.length; i++) {
        const xid = newslineAll[i++];
        if (page == 0 && i == 1){
            l("setting xid for page 0",xid)
            lastXid = xid;
        }
        const shared_time = newslineAll[i];
        console.log("ifn: inside newslineAll loop", i, page,xid, shared_time)
        /**
         * First item (lastid) is left without commentsBefore, those will be filled out for each call depending on tail and current comments
         */

        let commentsBefore = [];
        if (lastCreatedAt) {
            commentsBefore = await redis.zrevrangebyscore(commentsKey, lastCreatedAt - 1, shared_time);
            //  console.log(`t5-${i} Time:`,Date.now()-t1)
            l(chalk.yellow(`ifm: commentsBefore`, js({ commentsKey, lastCreatedAt: lastCreatedAt - 1, shared_time, commentsBefore })))
        }

        lastCreatedAt = shared_time;//i == 0 ? shared_time : commentsBefore[1]; //0 is id, q - createdat

        if (commentsBefore) {
            l(chalk.yellow("commentsBefore", js(commentsBefore)))
            for (let j = 0; j < commentsBefore.length; j++) {
                const qpostid = commentsBefore[j];
                if(page==0&&i==1&&j==0)
                    tail=qpostid;
                console.log('comment push', qpostid)
                const pJson = await getPJson({ threadid,qpostid, forum, redis });
                console.log('============  8235',pJson)
                // console.log(`t4-${i} Time:`,Date.now()-t1)
                pageJson.push({ item: pJson });
            }
        }
        const ntJson = await getNtJson({ threadid, xid, redis });
        pageJson.push({ item: ntJson });
        //  l('push ntJson',js(ntJson))
    }

    if (page > 0) {
        const pageKey = `2ndCache-mix-page-${page}-${newslineKey}-${lastXid}`;
        pageJsonRaw = JSON.stringify(pageJson);
        await redis.setex(pageKey, 600, pageJsonRaw); // cahce for the next 10 mins;
    }

    l("returning lastid=",lastXid,page)
    const ret = {
        success: true,
        type: "mix",
        items: pageJson,
        tail,
        lastid: lastXid
    };

    try {
        return ret;
    }
    catch (x) {
        l(chalk.yellow.bold(x))
    }
}
export default innerFunctionMix;