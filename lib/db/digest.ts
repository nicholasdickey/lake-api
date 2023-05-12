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
    return rows&&rows.length ? true : false
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


