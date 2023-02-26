// __tests__/api.test.js
// 🚨 Remember to keep your `*.test.js` files out of your `/pages` directory!
import { createMocks } from 'node-mocks-http';
import fetch from '../pages/api/v1/queue/fetch';
import { l, chalk, microtime, js, ds } from "../lib/common";
import { dbEnd, dbGetQuery, dbLog } from "../lib/db";
import axios from 'axios';
const threadid = Math.floor(Math.random() * 100000000)
describe('Test paging comments queue', () => {
  test('compares api comments wuth DB', async () => {
    const size = 4;
    const offset=10;
    // const page=1;
    let dbQwikets;
    if (process.env.LOCAL_TEST) {
    let sql;
    let query = await dbGetQuery("povdb", threadid);
    
    sql = `SELECT * FROM povdb.pov_threads_view6 where category_xid in (SELECT DISTINCT c.xid from povdb.pov_v30_newsline_default_tags dt, pov_categories c where c.shortname=dt.tag and newsline='qwiket')  order by published_time desc , shared_time desc limit 100`;
     dbQwikets = await query(sql);
    }
    else {
      const res = await axios.get(`https://dev-lake-api.qwiket.com/api/v1/test/fetch-newsline`);
      l("AXIOS RETURN ",res)
      expect(res.data.success == true);
      dbQwikets = res.data.rows;
    }
    const lastQwiket = dbQwikets[offset];
    l(chalk.green(js(lastQwiket)));
    const lastid = lastQwiket.threadid;
    l(chalk.cyan.bold('lastid=',lastid))
    //let { newsline, forum, tag, userslug, sessionid, type, countonly, lastid, tail, page, test, qwiketid, size, solo, debug } = req.query;
    for (let page = 0; page < 10; page++) {
    //const page=7;
    const { req, res } = createMocks({
        method: 'GET',
        query: {
          newsline: 'qwiket',
          forum: 'usconservative',
          type: 'newsline',
          sessionid: 'test',
          lastid,
          page,
          size
        },
      });

      await fetch(req, res);
      const dataString = await res._getData();
      const data = JSON.parse(dataString);
      l(data);
      expect(data.success == true);
      expect(data.lastid == lastid);
      expect(data.type == 'newsline');
      const items = data.items;
      const itemsIds = items.map(i => i.slug)
      l(chalk.yellow(js(itemsIds)))
      expect(items.length == size);
    
      const dbItems = dbQwikets.slice(offset + page * size, 10 + page * size + 4);
      const dbItemsIds = dbItems.map(i =>i.threadid);
      l(chalk.cyan(js(dbItemsIds)))
      expect(res._getStatusCode()).toBe(200);
      expect(itemsIds).toEqual(dbItemsIds)
    }
 
    // dbEnd(threadid);
  });
});
afterAll((done) => {
  dbEnd(threadid);
  done();
});