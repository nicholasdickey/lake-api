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
    // const page=1;
    let rows;
    if (process.env.LOCAL_TEST) {
      let sql;
      let query = await dbGetQuery("povdb", threadid);
      sql = `SELECT * FROM povdb.pov_channel_posts where qforumid=326  order by qpostid desc limit 100`;
      rows = await query(sql);
    }
    else {
      const res = await axios.get(`https://dev-lake-api.qwiket.com/api/v1/test/fetch-comments`);
      expect(res.data.success == true);
      rows = res.data.rows;
    }

    const lastQwiket = rows[10];
    l(chalk.green(js(lastQwiket)));
    const lastid = lastQwiket.qpostid;
    //let { newsline, forum, tag, userslug, sessionid, type, countonly, lastid, tail, page, test, qwiketid, size, solo, debug } = req.query;

    for (let page = 0; page < 10; page++) {
      const { req, res } = createMocks({
        method: 'GET',
        query: {
          newsline: 'qwiket',
          forum: 'usconservative',
          type: 'reacts',
          sessionid: 'test',
          lastid,
          page,
          size
        },
      });

      await fetch(req, res);
      const dataString = await res._getData();
      const data = JSON.parse(dataString);
      //  l(data);
      expect(data.success == true);
      expect(data.lastid == lastid);
      expect(data.type == 'reacts');
      const items = data.items;
      const itemsIds = items.map(i => i.qpostid)
      // l(chalk.yellow(js(itemsIds)))
      expect(items.length == size);
      const dbItems = rows.slice(10 + page * size, 10 + page * size + 4);
      const dbItemsIds = dbItems.map(i => "" + i.qpostid);
      // l(chalk.cyan(js(dbItemsIds)))
      expect(res._getStatusCode()).toBe(200);
      expect(itemsIds).toEqual(dbItemsIds)
    }
    /*expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        message: 'Your favorite animal is dog',
      }),
    );*/
    // dbEnd(threadid);
  });
});
afterAll((done) => {
  dbEnd(threadid);
  done();
});