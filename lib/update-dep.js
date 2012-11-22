var dive = require('dive')
  , fs = require('fs')
  , path = require('path')
  , util = require('./util');

module.exports = function updateDep(options, callback) {
  var cwd = process.cwd()
    , done = false
    , pending = 0

  // Iterate through all directories
  eachDir(null, cwd)
  dive(cwd, { directories: true, files: false }, eachDir, whenDone)

  function eachDir(err, dir) {
    if (err) throw err;
    if (dir.match(/node_modules/)) {
      return
    }

    // Check for existance of package.json and read it
    var pkgjson = path.join(dir, 'package.json')
    pending++;
    fs.exists(pkgjson, function(exists) {
      if (exists) {
        fs.readFile(pkgjson, 'utf-8', function(err, json) {
          if (err) throw err;
          var data = JSON.parse(json);

          var changed = update(data.dependencies) | update(data.devDependencies);

          if (changed) {
            util.log('update-dep', 'Updating ' + path.relative(cwd, pkgjson));
            fs.writeFile(pkgjson, JSON.stringify(data, null, '  ') + '\n', 'utf-8', function(err) {
              if (err) {
                throw err;
              }
              --pending
              checkReady();
            })
          } else {
            --pending
            checkReady();
          }
        })
      } else {
        --pending
        checkReady();
      }
    })
  }

  // called when all directories are visited
  function whenDone() {
    done = true
    checkReady();
  }

  // Update a dependency
  function update(deps) {
    if (deps && deps[options.dependency]) {
      deps[options.dependency] = options.version;
      return true;
    }
  }

  // Check if all package.json files were updated
  function checkReady() {
    if (done && !pending) {
      callback && callback()
    }
  }
}
