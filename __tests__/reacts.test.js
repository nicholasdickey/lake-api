// __tests__/api.test.js
// 🚨 Remember to keep your `*.test.js` files out of your `/pages` directory!
import { createMocks } from 'node-mocks-http';
import fetch from '../pages/api/v1/queue/fetch';
import { l, chalk, microtime, js, ds } from "../lib/common";
import { dbEnd, dbGetQuery, dbLog } from "../lib/db";
import axios from 'axios';
const threadid = Math.floor(Math.random() * 100000000)
describe('Test paging comments queue', () => {
  test('reacts', async () => {
    const size = 4;
    // const page=1;
    let rows, data;
    if (process.env.LOCAL_TEST) {
      let sql;
      let query = await dbGetQuery("povdb", threadid);
      sql = `SELECT * FROM povdb.pov_channel_posts where qforumid=326  order by qpostid desc limit 100`;
      rows = await query(sql);
    }
    else {
      const res = await axios.get(`https://dev-lake-api.qwiket.com/api/v1/test/fetch-reacts`);
      expect(res.data.success == true);
      rows = res.data.rows;
     // l(chalk.green.bold(js({rows})))
    }

    const lastQwiket = rows[10];
   l(chalk.green("lastQwiket:",js(lastQwiket)));
    const lastid = lastQwiket.qpostid;
    //let { newsline, forum, tag, userslug, sessionid, type, countonly, lastid, tail, page, test, qwiketid, size, solo, debug } = req.query;

    for (let page = 0; page < 10; page++) {

      if (process.env.LOCAL_TEST) {
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
        expect(res._getStatusCode()).toBe(200);
        data = JSON.parse(dataString);
      }
      else {
       // l('axios',`https://dev-lake-api.qwiket.com/api/v1/queue/fetch?newsline=qwiket&forum=usconservative&type=reacts&sessionid=test&lastid=${lastid}&page=${page}&size=${size}`)
        const res = await axios.get(`https://dev-lake-api.qwiket.com/api/v1/queue/fetch?newsline=qwiket&forum=usconservative&type=reacts&sessionid=test&lastid=${lastid}&page=${page}&size=${size}`);
        data = res.data;
      }
       // l("returned data",data);
      expect(data.success == true);
      expect(data.lastid == lastid);
      expect(data.type == 'reacts');
      
      const items = data.items;
      const itemsIds = items.map(i => i.qpostid)
      
      l(chalk.yellow(js(itemsIds)))
      expect(items.length == size);
      
      const dbItems = rows.slice(10 + page * size, 10 + page * size + 4);
      const dbItemsIds = dbItems.map(i => "" + i.qpostid);
      
      l(chalk.cyan(js(dbItemsIds)))
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