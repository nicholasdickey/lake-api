import { NextApiRequest, NextApiResponse } from 'next';
import fs from 'fs';
import path from 'path';
import ffmpeg from 'fluent-ffmpeg';
import NextCors from 'nextjs-cors';
import { l, chalk, js, ds } from "../../../../../lib/common";
import { dbEnd } from "../../../../../lib/db"
import {recordMetaimage} from "../../../../../lib/db/wishtext"
export const config = {
  api: {
    bodyParser: true,
  },
};
;
export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse<any>
) {

  await NextCors(req, res, {
    // Options
    methods: ['GET', 'HEAD', 'PUT', 'PATCH', 'POST', 'DELETE'],
    origin: '*',
    optionsSuccessStatus: 200, // some legacy browsers (IE11, various SmartTVs) choke on 204
  });
 
    //const { id } = req.query;
    //console.log("API: record-gif req", req)
    const body=req.body;
    //console.log("API: record-gif", body)
    const {inputVideo,linkid}=body;
    
    console.log("API: record-gif", linkid);
    let threadid = Math.floor(Math.random() * 100000000);
    try {
      if (!inputVideo) {
        return res.status(400).json({ error: 'No video data provided.' });
      }
      if (!linkid) {
        return res.status(400).json({ error: 'No linkid provided.' });
      }

      // Convert the base64-encoded data URL to a buffer
      const base64Data = inputVideo.split(';base64,').pop();
      const videoBuffer = Buffer.from(base64Data, 'base64');

      // Write the video buffer to a temporary file
      const tempVideoPath = path.join(process.cwd(), `tmp/${linkid}.webm`);
      fs.writeFileSync(tempVideoPath, videoBuffer);

      // Convert the video to GIF format
      const outputPath = path.join(process.cwd(), `/tmp/${linkid}.gif`);
      const palettePath = path.join(process.cwd(), `/tmp/palette-${linkid}.png`);
      
    //  -i image_%02d.png -vf palettegen palette.png
     await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(tempVideoPath)
          .output(palettePath)
          .outputOptions('-vf palettegen')
          .on('end', () => {
            // Clean up the temporary video file
            //fs.unlinkSync(tempVideoPath);
            resolve();
          })
          .on('error', (err) => {
            reject(err);
          })
          .run();
      });
    // console.log("AFTER PALETTE")
    const options = [
      '-i', palettePath,
      '-lavfi', 'paletteuse',
   //   '-loop', '-1',
      // ...etc
  ];
      await new Promise<void>((resolve, reject) => {
        ffmpeg()
          .input(tempVideoPath)
         // .inputOptions('-i palette.png -lavfi paletteuse')
          .output(outputPath)
          .outputOptions(options)
          .on('end', () => {
            // Clean up the temporary video file
            fs.unlinkSync(tempVideoPath);
            resolve();
          })
          .on('error', (err) => {
            reject(err);
          })
          .run();
      });

      // Read the converted GIF file as binary data
      const gifBinaryData = fs.readFileSync(outputPath);
      //fs.unlinkSync(outputPath);

      // Convert the binary data to a Base64-encoded string
      //const gifBase64String = gifBinaryData.toString('base64');
      const gifDataUrl = `data:image/gif;base64,${gifBinaryData.toString('base64')}`;

     await recordMetaimage({threadid, linkid:linkid as string, image:gifDataUrl});
     console.log("API: record-gif DONE", linkid);
      // Respond with the Base64-encoded GIF string
      res.status(200).json({ success:true});
    } catch (error) {
      console.error('Error:', error);
      res.status(500).json({ error: 'Server error' });
    }
    finally {
      dbEnd(threadid);
      return res.status(500);
  }
}

