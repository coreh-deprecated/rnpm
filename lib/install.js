var dive = require('dive')
  , fs = require('fs')
  , path = require('path')
  , exec = require('child_process').exec
  , npm = require('npm')

module.exports = function install() {

  // Initialize NPM as a lib
  npm.load({}, function() {

    var cwd = process.cwd()
      , depsPerDir = {
        '.': {}
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

            // Extract all dependencies
            addDependencies(data.dependencies, path.relative(cwd, dir))
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
      for (dep in deps) {

        // Try to add dependencies to root directory
        if (!depsPerDir['.'][dep]) {
          depsPerDir['.'][dep] = deps[dep]
        } else {
          // check for inconsistent dependency versions.
          if (depsPerDir['.'][dep] != deps[dep]) {
            console.warn('(WARNING) ' + dir + ': inconsistent dependency version ' + dep + '@' + deps[dep])

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
        install()
      }
    }

    // install everything
    function install() {
      var dirs = Object.keys(depsPerDir)

      // install each directory with dependencies
      function installDir(i) {
        if (i >= dirs.length) {
          return completed()
        }

        var dir = dirs[i]

        console.log('Installing deps for directory ' + dir)

        var deps = depsPerDir[dir];
        var depStrings = [];

        for (var dep in deps) {
          depStrings.push(dep + '@' + deps[dep])
        }
        
        npm.prefix = path.join(cwd, dir);

        fs.exists(path.join(cwd, dir, 'node_modules')), function(exists) {
          if (!exists) {
            fs.mkdirSync(path.join(cwd, dir, 'node_modules'));
          }
          installDep(0);
        })

        // install dependencies (by groups of ~20)
        function installDep(j) {
          if (j >= depStrings.length) {
            installDir(i+1)
            return;
          }

          npm.commands.install(depStrings.slice(j, j+20), function(err) {
            if (err) throw err;
            installDep(j+20)   
          })
        }

      }
      installDir(0)
    }

    function completed() {

    }
  })
}

