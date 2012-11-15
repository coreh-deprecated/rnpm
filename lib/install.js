var fs = require('fs')
  , path = require('path')
  , npm = require('npm')
  , analyze = require('./analyze');

module.exports = function install(options, callback) {

  var cwd = process.cwd()

  // Initialize NPM as a lib
  npm.load({}, function() {

    // analyze dependencies
    analyze(options, install)

    // install everything
    function install(depsPerDir) {
      var dirs = Object.keys(depsPerDir)

      // install each directory with dependencies
      function installDir(i) {
        if (i >= dirs.length) {
          return callback && callback()
        }

        var dir = dirs[i]

        console.log('Installing deps for directory ' + dir)

        var deps = depsPerDir[dir];
        var depStrings = [];

        for (var dep in deps) {
          depStrings.push(dep + '@' + deps[dep])
        }
        
        npm.prefix = path.join(cwd, dir);

        fs.exists(path.join(cwd, dir, 'node_modules'), function(exists) {
          // create node_modules dir if it doesn't exist
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
  })
}

