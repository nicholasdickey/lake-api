//./lib/queue/inner-function-mix.ts
import { l, chalk, js } from "../common";
import { Qwiket, React } from "../types/qwiket";
import { getPJson, getNtJson } from './fetch-qwiket';

const getNewCount = async ({ threadid, newslineKey, forum, commentsKey, lastXid, tail, redis }: { threadid: number, newslineKey: string, forum: string, commentsKey: string, lastXid: number, tail: number, redis: any }) => {
    if (!lastXid)
        return {
            success: false,
            newItems: 0,
            msg: 'No lastid provided'
        }
    let lastTime = 0;
    if (tail) {
        const pJson = await getPJson({ threadid, qpostid: tail, forum, redis });
        if (pJson && pJson.createdat)
            lastTime = +pJson.createdat;
    }
    else {
        const ntJson = await getNtJson({ threadid, xid: lastXid, redis });
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
    return {
        success: true,
        newItems: newItems + newComments
    }
}

const prependComments = async ({ threadid, commentsKey, lastCreatedAt, tail, forum, redis }: { threadid: number, commentsKey: string, lastCreatedAt: number, tail: number, forum: string, redis: any }) => {
    const comments = await redis.zrevrangebyscore(commentsKey, '+inf', lastCreatedAt, 'withscores');
    let trigger = tail > 0 ? false : true;
    let prepends: Array<{ item: Qwiket | React }> = [];
    for (let i = 0; i < comments.length; i++) {
        const qpostid = comments[i++];
        const createdAt = comments[i];
        if (!trigger) {
            if (tail == qpostid)
                trigger = true;
        }
        if (trigger) {
            const pJson = await getPJson({ threadid, qpostid, forum, redis });
            if (pJson) {
                prepends.push({ item: pJson });
                if (!tail && i == 1) {
                    tail = qpostid;
                }
            }
        }
    }
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
const innerFunctionMix = async ({ threadid, newslineKey, lastid, forum, redis, page, size, tail, countonly }: { threadid: number, newslineKey: string, lastid: string, forum: string, redis: any, page: number, size: number, tail: number, countonly: number }) => {
    const t1 = Date.now();
    const commentsKey = `lpxids-${forum}`;
    l(chalk.green("innerFunctionMix:",js({ threadid, newslineKey, lastid, forum,  page, size, tail, countonly })));
    let lastXid = + lastid;
    if (countonly == 1)
        return await getNewCount({ threadid, newslineKey, forum, commentsKey, lastXid, tail, redis })

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
        l(chalk.yellow("pageJsonRaw:", pageJsonRaw));
        if (pageJsonRaw) {  //already in cache, just if page==0 prepend comments to tail (or end if no tail)
            redis.expire(pageKey, 600);
            pageJson = JSON.parse(pageJsonRaw);
            if (page == 0) {// will need to prepend fresh comments from tail  
                const { shared_time } = pageJson[0].item || { shared_time: '' };
                const { tail: newTail, prepends } = await prependComments({ threadid, commentsKey, lastCreatedAt: shared_time, tail, forum, redis });
                tail = newTail;
                pageJson.unshift(...prepends); // prepend all the new comments in the descending order
            }
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
    let count = 0;
    if (page > 0) {
        while (!trigger) {
            const [xid, createdAt] = await redis.zrevrange(newslineKey, triggerPosition, triggerPosition, "withscores");
            if (xid == lastXid) {
                trigger = true;
                prevCreatedAt = createdAt + 100000; // only used for page0, otherwise overriden
            }
            else {
                triggerPosition++;
                prevCreatedAt = createdAt;
            }
            if (count++ > 1000)
                break;
        }
    }
    const start = page == 0 ? 0 : triggerPosition + page * size + 1;
    const end = page == 0 ? size - 1 : triggerPosition + (page + 1) * size;

    let newslineAll = await redis.zrevrange(newslineKey, start, end, "withscores");
    l(chalk.yellow("newslineAll:", newslineAll));
    if (page > 0) {
        const [xid, createdAt] = await redis.zrevrange(newslineKey, start - 1, start - 1, 'withscores');
        prevCreatedAt = createdAt;
    }
    else {
        prevCreatedAt = 9999999999999999999;
    }
    let lastCreatedAt = prevCreatedAt; // 0 when page==0 and no lastid or lastid still first item;
    for (let i = 0; i < newslineAll.length; i++) {
        const xid = newslineAll[i++];
        if (page == 0 && i == 1) {
            lastXid = xid;
        }
        const shared_time = newslineAll[i];

        /**
         * First item (lastid) is left without commentsBefore, those will be filled out for each call depending on tail and current comments
         */

        let commentsBefore = [];
        if (lastCreatedAt) {
            commentsBefore = await redis.zrevrangebyscore(commentsKey, lastCreatedAt - 1, shared_time);
        }

        lastCreatedAt = shared_time;//i == 0 ? shared_time : commentsBefore[1]; //0 is id, q - createdat

        if (commentsBefore) {
            for (let j = 0; j < commentsBefore.length; j++) {
                const qpostid = commentsBefore[j];
                if (page == 0 && i == 1 && j == 0)
                    tail = qpostid;
                const pJson = await getPJson({ threadid, qpostid, forum, redis });
                pageJson.push({ item: pJson });
            }
        }
        const ntJson = await getNtJson({ threadid, xid, redis });
        l(chalk.cyan("===>ntJson:",xid, ntJson?.tag, ntJson?.author_name));
        pageJson.push({ item: ntJson });
    }
    if (page > 0) {
        const pageKey = `2ndCache-mix-page-${page}-${newslineKey}-${lastXid}`;
        pageJsonRaw = JSON.stringify(pageJson);
       
        await redis.setex(pageKey, 600, pageJsonRaw); // cahce for the next 10 mins;
    }
   l(chalk.magenta("pageJson:", js(pageJson)));
    const ret = {
        success: true,
        type: "mix",
        items: pageJson,
        tail,
        lastid: lastXid
    };
    return ret;
}
export default innerFunctionMix;