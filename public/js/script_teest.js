let guid = null
let cid = null
let botName = "MrcConversationBOT"
let sequence = 0
const sessionId = localStorage.getItem("userInfo");

// function getCurrentTime() {
//   let today = new Date();
//   let time = (today.getFullYear()).toString() + (today.getMonth()+1).toString() + (today.getDate()).toString() + (today.getHours()).toString() + (today.getMinutes()).toString();
//   return time;
// }

//dynamodb logging function
function logMessage(msg, isBot = false){
  sequence = sequence + 1
  seq = sequence.toString()
  // let createOn = getCurrentTime();

  let owner = 'CUST'
  if (isBot)
  owner = 'BOT'

  // saveTransEndPoint = "https://er8bhccz8g.execute-api.us-east-1.amazonaws.com/dev/"
  saveTransEndPoint = "https://52fs0yoqll.execute-api.us-east-1.amazonaws.com/default/transcriptTest"
  postData = {"guid": guid, "campaignid": cid, "message": msg, "owner": owner, "conversationSeq": seq, "sessionId": sessionId}

  $.post(saveTransEndPoint, JSON.stringify(postData))
    .done(function(d){
      console.log('Script Saved');
    })
    .fail(function(xhr, status, error){
      console.log(xhr.status + "::" + xhr.responseText)
    })
}

$(document).ready(function() {
  // Initialize the Amazon Cognito credentials provider
  AWS.config.region = 'us-east-1'; // Region
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: 'us-east-1:41eb7311-5f5a-4de0-bb1a-21019f3de73c',
  });
  const lexUserInfo = 'chatbot-demo' + Date.now();
  localStorage.setItem("userInfo", lexUserInfo);

  //getting query params from url
  let params = [], splitParam;
  let rawParams = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
  for(let i = 0; i < rawParams.length; i++) {
    paramValue = rawParams[i].split('=');
    let paramKey = paramValue[0];
    params[paramKey] = paramValue[1];
  }

  guid = params.guid
  cid = params.cid

  //botname get
  $.get(`https://c8l2ro2uy8.execute-api.us-east-1.amazonaws.com/default/mrcconnectValidate?guid=${guid}`,
  function(data, status){
    // botName = data.botName;
    botName = "MrcConversationBOT";
    console.log(botName);
  });

  //preloading
  $('.chatbox').append(`
  <div class="loader friend-bubble">
    <div class="bubble-1"></div>
    <div class="bubble-2"></div>
    <div class="bubble-3"></div>
  </div>
  `);

  //dynamodb check name setting
  profEndPoint = "https://p9oi7ujdkg.execute-api.us-east-1.amazonaws.com/dev/mrcconnectGetProfUsingGUID"
  postData = {"guid": params.guid, "campaignid": params.cid}

  let userName = ''

  //intro
  if (botName == "MrcConversationBOT") {
    //dynamodb name query send
    $.post(profEndPoint, JSON.stringify(postData))
      .done(function(d){

        //remove preloading
        $('.loader').remove();

        //greetings
        $('body').show()
        userName = d.firstname + ' ' + d.lastname;
        let greetingMsg = `Hi ${userName}!`;
        $('.chatbox').append(`<div class="friend-bubble bubble">${greetingMsg}</li>`);
        logMessage(greetingMsg, true);//loggin for bot
        // $('.chatbox').append(`<div class="friend-bubble bubble">Hi! How can I help you?</li>`);
      })
      .fail(function(data, status, error){
        ('body').html('Invalid Access').show()
        console.log(data.status + "::" + data.responseText)
      });
  } else {
    $('.chatbox').append(`<div class="friend-bubble bubble">Hi! How can I help you?</li>`);
  }

  $("textarea").focus();
});

// mouse
$('#send').on('click', send);

// keyboard
$('.text-box').on('keypress', keySend);

//sending fuctions
function keySend(event) {
        // console.log(event);
        if ($('textarea').val() !== '' && !event.shiftKey && event.key == 'Enter') {
            //shift + key => line change
            event.preventDefault();
            send();
            // $('textarea').blur(); //keyboard cursor disappear.

            //fix the scroll to the bottom
            $(".chatbox").stop().animate({ scrollTop: $(".chatbox")[0].scrollHeight}, 1500);
        }
}

