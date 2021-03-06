const clova = require("@line/clova-cek-sdk-nodejs");
const line = require('@line/bot-sdk');
const util = require('util');
const { breakFirst, lunch, dinner } = require("./menus");

const clovaSkillHandler = clova.Client
  .configureSkill() 
  .onLaunchRequest(responseHelper => {
    responseHelper.setSimpleSpeech(
      clova.SpeechBuilder.createSpeechText(`何を食べるか決められないあなたに、オススメのメニューを提案します。朝、昼、夜を指定して、朝に何を食べたらいい？などと聞いてください`)
    );
  })
  .onIntentRequest(async responseHelper => {
    const intent = responseHelper.getIntentName();
    const sessionId = responseHelper.getSessionId();

    switch (intent) {
      case "MenuIntent":
        // slots取得(朝、昼、夜）
        const time = responseHelper.getSlot("timezone");

        // TODO スロットがNULLの時の処理が必要
        // スロットに登録していない単語はnullになる。
        if(time === null){
          responseHelper.setSimpleSpeech(
            clova.SpeechBuilder.createSpeechText(`うまく聞き取れませんでした。朝、昼、夜を指定してください。`)
          );
          break;
        }

        var menu;
        // メニューを朝、昼、夜、で分けてランダムで取得しています。
        if(time === "朝"){
          menu = breakFirst[Math.floor(Math.random() * breakFirst.length)];
        }
        else if(time === "昼"){
          menu = lunch[Math.floor(Math.random() * lunch.length)];
        }
        else{
          menu = dinner[Math.floor(Math.random() * dinner.length)];
        }

        // 今日あなたが食べるべき${time}ご飯は${menu.name}です。
        responseHelper.setSpeechList(
          [
            clova.SpeechBuilder.createSpeechText(`今日あなたが食べるべき${time}ご飯は`),
            clova.SpeechBuilder.createSpeechText(`${menu.name}です。`),
          ]
        );

        responseHelper.endSession();

        // channelaccesstokenが環境変数にセットされているときにBotに送信する
        if(process.env["channelAccessToken"]){
          const client = new line.Client({
            channelAccessToken: process.env["channelAccessToken"]
          });

          // Botに送信するためにはuserIdが必要です。
          const userId = responseHelper.getUser().userId;

          // Botに送るメッセージの内容
          // 詳しくは >> https://developers.line.me/ja/reference/messaging-api/#send-push-message
          var message = {
            type: "template",
            altText: `あなたが食べるべき${time}ご飯は...`,
            template: {
              type: "buttons",
              actions: [
                {
                  type: "uri",
                  label: `レシピを見る`,
                  uri: menu.recipe,
                }, 
              ], 
              thumbnailImageUrl: menu.image,
              title: `${menu.name}`,
              text: `今日のあなたの${time}ご飯は、${menu.name}だ!!`
            }
          }

          // SDKのメソッドでBotに送信
          // 詳しくは >> https://developers.line.me/ja/reference/messaging-api/#send-push-message
          await client.pushMessage(userId, message)
            .catch( err => {
              console.log("-- err ---");
              console.log(util.inspect(err), false, null);
            });
        }

        break;
      case "Clova.GuideIntent":
      case "Clova.YesIntent":
      case "Clova.NoIntent":
        responseHelper.setSimpleSpeech(
          clova.SpeechBuilder.createSpeechText(`朝、昼、夜を指定してください。`)
        );
        break;
    }
  })
  .onSessionEndedRequest(responseHelper => {
    responseHelper.endSession();

  })

exports.handler = async (event, content) => {
  console.log("--- event ---");
  console.log(util.inspect(event), false, null);

  const signature = event.headers.signaturecek || event.headers.SignatureCEK;
  const applicationId = process.env["applicationId"];
  const requestBody = event.body;
  // 検証
  // リクエストが自分の作成したスキルからであるか等を確認しています。
  await clova.verifier(signature, applicationId, requestBody);
  console.log("clear verifier");

  var ctx = new clova.Context(JSON.parse(event.body));
  const requestType = ctx.requestObject.request.type;
  const requestHandler = clovaSkillHandler.config.requestHandlers[requestType];

  if (requestHandler) {
    await requestHandler.call(ctx, ctx);

    // CEKに返すレスポンスです。
    // API Gatewayの設定で「Lambdaのプロキシ結合の使用」のチェックを入れた場合、
    // レスポンスにヘッダー等を入れる必要がある
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

// 検証を行わない場合以下のコードでも実行することは可能です。
// TODO ただし、API Gatewayの設定で「Lambdaのプロキシ結合の使用」のチェックを外す必要があります。

/*

exports.handler = clovaSkillHandler.lambda()

*/




