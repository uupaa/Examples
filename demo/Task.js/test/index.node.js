var Task = require("../lib/Task.js");

var g = "a > 1000 > b > 1000"; // task group

Task.run([g,g,g,g,g].join(">"), {
  a: function(task) { console.log("どっこらせー"); task.pass(); },
  b: function(task) { console.log("よっこいせー"); task.pass(); }
}, function() {
  console.log("おしまい");
});