function send() {
      //user input
      const msg = $('textarea').val();
      logMessage(msg, false); //dynamodb logging for user

      if ($('textarea').val().trim() !== '') {
      $('.chatbox').append(`<div class="my-bubble bubble">${msg}</li>`);

      //preloading
      $('.chatbox').append(`
      <div class="loader friend-bubble">
        <div class="bubble-1"></div>
        <div class="bubble-2"></div>
        <div class="bubble-3"></div>
      </div>
      `);

      //lex response
      var lexruntime = new AWS.LexRuntime();
      const lexUserId = localStorage.getItem("userInfo");
      var sessionAttributes = {
        "cid": cid,
        "guid": guid
      };

      var params = {
        botAlias: '$LATEST',
        botName: botName,
        // botName: "mrcConnect_surveyBot",
        inputText: msg,
        userId: lexUserId,
        sessionAttributes: sessionAttributes
      };

      lexruntime.postText(params, function(err, data) {
        if (err) {
          console.log(err, err.stack);
          console.log('Error:  ' + err.message + ' (see console for details)');
        }
        if (data) {
          // myMsgx = []
          // myMsgx.push(data.message)
          logMessage(data.message, true); //dynamodb logging for bot
          console.log(data);

          //remove preloader
          $('.loader').remove();

          // capture the sessionAttributes for the next cycle
          sessionAttributes = data.sessionAttributes;

          // show response and/or error/dialog status
          $('.chatbox').append('<div class="friend-bubble bubble">' + data.message + '</li>');

          //responseCard
          if (data.responseCard) {
            if (data.responseCard.genericAttachments[0].imageUrl) {
              $('.chatbox').append(`
              <div class="friend-bubble bubble" style="text-align: center;">
                <div>${data.responseCard.genericAttachments[0].title}</div>
                <div>${data.responseCard.genericAttachments[0].subTitle}</div>
                <img src="${data.responseCard.genericAttachments[0].imageUrl}" style="width: 80%; height: 50%; margin: 10px; border-radius: 10px;">
              </div>
              `);
            } else {
              $('.chatbox').append(`
              <div class="friend-bubble bubble" style="text-align: center;">
                <div>${data.responseCard.genericAttachments[0].title}</div>
                <div>${data.responseCard.genericAttachments[0].subTitle}</div>
              </div>
            `);
            }

            // myMsgx.push("<b>" + data.responseCard.genericAttachments[0].title + "</b>")
            // myMsgx.push(data.responseCard.genericAttachments[0].subTitle)

            logMessage(data.responseCard.genericAttachments[0].title, true);
            logMessage(data.responseCard.genericAttachments[0].subTitle, true);

            // $('.chatbox').append(`
            //   <div class="friend-bubble bubble" style="text-align: center;">
            //     <div>${data.responseCard.genericAttachments[0].title}</div>
            //     <div>${data.responseCard.genericAttachments[0].subTitle}</div>
            //   </div>
            // `);
            const cardButton = data.responseCard.genericAttachments[0].buttons;
            for (i in cardButton) {
              $('.friend-bubble:last').append(`
                <button class="answer-button" value="${cardButton[i].value}">${cardButton[i].text}</button >
              `);
              // myMsgx.push("-- Opt: " + "(" + cardButton[i].value + ") " + cardButton[i].text)
              logMessage(cardButton[i].text, true);
            }
          }
          $(".chatbox").stop().animate({ scrollTop: $(".chatbox")[0].scrollHeight}, 1500);

          // lmsg = myMsgx.join('<br>')
          // logMessage(lmsg, true) //dynamodb logging for bot
        }
      });
      $('textarea').val('');
      //lambda API (ajax)
      // $.post("https://rmmq6sqmhk.execute-api.us-east-1.amazonaws.com/default/BiBot_API",
      // JSON.stringify(
      //   {
      //     message: msg
      //   }),
      // function(data, status){
      //   $('.chatbox').append('<div class="friend-bubble bubble">' + data.message + '</li>');
      //   $(".chatbox").stop().animate({ scrollTop: $(".chatbox")[0].scrollHeight}, 1500);
      // });

      $("textarea").focus();
    }
}

