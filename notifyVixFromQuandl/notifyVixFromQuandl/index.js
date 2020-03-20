const https = require('https');
const CONFIG = require('./token');
const { WebClient } = require('@slack/client');

exports.handler = async (event, context, callback) => {

  // const vix = await vixParser();
  const vixSeries = await vixParser();
  const vixPng = drawGraph(vixSeries);
  // vix.forEach(e => console.log(e));
  // const result = '';
  // const result = await postToSlack(vix);
  const result = await postToSlack(vixPng);
  callback(null, result);
};

const drawGraph = (vixSeries) => {
  const { CanvasRenderService } = require('chartjs-node-canvas');
  const renderService = new CanvasRenderService(800, 600);
  const options = {
    plugins: [{
      beforeDraw: drawBackground
    }],
    type: 'line',
    data: {
      labels: vixSeries.labels,
      datasets: [{
        label: `CBOE VIX: ${vixSeries.labels[0]} - ${vixSeries.labels[vixSeries.labels.length - 1]}`,
        data: vixSeries.data,
        backgroundColor:
          'rgba(255, 99, 132, 0.2)',
        borderColor:
          'rgba(255,99,132,1)',
        borderWidth: 1
      }]
    },
    options: {
      scales: {
        yAxes: [{
          ticks: {
            beginAtZero: true
          }
        }]
      }
    }
  };
  const buffer = renderService.renderToBufferSync(options);
  return buffer;
  // const fs = require('fs');
  // fs.writeFileSync('test.png', buffer);
}

const drawBackground = (c) => {
  const ctx = c.chart.ctx;
  ctx.fillStyle = 'rgba(255,255,255,1)';
  ctx.fillRect(0, 0, c.chart.width, c.chart.height);
}

const vixParser = () => new Promise((resolve, reject) => {

  let vix = new Map();
  const options = {
    hostname: 'www.quandl.com',
    path: `/api/v3/datasets/CBOE/VIX/data.json?limit=14&auth_token=${CONFIG.QUANDL}`,
  }

  let body = '';
  const req = https.request(options, (res) => {
    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      let vixJson = JSON.parse(body);
      let element = '';

      vix.set("Source", "CBOE VIX");
      const vixSeries = {};
      const labels = [];
      const data = [];
      // Parse vix series
      // i=0:Date, i=1:VIX Open, i=2:VIX High, i=3:VIX Low, i=4:VIX Close
      const DATE_INDEX = 0, VIX_CLOSE_INDEX = 4;
      vixJson.dataset_data.data.reverse().forEach((k, v) => {
        labels.push(k[DATE_INDEX]);
        data.push(k[VIX_CLOSE_INDEX]);
      });
      vixSeries.labels = labels;
      vixSeries.data = data;
      // console.log(vixSeries);
      // pic VIX data
      // i=0:Date, i=1:VIX Open, i=2:VIX High, i=3:VIX Low, i=4:VIX Close
      vixJson.dataset_data.column_names.forEach((v, i) => {
        // console.log(`v: ${v} -> ${i}`);
        element = vixJson.dataset_data.data[0][i];
        // console.log(`${v} -> Element:${element}`);
        vix.set(v, element);
      });
      // console.log("------" , vix);
      // resolve(vix);
      resolve(vixSeries);
    });
  })

  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
    reject(e);
  });

  req.end();
});

// const postToSlack = (vixMap) => new Promise((resolve, reject) => {

const postToSlack = (vixPng) => new Promise((resolve, reject) => {
  // Transfer for slack post format
  // const o = {};
  // o.text = '';

  // for (let [k, v] of vixMap.entries()) {
  //   o.text += `${k}:${v} `;
  // }
  // const vix = JSON.stringify(o);
  // console.log(vix);

  // const options = {
  //   hostname: TOKEN.SLACK_HOST,
  //   path: TOKEN.SLACK_PATH,
  //   method: 'POST',
  //   headers: {
  //     // 'Content-Type': 'application/json',
  //     // 'Content-Length': vix.length
  //     'Content-Type': 'image/png',
  //     'Content-Length': vixPng.length
  //   }
  // }

  // const req = https.request(options, (res) => {
  //   console.log('STATUS: ' + res.statusCode);
  //   console.log('HEADERS: ' + JSON.stringify(res.headers));
  //   res.setEncoding('utf8');
  //   res.on('data', (chunk) => {
  //     console.log('BODY: ' + chunk);
  //   });

  //   res.on('end', () => {
  //     resolve('Post to Slack done.');
  //   });
  // });

  // req.on('error', (e) => {
  //   console.log('problem with request: ' + e.message);
  // });

  // req.write(vixPng);

  // req.end();
  const web = new WebClient(CONFIG.SLACK_TOKEN);
  const channel = 'D8A9Z0DB2';
  const option = {
    channels: channel,
    file: vixPng,
    filename: 'VIX graph for the last two weeks.',
  }

  web.files.upload(option)
    .then(res => {
      console.log('');
    }).catch(console.error);
});
