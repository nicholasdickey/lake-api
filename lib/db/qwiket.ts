import { l, chalk, microtime, js, ds } from "../common";
import { dbGetQuery, dbLog } from "../db";
import { Qwiket, React } from "../types/qwiket"
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
    txid,
    tag

}: {
    threadid: number,
    slug?: string,
    txid?: number,
    withBody?: [0, 1],
    tag?: string
}): Promise<Qwiket | null> => {
    let sql, rows, qwiket;
  //  l('getQwiket db', js({ slug, tag, threadid }))
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
        sql = `SELECT t.*, c.text as catName, c.icon as catIcon, c.shortname as cat from pov_threads_view6 t, pov_categories c where t.category_xid=c.xid and c.shortname='${tag}' and reshare!=102 order by t.published_time desc limit 1`;
       // l(chalk.green(sql))
        rows = await query(`SELECT t.*, c.text as catName, c.icon as catIcon, c.shortname as cat from pov_threads_view6 t,  pov_categories c where t.category_xid=c.xid and c.shortname=? and reshare!=102 order by t.published_time desc limit 1`, [tag]);
       // console.log("ALTERNATIVE QWIKET", sql, rows)
        if (rows && rows.length > 0) {
            if (withBody) {
                qwiket = rows[0];
                const qwiketid = qwiket['threadid'];
                sql = `SELECT * from q6 where \`key\` ='${qwiketid}' limit 1`;
                rows = await query(`SELECT * from q6 where \`key\`=?  limit 1`, [qwiketid]);
                let json = rows[0]?.value;
                if (json)
                    qwiket = json ? JSON.parse(json) : {};
            }
        }
        else {
            sql = `SELECT t.*, c.text as catName, c.icon as catIcon, c.shortname as cat from pov_threads_view51 t, pov_categories c where t.category_xid=c.xid and c.shortname='${tag}'and reshare!=102 order by t.published_time desc limit 1`;
           // l(chalk.green(sql))
            rows = await query(`SELECT t.*, c.text as catName, c.icon as catIcon, c.shortname as cat from pov_threads_view51 t,  pov_categories c where t.category_xid=c.xid and c.shortname=? and reshare!=102 order by t.published_time desc limit 1`, [tag]);
         //   console.log("ALTERNATIVE QWIKET51", sql, rows)
            if (withBody) {
                qwiket = rows[0];
                const qwiketid = qwiket['threadid'];
                sql = `SELECT * from q51 where \`key\` ='${qwiketid}' limit 1`;
                rows = await query(`SELECT * from q51 where \`key\`=?  limit 1`, [qwiketid]);
                let json = rows[0]?.value;
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
export const fetchPosts = async ({
    threadid,
    forum,
    size
}: {
    threadid: number,
    forum: string,
    size: number
}): Promise<Array<React>> => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT * FROM povdb.pov_channel_posts where forum='${forum}' order by qpostid desc limit ${size}`;
    rows = await query(sql);
    return rows;
}
interface PostReturn { success: boolean, react?: React }
export const getPost = async ({
    threadid,
    qpostid
}: {
    threadid: number,
    qpostid: number
}): Promise<PostReturn> => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    sql = `SELECT p.*,u.subscr_status FROM povdb.pov_channel_posts p left outer join pov_users u on u.username=p.author_username where p.qpostid='${qpostid}' limit 1`;
    rows = await query(`SELECT p.*,u.subscr_status FROM povdb.pov_channel_posts p left outer join pov_users u on u.username=p.author_username where p.qpostid=? limit 1`, [qpostid]);
    if (!rows || !rows.length)
        return {
            success: false
        }
    const react = rows[0];
    const { thread, author_username, subscr_status, author_name, author_avatar, thread_url, body, createdat, id } = react;

    let millis = microtime();
    sql = `SELECT * from pov_threads_map2 where thread=${thread}  limit 1`;
    l(chalk.magenta.bold(sql))
    rows = await query(
        sql
    );
    l(chalk.green.bold(sql, js(rows[0])))
    if (!rows || !rows.length)
        return { success: false }
    let slug;

    slug = rows[0]['threadid'];

    const slugParts = slug.split('-slug-');
    const table = `pov_threads_view${slugParts[0]}`;;
    sql = `SELECT t.*,c.shortname as tag, c.icon as cat_icon, c.text as cat_name from ${table} t, pov_categories c  where c.xid=t.category_xid and t.threadid='${slug}'`;
    l(chalk.cyan.bold(sql))
    rows = await query(
        sql
    );
    if (rows && rows.length) {
        const { xid, description, author, title, url, image, cat_icon, cat_name, tag } = rows[0];
        l(chalk.yellow.bold('rows[0]:'), js(rows[0]))
        const react = {
            qpostid,
            cat_name,
            cat_icon,
            category: tag,
            subscr_status,
            author_username,
            author_avatar,
            author_name,
            username: author_username,
            thread_url: url,
            thread_image: image,
            threadid: slug,
            description,
            title: title,
            thread_title: title,
            thread_xid: xid,
            thread_author: author,
            thread_description: description,
            createdat,
            id,
            body

        }
        l(chalk.magenta.bold('react:', js(react)))
        return {
            success: true,
            react
        }
    }
    return {
        success: false,

    }

}
export const unpublishQwiket = async ({
    threadid,
    slug,
}: {
    threadid: number,
    slug: string
}) => {
    let sql, rows;
    let query = await dbGetQuery("povdb", threadid);
    if (slug) {
        const parts = slug.split('-');
        let silo = parts[0];
        const table = `pov_threads_view${silo}`;
        sql = `UPDATE ${table} set reshare=102 where threadid='${slug}'`;
        rows = await query(sql);
        return rows;
    }
}
