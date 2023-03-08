// __tests__/api.test.js
//@ts-nocheck
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
    expect(res._getStatusCode()).toBe(200);
  });
});