const https = require('https');
const TOKEN = require('./token');

exports.handler = async(event, context, callback) => {

  const vix = await vixParser();
  const result = await postToSlack(vix);

  callback(null, result);
};

const vixParser = () => new Promise((resolve, reject) => {

  let vix = new Map();
  const options = {
    hostname: TOKEN.QUANDL_HOST,
    path: TOKEN.QUANDL_PATH_WITH_TOKEN;
  }

    let body = '';
    const req = https.request(options, (res) => {
      res.on('data', (chunk) => {
        body += chunk;
      });

      res.on('end', () => {
        let vixJson = JSON.parse(body);
        let element = '';

        // i=0:Date, i=1:VIX Open, i=2:VIX High, i=3:VIX Low, i=4:VIX Close
        vixJson.dataset_data.column_names.forEach((v, i) => {
          element = vixJson.dataset_data.data[0][i]
          vix.set(v, element);
        });
        resolve(vix);
      });
    })

    req.on('error', (e) => {
      console.error(`problem with request: ${e.message}`);
      reject(e);
    });

    req.end();
});


const postToSlack = (vixMap) => new Promise((resolve, reject) => {

  // transfer to post json
  const o = {};
  o.text = '';

  for (let [k, v] of vixMap.entries()) {
    o.text += `${k}:${v} `;
  }
  const vix = JSON.stringify(o);
  console.log(vix);

  const options = {
    hostname: TOKEN.SLACK_HOST,
    path: TOKEN.SLACK_PATH_WITH_TOKEN,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': vix.length
    }
  }

  const req = https.request(options, (res) => {
    console.log('STATUS: ' + res.statusCode);
    console.log('HEADERS: ' + JSON.stringify(res.headers));
    res.setEncoding('utf8');

    res.on('data', (chunk) => {
      console.log('BODY: ' + chunk);
    });

    res.on('end', () => {
      resolve('Post to Slack done.');
    });
  });

  req.on('error', (e) => {
    console.log('problem with request: ' + e.message);
  });

  req.write(vix);
  req.end();
});

