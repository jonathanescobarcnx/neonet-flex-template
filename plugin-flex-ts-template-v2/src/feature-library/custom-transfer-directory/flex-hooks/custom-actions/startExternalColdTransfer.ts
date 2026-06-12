import { Actions, ITask, Notifications, TaskHelper, templates } from '@twilio/flex-ui';

import { shouldSkipPhoneNumberValidation } from '../../config';
import PhoneNumberService from '../../../../utils/serverless/PhoneNumbers/PhoneNumberService';
import ProgrammableVoiceService from '../../../../utils/serverless/ProgrammableVoice/ProgrammableVoiceService';
import { CustomTransferDirectoryNotification } from '../notifications/CustomTransferDirectory';
import { StringTemplates } from '../strings/CustomTransferDirectory';
import logger from '../../../../utils/logger';

export const registerStartExternalColdTransfer = async () => {
  const SIP_DOMAIN = "181.119.99.115";
  const PREFIX_NUMBER = "600";
  const AREA_CODE = "+57";

  Actions.registerAction('StartExternalColdTransfer', async (payload: { task?: ITask; sid?: string; phoneNumber: string; callerId?: string }) => {
    let { task, sid, phoneNumber, callerId } = payload;
    if (!task) {
      task = TaskHelper.getTaskByTaskSid(sid || '');
    }

      // Validate phone numbers if not disabled. We cannot validate application SIDs as they
      // may be from another account.
      if (!shouldSkipPhoneNumberValidation() && !phoneNumber.startsWith('app:')) {
        try {
          const validationCheck = await PhoneNumberService.validatePhoneNumber(phoneNumber);

          if (!validationCheck.success) {
            Notifications.showNotification(
              CustomTransferDirectoryNotification.PhoneNumberFailedValidationCheckRequest,
              {
                phoneNumber,
              },
            );
            return;
          } else if (validationCheck.success && !validationCheck.valid) {
            let errors = validationCheck.invalidReason;

            errors = errors?.replace('COUNTRY_DISABLED', templates[StringTemplates.CountryDisabled]());
            errors = errors?.replace('COUNTRY_UNKNOWN', templates[StringTemplates.CountryUnknown]());
            errors = errors?.replace(
              'HIGH_RISK_SPECIAL_NUMBER_DISABLED',
              templates[StringTemplates.HighRiskSpecialNumberDisabled](),
            );

            Notifications.showNotification(
              CustomTransferDirectoryNotification.PhoneNumberFailedValidationCheckWithErrors,
              {
                phoneNumber,
                errors,
              },
            );
            return;
          }
        } catch (e: any) {
          logger.error('[custom-transfer-directory] Unable to validate phone number', e);
          Notifications.showNotification(CustomTransferDirectoryNotification.PhoneNumberFailedValidationCheckRequest, {
            phoneNumber,
          });
          return;
        }
      }

        Notifications.showNotification(
          CustomTransferDirectoryNotification.PhoneNumberFailedValidationCheckWithErrors,
          {
            phoneNumber,
            errors,
          },
        );
        return;
      }
    }

    let newDestination = phoneNumber.replace(AREA_CODE, '');
    const sipDestination = `sip:${PREFIX_NUMBER}${newDestination}@${SIP_DOMAIN}`;

    try {
      await ProgrammableVoiceService.startColdTransfer(
        task?.attributes?.conference?.participants?.customer ?? task?.attributes?.call_sid,
        sipDestination,
        callerId,
      );
    } catch (error: any) {
      logger.error('[custom-transfer-directory] Error executing startColdTransfer', error);
      Notifications.showNotification(CustomTransferDirectoryNotification.ErrorExecutingColdTransfer, {
        message: error.message,
      });
    }
  },
  );
};
