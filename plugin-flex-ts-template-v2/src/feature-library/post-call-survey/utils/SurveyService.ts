import { EncodedParams } from 'types/serverless';

import TaskRouterService from '../../../utils/serverless/TaskRouter/TaskRouterService';
import ApiService from '../../../utils/serverless/ApiService';
import { RuleItem } from '../types/RuleItem';
import { ISurveyDefinition } from '../types/SurveyDefinition';
import { SurveyItem } from '../types/SurveyItem';
import SyncHelper from './SyncHelper';
import SyncClient from '../../../utils/sdk-clients/sync/SyncClient';
import { getRuleDefinitionsMapName, getSurveyDefinitionsMapName, getServerlessUrl } from '../config';

export interface PendingAudioFile {
  fieldPath: 'message_intro' | 'message_end' | `question_${number}`;
  assetPath: string;
  file: File;
}

export type UploadStage = 'uploading' | 'building' | 'deploying' | 'saving';

class SurveyService extends ApiService {
  private get pcsBase(): string {
    const url = getServerlessUrl();
    return url || `${this.serverlessProtocol}://${this.serverlessDomain}`;
  }

  getQueueNames = async (): Promise<string[]> => {
    const [queues, rules] = await Promise.all([TaskRouterService.getQueues(), this.getRules()]);
    if (!queues) throw new Error('Error getting queue names');
    const mappedQueues = new Set(rules.map((r) => r.data.queue_name));
    return queues.map((q) => q.friendlyName).filter((name) => !mappedQueues.has(name));
  };

