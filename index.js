var EventEmitter = require('events').EventEmitter
var deleteRange = require('level-delete-range')
var combine = require('stream-combiner')
var now = require('monotonic-timestamp')
var batch = require('batch-stream')
var through2 = require('through2')
var stats = require('npm-stats')()
var json = require('JSONStream')
var map = require('map-async')

var objectmode = { objectMode: true }
var sep = '\xFE'

module.exports = raw

function noop(){}

function raw(db, completed) {
  if (!db.sublevel) throw new Error(
    'Please ensure that you have used the level-sublevel module on your database'
  )

  var metadata = db.sublevel('metadata')
  var dates = db.sublevel('dates')

  metadata.sync = function sync(_completed) {
    var emitter = new EventEmitter
    if (_completed) emitter.once('end', _completed)

    var store = through2(objectmode
      , function(row, _, next) {
        var key = row.date + sep + now().toString(36)
        dates.put(key, row.name, function(err) {
          if (err) return store.emit('error', err)
          emitter.emit('found', row.name)
          next()
        })
      })

    var most_recent = null
    var retrieve = through2(objectmode
      , function(rows, _, done) {
        var latest = null

        map(rows, function(row, i, next) {
          var name = row.value
          var date = new Date(row.key.split(sep)[0])
          if (date < most_recent) return next()
          if (date > latest) latest = date

          stats.module(name).info(function(err, info) {
            if (err) return next(err)
            emitter.emit('data', info, name, date)
            metadata.put(name, JSON.stringify(info))
            next()
          })
        }, function(err) {
          if (err) return done(err)
          if (!latest) return done()
          return db.put('most_recent', JSON.stringify(latest), done)
        })
      })

    deleteRange(dates, {}, function(err) {
      if (err) return completed(err)

      db.get('most_recent', function(err, recent) {
        if (recent) most_recent = new Date(JSON.parse(recent))

        combine(
          stats.listByDate(most_recent
            ? { since: most_recent }
            : {}
            )
          , json.parse([true])
          , store
        ).once('end', ready)
         .once('error', ready)
      })
    })

    return emitter

    function ready() {
      combine(
          dates.createReadStream()
        , new batch({ size: 20 })
        , retrieve
      ).once('end', completed)
       .once('error', completed)
    }

    function completed() {
      deleteRange(dates, {}, function() {
        emitter.emit('end')
      })
    }
  }

  return metadata
}

var db = raw(
  require('level-sublevel')(
    require('level')(
      __dirname + '/.tmp'
    )
  )
)

db.get('browserify', function(err, meta) {
  if (err) throw err
  console.error(JSON.parse(meta))
})

// db.sync(function(err) {
//   if (err) throw err
//   console.error('done!!!')
// }).on('data', function(data, name, date) {
//   console.log(date, name)
// }).on('found', function(name) {
//   console.log(name)
// })
