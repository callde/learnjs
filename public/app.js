"use strict";

var learnjs = {
  poolId: 'us-east-2:b8b113f0-d711-4dbf-84ba-7f2a19aa75f5'
};

learnjs.identity = new $.Deferred() 

learnjs.awsRefresh = () => {
  var deferred = new $.Deferred()

  AWS.config.credentials.refresh(function(err) {
    if(err) {
      deferred.reject(err)
    } else {
      deferred.resolve(AWS.config.credentials.identityId)
    }
  })

  return deferred.promise()
}

function googleSignIn(googleUser) {
  const id_token = googleUser.getAuthResponse().id_token;

  AWS.config.update({
    region: 'us-east-2', 
    credentials: new AWS.CognitoIdentityCredentials({
      IdentityPoolId: learnjs.poolId,
      Logins: {
        'accounts.google.com': id_token
      }
    })
  })

  function refresh() {
    return gapi.auth2.getAuthInstance().signIn({
      prompt: 'login'
    }).then(function(userUpdate) {
      var creds = AWS.config.credentials;
      var newToken = userUpdate.getAuthResponse().id_token;

      creds.param.Logins['accounts.google.com'] = newToken;

      return learnjs.awsRefresh()
    })
  }

  learnjs.awsRefresh().then((id) =>  {
    learnjs.identity.resolve({
      id: id,
      email: googleUser.getBasicProfile().getEmail(),
      refresh: refresh
    })
  })
}

learnjs.sendDbRequest = (req, retry) => {
  var promise = new $.Deferred()

  req.on('error', (error) => {
    if(error.code === "CredentialsError") {
      learnjs.identity.then((identity) => {
        return identity.refresh().then(() => {
          return retry()
        }, () => {
          promise.reject(resp)
        })
      })
    } else {
      promise.reject(error)
    }
  })

  req.on('success', (resp) => {
    promise.resolve(resp.data)
  })

  req.send()

  return promise
}

learnjs.saveAnswer = (problemId, answer) => {
  return learnjs.identity.then((identity) => {
    var db = new AWS.DynamoDB.DocumentClient()
    var item = {
      TableName: 'learnjs',
      Item: {
        userId: identity.id,
        problemId: problemId,
        answer: answer
      }
    }

    return learnjs.sendDbRequest(db.put(item), () => {
      return learnjs.saveAnswer(problemId, answer)
    })
  })
}

learnjs.fetchAnswer = (problemId) => {
  return learnjs.identity.then((identity) => {
    const db = new AWS.DynamoDB.DocumentClient()
    var item = {
      TableName: 'learnjs', 
      Key: {
        userId: identity.id,
        problemId: problemId
      }
    }

    return learnjs.sendDbRequest(db.get(item), () => {
      return learnjs.fetchAnswer(problemId)
    })
  })
}

learnjs.countAnswers = (problemId) => {
  return learnjs.identity.then((identity) => {
    const db = new AWS.DynamoDB.DocumentClient()
    const params = {
      TableName: 'learnjs',
      Select: 'COUNT',
      FilterExpression: 'problemId = :problemId',
      ExpressionAttributeValues: {':problemId': problemId}
    }

    return learnjs.sendDbRequest(db.scan(params), () => {
      return learnjs.countAnswers(problemId)
    })
  })
}

learnjs.profileView = () =>  {
  const view = learnjs.template('profile-view')

  learnjs.identity.done((identity) => { 
    view.find('.email').text(identity.email)
  })

  return view
}

learnjs.addProfileLink = (profile) => {
  var link = learnjs.template('profile-link')

  link.find('a').text(profile.email)
  $('.signin-bar').prepend(link)
}

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

learnjs.triggerEvent = (name, args) => {
  $('.view-container>*').trigger(name, args)
}

learnjs.flashElement = (elem, content) => {
  elem.fadeOut('fast', () => {
    elem.html(content)
    elem.fadeIn()
  })
}

learnjs.buildCorrectFlash = (problemNum) => {
  var correctFlash = learnjs.template('correct-flash')
  var link = correctFlash.find('a')

  if(problemNum < learnjs.problems.length) {
    link.attr('href', '#problem-' + (problemNum + 1))
  } else {
    link.attr('href', '')
    link.text("You're finished!")
  }

  return correctFlash
}

learnjs.template = (name) => {
  return $('.templates .' + name).clone()
}

learnjs.landingView = () => {
  return learnjs.template('landing-view')
}

learnjs.problemView = function(data) {
  var problemNumber = parseInt(data, 10)
  var view = $('.templates .problem-view').clone()
  var problemData = learnjs.problems[problemNumber - 1]
  var resultFlash = view.find('.result')

  if(problemNumber < learnjs.problems.length) {
    var buttonItem = learnjs.template('skip-btn')

    buttonItem.find('a').attr('href', '#problem-' + (problemNumber + 1))
    $('.nav-list').append(buttonItem)
    view.bind('removingView', function() {
      buttonItem.remove()
    })
  } 
  
  function checkAnswer() {
    var answer = view.find('.answer').val()
    var test = problemData.code.replace('__', answer) + '; problem();'

    return eval(test)
  }

  /* function checkAnswerClick() {
    if(checkAnswer()) {
      var correctFlash = learnjs.template('correct-flash')

      correctFlash.find('a').attr('href', '#problem-' + (problemNumber + 1))
      learnjs.flashElement(resultFlash, correctFlash)
    } else {
      learnjs.flashElement(resultFlash, 'Incorrect!')
    }

    return false
  } */

  function checkAnswerClick() {
    var answer = view.find('.answer').val()

    if(checkAnswer()) {
      const flashContent = learnjs.buildCorrectFlash(problemNumber)

      learnjs.flashElement(resultFlash, flashContent)
      // learnjs.saveAnswer(problemNumber, answer.val())
      learnjs.saveAnswer(problemNumber, answer)
    } else {
      learnjs.flashElement(resultFlash, 'Incorrect!')
    }

    return false
  }

  view.find('.check-btn').click(checkAnswerClick)
  view.find('.title').text('Problem #' + problemNumber)

  learnjs.applyObject(problemData, view)
  learnjs.fetchAnswer(problemNumber).then((data) => {
    var answer = view.find('.answer')

    if(data.Item) {
      answer.val(data.Item.answer)
    }
  })

  return view
}

/* learnjs.problemView = function(problemNumber) {
  var view = $('.templates .problem-view').clone()

  view.find('.title').text('Problem #' + problemNumber)

  return view
} */

learnjs.showView = function(hash) {
  var routes = {
    '#problem': learnjs.problemView,
    '#profile': learnjs.profileView,
    '#': learnjs.landingView,
    '': learnjs.landingView
  }

  var hashParts = hash.split('-')
  var viewFn = routes[hashParts[0]]

  if (viewFn) {
    learnjs.triggerEvent('removingView', [])
    $('.view-container').empty().append(viewFn(hashParts[1]))
  }
}

learnjs.appOnReady = () => {
  window.onhashchange = () =>  {
    learnjs.showView(window.location.hash)
  }

  learnjs.showView(window.location.hash)
  learnjs.identity.done(learnjs.addProfileLink)
}
