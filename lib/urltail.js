module.exports = getUrlTail;
function getUrlTail(prefix, url) {
  function escapeRegExp(str) {
    return str.replace(/[\-\[\]\/\{\}\(\)\*\+\?\.\\\^\$\|]/g, "\\$&");
  }
  var pathRegExp = new RegExp('^' + escapeRegExp(prefix) + '/([^\?$]*)');
  var match = url.match(pathRegExp);
  return match[1];
}