  startSurvey = async (
    queueName: string,
    callSid: string,
    taskSid: string,
    surveyKey: string,
    channelType: string,
    reservationSid: string,
    caller: string,
    workerEmail: string,
  ) => {
    return new Promise((resolve, reject) => {
      const encodedParams: EncodedParams = {
        queueName: encodeURIComponent(queueName),
        callSid: encodeURIComponent(callSid),
        taskSid: encodeURIComponent(taskSid),
        surveyKey: encodeURIComponent(surveyKey),
        channelType: encodeURIComponent(channelType),
        reservationSid: encodeURIComponent(reservationSid),
        caller: encodeURIComponent(caller),
        workerEmail: encodeURIComponent(workerEmail),
        Token: encodeURIComponent(this.manager.user.token),
      };

      this.fetchJsonWithReject<any>(
        `https://${this.pcsBase}/flex/start-voice-survey`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: this.buildBody(encodedParams),
        },
      )
        .then((resp: any) => {
          resolve(resp);
        })
        .catch((error) => {
          console.log('Error starting post call survey', error);
          reject(error);
        });
    });
  };

  getSurveys = async (): Promise<SurveyItem[]> => {
    return SyncHelper.getMapItems(getSurveyDefinitionsMapName());
  };

  saveSurvey = async (key: string, survey: ISurveyDefinition) => {
    return (await SyncClient.map(getSurveyDefinitionsMapName())).update(key, survey);
  };

  deleteSurvey = async (key: string) => {
    return (await SyncClient.map(getSurveyDefinitionsMapName())).remove(key);
  };

  generateSurveyKey = () => {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < 30) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return `PCSS${result}`;
  };

  createNewSurveyItem = (): SurveyItem => {
    return new SurveyItem(this.generateSurveyKey());
  };

  generateRuleKey = () => {
    let result = '';
    const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    let counter = 0;
    while (counter < 30) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
      counter += 1;
    }
    return `PCSR${result}`;
  };

  getRules = async (): Promise<RuleItem[]> => {
    return SyncHelper.getMapItems(getRuleDefinitionsMapName());
  };

  saveRule = async (rule: RuleItem) => {
    return (await SyncClient.map(getRuleDefinitionsMapName())).update(rule.key, rule.data);
  };

  deleteRule = async (key: string) => {
    return (await SyncClient.map(getRuleDefinitionsMapName())).remove(key);
  };

  createNewRule = (): RuleItem => {
    return new RuleItem(this.generateRuleKey());
  };

  // Uploads all pending audio files, creates a single build, deploys, then saves the survey.
  // Returns the updated survey definition with resolved audio URLs.
  uploadAndSaveSurvey = async (
    surveyKey: string,
    surveyDefinition: ISurveyDefinition,
    pendingFiles: PendingAudioFile[],
    onProgress: (stage: UploadStage) => void,
  ): Promise<ISurveyDefinition> => {
    if (pendingFiles.length === 0) {
      onProgress('saving');
      await this.saveSurvey(surveyKey, surveyDefinition);
      return surveyDefinition;
    }

    onProgress('uploading');

    const uploadResults: { fieldPath: string; assetVersionSid: string; assetPath: string; pendingUrl: string }[] = [];

    for (const { fieldPath, assetPath, file } of pendingFiles) {
      const result = await this.uploadFileAsAsset(file, assetPath);
      uploadResults.push({ fieldPath, assetVersionSid: result.assetVersionSid, assetPath: result.assetPath, pendingUrl: result.pendingUrl });
    }

    onProgress('building');

    const { buildSid } = await this.createBuild(
      uploadResults.map((r) => r.assetVersionSid),
      uploadResults.map((r) => r.assetPath),
    );

    onProgress('deploying');

    await this.pollDeployment(buildSid, uploadResults[0].pendingUrl);

    onProgress('saving');

    const updatedSurvey = this.applyAudioUrls(surveyDefinition, uploadResults);
    await this.saveSurvey(surveyKey, updatedSurvey);

    return updatedSurvey;
  };

  private uploadFileAsAsset = (
    file: File,
    assetPath: string,
  ): Promise<{ assetVersionSid: string; assetPath: string; pendingUrl: string }> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => {
        const base64 = (reader.result as string).split(',')[1];
        const encodedParams: EncodedParams = {
          fileBase64: encodeURIComponent(base64),
          contentType: encodeURIComponent(file.type),
          assetPath: encodeURIComponent(assetPath),
          Token: encodeURIComponent(this.manager.user.token),
        };
        this.fetchJsonWithReject<{ assetVersionSid: string; assetPath: string; pendingUrl: string }>(
          `https://${this.pcsBase}/flex/upload-audio`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
            body: this.buildBody(encodedParams),
          },
        )
          .then(resolve)
          .catch(reject);
      };
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  };

  private createBuild = async (assetVersionSids: string[], assetPaths: string[]): Promise<{ buildSid: string }> => {
    const encodedParams: EncodedParams = {
      assetVersionSids: encodeURIComponent(JSON.stringify(assetVersionSids)),
      assetPaths: encodeURIComponent(JSON.stringify(assetPaths)),
      Token: encodeURIComponent(this.manager.user.token),
    };
    return this.fetchJsonWithReject<{ buildSid: string }>(
      `https://${this.pcsBase}/flex/create-build`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
        body: this.buildBody(encodedParams),
      },
    );
  };

  private pollDeployment = async (buildSid: string, pendingUrl: string): Promise<void> => {
    const MAX_ATTEMPTS = 20;
    const INTERVAL_MS = 3000;

    for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt++) {
      await new Promise<void>((resolve) => setTimeout(resolve, INTERVAL_MS));

      const encodedParams: EncodedParams = {
        buildSid: encodeURIComponent(buildSid),
        pendingUrl: encodeURIComponent(pendingUrl),
        Token: encodeURIComponent(this.manager.user.token),
      };

      const result = await this.fetchJsonWithReject<{ status: string }>(
        `https://${this.pcsBase}/flex/check-deployment-status`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: this.buildBody(encodedParams),
        },
      );

      if (result.status === 'deployed') return;
      if (result.status === 'failed') throw new Error('Deployment failed');
    }

    throw new Error('Deployment timed out after 60 seconds');
  };

  private applyAudioUrls = (
    survey: ISurveyDefinition,
    uploads: { fieldPath: string; pendingUrl: string }[],
  ): ISurveyDefinition => {
    const updated: ISurveyDefinition = { ...survey, questions: survey.questions.map((q) => ({ ...q })) };

    for (const { fieldPath, pendingUrl } of uploads) {
      if (fieldPath === 'message_intro') {
        updated.message_intro_audio_url = pendingUrl;
      } else if (fieldPath === 'message_end') {
        updated.message_end_audio_url = pendingUrl;
      } else if (fieldPath.startsWith('question_')) {
        const idx = parseInt(fieldPath.replace('question_', ''), 10);
        updated.questions[idx] = { ...updated.questions[idx], prompt_audio_url: pendingUrl };
      }
    }

    return updated;
  };
}

const service = new SurveyService();

export default service;
