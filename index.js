const clova = require('@line/clova-cek-sdk-nodejs');
//const bodyParser = require('body-parser');

const clovaSkillHandler = clova.Client
//exports.handler = clova.Client
  .configureSkill() // SkillConfiguratorをインスタンス化として戻り値にしている
  .onLaunchRequest(responseHelper => {
    responseHelper.setSimpleSpeech({
      lang: 'ja',
      type: 'PlainText',
      value: 'おはよう',
    });
  })
  .onIntentRequest(async responseHelper => {
    const intent = responseHelper.getIntentName();
    const sessionId = responseHelper.getSessionId();

    switch (intent) {
      case 'MenuIntent':
      case 'Clova.YesIntent':
        // Build speechObject directly for response
        responseHelper.setSimpleSpeech({
          lang: 'ja',
          type: 'PlainText',
          value: 'はいはい',
        });
        break;
      case 'Clova.NoIntent':
        // Or build speechObject with SpeechBuilder for response
        responseHelper.setSimpleSpeech(
          clova.SpeechBuilder.createSpeechText('いえいえ')
        );
        break;
    }
  })
  .onSessionEndedRequest(responseHelper => {
    const sessionId = responseHelper.getSessionId();

    // Do something on session end
  })
  //.Middleware({ applicationId: "YOUR_APPLICATION_ID" });
  //.lambda()

exports.handler = async (event, content) => {
  console.log("--- event ---");
  console.log(event);
  console.log("--- event end ---");

  // 検証
  const signature = event.headers.signaturecek || event.headers.SignatureCEK;
  const applicationId = process.env["applicationId"];
  const requestBody = event.body;
  await clova.verifier(signature, applicationId, requestBody);
  console.log("clear verifier");

  // TODO
  // ここでnew Context(event);できればOK？
  var ctx = new clova.Context(JSON.parse(event.body));
  const requestType = ctx.requestObject.request.type;
  const requestHandler = clovaSkillHandler.config.requestHandlers[requestType];

  if (requestHandler) {
    await requestHandler.call(ctx, ctx);
    console.log("--- responseObject ---");
    console.log(ctx.responseObject);
    console.log("--- responseObject end ---");
    //return ctx.responseObject;
    const response =  {
        "isBase64Encoded": false,
        "statusCode": 200,
        "headers": {},
        "body": JSON.stringify(ctx.responseObject),
    }
    console.log(response);
    return response;
  } else {
    throw new Error(`Unable to find requestHandler for '${requestType}'`);
  }
  //return clovaSkillHandler.lambda()
}

//exports.handler = clovaSkillHandler.lambda();
