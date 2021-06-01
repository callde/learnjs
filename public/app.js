"use strict";

var learnjs = {
     poolId: 'us-east-1:71958f90-67bf-4571-aa17-6e4c1dfcb67d'
}; 
 
learnjs.identity = new $.Deferred(); 

learnjs.problems = [
  {
    description: "What is truth?",
    code: "function problem() { return __; }"
  },
  {
    description: "Simple Math",
    code: "function problem() { return 42 === 6 * __; }"
  }
]

learnjs.applyObject = function(obj, elem) {
  for(var key in obj) {
    elem.find('[data-name="' + key +  '"]').text(obj[key])
  }
}

learnjs.flashElement = (elem, content) => {
  elem.fadeOut('fast', () => {
    elem.html(content)
    elem.fadeIn()
  })
}

learnjs.problemView = function(data) {
  var problemNumber = parseInt(data, 10)
  var view = $('.templates .problem-view').clone()
  var problemData = learnjs.problems[problemNumber - 1]
  var resultFlash = view.find('.result')
  
  function checkAnswer() {
    var answer = view.find('.answer').val()
    var test = problemData.code.replace('__', answer) + '; problem();'

    return eval(test)
  }

  function checkAnswerClick() {
    if(checkAnswer()) {
      learnjs.flashElement(resultFlash, 'Correct!')
    } else {
      learnjs.flashElement(resultFlash, 'Incorrect!')
    }

    return false
  }

  view.find('.check-btn').click(checkAnswerClick)
  view.find('.title').text('Problem #' + problemNumber)

  learnjs.applyObject(problemData, view)

  return view
}

/* learnjs.problemView = function(problemNumber) {
  var view = $('.templates .problem-view').clone()

  view.find('.title').text('Problem #' + problemNumber)

  return view
} */

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
