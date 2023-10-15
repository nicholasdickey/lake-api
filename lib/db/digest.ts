//./lib/db/qwiket.ts
import { l, chalk, microtime, js, ds } from "../common";
import { dbGetQuery, dbLog } from "../db";
export const checkDigest = async ({
    threadid,
    label,
}: {
    threadid: number,
    label: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT * from pov_v30_digests where label=?`;
    rows = await query(sql, label);
    return rows && rows.length ? true : false
}
export const insertDigest = async ({
    threadid,
    label,
}: {
    threadid: number,
    label: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `INSERT into pov_v30_digests (label,\`time\`) VALUES  (?,now())`;
    rows = await query(sql, [label]);
    return rows ? true : false
}

export const getUnprocessedDigestInclude = async ({
    threadid,

}: {
    threadid: number
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT i.slug,i.tag, t.description,t.title, t.site_name, t.shared_time,t.url from pov_v30_digest_include i, pov_threads_view6 t where t.threadid=i.slug and i.processed=0`;
    l(chalk.greenBright(sql));
    rows = await query(sql);
    sql = `UPDATE  pov_v30_digest_include set processed=1 where processed=0`;
    await query(sql);

    return rows
}

export const insertDigestInclude = async ({
    threadid,
    slug,
    tag,
}: {
    threadid: number,
    tag: string,
    slug: string
}) => {
    let sql, rows;
    const timestamp = microtime();
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT * from pov_v30_digest_include where tag=? and slug=?`;
    rows = await query(sql, [tag, slug]);
    if (rows && rows.length) {
        sql = `UPDATE pov_v30_digest_include set processed=0 where tag=? and slug=?`;
        await query(sql, [tag, slug]);
        return;
    }
    sql = `INSERT into pov_v30_digest_include (tag,slug,\`timestamp\`,processed,created) VALUES  (?,?,?,?,now())`;
    try {
        await query(sql, [tag, slug, timestamp, 0]);
    }
    catch (x) {
        l(chalk.yellow.bold("Handled Exception in insert-digest-include", x));
    }
}    
