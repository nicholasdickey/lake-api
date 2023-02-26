import { l, chalk, microtime, js, ds } from "../common";
import { dbGetQuery, dbLog } from "../db";
import { Qwiket } from "../types/qwiket"
export const getRssNewsline = async ({

    threadid,
    key,
    timeStart,
    timeEnd

}: {

    threadid: number,
    key: string,
    timeStart: number,
    timeEnd: number
}) => {

    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);

    sql = `select * from (SELECT DISTINCT t.threadid,c.shortname as tag FROM povdb.pov_threads_view51 t,  
            povdb.pov_categories c 

            where c.xid=t.category_xid and c.shortname in (${key}) 
            and t.shared_time>=${timeStart}
            and t.shared_time<=${timeEnd}
            order by t.xid desc) as a
            UNION ALL
            select * from (SELECT DISTINCT t.threadid,c.shortname as tag FROM povdb.pov_threads_view6 t,  
            povdb.pov_categories c 

            where c.xid=t.category_xid and c.shortname in (${key}) 
            and t.shared_time>=${timeStart}
            and t.shared_time<=${timeEnd}
            order by t.xid desc) as b   
            
            limit 50000 `;
    l(chalk.green(sql))
    rows = await query(`
    select * from (SELECT DISTINCT t.threadid,c.shortname as tag FROM povdb.pov_threads_view51 t,  
    povdb.pov_categories c 
    
    where c.xid=t.category_xid and c.shortname in (${key}) 
    and t.shared_time>=${timeStart}
    and t.shared_time<=${timeEnd}
    order by t.xid desc) as a
    UNION ALL
    select * from (SELECT DISTINCT t.threadid,c.shortname as tag FROM povdb.pov_threads_view6 t,  
    povdb.pov_categories c 
    
    where c.xid=t.category_xid and c.shortname in (${key}) 
    and t.shared_time>=${timeStart}
    and t.shared_time<=${timeEnd}


    order by t.xid desc ) as b  
    
    limit 50000 `);
    // l(chalk.green(sql, rows))
    return rows;
}
export const getQwiket = async ({
    threadid,
    slug,
    withBody,
    tag

}: {
    threadid: number,
    slug?: string,
    txid?: string,
    withBody: [0, 1],
    tag?: string
}): Promise<Qwiket | null> => {
    let sql, rows, qwiket;
    let query = await dbGetQuery("povdb", threadid);
    if (slug) {
        const parts = slug.split('-');
        let silo = parts[0];
        if (slug == 'nro-is-moving-to-facebook-comments')
            silo = '';
        else if (!(+silo >= 0))
            return null;
        else if (!silo && silo == 'cc')
            return null;
        const table = `q${silo}`;
        const qwiketid = `${slug}.qwiket`;
        // console.log('getQwiket',qwiketid,withBody)
        sql = `SELECT * from ${table} where \`key\` ='${qwiketid}' limit 1`;
        rows = await query(`SELECT * from ${table} where \`key\`=?  limit 1`, [qwiketid]);
        const json = rows[0]?.value;
        // console.log("result json:",sql,json)

        if (json)
            qwiket = json ? JSON.parse(json) : {};
        else {
            const table = `pov_threads_view${silo}`;
            sql = `SELECT t.*, c.text as catName, c.icon as catIcon, c.shortname as cat from ${table} t, pov_categories c where t.category_xid=c.xid and \`threadid\` ='${slug}' limit 1`;
            // l(chalk.green(sql))
            rows = await query(`SELECT t.*, c.text as catName, c.icon as catIcon, c.shortname as cat from ${table} t,  pov_categories c where t.category_xid=c.xid and \`threadid\`=?  limit 1`, [slug]);
            // console.log("ALTERNATIVE QWIKET",sql,rows)
            qwiket = rows[0];
            if (qwiket)
                qwiket.body = '';
        }
    }
    else if (tag) {
        sql = `SELECT t.*, c.text as catName, c.icon as catIcon, c.shortname as cat from pov_threads_view51 t, pov_categories c where t.category_xid=c.xid and c.shortname='${tag}' order by t.xid desc limit 1`;
        // l(chalk.green(sql))
        rows = await query(`SELECT t.*, c.text as catName, c.icon as catIcon, c.shortname as cat from pov_threads_view51 t,  pov_categories c where t.category_xid=c.xid and c.shortname=? order by t.xid desc limit 1`, [tag]);
        // console.log("ALTERNATIVE QWIKET",sql,rows)
        if (withBody) {
            qwiket = rows[0];
            const qwiketid = qwiket['threadid'];
            sql = `SELECT * from q6 where \`key\` ='${qwiketid}' limit 1`;
            rows = await query(`SELECT * from q6 where \`key\`=?  limit 1`, [qwiketid]);
            let json = rows[0]?.value;
            if (json)
                qwiket = json ? JSON.parse(json) : {};
            else {
                sql = `SELECT * from q51 where \`key\` ='${qwiketid}' limit 1`;
                rows = await query(`SELECT * from q51 where \`key\`=?  limit 1`, [qwiketid]);
                json = rows[0]?.value;
                if (json)
                    qwiket = json ? JSON.parse(json) : {};
            }
        }
    }
    if (!withBody)
        delete qwiket?.body;
    // l(chalk.green(sql,js(qwiket.body)))
    return qwiket;
}
export const fetchPosts=async ({
    threadid,
    forum,
    size
}: {
    threadid: number,
    forum:string,
    size:number
}): Promise<Array<Qwiket>> => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql=`SELECT * FROM povdb.pov_channel_posts where forum='${forum}' order by qpostid desc limit ${size}`;
    rows = await query(sql);
    return rows;
}