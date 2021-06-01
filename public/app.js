"use strict";

var learnjs = {
     poolId: 'us-east-1:71958f90-67bf-4571-aa17-6e4c1dfcb67d'
}; 
 
learnjs.identity = new $.Deferred(); 

learnjs.showView = function(hash) {
  var problemView = $('<div class="problem-view">').text('Coming soon!');

  $('.view-container').empty().append(problemView);
}
