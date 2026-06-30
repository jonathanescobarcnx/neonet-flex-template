const TaskOperations = require(Runtime.getFunctions()['twilio-wrappers/taskrouter'].path);
const { twilioExecute } = require(Runtime.getFunctions()['common/helpers/function-helper'].path);

function addPromptToTwiml(twimlNode, text, type, audioUrl) {
  if (type === 'audio' && audioUrl) {
    twimlNode.play(audioUrl);
  } else if (text) {
    twimlNode.say(text);
  }
}

exports.handler = async (context, event, callback) => {
  console.log('PCS >> Incoming >>', event);

  const twiml = new Twilio.twiml.VoiceResponse();

  const { queueName, callSid, taskSid, surveyKey, Digits } = event;
  const channelType = decodeURIComponent(event.channelType || '');
  const reservationSid = decodeURIComponent(event.reservationSid || '');
  const caller = decodeURIComponent(event.caller || '');
  const workerEmail = decodeURIComponent(event.workerEmail || '');
  let { questionIndex, surveyTaskSid, attributes } = event;

  questionIndex = parseInt(questionIndex, 10);
  const digits = parseInt(Digits, 10);
  console.log(`attributes: ${attributes}`);
  attributes = attributes ? JSON.parse(attributes) : { conversations: {} };
  console.log('attributes 2:', attributes);

  // UPDATE: Rethink serverless wrappers #492
  const result = await twilioExecute(context, async (client) => {
    try {
      return await client.sync.v1
        .services(context.TWILIO_FLEX_SYNC_SID)
        .syncMaps(context.TWILIO_FLEX_POST_CALL_SURVEY_SYNC_MAP_SID)
        .syncMapItems(surveyKey)
        .fetch();
    } catch (error) {
      twiml.say("I'm sorry an error occurred in the post call survey. Goodbye.");
      // Re-throw the error for the retry handler to catch
      return callback(null, twiml);
    }
  });

  if (result.success) {
    console.log('Twilio Fetch Survey from sync API response:', result.data);
  }

  const mapItem = result.data;
  console.log('mapItem: ', mapItem);

  const survey = mapItem.data;
  console.log('survey:', survey);

  if (questionIndex === 0) {
    addPromptToTwiml(twiml, survey.message_intro, survey.message_intro_type, survey.message_intro_audio_url);

    const conversations = {
      abandoned: 'Yes',
      communication_channel: 'Survey',
      kind: 'Survey',
      content: 'Post Task Survey',
      conversation_id: taskSid,
      direction: 'Inbound',
      initiated_by: 'Customer',
      conversation_attribute_1: callSid,
      conversation_attribute_2: channelType,
      conversation_attribute_3: reservationSid,
      conversation_attribute_4: caller,
      conversation_attribute_5: queueName,
      conversation_attribute_6: workerEmail,
      queue: queueName,
      virtual: 'Yes',
      ivr_time: 0,
      talk_time: 0,
      ring_time: 0,
      queue_time: 0,
      wrap_up_time: 0,
    };

    attributes.conversations = conversations;

    const taskResult = await TaskOperations.createTask({
      context,
      workflowSid: context.TWILIO_FLEX_POST_CALL_SURVEY_WORKFLOW_SID,
      taskChannel: 'voice',
      attributes,
      timeout: 300,
    });

    console.log('create taskResult', taskResult);
    surveyTaskSid = taskResult.data.sid;
    console.log(`Survey task SID: ${surveyTaskSid}`);
    attributes = taskResult.data.attributes;
  } else {
    attributes.conversations[`conversation_measure_${questionIndex}`] = Number.isNaN(digits) ? null : digits;

    const updateTaskResult = await TaskOperations.updateTask({
      taskSid: surveyTaskSid,
      updateParams: { attributes: JSON.stringify(attributes) },
      context,
    });
    attributes = updateTaskResult.data.attributes || attributes;
  }

  if (questionIndex === survey.questions.length) {
    attributes.conversations.abandoned = 'No';
    attributes.conversations.outcome = 'Survey Complete';
    console.log('taskSid', taskSid);

    const updateTaskResult = await TaskOperations.updateTask({
      taskSid: surveyTaskSid,
      updateParams: {
        reason: 'Survey completed',
        assignmentStatus: 'canceled',
        attributes: JSON.stringify(attributes),
      },
      context,
    });

    attributes = updateTaskResult.data.attributes || attributes;

    addPromptToTwiml(twiml, survey.message_end, survey.message_end_type, survey.message_end_audio_url);
  } else {
    const question = survey.questions[parseInt(questionIndex, 10)];
    addPromptToTwiml(twiml, question.prompt, question.prompt_type, question.prompt_audio_url);
    const nextQuestion = questionIndex + 1;

    let callbackDomain = context.DOMAIN_NAME;

    const nextUrl = `https://${callbackDomain}/common/survey-questions?callSid=${callSid}&taskSid=${taskSid}&surveyKey=${surveyKey}&queueName=${queueName}&channelType=${encodeURIComponent(channelType)}&reservationSid=${encodeURIComponent(reservationSid)}&caller=${encodeURIComponent(caller)}&workerEmail=${encodeURIComponent(workerEmail)}&surveyTaskSid=${surveyTaskSid}&questionIndex=${nextQuestion}&attributes=${encodeURIComponent(
      JSON.stringify(attributes),
    )}`;

    console.log(`Next URL: ${nextUrl}`);

    twiml.gather({
      timeout: 10,
      numDigits: 1,
      bargeIn: true,
      method: 'POST',
      action: nextUrl,
    });
  }

  return callback(null, twiml);
};
