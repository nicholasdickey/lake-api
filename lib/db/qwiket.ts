import { l, chalk, microtime, js, ds } from "../common";
import { dbGetQuery, dbLog } from "../db";
import {Qwiket} from "../types/qwiket"

export const getQwiket = async ({
    threadid,
    slug,
    withBody

}: {
    threadid: number,
    slug: string,
    withBody:[0,1]
}):Promise<Qwiket> => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    const parts=slug.split('-');
    const silo=parts[0];
    const table=`q${silo}`;
    const qwiketid=`${slug}.qwiket`;
    console.log('getQwiket',qwiketid,withBody)
    sql = `SELECT * from ${table} where \`key\` ='${qwiketid}' limit 1`;
    rows = await query(`SELECT * from ${table} where \`key\`=?  limit 1`, [qwiketid]);
    const json=rows[0]?.value;
    console.log("result json:",sql,json)
    let qwiket;
    if(json)
    qwiket=json?JSON.parse(json):{};
    else {
        const table=`pov_threads_view${silo}`;
        sql = `SELECT t.*, c.text as catName, c.icon as catIcon, c.shortname as cat from ${table} t, pov_categories c where t.category_xid=c.xid and \`threadid\` ='${slug}' limit 1`;
        l(chalk.green(sql))
        rows = await query(`SELECT t.*, c.text as catName, c.icon as catIcon, c.shortname as cat from ${table} t,  pov_categories c where t.category_xid=c.xid and \`threadid\`=?  limit 1`, [slug]); 
        console.log("ALTERNATIVE QWIKET",sql,rows)
        qwiket=rows[0];
        qwiket.body='';
    }
    if(!withBody)
        delete qwiket?.body;
    l(chalk.green(sql,js(qwiket.body)))
    return qwiket;
}
