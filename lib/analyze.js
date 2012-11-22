var dive = require('dive')
  , fs = require('fs')
  , path = require('path')
  , util = require('./util');

module.exports = function analyze(options, callback) {

  var cwd = process.cwd()
    , depsPerDir = {
      '.': {}
      }
    , inconsistencies = {
    }
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

          // Extract dependencies
          addDependencies(data.dependencies, path.relative(cwd, dir))

          // Extract development dependencies if not in production
          if (!options.production) {
            addDependencies(data.devDependencies, path.relative(cwd, dir))
          }

          --pending
          checkReady();
        })
      } else {
        --pending
        checkReady();
      }
    })
  }

  function addDependencies(deps, dir) {
    if (!deps) {
      return;
    }
    for (dep in deps) {

      // Try to add dependencies to root directory
      if (!depsPerDir['.'][dep]) {
        depsPerDir['.'][dep] = deps[dep]
      } else {
        // check for inconsistent dependency versions.
        if (depsPerDir['.'][dep] != deps[dep]) {
          if (!options.silent) {
            util.warn('analyze', dir + ': inconsistent dependency version ' + dep + '@' + deps[dep])
          }

          // Store inconsistencies
          if (!inconsistencies[dep]) {
            inconsistencies[dep] = [depsPerDir['.'][dep]]
          }

          if (inconsistencies[dep].indexOf(deps[dep]) == -1) {
            inconsistencies[dep].push(deps[dep]);
          }

          // create dir entry if necessary
          if (!depsPerDir[dir]) {
            depsPerDir[dir] = {}
          }

          // Add dependency to nested directory
          depsPerDir[dir][dep] = deps[dep]
        }
      }
    }
  }

  // called when all directories are visited
  function whenDone() {
    done = true
    checkReady();
  }

  // Check if all package.json files were read
  function checkReady() {
    if (done && !pending) {
      callback && callback(depsPerDir, inconsistencies)
    }
  }
}
