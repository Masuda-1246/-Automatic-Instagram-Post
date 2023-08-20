require('dotenv').config();
const puppeteer = require('puppeteer');
const { getStorage } = require('firebase-admin/storage');
const { initializeApp, cert } = require('firebase-admin/app');
const fetch = require("node-fetch");

var serviceAccount = require("./kanken-e24d4-firebase-adminsdk-dgxla-c161175af7.json");
initializeApp({
  credential: cert(serviceAccount),
  storageBucket: 'gs://kanken-e24d4.appspot.com/'
});

exports.autoScraping = async (req, res) => {
  console.log("START")
  const title = req.body.title;
  const description = req.body.description;
  const category = req.body.category;
  const number = req.body.number;
  console.log(title, description, category)
  const browser = await puppeteer.launch({
    args: [
        '--no-sandbox'
    ],
    headless: "new",
  });
  try {
    const page = await browser.newPage();
    await page.goto('https://auto-posts.vercel.app/');
    await page.type('#title', title);
    await page.type('#description', description);
    await page.type('#category', category);
    await page.click('#btn');
    await page.waitForTimeout(1500);
    const clip = await page.evaluate(s => {
      const el = document.querySelector(s)
      const { width, height, top: y, left: x } = el.getBoundingClientRect()
      return { width, height, x, y }
    }, "div.post-image")
    await page.screenshot({ clip, path: `/tmp/${title}-ss.png` })
    console.log("SCREENSHOT")
    const bucket = getStorage().bucket();
    await bucket.upload(`/tmp/${title}-ss.png`)
    .then(res => {
      console.log("upload success")
    })
    .catch(err => {
      console.error('-- ERROR:', err);
    });
    const image_url = await bucket.file(`${title}-ss.png`).getSignedUrl({
      action: 'read',
      expires: '12-31-3020'
    });
    const url = process.env["URL"] + encodeURI(title) + "-ss.png?alt=media&token="+process.env["TOKEN"]
    console.log("IMAGE_URL: ",image_url)
    console.log("URL: ",url)
    const caption = `\n[基本情報技術者試験]\nNo.${number} ${title}\nこのアカウントでは基本情報技術者試験に関する情報を発信しています!!\n1日に複数の用語を解説して行きます!\n#基本情報\n#基本情報技術者\n#プログラミング\n#情報処理技術者\n#情報系`
    const options = {
      method: 'POST',
      mode: 'cors',
      cache: 'no-cache',
      credentials: 'same-origin',
      headers: {
        'Content-Type': 'application/json'
      },
      redirect: 'follow',
      referrerPolicy: 'no-referrer',
      body: JSON.stringify({
        "image_url": url,
        "caption": caption,
      })
    }
    const response = await fetch("https://us-central1-auto-posting-74843.cloudfunctions.net/hello_http", options)
    await page.close();
    console.log(response)
    console.log(response.status)
    if (response.status !== 200) {
      return res.send({"message": "python error"})
    } else {
      await bucket.file(`${title}-ss.png`).delete()
      return res.send({"message": "success"})
    }
  } catch (error) {
    return res.send({"message": error.message})
  }
}
