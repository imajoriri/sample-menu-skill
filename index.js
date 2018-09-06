const clova = require("@line/clova-cek-sdk-nodejs");
const line = require('@line/bot-sdk');
const util = require('util');
const client = new line.Client({
  channelAccessToken: process.env["channelAccessToken"]
});
const { breakFirst, lunch, dinner } = require("./menus");

const clovaSkillHandler = clova.Client
  .configureSkill() 
  .onLaunchRequest(responseHelper => {
    responseHelper.setSimpleSpeech(
      clova.SpeechBuilder.createSpeechText(`を食べるか決められないあなたに、オススメのメニューを提案します。朝ご飯、昼ご飯、晩ご飯を指定してください。`)
    );
  })
  .onIntentRequest(async responseHelper => {
    const intent = responseHelper.getIntentName();
    const sessionId = responseHelper.getSessionId();

    switch (intent) {
      case "MenuIntent":
        // slots取得(朝、昼、晩）
        const time = responseHelper.getSlot("time");

        // スロットに登録していない単語はnullになる。
        if(time === null){
          responseHelper.setSimpleSpeech(
            clova.SpeechBuilder.createSpeechText(`うまく聞き取れませんでした。朝ご飯、昼ご飯、晩ご飯を指定してください。`)
          );
          break;
        }

        var menu;
        if(time === "朝"){
          menu = breakFirst[Math.floor(Math.random() * breakFirst.length)];
        }
        else if(time === "昼"){
          menu = lunch[Math.floor(Math.random() * lunch.length)];
        }
        //else if(time === "晩"){
        else{
          menu = dinner[Math.floor(Math.random() * dinner.length)];
        }

        responseHelper.setSimpleSpeech(
          clova.SpeechBuilder.createSpeechText(`今日あなたが食べるべき${time}ご飯は、${menu.name}です。`)
        );

        // TODO Botにメッセージを送る
        // ここからBot
        const userId = responseHelper.getUser().userId;
        var message = {
          type: "template",
          altText: `hoge`,
          template: {
            type: "buttons",
            actions: [
              {
                type: "uri",
                label: `レシピを見る`,
                uri: "https://hogehoge",
              }, 
            ], 
            thumbnailImageUrl: "https://hogehoge",
            title: `今日のあなたの${time}ご飯は、${menu.name}だ!!`,
            text: `今日のあなたの${time}ご飯は、${menu.name}だ!!`
          }
        }
        // Botに送信
        await client.pushMessage(userId, message)
          .catch( err => {
            console.log("-- err ---");
            console.log(util.inspect(err), false, null);
          });

        break;
      case "Clova.YesIntent":
      case "Clova.NoIntent":
        responseHelper.setSimpleSpeech(
          clova.SpeechBuilder.createSpeechText(`朝ご飯、昼ご飯、晩ご飯を指定してください。`)
        );
        break;
    }
  })
  .onSessionEndedRequest(responseHelper => {
    const sessionId = responseHelper.getSessionId();

  })

exports.handler = async (event, content) => {
  console.log("--- event ---");
  console.log(util.inspect(event), false, null);

  // 検証
  const signature = event.headers.signaturecek || event.headers.SignatureCEK;
  const applicationId = process.env["applicationId"];
  const requestBody = event.body;
  await clova.verifier(signature, applicationId, requestBody);
  console.log("clear verifier");

  var ctx = new clova.Context(JSON.parse(event.body));
  const requestType = ctx.requestObject.request.type;
  const requestHandler = clovaSkillHandler.config.requestHandlers[requestType];

  if (requestHandler) {
    await requestHandler.call(ctx, ctx);
    const response =  {
      "isBase64Encoded": false,
      "statusCode": 200,
      "headers": {},
      "body": JSON.stringify(ctx.responseObject),
    }
    console.log(util.inspect(response), false, null);
    return response;
  } else {
    throw new Error(`Unable to find requestHandler for "${requestType}"`);
  }
}

