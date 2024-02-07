//./lib/google/submit-current-sitemap.ts
import { google } from "googleapis"
import { l, chalk, js } from "../common"
import clientSecrets from "./client_secrets.json" assert { type: 'json' };
const searchconsole = google.searchconsole;
export const submitCurrentSitemap = async (currentMapName:string, domain:string,league:string) => {

  let jwtClient = new google.auth.JWT(
    clientSecrets.client_email,
    undefined,
    clientSecrets.private_key,
    ['https://www.googleapis.com/auth/webmasters']);

  await jwtClient.authorize();

  const client = searchconsole({
    version: 'v1',
    // All requests made with this object will use the specified auth.
    auth: jwtClient
  });

  await client.sites.add({ siteUrl: `https://${domain}` })
  await client.sitemaps.list({
    siteUrl: `sc-domain:${domain}`,

  })
  await client.sitemaps.submit({
    siteUrl: `sc-domain:${domain}`,
    feedpath: `https://${domain}/sitemap/${league}/${currentMapName}.xml`//'https://am1.news/sitemap_qwiket_usconservative_2023-02-05T00:00:00.txt'
  })
}