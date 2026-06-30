import * as Flex from '@twilio/flex-ui';
import { TaskHelper } from '@twilio/flex-ui';

import { FlexAction, FlexActionEvent } from '../../../../types/feature-loader';
import FlexHelper from '../../../../utils/helpers/FlexHelper';
import surveyService from '../../utils/SurveyService';

export const actionEvent = FlexActionEvent.before;
export const actionName = FlexAction.HangupCall;
export const actionHook = async (flex: typeof Flex) => {
  flex.Actions.addListener(`${actionEvent}${actionName}`, async (payload) => {
    const { task } = payload;
    if (!TaskHelper.isCallTask(task) || TaskHelper.isOutboundCallTask(task)) {
      return;
    }

    console.log('post-call-survey', task);

    const rules = await surveyService.getRules();

    const surveyRequired = rules.find((r) => r.data.queue_name === task.queueName);

    if (surveyRequired) {
      console.log(`post-call-survey running survey: ${surveyRequired.data.survey_key}`);
      try {
        const channelType = task.channelType ?? '';
        const reservationSid = task.sid ?? '';
        const caller = task.attributes.from ?? '';
        const workerEmail = (FlexHelper.getCurrentWorker()?.attributes as any)?.email ?? '';

        await surveyService.startSurvey(
          surveyRequired.data.queue_name,
          task.attributes.call_sid,
          task.taskSid,
          surveyRequired.data.survey_key,
          channelType,
          reservationSid,
          caller,
          workerEmail,
        );
      } catch (error) {
        console.log('Error starting survey: ', error);
      }
    }
  });
};
