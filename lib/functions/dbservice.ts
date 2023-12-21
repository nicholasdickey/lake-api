//./functions/dbservice.ts
import { l, chalk, microtime, js, ds, uxToMySql, } from "../common";
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
    l("RESULT:", rows);
    return rows;
}
export const getOutfeeds = async ({
    threadid,
}: {
    threadid: number,
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT DISTINCT outfeed from x40_outfeeds limit 1000`;
    rows = await query(sql, []);
    interface Outfeed {
        outfeed: string,
        channels: string[]
    }
    let outfeeds: Outfeed[] = []
    if (rows && rows.length) {
        for (let i = 0; i < rows.length; i++) {
            const outfeed = rows[i].group;
            sql = `SELECT DISTINCT channel from x40_outfeeds where outfeed=?`;
            const channels = await query(sql, [outfeed]);
            let g: Outfeed = { outfeed, channels };
            outfeeds.push(g);
        }
    }
    return outfeeds;
}
export const getOutfeedItems = async ({
    threadid,
    outfeed
}: {
    threadid: number,
    outfeed: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT DISTINCT channel from x40_outfeeds where outfeed=?`;
    const channels = await query(sql, [outfeed]);
    let chans: string[] = [];
    l(chalk.yellow("outfeed=", outfeed, "channels=", channels,))
    for (let j = 0; j < channels.length; j++) {
        chans.push(`'${channels[j].channel}'`);
    }
    let channelString = chans.join(",");
    // l("channelString=", channelString);
    sql = `SELECT DISTINCT i.digest,i.longdigest,i.title,i.url,i.createdTime,c.hashtag from x40_channel_items i, x40_channels c where i.channel in (${channelString}) and i.channel=c.channel order by i.createdTime desc limit 100`;
    const items = await query(sql, []);
    return items;
}
export const getLeagueItems = async ({
    threadid,
    league
}: {
    threadid: number,
    league: string
}) => {
    let sql, rows;
    league = league.toUpperCase();
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT DISTINCT id from x41_teams where league=?`;
    const channels = await query(sql, [league]);
    let chans: string[] = [];
    l(chalk.yellow("league=", league, "teams=", js(channels)))
    for (let j = 0; j < channels.length; j++) {
        chans.push(`'${channels[j].id}'`);
    }
    let channelString = chans.join(",");
    // l("channelString=", channelString);
    sql = `SELECT DISTINCT i.digest,i.longdigest,i.title,i.url,i.createdTime,c.hashtag from x41_league_items i, x41_hashtags c where i.channel in (${channelString}) and i.channel=c.id order by i.createdTime desc limit 100`;
    const items = await query(sql, []);
    // l("return items:",js(items))
    return items;
}
//to be called once an hour using redis as a timer
export const findexCalc = async ({
    threadid,
}: {
    threadid: number,

}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT name,  GROUP_CONCAT(DISTINCT team SEPARATOR ', ') team_menions,count(*) as mentions, SUM(findex)/count(*) as avg_findex,team,league FROM povdb.x41_raw_findex
    where team in (select id from x41_teams )
    group by name`;
    rows = await query(sql, []);
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const { name, team_menions, mentions, avg_findex, team, league } = row;
        sql = `SELECT millis from x41_findex where name=? and teamid=?`;
        const findexRows = await query(sql, [name, team]);
        let millis = 0;
        if (findexRows && findexRows.length) {
            millis = findexRows[0].millis || 0;
        }

        let millisNow = microtime();
        
        if (millisNow - millis < 1000 * 60 * 60 * 24)
            continue;
        //need to set millisNow to milliseconds of noon today
        const now = new Date();
        const noon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
        const recorded=noon.toISOString().slice(0, 19).replace('T', ' ');
        millisNow = noon.getTime();

        //needs a fresh update to be inserted
        sql = `INSERT into x41_findex (name,teams,mentions,findex,teamid,league,millis,recorded) values (?,?,?,?,?,?,?,?)`;
        await query(sql, [name, team_menions, mentions, avg_findex, team, league, millisNow,recorded]);
    }
    sql = `SELECT name,  GROUP_CONCAT(DISTINCT team SEPARATOR ', ') team_menions,count(*) as mentions, SUM(findex)/count(*) as avg_findex,team,league FROM povdb.x41_raw_findex
    where name in (select name from x41_teams )
    group by name`;
    rows = await query(sql, []);
    for (let i = 0; i < rows.length; i++) {
        const row = rows[i];
        const { name, team_menions, mentions, avg_findex, team, league } = row;
        sql = `SELECT millis from x41_findex where name=? and teamid=?`;
        const findexRows = await query(sql, [name, team]);
        let millis = 0;
        if (findexRows && findexRows.length) {
            millis = findexRows[0].millis || 0;
        }
        let millisNow = microtime();
        if (millisNow - millis < 1000 * 60 * 60 * 24)
            continue;
        //need to set millisNow to milliseconds of noon today
        const now = new Date();
        const noon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0);
        const recorded=noon.toISOString().slice(0, 19).replace('T', ' ');
        millisNow = noon.getTime();

        //needs a fresh update to be inserted
        sql = `INSERT into x41_findex (name,teams,mentions,findex,teamid,league,millis,recorded) values (?,?,?,?,?,?,?,?)`;
        await query(sql, [name, team_menions, mentions, avg_findex, team, league, millisNow,recorded]);



    }
}

/*******************************************************************/
export const getLeagues = async ({
    threadid,

}: {
    threadid: number,

}) => {
    let sql, rows;

    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT DISTINCT name from x41_leagues limit 100`;
    rows = await query(sql, []);
    let leagues: string[] = [];
    l(chalk.yellow("leagues=", js(leagues)))
    for (let j = 0; j < rows.length; j++) {
        leagues.push(`'${rows[j].name}'`);
    }
    return leagues;
}
export const getLeagueTeams = async ({
    threadid,
    league
}: {
    threadid: number,
    league: string
}) => {
    let sql, rows;
    league = league.toUpperCase();
    let query = await dbGetQuery("povdb", threadid);

    sql = `SELECT DISTINCT id,name from x41_teams where league=?`;
    rows = await query(sql, [league]);
    return rows;
}

