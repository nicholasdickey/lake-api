import { l, chalk, js } from "../common";
import { Qwiket, React } from "../types/qwiket";
import { getPost, getQwiket } from "../db/qwiket";
export const getPJson = async ({ threadid, qpostid, forum, redis }: { threadid: number, qpostid: number, forum: string, redis: any }) => {
    const commentKey = `pjson-${forum}-${qpostid}`;
    l(chalk.yellow.bold(js({ commentKey })))
    const pJsonRaw = await redis.get(commentKey);
    let pJson: React | undefined;
    if (!pJsonRaw) {
        const result = await getPost({ qpostid, threadid });
        l(js(result))
        if (result)
            pJson = result.react;
    }
    else
        pJson = JSON.parse(pJsonRaw);
    l(chalk.cyan.bold(js({ pJsonRaw, pJson })))
    return pJson;
}
export const getNtJson = async ({ threadid, xid, redis, withBody }: { threadid: number, xid: number, redis: any, withBody?: [0, 1] }) => {
    const ntJsonRaw = await redis.get(`ntjson-${xid}`);
    let ntJson: Qwiket | null = null;
    if (!ntJsonRaw) {
        ntJson = await getQwiket({ threadid, txid: xid, withBody })
    }
    else {
        ntJson = JSON.parse(ntJsonRaw);
    }
    return ntJson;
}