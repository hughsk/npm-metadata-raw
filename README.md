# npm-metadata-raw [![Flattr this!](https://api.flattr.com/button/flattr-badge-large.png)](https://flattr.com/submit/auto?user_id=hughskennedy&url=http://github.com/hughsk/npm-metadata-raw&title=npm-metadata-raw&description=hughsk/npm-metadata-raw%20on%20GitHub&language=en_GB&tags=flattr,github,javascript&category=software)[![experimental](http://hughsk.github.io/stability-badges/dist/experimental.svg)](http://github.com/hughsk/stability-badges) #

Retrieve the metadata for every package on NPM and store it in a level*
database. Once you've acquired the data, you can then run your own manual
queries over it very quickly and without hitting the registry.

The initial sync takes a long time, but this module only downloads the most
recent changes not already stored - so after the first run it should be
relatively speedy.

## Usage ##

[![npm-metadata-raw](https://nodei.co/npm/npm-metadata-raw.png?mini=true)](https://nodei.co/npm/npm-metadata-raw)

### `metadb = require('npm-metadata-raw')(db)` ###

Takes a level* database `db` and returns a modified one for querying. Once
synced, each package is stored in `metadb` by their name - so you could do
this to get the metdata for the [disc](http://github.com/hughsk/disc) module:

``` javascript
var db = require('level')(__dirname + '/npm-meta')
var metadata = require('npm-metadata-raw')
var sublevel = require('level-sublevel')

var metadb = metadata(sublevel(db))

metadb.sync(function(err) {
  if (err) throw err
  metadb.get('disc', function(err, meta) {
    if (err) throw err
    console.log(JSON.parse(meta).name) // "disc"
  })
})
```

### `metadb.sync([finished])` ###

Sync with the NPM registry, optionally passing the `finished` callback for when
the process is complete. This must be done at least once before you can access
any data.

### `metadb.sync().on('found', name)` ###

When syncing, an initial pass is done over a complete list of packages in the
registry. The `found` event is emitted once for each module in the list.

### `metadb.sync().on('data', json, name, date)` ###

After the first pass, a second pass will retrieve and store the metadata for
each out of date package. When retrieved, the module data is emitted under
the `data` event.

### `metadb.sync().on('end')` ###

Emitted when the whole process is complete.

## License ##

MIT. See [LICENSE.md](http://github.com/hughsk/npm-metadata-raw/blob/master/LICENSE.md) for details.
