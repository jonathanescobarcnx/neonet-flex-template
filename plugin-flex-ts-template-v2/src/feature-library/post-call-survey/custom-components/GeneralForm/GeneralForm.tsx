import { FormActions, Form, FormControl } from '@twilio-paste/core/form';
import { Card } from '@twilio-paste/core/card';
import { Heading } from '@twilio-paste/core/heading';
import { Input } from '@twilio-paste/core/input';
import { Label } from '@twilio-paste/core/label';
import { TextArea } from '@twilio-paste/core/textarea';
import { HelpText } from '@twilio-paste/core/help-text';
import { Radio, RadioGroup } from '@twilio-paste/core/radio-group';
import { FC, useEffect, useState } from 'react';
import { useUIDSeed } from '@twilio-paste/core/dist/uid-library';

import { ISurveyDefinition, PromptMode } from '../../types/SurveyDefinition';
import EditButtonGroup from '../EditButtonGroup/EditButtonGroup';
import AudioFilePicker from '../AudioFilePicker/AudioFilePicker';

export interface GeneralFormProps {
  canAddNew: boolean;
  isNewSurvey: boolean;
  isEditMode: boolean;
  isSurveyDirty: boolean;
  survey: ISurveyDefinition;
  pendingIntroFile?: File;
  pendingEndFile?: File;
  handleEditPress: () => void;
  handleAddPress: () => void;
  handleDeletePress: () => void;
  handleChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => void;
  handleDirectChange: (field: keyof ISurveyDefinition, value: string) => void;
  onAudioFileSelected: (field: 'message_intro' | 'message_end', file: File) => void;
}

