//./functions/dbservice.ts
import { l, chalk, microtime, js, ds, uxToMySql } from "../common";
import { dbGetQuery, dbLog } from "../db";
export const getChannelItem = async ({
    threadid,
    url,
    channel
}: {
    threadid: number,
    url: string,
    channel: string

}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT * from x40_channel_items where url=? and channel=?`;
    rows = await query(sql, [url, channel]);
    return rows && rows.length ? rows[0] : false
}
export const saveChannelItem = async ({
    threadid,
    url,
    title,
    digest,
    body,

    channel,
}: {
    threadid: number,
    url: string,
    title: string,
    digest: string,
    body: string,

    channel: string,

}) => {
    digest = digest || "";
    body = body || "";
    // const pt=uxToMySql(publishedTime);
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT xid from x40_channel_items where url=? and channel=?`;
    rows = await query(sql, [url, channel]);
    if (rows && rows.length) {
        const xid = rows[0].xid;
        l("xid=", xid, rows[0]);
        sql = `UPDATE x40_channel_items set channel=?,title=?,digest=?,body=?${digest && digest.length > 0 ? ',processedTime=now()' : ''} where xid=?`;
        rows = await query(sql, [channel, title, digest, body, xid]);
    }
    else {
        sql = `INSERT into x40_channel_items (channel,url,title,digest,body${digest && digest.length > 0 ? ',processedTime' : ''},createdTime) VALUES  (?,?,?,?,?${digest && digest.length > 0 ? ',now()' : ''},now())`;
        rows = await query(sql, [channel, url, title, digest, body]);
    }
    return rows && rows.length ? rows[0] : false
}
export const getChannel = async ({
    threadid,
    channel
}: {
    threadid: number,
    url: string,
    channel: string

}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    let chan;
    if (!channel) {
        sql = `SELECT DISTINCT channel from x40_channels order by lastProcessed limit 1`;
        rows = await query(sql, []);
        chan = rows[0];

    }
    sql = `SELECT DISTINCT * from x40_channels where channel=?`;
    rows = await query(sql, [channel]);
    chan = rows && rows.length ? rows[0] : null;
}
export const checkFeedItem = async ({
    threadid,
    url,
    feed
}: {
    threadid: number,
    url: string,
    feed: string

}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT * from x40_feed_items where url=? and feed=? limit 1`;
    rows = await query(sql, [url, feed]);
    return rows && rows.length ? true : false
}
interface Filter {
    value: string,
    sign: number
}
interface Channel {
    channel: string,
    filters: Filter[],
}
export const getChannels = async ({
    threadid,

}: {
    threadid: number,


}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    let chan;

    sql = `SELECT DISTINCT channel from x40_channels where UNIX_TIMESTAMP(lastProcessed)+5*60<UNIX_TIMESTAMP(now()) order by lastProcessed limit 10`;
    rows = await query(sql, []);

    let channels: Channel[] = []
    for (let i = 0; i < rows.length; i++) {
        const channel = rows[i].channel;
        sql = `SELECT DISTINCT filter as value, sign from x40_channel_filters where channel=?`;
        const filters = await query(sql, [channel]);

        //const filters=await getFilters({threadid,channel});
        let chan: Channel = { channel, filters };
        channels.push(chan);
    }
    return channels;

}
export const getFeeds = async ({
    threadid,
    force

}: {
    threadid: number,
    force: number;

}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    if (force == 1)
        sql = `SELECT * from x40_feeds where active=1  limit 100`;
    else
        sql = `SELECT * from x40_feeds where active=1 and UNIX_TIMESTAMP(lastprocessed)+5*60<UNIX_TIMESTAMP(now()) limit 100`;
    rows = await query(sql, []);
    return rows;
}
export const setProcessedFeed = async ({
    threadid,
    feed

}: {
    threadid: number,
    feed: string

}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `UPDATE x40_feeds  set lastprocessed=now() where feed=? limit 1`;
    await query(sql, [feed]);

}
export const getChannelItems = async ({
    threadid,
    channel

}: {
    threadid: number,
    channel: string;

}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    
    sql = `SELECT i.digest,i.longdigest,i.title,i.url,i.createdTime,c.hashtag from x40_channel_items i, x40_channels c where i.channel=? and i.channel=c.channel order by i.createdTime desc limit 100`;
    l(chalk.green(sql))
    rows = await query(sql, [channel]);
    l("RESULT:",rows);
    return rows;
}