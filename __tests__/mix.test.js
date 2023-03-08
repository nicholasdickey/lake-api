// __tests__/api.test.js
import { createMocks } from 'node-mocks-http';
import fetch from '../pages/api/v1/queue/fetch';
import { l, chalk, microtime, js, ds, sleep } from "../lib/common";
import { dbEnd, dbGetQuery, dbLog } from "../lib/db";
import axios from 'axios';

const threadid = Math.floor(Math.random() * 100000000)

describe('Test Mix', () => {
    beforeAll(() => { jest.setTimeout(90 * 1000); jest.useFakeTimers('legacy') })

    test('mix', async () => {
        const size = 4;
        let offset = 10;
        // const page=1;
        let rows, data;
        if (process.env.LOCAL_TEST) {
            let sql;
            let query = await dbGetQuery("povdb", threadid);
            sql = `SELECT * from (select threadid as slug, shared_time as \`time\`,'qwiket' as qtype,xid FROM povdb.pov_threads_view6 where category_xid in (SELECT DISTINCT c.xid from povdb.pov_v30_newsline_default_tags dt, pov_categories c where c.shortname=dt.tag and newsline='qwiket')  order by  shared_time desc limit 100) as a
                UNION ALL 
            SELECT * from (select qpostid as slug, createdat as \`time\`,'react' as qtype,qpostid as xid from pov_channel_posts order by createdat desc limit 100) as b
                
            order by \`time\` desc`;
            rows = await query(sql);
        }
        else {
            const res = await axios.get(`https://dev-lake-api.qwiket.com/api/v1/test/fetch-mix`);
            expect(res.data.success == true);
            rows = res.data.rows;
            //  l(chalk.green.bold(js({ rows })))
        }

        let lastQwiket;

        while (true) {
            lastQwiket = rows[offset];
            l(chalk.yellow.bold("lastQwiket", js(lastQwiket)));
            if (lastQwiket.qtype == 'qwiket')
                break;
            offset++;
        }
        l(chalk.green(js(lastQwiket)));
        const lastid = lastQwiket.xid;

        for (let page = 1; page < 3; page++) {

            if (process.env.LOCAL_TEST) {
                const { req, res } = createMocks({
                    method: 'GET',
                    query: {
                        newsline: 'qwiket',
                        forum: 'usconservative',
                        type: 'mix',
                        sessionid: 'test',
                        lastid,
                        page,
                        size
                    },
                });

                await fetch(req, res);
                const dataString = await res._getData();
                expect(res._getStatusCode()).toBe(200);
                data = JSON.parse(dataString);
            }
            else {
                l('axios', `https://dev-lake-api.qwiket.com/api/v1/queue/fetch?newsline=qwiket&forum=usconservative&type=mix&sessionid=test&lastid=${lastid}&page=${page}&size=${size}`)
                const res = await axios.get(`https://dev-lake-api.qwiket.com/api/v1/queue/fetch?newsline=qwiket&forum=usconservative&type=mix&sessionid=test&lastid=${lastid}&page=${page}&size=${size}`);
                data = res.data;
            }

            expect(data.success).toEqual(true);
            expect(data.lastid).toEqual(lastid);
            expect(data.type).toEqual('mix');

            const items = data.items;
            const itemsIds = items.map(i => i.qpostid || i.slug)
            expect(items.length == size);

            let dbItems = [];
            let o = offset + 1;
            for (let i = 0; i <= page; i++) {

                let count = 0;
                while (count < size) {
                    const item = rows[o++];
                    if (i == page) {
                        dbItems.push(item)
                    }
                    if (item.qtype == 'qwiket')
                        count++;
                }
            }
            const dbItemsIds = dbItems.map(i => i.slug);

            var good = false;
            if (dbItemsIds.length == itemsIds.length) {
                var good = false;
                while (!good) {
                    for (let i = 0; i < dbItemsIds.length; i++) {
                        if (dbItemsIds[i] == itemsIds[i]) {
                            continue;
                        }
                        if (dbItemsIds[i] == itemsIds[i + 1]) {
                            const i1 = itemsIds[i];
                            const i2 = itemsIds[i + 1]
                            itemsIds[i] = i2;
                            itemsIds[i + 1] = i1;
                            break;
                        }
                    }
                    good = true;
                }
            }
            l(chalk.yellow(js(itemsIds)))
            expect(itemsIds).toEqual(dbItemsIds)
        }
    });
    test('mix, page0', async () => {
        jest.setTimeout(90 * 1000)
        const size = 4;
        let offset = 0;
        // const page=1;
        let rows, data;
        if (process.env.LOCAL_TEST) {
            let sql;
            let query = await dbGetQuery("povdb", threadid);
            sql = `SELECT * from (select threadid as slug, shared_time as \`time\`,'qwiket' as qtype,xid FROM povdb.pov_threads_view6 where category_xid in (SELECT DISTINCT c.xid from povdb.pov_v30_newsline_default_tags dt, pov_categories c where c.shortname=dt.tag and newsline='qwiket')  order by  shared_time desc limit 100) as a
                UNION ALL 
            SELECT * from (select qpostid as slug, createdat as \`time\`,'react' as qtype,qpostid as xid from pov_channel_posts order by createdat desc limit 100) as b 
            order by \`time\` desc`;
            rows = await query(sql);
        }
        else {
            const res = await axios.get(`https://dev-lake-api.qwiket.com/api/v1/test/fetch-mix`);
            expect(res.data.success == true);
            rows = res.data.rows;
        }


        const page = 0;
        let retry = 6;
        let dbItemsIds, itemsIds;
        while (retry) {
            if (process.env.LOCAL_TEST) {
                const { req, res } = createMocks({
                    method: 'GET',
                    query: {
                        newsline: 'qwiket',
                        forum: 'usconservative',
                        type: 'mix',
                        sessionid: 'test',
                        page,
                        size
                    },
                });

                await fetch(req, res);
                const dataString = await res._getData();
                expect(res._getStatusCode()).toBe(200);
                data = JSON.parse(dataString);
            }
            else {
                l('axios', `https://dev-lake-api.qwiket.com/api/v1/queue/fetch?newsline=qwiket&forum=usconservative&type=mix&sessionid=test&&page=${page}&size=${size}`)
                const res = await axios.get(`https://dev-lake-api.qwiket.com/api/v1/queue/fetch?newsline=qwiket&forum=usconservative&type=mix&sessionid=test&lastid=0&page=${page}&size=${size}`);
                data = res.data;
            }

            expect(data.success).toEqual(true);
            expect(+data.lastid > 0).toEqual(true)

            expect(data.type == 'mix').toEqual(true);
            const items = data.items;
            itemsIds = items.map(i => i.qpostid || i.slug)

            let dbItems = [];
            let o = offset;
            for (let i = 0; i <= page; i++) {
                //count size qwikets per page
                let count = 0;
                while (count < size) {
                    const item = rows[o++];
                    if (i == page) {
                        dbItems.push(item)
                    }
                    if (item.qtype == 'qwiket')
                        count++;
                }
            }
            //check for tail
            const { qtype, slug } = dbItems[0];
            if (qtype =='react') {
                l("comparing tail", slug,dbItems[0])
                expect(data.tail).toEqual(slug);
            }
            dbItemsIds = dbItems.map(i => i.slug);

            if (dbItemsIds.length == itemsIds.length)
                break;;
            await sleep(1000)
            retry--;
        }
        var good = false;
        if (dbItemsIds.length == itemsIds.length) {
            var good = false;
            while (!good) {
                for (let i = 0; i < dbItemsIds.length; i++) {
                    if (dbItemsIds[i] == itemsIds[i]) {
                        continue;
                    }
                    if (dbItemsIds[i] == itemsIds[i + 1]) {
                        const i1 = itemsIds[i];
                        const i2 = itemsIds[i + 1]
                        itemsIds[i] = i2;
                        itemsIds[i + 1] = i1;
                        break;
                    }
                }
                good = true;
            }
        }
        expect(itemsIds).toEqual(dbItemsIds)
    });
});
afterAll((done) => {
    dbEnd(threadid);
    done();
});