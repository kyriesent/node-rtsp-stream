{print} = require 'util'
{spawn} = require 'child_process'

build = (watch) ->
  options = ['-c', '-o', 'lib', 'src']
  if watch is true
    options.unshift '-w'
  coffee = spawn 'coffee', options
  coffee.stderr.on 'data', (data) ->
    coffee = spawn 'node_modules\\.bin\\coffee.cmd', options
    coffee.stdout.on 'data', (data) ->
      console.log data.toString().trim()
    coffee.stderr.on 'data', (data) ->
      console.log data.toString().trim()
  coffee.on 'error', (error) ->
    coffee = spawn 'node_modules\\.bin\\coffee.cmd', options
    coffee.stdout.on 'data', (data) ->
      console.log data.toString().trim()
    coffee.stderr.on 'data', (data) ->
      console.log data.toString().trim()
  coffee.stdout.on 'data', (data) ->
    print data.toString()
  # coffee.on 'exit', (code) ->
  #   callback?() if code is 0

task 'build', 'Build lib/ from src/', ->
  build false

task 'watch', 'Watch src/ for changes', ->
  build true