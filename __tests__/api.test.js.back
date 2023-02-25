// __tests__/api.test.js
// 🚨 Remember to keep your `*.test.js` files out of your `/pages` directory!
import { createMocks } from 'node-mocks-http';
import fetchAll from '../pages/api/v1/sitemap/fetchAll';

describe('/api/v1/sitemap/fetchAll?newsline=qwiket&forum=usconservative', () => {
   test('returns a message with all the sitemaps', async () => {
    const { req, res } = createMocks({
      method: 'GET',
      query: {
        newsline: 'qwiket',
        forum: 'usconservative'
      },
    });

    await fetchAll(req, res);
    console.log(res._getData())
    expect(res._getStatusCode()).toBe(200);
    /*expect(JSON.parse(res._getData())).toEqual(
      expect.objectContaining({
        message: 'Your favorite animal is dog',
      }),
    );*/
  });
});