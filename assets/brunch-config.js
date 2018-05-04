exports.config = {
  // See http://brunch.io/#documentation for docs.
  files: {
    javascripts: {
      joinTo: "js/app.js"

      // To use a separate vendor.js bundle, specify two files path
      // http://brunch.io/docs/config#-files-
      // joinTo: {
      //   "js/app.js": /^js/,
      //   //"js/vendor.js": /^(?!js)/,
      //   "js/codemirror.js": "node_modules/codemirror/lib/codemirror.js",
      //   //"js/javascript.js": "node_modules/codemirror/mode/javascript/javascript.js",
      // },
      
      // //To change the order of concatenation of files, explicitly mention here
      // order: {
      //   before: [
      //     "node_modules/codemirror/mode/javascript/javascript.js",
      //     "node_modules/codemirror/lib/codemirror.js",
      //   ]
      // }
    },
    stylesheets: {
      joinTo: 'css/app.css'
    },
    templates: {
      joinTo: "js/app.js"
    }
  },

  conventions: {
    // This option sets where we should place non-css and non-js assets in.
    // By default, we set this to "/assets/static". Files in this directory
    // will be copied to `paths.public`, which is "priv/static" by default.
    assets: /^(static)/
  },

  // Phoenix paths configuration
  paths: {
    // Dependencies and current project directories to watch
    watched: ["static", "css", "js", "vendor"],
    // Where to compile files to
    public: "../priv/static"
  },

  // Configure your plugins
  plugins: {
    babel: {
      // Do not use ES6 compiler in vendor code
      ignore: [/vendor/]
    },
    copycat:{
      "js/codemirror" : ["node_modules/codemirror/lib/codemirror.js"],
      "js/codemirror/mode" : ["node_modules/codemirror/mode"],
      "js/codemirror/addon" : ["node_modules/codemirror/addon"],
      "css": ["node_modules/codemirror/lib/codemirror.css"],
      verbose : true, //shows each file that is copied to the destination directory
      onlyChanged: true //only copy a file if it's modified time has changed (only effective when using brunch watch)
    }
  },

  modules: {
    autoRequire: {
      "js/app.js": ["js/app"]
    }
  },

  npm: {
    enabled: true
  }
};
