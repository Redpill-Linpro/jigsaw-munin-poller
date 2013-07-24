var config       = require(process.env.JIGSAW_CONFIG || '/opt/jigsaw/etc/config.json')
  , net          = require('net')
  , util         = require('util')
  , MuninClient  = require('node-munin-client')
  , DataSetGraph = require('jigsaw-schema').datasetgraph
  , m2js         = require('./lib/munin2Jigsaw')


var graphite = net.connect(config.graphiteServer.port || 2003, config.graphiteServer.host, function (g) {
  util.log('connected to graphite');
});
graphite.setEncoding('utf8');
graphite.on('error', function (err) { util.log('Unable to talk to graphite: ' + err); });
graphite.on('data', function (data) { util.log('Graphite said (ERR?): ' + data); });



function fetchHandler(node, plugin, c) {
  return function (values) {
    var ts = Math.round((new Date()).getTime() / 1000);
      for (key in values) {
        graphite.write('jigsaw.' + node.replace(/\./g, '_') + '.munin.' + plugin + '.' + key + ' ' + values[key] + ' ' + ts + '\n');
      }
  };
}

function configHandler(node, plugin, c, nConfig) {
  return function (values) {
    for (key in values) {
      util.log('Node: ' + node + ', saving dataset: ' + key);
      m2js(plugin, values[key], node, nConfig);
    };
  };
}

function listHandler(node, c, nConfig) {
  return function (list) {
    for (var i=0; i<list.length; i++) {
      c.getMetrics(list[i], fetchHandler(node, list[i], c));
      c.getConfig(list[i], configHandler(node, list[i], c, nConfig));
    }
    c.quit();
  };
}


function queryNode(nodename, nConfig) {
  var c = new MuninClient(nodename);
  c.connect();
  c.getNodes(function (nodes) {
    for (var i=0; i < nodes.length; i++) {
      c.getList(nodes[i], listHandler(nodes[i], c, nConfig));
    }
  });
};

function queryClients() {
  for (key in config.muninNagger.nodes) {
    queryNode(key, config.muninNagger[key]);
  }
}


setInterval(function () {
  queryClients();
}, config.muninNagger.interval || 300000);

queryClients();

