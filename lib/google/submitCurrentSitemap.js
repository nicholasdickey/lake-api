import {google}  from "googleapis"  
import { l, chalk, js } from "../common"
import clientSecrets from "./client_secrets.json" assert { type: 'json' };
const searchconsole=google.searchconsole;
export const submitCurrentSitemap = async (currentMapName) => {
   //console.log(clientSecrets)
   // const apis = google.getSupportedAPIs();
   /*const auth = new searchConsole.auth.GoogleAuth({
    credentials: {
      private_key: process.env.PRIVATE_KEY.replaceAll('\\n', '\n'),
      client_email: process.env.CLIENT_EMAIL,
    },
    scopes: [
      'https://www.googleapis.com/auth/webmasters.readonly',
    ],
  });*/
 /* const auth = new google.auth.OAuth2(
    YOUR_CLIENT_ID,
    YOUR_CLIENT_SECRET,
    YOUR_REDIRECT_URL
  );*/
  
  //google.options({ auth })
  let jwtClient = new google.auth.JWT(
    clientSecrets.client_email,
    null,
    clientSecrets.private_key,
    ['https://www.googleapis.com/auth/webmasters']);
   
    const tokens=await jwtClient.authorize();
  //  console.log("tokens:",tokens)
    const client = searchconsole({
    version: 'v1',
    // All requests made with this object will use the specified auth.
    auth : jwtClient
  });
   const res= await client.sites.list({});
   //const maps=
    l(
        "THIS IS SITEAMP FUNCTION",res.data
    )
   /* await client.sites.add({siteUrl:'https://am1.news'})
    const res2= await client.sites.list({});*/
    const res3=await client.sitemaps.submit({
        siteUrl:'sc-domain:am1.news',
        feedpath:currentMapName//'https://am1.news/sitemap_qwiket_usconservative_2023-02-05T00:00:00.txt'
     })
    const res2=await client.sitemaps.list({
        siteUrl:'sc-domain:am1.news',
      
     })
     l(
         "THIS IS SITEAMP2 FUNCTION",res2.data
     )
 
}