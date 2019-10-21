var guid = null
var cid = null
let botName = "MrcConversationBOT"

$(document).ready(function() {
  // Initialize the Amazon Cognito credentials provider
  AWS.config.region = 'us-east-1'; // Region
  AWS.config.credentials = new AWS.CognitoIdentityCredentials({
      IdentityPoolId: 'us-east-1:41eb7311-5f5a-4de0-bb1a-21019f3de73c',
  });
  const lexUserInfo = 'chatbot-demo' + Date.now();
  localStorage.setItem("userInfo", lexUserInfo);

  // let params = [];
  // let hashes = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
  // for(let i = 0; i < hashes.length; i++)
  //   {
  //       hash = hashes[i].split('=');
  //       params.push(hash[0]);
  //       params[hash[0]] = hash[1];
  //   }

  let params = [], splitParam;
  let rawParams = window.location.href.slice(window.location.href.indexOf('?') + 1).split('&');
  for(let i = 0; i < rawParams.length; i++)
  {
      paramValue = rawParams[i].split('=');
      let paramKey = paramValue[0];
      params[paramKey] = paramValue[1];
  }

  // localStorage.setItem("guid", params.guid);
  // localStorage.setItem("cuid", params.cid);
  guid = params.guid
  cid = params.cid

  //botname get
  $.get(`https://c8l2ro2uy8.execute-api.us-east-1.amazonaws.com/default/mrcconnectValidate?guid=${guid}`,
  function(data, status){
    // botName = data.botName;
    botName = "MrcConversationBOT"
    console.log(botName);
  });

  //dynamodb check name
  profEndPoint = "https://p9oi7ujdkg.execute-api.us-east-1.amazonaws.com/dev/mrcconnectGetProfUsingGUID"
  postData = {"guid": params.guid, "campaignid": params.cid}

  let userName = ''

  if (botName == "MrcConversationBOT") {
    $.post(profEndPoint, JSON.stringify(postData))
    .done(function(d){
      $('body').show()
      userName = d.firstname + ' ' + d.lastname;
      $('.chatbox').append(`<div class="friend-bubble bubble">Hi ${userName}!</li>`);
    })
    .fail(function(xhr, status, error){
      $('body').html('Invalid Access').show()
      console.log(xhr.status + "::" + xhr.responseText)
    })
  } else {
    $('.chatbox').append(`<div class="friend-bubble bubble">Hi! How can I help you?</li>`);
  }

  $("textarea").focus();
});

// mouse
$('#send').on('click', send);

// keyboard
$('.text-box').on('keypress', keySend);

//fuctions
function keySend(event) {
        // console.log(event);
        if ($('textarea').val() !== '' && !event.shiftKey && event.key == 'Enter') {
            //.shiftkey를 통해 shift + key 조합을 누르면 줄 바꿈이 되도록 함.
            event.preventDefault();
            send();
            // $('textarea').blur(); //이렇게 할 경우 엔터치면 키보드 커서 사라짐.

            //fix the scroll to the bottom
            $(".chatbox").stop().animate({ scrollTop: $(".chatbox")[0].scrollHeight}, 1500);
        }
}

function logMessage(msg, isBot = false){
  owner = 'CUST'
  if (isBot)
    owner = 'BOT'

  saveTransEndPoint = "https://er8bhccz8g.execute-api.us-east-1.amazonaws.com/dev/"
  postData = {"guid": guid, "campaignid": cid, "message": msg, "owner": owner}

  $.post(saveTransEndPoint, JSON.stringify(postData))
    .done(function(d){
      console.log('Script Saved')
    })
    .fail(function(xhr, status, error){
      console.log(xhr.status + "::" + xhr.responseText)
    })

}

function send() {
    if ($('textarea').val().trim() !== '') {
      $('.chatbox').append('<div class="my-bubble bubble">' + $('textarea').val() + '</li>');
      const msg = $('textarea').val();

      var lexruntime = new AWS.LexRuntime();
      const lexUserId = localStorage.getItem("userInfo");
      var sessionAttributes = {
        "cid": cid,
        // "campaignid": cid,
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

      logMessage(msg, false)

      lexruntime.postText(params, function(err, data) {
        if (err) {
          console.log(err, err.stack);
          console.log('Error:  ' + err.message + ' (see console for details)');
        }
        if (data) {
          // capture the sessionAttributes for the next cycle
          sessionAttributes = data.sessionAttributes;
          logMessage(data.message, true)

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
            }
            $('.chatbox').append(`
              <div class="friend-bubble bubble" style="text-align: center;">
                <div>${data.responseCard.genericAttachments[0].title}</div>
                <div>${data.responseCard.genericAttachments[0].subTitle}</div>
              </div>
            `);
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
              console.log(i);
            }
          }
          $(".chatbox").stop().animate({ scrollTop: $(".chatbox")[0].scrollHeight}, 1500);
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
    }
}

$(document).on('click', '.answer-button', function() {
  const msg = $(this).attr("value");
  console.log(msg);

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

  logMessage(msg, false)

  lexruntime.postText(params, function(err, data) {
    if (err) {
      console.log(err, err.stack);
      console.log('Error:  ' + err.message + ' (see console for details)');
    }
    if (data) {
      // capture the sessionAttributes for the next cycle
      sessionAttributes = data.sessionAttributes;
      logMessage(data.message, true)
      // show response and/or error/dialog status
      console.log(data);
      console.log(data.responseCard);
      //
      // saveTransEndPoint = "https://er8bhccz8g.execute-api.us-east-1.amazonaws.com/dev/"
      // postData = {"guid": guid, "campaignid": cid, "message": msg, "owner": "CUST"}

      // $.post(saveTransEndPoint, JSON.stringify(postData))
      //   .done(function(d){
      //     console.log('Script Saved')
      //   })
      //   .fail(function(xhr, status, error){
      //     console.log(xhr.status + "::" + xhr.responseText)
      //   })
        //
        
      //message
      if (data.message) {
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
            </div>
          `);
        }
        if (data.responseCard.genericAttachments[0].subTitle) {
          $('.chatbox').append(`
            <div class="friend-bubble bubble" style="text-align: center;">
              <div>${data.responseCard.genericAttachments[0].subTitle}</div>
            </div>
          `);
        }

        $('.chatbox').append(`
          <div class="friend-bubble bubble" style="text-align: center;">
            <div>${data.responseCard.genericAttachments[0].title}</div>
            <div>${data.responseCard.genericAttachments[0].subTitle}</div>
          </div>
        `);
    

        const cardButton = data.responseCard.genericAttachments[0].buttons;
        for (i in cardButton) {
          $('.friend-bubble:last').append(`
            <button class="answer-button" value=${cardButton[i].value}>${cardButton[i].text}</button >
          `);
          console.log(i);
        }
      }
      $(".chatbox").stop().animate({ scrollTop: $(".chatbox")[0].scrollHeight}, 1500);
    }
  });
});
