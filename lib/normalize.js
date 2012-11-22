var commander = require('commander')
  , analyze = require('./analyze')
  , updateDep = require('./update-dep')
  , util = require('./util')

module.exports = function(options, callback) {
  // analyze dependencies
  analyze({ silent: true }, normalize);

  // normalize all dependencies
  function normalize(depsPerDir, inconsistencies) {
    var deps = Object.keys(inconsistencies);

    // normalize each dependency
    function normalizeOne(i) {

      // we've reached the end of the dependency list
      if (i >= deps.length) {
        util.log('normalize', 'Done.')
        return callback && callback();
      }

      // ask the user for the right version
      commander.prompt('(' + (i+1) + '/' + deps.length + ') New version for `' + deps[i] + '` [' + inconsistencies[deps[i]].sort().join(', ') + ']: ', function(version) {
        if (!version) {
          util.log('normalize', 'Skipping dependency `' + deps[i] + '`.');
          return normalizeOne(i+1);
        }
        updateDep({ dependency: deps[i], version: version }, function() {
          normalizeOne(i+1);
        })
      })
    }

    if (deps.length > 0) {
      if (deps.length == 1) {
        util.log('normalize', '1 dependency needs normalization.')
      } else {
        util.log('normalize', deps.length + ' dependencies need normalization.')
      }
      util.log('normalize', '(Leave a dependency empty to skip it.)')
      normalizeOne(0);
    } else {
      util.log('normalize', 'All dependencies already normalized.')
      callback && callback();
    }
  }
}
