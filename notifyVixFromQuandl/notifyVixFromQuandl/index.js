const https = require('https');
const CONFIG = require('./config');
const { WebClient } = require('@slack/client');

exports.handler = async (event, context, callback) => {

  const vixSeries = await vixDownload();
  const graphDrawer = new GraphDrawer(vixSeries);
  const vixPng = graphDrawer.draw();
  const todayVIX = vixSeries.data[vixSeries.data.length - 1];
  const result = await postToSlack(vixPng, todayVIX);
  callback(null, result);
};

class GraphDrawer {

  // series = { labels: [<string>], data: [<number>] }
  constructor(series = {}) {
    this.series = series;
    const { CanvasRenderService } = require('chartjs-node-canvas');
    this.renderService = new CanvasRenderService(800, 600);
    this.startDay = series.labels[0];
    this.endDay = series.labels[series.labels.length - 1];
    this.options = {
      plugins: [{
        beforeDraw: this.drawBackground
      }],
      type: 'line',
      data: {
        labels: series.labels,
        datasets: [{
          label: `CBOE VIX: ${this.startDay} - ${this.endDay}`,
          data: series.data,
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
    }
  }

  drawBackground(c) {
    const ctx = c.chart.ctx;
    ctx.fillStyle = 'rgba(255,255,255,1)';
    ctx.fillRect(0, 0, c.chart.width, c.chart.height);
  }

  draw() {
    return this.renderService.renderToBufferSync(this.options);
  }
}

const vixDownload = () => new Promise((resolve, reject) => {
  const options = {
    hostname: CONFIG.QUANDL_HOST,
    path: `${CONFIG.QUANDL_PATH}?limit=${CONFIG.DAYS}&auth_token=${CONFIG.QUANDL_TOKEN}`,
  }

  let body = '';
  const req = https.request(options, (res) => {
    res.on('data', (chunk) => {
      body += chunk;
    });

    res.on('end', () => {
      let vixJson = JSON.parse(body);

      const vixSeries = {};
      vixSeries.labels = [];
      vixSeries.data = [];

      // Parse vix series
      const DATE_INDEX = 0, VIX_INDEX = 1;
      vixJson.dataset_data.data.reverse().forEach((k, v) => {
        vixSeries.labels.push(k[DATE_INDEX]);
        vixSeries.data.push(k[VIX_INDEX]);
      });
      resolve(vixSeries);
    });
  })

  req.on('error', (e) => {
    console.error(`problem with request: ${e.message}`);
    reject(e);
  });

  req.end();
});

const postToSlack = (vixPng, todayVIX) => new Promise((resolve, reject) => {
  const web = new WebClient(CONFIG.SLACK_TOKEN);
  const channel = CONFIG.SLACK_CHANNEL;
  const option = {
    channels: channel,
    file: vixPng,
    filename: `CBOE VIX trend`,
    filetype: 'png',
    initial_comment: `Last ${CONFIG.DAYS} days VIX. Today VIX is ${todayVIX}`,
  }

  web.files.upload(option)
    .then(res => {
      console.log(`Post file [ ${res.file.name} ] done`);
    }).catch(console.error);
});
