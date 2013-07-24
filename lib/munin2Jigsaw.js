var DataSetGraph = require('jigsaw-schema').datasetgraph;

function createObject (plugin, gd, node, config) {
  var ret = { host: node, draw: [] };

  ret.id = plugin;
  ret.name = gd.graph.title;
  ret.category = gd.graph.category || 'Uncategorized';
  if ( gd.graph.vlabel ) {
    ret.vlabel = gd.graph.vlabel;
  }

  if ( gd.graph.info ) {
    ret.description = gd.graph.info;
  }

  for (key in gd.values) {
    var line = { name: 'munin.' + plugin + '.' + key, alias: key };

    for (attr in gd.values[key]) {
      switch(attr) {
      case 'type':
        if ( gd.values[key].type.match(/(DERIVE|COUNTER)/) ) {
          line.type = 'counter';
        }
        break;
      case 'draw':
        if ( gd.values[key].draw.match(/(AREA|STACK)/) ) {
          line.draw = 'stacked';
        }
        break;
      case 'label':
        line.alias = gd.values[key].label;
        break;
      case 'colour':
        line.color = gd.values[key].colour;
        break;
      }
    }
    ret.draw.push(line);
  }
  ret.ttl = 3600;
//  console.log(ret.draw[0]);
  return ret;
}

module.exports = function (plugin, gd, node, config) {
  var obj = createObject(plugin, gd, node, config);
  if ( obj.draw.length === 0 ) {
    // No point in storing empty graphs.
    return;
  }
  DataSetGraph.findOne({ host: obj.host, id: obj.id }, function (err, res) {
    if ( res ) {
      for (key in obj) {
        res[key] = obj[key];
      }
      res.updated = (new Date);
      res.save();
    } else {
      var ds = new DataSetGraph(obj);
      ds.save();
    }
  });
};