$(document).on('click', '.answer-button', function() {
  const msg = $(this).attr("value");
  logMessage(msg, false); //dynamodb logging for user

  //preloading
  $('.chatbox').append(`
  <div class="loader friend-bubble">
    <div class="bubble-1"></div>
    <div class="bubble-2"></div>
    <div class="bubble-3"></div>
  </div>
  `);

  var lexruntime = new AWS.LexRuntime();
  const lexUserId = localStorage.getItem("userInfo");
  var sessionAttributes = {
    "cid": cid,
    "guid": guid
  };

  var params = {
    botAlias: '$LATEST',
    botName: "MrcConversationBOT",
    // botName: "mrcConnect_surveyBot",
    inputText: msg,
    userId: lexUserId,
    sessionAttributes: sessionAttributes
  };

  lexruntime.postText(params, function(err, data) {
    console.log(data)
    //remove preloader
    $('.loader').remove();

    //response from lax
    if (err) {
      console.log(err, err.stack);
      console.log('Error:  ' + err.message + ' (see console for details)');
    }
    if (data) {
      // capture the sessionAttributes for the next cycle
      sessionAttributes = data.sessionAttributes;
      // show response and/or error/dialog status
      console.log(data);
      console.log(data.responseCard);

      //message
      // LogMessage = false
      // myMsg = []
      // if (data.message) {
      //   LogMessage = true
      //   // logMessage(data.message, true); //dynamodb logging for bot
      //   $('.chatbox').append('<div class="friend-bubble bubble">' + data.message + '</li>');
      //   myMsg.push(data.message)
      // }
      if (data.message) {
        logMessage(data.message, true); //dynamodb logging for bot
        $('.chatbox').append('<div class="friend-bubble bubble">' + data.message + '</li>');
      }

      //responseCard
      if (data.responseCard) {
        console.log(data.responseCard);

        if (data.responseCard.genericAttachments[0].imageUrl) {
          $('.chatbox').append(`
            <div class="friend-bubble bubble" style="text-align: center;">
              <div>${data.responseCard.genericAttachments[0].title}</div>
              <div>${data.responseCard.genericAttachments[0].subTitle}</div>
              <img src="${data.responseCard.genericAttachments[0].imageUrl}" style="width: 80%; height: 50%; margin: 10px; border-radius: 10px;">
            </div>
          `);
        }
        if (data.responseCard.genericAttachments[0].title) {
          $('.chatbox').append(`
            <div class="friend-bubble bubble" style="text-align: center;">
              <div>${data.responseCard.genericAttachments[0].title}</div>
              <div>${data.responseCard.genericAttachments[0].subTitle}</div>
            </div>
          `);
        }

        logMessage(data.responseCard.genericAttachments[0].title, true);
        logMessage(data.responseCard.genericAttachments[0].subTitle, true);

        // myMsg.push("<b>" + data.responseCard.genericAttachments[0].title + "</b>")
        // myMsg.push(data.responseCard.genericAttachments[0].subTitle)

        const cardButton = data.responseCard.genericAttachments[0].buttons;
        for (i in cardButton) {
          $('.friend-bubble:last').append(`
            <button class="answer-button" value=${cardButton[i].value}>${cardButton[i].text}</button >
          `);
          logMessage(cardButton[i].text, true); //dynamodb logging for bot
          // myMsg.push("-- Opt: " + "(" + cardButton[i].value + ") " + cardButton[i].text)
        }
      }
      $(".chatbox").stop().animate({ scrollTop: $(".chatbox")[0].scrollHeight}, 1500);
      // if(toLogMessage){
      //   lmsg = myMsg.join('<br>')
      //   logMessage(lmsg, true)
      // }

    }

    $("textarea").focus();
  });
});
