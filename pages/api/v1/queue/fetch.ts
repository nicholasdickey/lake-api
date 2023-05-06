//./pages/api/v1/queue/fetch.ts
import type { NextApiRequest, NextApiResponse } from 'next'
import NextCors from 'nextjs-cors';
import { l, chalk, js } from "../../../../lib/common";
import { getRedisClient } from "../../../../lib/redis"
import { dbEnd } from "../../../../lib/db"
import { fetchQueue } from "../../../../lib/queue/fetch-queue"
import { processPostBody } from '../../../../lib/process-post-body';

export default async function handler(
    req: NextApiRequest,
    res: NextApiResponse<any>
) {
    await NextCors(req, res, {
        // Options
        methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE', 'OPTIONS'],
        origin: '*',
        optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
    });

    let { newsline, forum, tag, userslug, sessionid, type, countonly = 0, lastid, tail = 0, page = 0, test, qwiketid, size = 0, solo, debug } = req.query;

    if (!+size)
        size = type == 'hot' ? '9' : '4';
    let threadid = Math.floor(Math.random() * 100000000)
    const redis = await getRedisClient({});
    if (!redis)
        return res.status(500).json({ msg: "Unable to create redis" })

    const countOnlyParam = +countonly;
    const tailParam = +tail;
    const pageParam = +page;
    try {
        let ret: any = await fetchQueue({ type, newsline, forum, tag, lastid, firstid: 0, page: pageParam, sessionid, countonly: countOnlyParam, userslug, tail: tailParam, qwiketid, size, solo, test, debug, threadid, redis })
        ret.type = type;
       
        if (!countonly || (countonly == '0')) {
            const items = ret.items;
            let newItems = items.filter((p: any) => p != null)
            newItems = await Promise.all(newItems.map(async ({ item }: any) => {
                if (!item)
                    return null;
                const isPost = item.qpostid ? true : false;
                let processedBody = item.body;
                if (isPost) {
                    processedBody = processPostBody(item.body)
                }
                let description = item.description;//.substring(0, 196);
                if (description.length == 196)
                    description += "...";
                let common: any = {
                    catName: isPost ? item.cat_name : item.catName,
                    catIcon: isPost ? item.cat_icon : item.catIcon,
                    postBody: processedBody,
                    qpostid: item.qpostid ? item.qpostid : '',
                    published_time: item.published_time,
                    shared_time: item.shared_time,
                    slug: item.threadid,
                    title: item.title,
                    site_name: item.site_name || '',
                    url: item.url,
                    description: description,
                    author: item.author,
                    image: item.image,
                    tag: isPost ? item.category : item.cat,
                }
                if (isPost) {

                    const moderateFlag = await redis.get(`flag-${item.author_username}`) || '';
                    common['moderate_flag'] = moderateFlag;
                    common['author_username'] = item.username;
                    common['author_avatar'] = item.author_avatar;
                    common['author_name'] = item.author_name;
                    common['thread_title'] = item.title;
                    common['thread_url'] = item.thread_url;
                    common['thread_image'] = item.thread_image;
                    common['thread_author'] = item.thread_author;
                    common['createdat'] = item.createdat;
                    common['subscr_status'] = item.subscr_status;
                    common['id'] = item.id;
                }
            //    / console.log("ITEM:",common)
                return common;
            }))
            ret.items = newItems.filter((p: any) => p != null);
        }
        return res.status(200).json(ret)
    }
    catch (x) {
        l(chalk.red.bold(x))
        res.status(501).json(x);
    }
    finally {
        await redis.quit();
        dbEnd(threadid);
    }
}