const GeneralForm: FC<GeneralFormProps> = (props) => {
  const seed = useUIDSeed();
  const [nameHasError, setNameHasError] = useState(false);
  const [messageIntroHasError, setMessageIntroHasError] = useState(false);
  const [messageEndHasError, setMessageEndHasError] = useState(false);

  useEffect(() => {
    setNameHasError(props.survey.name === '');
    const introType = props.survey.message_intro_type ?? 'tts';
    setMessageIntroHasError(introType === 'tts' ? !props.survey.message_intro : !props.survey.message_intro_audio_url);
    const endType = props.survey.message_end_type ?? 'tts';
    setMessageEndHasError(endType === 'tts' ? !props.survey.message_end : !props.survey.message_end_audio_url);
  }, [
    props.survey.name,
    props.survey.message_intro,
    props.survey.message_intro_type,
    props.survey.message_intro_audio_url,
    props.survey.message_end,
    props.survey.message_end_type,
    props.survey.message_end_audio_url,
  ]);

  return (
    <Card>
      <Form aria-labelledby={seed('general_heading')}>
        <Heading as="h3" variant="heading30" marginBottom="space0" id={seed('general_heading')}>
          Survey Settings
        </Heading>

        <FormControl>
          <Label htmlFor={seed('survey_name')} required>
            Survey name
          </Label>
          <Input
            aria-describedby="survey_name_help"
            id={seed('survey_name')}
            name="name"
            type="text"
            placeholder="e.g. CSAT, NPS, Agent Rating"
            onChange={props.handleChange}
            required
            readOnly={!props.isEditMode}
            value={props.survey.name}
            hasError={nameHasError}
          />
          <HelpText variant="default" id="survey_name_help">
            This value will be used in Flex Insights as the label for the survey
          </HelpText>
        </FormControl>

        <FormControl>
          <Label htmlFor={seed('message_intro')} required>
            Welcome prompt
          </Label>
          {props.isEditMode && (
            <RadioGroup
              name="message_intro_type"
              legend="Prompt type"
              orientation="horizontal"
              value={props.survey.message_intro_type ?? 'tts'}
              onChange={(value) => props.handleDirectChange('message_intro_type', value as PromptMode)}
            >
              <Radio id={seed('intro_tts')} value="tts">
                Text to Speech
              </Radio>
              <Radio id={seed('intro_audio')} value="audio">
                Audio File
              </Radio>
            </RadioGroup>
          )}
          {(props.survey.message_intro_type ?? 'tts') === 'tts' ? (
            <>
              <TextArea
                aria-describedby="message_intro_help"
                id={seed('message_intro')}
                name="message_intro"
                onChange={props.handleChange}
                required={true}
                readOnly={!props.isEditMode}
                value={props.survey.message_intro}
                hasError={messageIntroHasError}
              />
              <HelpText variant="default" id="message_intro_help">
                This text will be read out to the customer via text to speech at the commencement of the survey
              </HelpText>
            </>
          ) : (
            <>
              <AudioFilePicker
                isReadOnly={!props.isEditMode}
                currentUrl={props.survey.message_intro_audio_url}
                pendingFile={props.pendingIntroFile}
                onFileSelected={(file) => props.onAudioFileSelected('message_intro', file)}
                onError={(msg) => console.error('Audio file error (intro):', msg)}
              />
              <Label htmlFor={seed('message_intro_transcription')}>Audio transcription</Label>
              <TextArea
                id={seed('message_intro_transcription')}
                name="message_intro"
                onChange={props.handleChange}
                readOnly={!props.isEditMode}
                value={props.survey.message_intro}
                placeholder="Paste the transcript of the audio file here (optional)"
              />
              <HelpText variant="default">
                Text transcript of the audio file for reference
              </HelpText>
            </>
          )}
        </FormControl>

        <FormControl>
          <Label htmlFor={seed('message_end')} required>
            Ending prompt
          </Label>
          {props.isEditMode && (
            <RadioGroup
              name="message_end_type"
              legend="Prompt type"
              orientation="horizontal"
              value={props.survey.message_end_type ?? 'tts'}
              onChange={(value) => props.handleDirectChange('message_end_type', value as PromptMode)}
            >
              <Radio id={seed('end_tts')} value="tts">
                Text to Speech
              </Radio>
              <Radio id={seed('end_audio')} value="audio">
                Audio File
              </Radio>
            </RadioGroup>
          )}
          {(props.survey.message_end_type ?? 'tts') === 'tts' ? (
            <>
              <TextArea
                onChange={props.handleChange}
                aria-describedby="message_end_help"
                id={seed('message_end')}
                name="message_end"
                required={true}
                readOnly={!props.isEditMode}
                value={props.survey.message_end}
                hasError={messageEndHasError}
              />
              <HelpText variant="default" id="message_end_help">
                This text will be read out to the customer via text to speech at the conclusion of the survey
              </HelpText>
            </>
          ) : (
            <>
              <AudioFilePicker
                isReadOnly={!props.isEditMode}
                currentUrl={props.survey.message_end_audio_url}
                pendingFile={props.pendingEndFile}
                onFileSelected={(file) => props.onAudioFileSelected('message_end', file)}
                onError={(msg) => console.error('Audio file error (end):', msg)}
              />
              <Label htmlFor={seed('message_end_transcription')}>Audio transcription</Label>
              <TextArea
                id={seed('message_end_transcription')}
                name="message_end"
                onChange={props.handleChange}
                readOnly={!props.isEditMode}
                value={props.survey.message_end}
                placeholder="Paste the transcript of the audio file here (optional)"
              />
              <HelpText variant="default">
                Text transcript of the audio file for reference
              </HelpText>
            </>
          )}
        </FormControl>

        <FormActions>
          <EditButtonGroup
            canAddNew={props.canAddNew}
            canDelete={true}
            isEditing={props.isEditMode}
            handleEditPress={props.handleEditPress}
            handleAddPress={props.handleAddPress}
            handleDeletePress={props.handleDeletePress}
          />
        </FormActions>
      </Form>
    </Card>
  );
};

export default GeneralForm;
