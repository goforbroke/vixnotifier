const lambda = require('../notifyVixFromQuandl/notifyVixFromQuandl/index.js');

const event = '';
const context = '';

const callback =(error, result) => {
  console.log(result);
  process.exit(0);
}

lambda.handler(event, callback, callback);