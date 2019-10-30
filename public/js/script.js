let guid = null
let cid = null
let botName = "MrcConversationBOT"
const sessionId = localStorage.getItem("userInfo");
console.log(`sessionId: ${sessionId}`);

let sequence = 100

//dynamodb logging function
function logMessage(msg, owner){
  sequence = sequence + 1
  seq = sequence.toString()
  console.log(sequence);
  
  // let owner = 'CUST'
  // if (isBot)
  // owner = 'BOT'

  saveTransEndPoint = "https://er8bhccz8g.execute-api.us-east-1.amazonaws.com/dev/"
  // postData = {"guid": guid, "campaignid": cid, "message": msg, "owner": owner}
  // saveTransEndPoint = "https://52fs0yoqll.execute-api.us-east-1.amazonaws.com/default/transcriptTest"
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
  for(let i = 0; i < rawParams.length; i++)
  {
      paramValue = rawParams[i].split('=');
      let paramKey = paramValue[0];
      params[paramKey] = paramValue[1];
  }

  guid = params.guid
  cid = params.cid

  //botname get
  // $.get(`https://c8l2ro2uy8.execute-api.us-east-1.amazonaws.com/default/mrcconnectValidate?guid=${guid}`,
  // function(data, status){
  //   // botName = data.botName;
  //   botName = "MrcConversationBOT";
  //   console.log(botName);
  // });

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
        console.log(d.email);
        console.log(d.firstname + ' ' + d.lastname);
        $('body').show()
        userName = d.firstname + ' ' + d.lastname;
        let greetingMsg = `Hi ${userName}!`;
        $('.chatbox').append(`<div class="friend-bubble bubble">${greetingMsg}</li>`);
        logMessage(greetingMsg, 'BOT')//logging for bot
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
      logMessage(msg, 'CUST') //dynamodb logging for user

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
        "guid": guid,
        // "sessionId": lexUserId
        "sessionId": sessionId
      };

      var params = {
        botAlias: '$LATEST',
        botName: botName,
        // botName: "emailTest",
        inputText: msg,
        userId: sessionId,
        sessionAttributes: sessionAttributes
      };

      lexruntime.postText(params, function(err, data) {
        if (err) {
          console.log(err, err.stack);
          console.log('Error:  ' + err.message + ' (see console for details)');
        }
        if (data) {
          logMessage(data.message, 'BOT') //dynamodb logging for bot
          console.log(data);

          //remove preloader
          $('.loader').remove();

          // capture the sessionAttributes for the next cycle
          sessionAttributes = data.sessionAttributes;

          // show response and/or error/dialog status
          $('.chatbox').append('<div class="friend-bubble bubble">' + data.message + '</li>');

          //responseCard
          if (data.responseCard) {
            console.log(data.responseCard.contentType);

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
            logMessage(data.responseCard.genericAttachments[0].title, 'BOT');//loggin bot's response card
            logMessage(data.responseCard.genericAttachments[0].subTitle, 'BOT');//loggin bot's response card

            const cardButton = data.responseCard.genericAttachments[0].buttons;
            for (i in cardButton) {
              $('.friend-bubble:last').append(`
                <button class="answer-button" value="${cardButton[i].value}">${cardButton[i].text}</button >
              `);
              logMessage(cardButton[i].text, 'Option');
              console.log(i);
            }
          }
          $(".chatbox").stop().animate({ scrollTop: $(".chatbox")[0].scrollHeight}, 1500);
        }
      });
      $('textarea').val('');
      $("textarea").focus();
    }
}

$(document).on('click', '.answer-button', function() {
  const msg = $(this).attr('value');
  logMessage($(this).html(), 'CUST') //dynamodb logging for user
  console.log(msg);

  //preloading
  $('.chatbox').append(`
  <div class="loader friend-bubble">
    <div class="bubble-1"></div>
    <div class="bubble-2"></div>
    <div class="bubble-3"></div>
  </div>
  `);  

  var lexruntime = new AWS.LexRuntime();
  // const lexUserId = localStorage.getItem("userInfo");
  var sessionAttributes = {
    "cid": cid,
    "guid": guid,
    "sessionId": sessionId
  };

  var params = {
    botAlias: '$LATEST',
    botName: "MrcConversationBOT",
    // botName: "emailTest",
    inputText: msg,
    userId: sessionId,
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
      if (data.message) {
        logMessage(data.message, 'BOT'); //dynamodb logging for bot
        $('.chatbox').append('<div class="friend-bubble bubble">' + data.message + '</li>');
      }
   
      //responseCard
      if (data.responseCard) {
        console.log(data.responseCard.contentType);

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
        logMessage(data.responseCard.genericAttachments[0].title, 'BOT'); //dynamodb logging for bot
        logMessage(data.responseCard.genericAttachments[0].subTitle, 'BOT'); //dynamodb logging for bot    

        const cardButton = data.responseCard.genericAttachments[0].buttons;
        for (i in cardButton) {
          $('.friend-bubble:last').append(`
            <button class="answer-button" value=${cardButton[i].value}>${cardButton[i].text}</button >
          `);
          logMessage(cardButton[i].text, 'Option')
          console.log(i);
        }
      }
      $(".chatbox").stop().animate({ scrollTop: $(".chatbox")[0].scrollHeight}, 1500);
    }
    
    $("textarea").focus();
  });
});

