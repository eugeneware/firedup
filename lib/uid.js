var bytewise = require('bytewise');

module.exports = getKey;
function getKey() {
  var hr = process.hrtime();
  var key = '-' + bytewise.encode(hr[0]*1e9 + hr[1]).toString('hex');
  return key;
}
