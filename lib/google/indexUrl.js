import {google}  from "googleapis"  
import { l, chalk, js } from "../common"
import request from "request";
import clientSecrets from "./client_secrets.json" assert { type: 'json' };
const indexing=google.indexing;
export const indexUrl = async (url) => {
   //console.log(clientSecrets)
    const apis = google.getSupportedAPIs();
   // l(chalk.green(js(apis)));
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
    ['https://www.googleapis.com/auth/indexing']);
   
    const tokens=await jwtClient.authorize();
  //  console.log("tokens:",tokens)
    const client = indexing({
    version: 'v3',
    // All requests made with this object will use the specified auth.
    auth : jwtClient
  });
  l(chalk.yellow(`https://indexing.googleapis.com/v3/urlNotifications:publish`,url))
 /* const res=await axios.post(`https://indexing.googleapis.com/v3/urlNotifications:publish`,{
    body:{
        url,
        type:'URL_UPDATED'
    },
    headers:{
       auth:{bearer:tokens.access_token}
    }
  })*/
  //l(client)
  /* const res= await client.urlNotifications.publish({
    url,
    type:"URL_UPDATED"
   });
   */
   let options = {
    url: "https://indexing.googleapis.com/v3/urlNotifications:publish",
    method: "POST",
    // Your options, which must include the Content-Type and auth headers
    headers: {
    "Content-Type": "application/json"
    },
    auth: {
    "bearer": tokens.access_token
    },
    // Define contents here. The structure of the content is described in the next step.
    json: {
    "url": url,
    "type": "URL_UPDATED"
    },
    
    }
    
    const {body}=await request(options);//, function (error, response, body) {
   
   
    l(
        "submitted url",js({url,body})
    )
  
   

  
    
}