"use strict";

var learnjs = {
     poolId: 'us-east-1:71958f90-67bf-4571-aa17-6e4c1dfcb67d'
}; 
 
learnjs.identity = new $.Deferred(); 

learnjs.problemView = function(problemNumber) {
  var title = 'Problem #' + problemNumber + ' Coming soon!'

  return $('<div class="problem-view">').text(title)
}

learnjs.showView = function(hash) {
  var routes = {
    '#problem': learnjs.problemView
  }

  var hashParts = hash.split('-')
  var viewFn = routes[hashParts[0]]

  if (viewFn) {
    $('.view-container').empty().append(viewFn(hashParts[1]))
  }
}

learnjs.appOnReady = () => {
  window.onhashchange = () =>  {
    learnjs.showView(window.location.hash)
  }

  learnjs.showView(window.location.hash)
}
