import { Box } from '@twilio-paste/core/box';
import { Button } from '@twilio-paste/core/button';
import { Heading } from '@twilio-paste/core/heading';
import { Paragraph } from '@twilio-paste/core/paragraph';
import { Text } from '@twilio-paste/core/text';
import { Stack } from '@twilio-paste/core/stack';
import { Toaster, useToaster } from '@twilio-paste/core/toast';
import { Tab, TabList, TabPanel, TabPanels, Tabs } from '@twilio-paste/core/tabs';
import { FC, useEffect, useState } from 'react';

import { AnswerOptions } from '../../types/AnswerOptions';
import { ISurveyQuestion, SurveyQuestion } from '../../types/SurveyQuestion';
import { ISurveyDefinition } from '../../types/SurveyDefinition';
import { SurveyItem } from '../../types/SurveyItem';
import ConfirmationModal from '../ConfirmationModal/ConfirmationModal';
import SurveyService, { PendingAudioFile, UploadStage } from '../../utils/SurveyService';
import GeneralForm from '../GeneralForm/GeneralForm';
import QuestionForm from '../QuestionForm/QuestionForm';
import { useDesignerTabState } from '../../utils/Hooks';

export interface SurveyDesignerProps {
  survey: SurveyItem;
  isNewSurvey: boolean;
  handleHomePress: () => void;
}

interface PendingAudioFiles {
  message_intro?: File;
  message_end?: File;
  questions: Record<number, File>;
}

const UPLOAD_STAGE_LABELS: Record<UploadStage, string> = {
  uploading: 'Uploading audio files…',
  building: 'Creating deployment build…',
  deploying: 'Deploying to Twilio (this may take ~60s)…',
  saving: 'Saving survey…',
};

const SurveyDesigner: FC<SurveyDesignerProps> = (props) => {
  const [surveyDefinition, setSurveyDefinition] = useState<ISurveyDefinition>(props.survey.data);
  const [pendingAudioFiles, setPendingAudioFiles] = useState<PendingAudioFiles>({ questions: {} });
  const [saveProgress, setSaveProgress] = useState<string>('');

  const tabState = useDesignerTabState();
  const [isDirty, setIsDirty] = useState<boolean>(false);
  const [hasError, setHasError] = useState(false);
  const [isProcessing, setIsProcessing] = useState<boolean>(false);
  const [isEditMode, setIsEditMode] = useState<boolean>(props.isNewSurvey || false);
  const [currentQuestion, setCurrentQuestion] = useState<number>(0);
  const [saveConfirmationIsOpen, setSaveConfirmationIsOpen] = useState(false);
  const [deleteSurveyConfirmationIsOpen, setDeleteSurveyConfirmationIsOpen] = useState(false);
  const [deleteQuestionConfirmationIsOpen, setDeleteQuestionConfirmationIsOpen] = useState(false);
  const [editConfirmationIsOpen, setEditConfirmationIsOpen] = useState(false);

  const toaster = useToaster();

  useEffect(() => {
    setHasError(false);
    if (!surveyDefinition.name) { setHasError(true); return; }

    const introType = surveyDefinition.message_intro_type ?? 'tts';
    const introValid = introType === 'tts'
      ? !!surveyDefinition.message_intro
      : !!(surveyDefinition.message_intro_audio_url || pendingAudioFiles.message_intro);
    if (!introValid) { setHasError(true); return; }

    const endType = surveyDefinition.message_end_type ?? 'tts';
    const endValid = endType === 'tts'
      ? !!surveyDefinition.message_end
      : !!(surveyDefinition.message_end_audio_url || pendingAudioFiles.message_end);
    if (!endValid) { setHasError(true); return; }

    for (let i = 0; i < surveyDefinition.questions.length; i++) {
      const q = surveyDefinition.questions[i];
      if (!q.label || !q.answers) { setHasError(true); return; }
      const promptType = q.prompt_type ?? 'tts';
      const promptValid = promptType === 'tts'
        ? !!q.prompt
        : !!(q.prompt_audio_url || pendingAudioFiles.questions[i]);
      if (!promptValid) { setHasError(true); return; }
    }
  }, [surveyDefinition, pendingAudioFiles]);

  const buildPendingFilesList = (): PendingAudioFile[] => {
    const key = props.survey.key;
    const files: PendingAudioFile[] = [];

    if (pendingAudioFiles.message_intro) {
      const ext = pendingAudioFiles.message_intro.type === 'audio/mpeg' ? 'mp3' : 'wav';
      files.push({ fieldPath: 'message_intro', assetPath: `/survey-audio/${key}_message_intro.${ext}`, file: pendingAudioFiles.message_intro });
    }
    if (pendingAudioFiles.message_end) {
      const ext = pendingAudioFiles.message_end.type === 'audio/mpeg' ? 'mp3' : 'wav';
      files.push({ fieldPath: 'message_end', assetPath: `/survey-audio/${key}_message_end.${ext}`, file: pendingAudioFiles.message_end });
    }
    Object.entries(pendingAudioFiles.questions).forEach(([idx, file]) => {
      const n = Number(idx);
      const ext = file.type === 'audio/mpeg' ? 'mp3' : 'wav';
      files.push({ fieldPath: `question_${n}`, assetPath: `/survey-audio/${key}_question_${n}_prompt.${ext}`, file });
    });

    return files;
  };

  const handleNewQuestion = () => {
    setSurveyDefinition((prev) => {
      const newSurvey = { ...prev };
      newSurvey.questions.push(new SurveyQuestion());
      return newSurvey;
    });
  };

  const handleEditPress = () => {
    setEditConfirmationIsOpen(true);
  };

  const handleEditAction = () => {
    setEditConfirmationIsOpen(false);
    setIsEditMode(true);
  };

  const handleDeleteSurveyAction = () => {
    setIsProcessing(true);
    SurveyService.deleteSurvey(props.survey.key)
      .then(() => {
        setIsDirty(false);
        setDeleteSurveyConfirmationIsOpen(false);
        toaster.push({ message: 'Survey deleted successfully', variant: 'success', dismissAfter: 5000 });
      })
      .catch((err: any) => {
        console.warn(err);
        toaster.push({ message: 'Error deleting survey, please check logs', variant: 'error', dismissAfter: 5000 });
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  const handleDeleteQuestionPress = (index: number) => {
    setCurrentQuestion(index);
    setDeleteQuestionConfirmationIsOpen(true);
  };

  const handleDeleteQuestionAction = (index: number) => {
    setDeleteQuestionConfirmationIsOpen(false);
    setIsDirty(true);
    setSurveyDefinition((prev) => {
      const target: ISurveyDefinition = { ...prev };
      target.questions = target.questions.filter((_, idx) => idx !== index);
      return target;
    });
    // Also clear any pending file for the deleted question
    setPendingAudioFiles((prev) => {
      const updatedQuestions = { ...prev.questions };
      delete updatedQuestions[index];
      return { ...prev, questions: updatedQuestions };
    });
  };

  const handleSaveAction = () => {
    setIsProcessing(true);
    const pendingFiles = buildPendingFilesList();

    SurveyService.uploadAndSaveSurvey(props.survey.key, surveyDefinition, pendingFiles, (stage) => {
      setSaveProgress(UPLOAD_STAGE_LABELS[stage]);
    })
      .then((updatedSurvey) => {
        setSurveyDefinition(updatedSurvey);
        setPendingAudioFiles({ questions: {} });
        setIsDirty(false);
        setSaveConfirmationIsOpen(false);
        setSaveProgress('');
        toaster.push({ message: 'Survey saved successfully', variant: 'success', dismissAfter: 5000 });
      })
      .catch((err) => {
        console.warn(err);
        setSaveProgress('');
        toaster.push({ message: 'Error saving survey, please check logs', variant: 'error', dismissAfter: 5000 });
      })
      .finally(() => {
        setIsProcessing(false);
      });
  };

  const handleGeneralChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setSurveyDefinition((prev) => ({ ...prev, [name]: value }));
    setIsDirty(true);
  };

  const handleGeneralDirectChange = (field: keyof ISurveyDefinition, value: string) => {
    setSurveyDefinition((prev) => ({ ...prev, [field]: value }));
    setIsDirty(true);
  };

  const handleGeneralAudioFileSelected = (field: 'message_intro' | 'message_end', file: File) => {
    setPendingAudioFiles((prev) => ({ ...prev, [field]: file }));
    setIsDirty(true);
  };

  const handleQuestionChange = (index: number, attribute: keyof ISurveyQuestion, value: string | AnswerOptions) => {
    setSurveyDefinition((prev) => {
      const target: ISurveyDefinition = { ...prev };

      if (attribute === 'answer_options') {
        target.questions[index][attribute] = value as AnswerOptions;
      } else {
        (target.questions[index] as unknown as Record<string, unknown>)[attribute as string] = value;
      }
      return target;
    });
    setIsDirty(true);
  };

  const handleQuestionAudioFileSelected = (index: number, file: File) => {
    setPendingAudioFiles((prev) => ({
      ...prev,
      questions: { ...prev.questions, [index]: file },
    }));
    setIsDirty(true);
  };

  return (
    <Stack orientation="vertical" spacing="space70">
      <Box alignItems="center" display="flex">
        <Heading as="h2" variant="heading20" marginBottom="space0">
          <span aria-label="survey image" role="img">
            📞
          </span>{' '}
          {surveyDefinition.name || '(Survey name not set)'}
        </Heading>
        <Box marginLeft="auto">
          <Button variant="primary" disabled={hasError || !isDirty} onClick={() => setSaveConfirmationIsOpen(true)}>
            Save Survey
          </Button>
        </Box>
      </Box>
      <Paragraph>
        Customer feedback is super important! These surveys will be played to customers at the end of the call once the
        agent presses the hang up button. Keep the questions to as few as possible and think hard about the words you
        use to request feedback. combinations. Go ahead, add your own.
      </Paragraph>

      <Tabs orientation="vertical" state={tabState}>
        <TabList aria-label="Vertical product tabs">
          <Tab id={'tab-general'}>General</Tab>
          {surveyDefinition.questions.map((q, idx) => (
            <Tab key={`survey-designer-tab-${idx}`} id={`survey-designer-tab-${idx}`}>
              Question {idx + 1}
              {q.label && (
                <Text as={'p'} fontSize={'fontSize20'}>
                  {q.label}
                </Text>
              )}
            </Tab>
          ))}
        </TabList>
        <TabPanels>
          <TabPanel tabId={'tab-general'}>
            <GeneralForm
              isNewSurvey={props.isNewSurvey}
              survey={surveyDefinition}
              isSurveyDirty={isDirty}
              isEditMode={isEditMode}
              canAddNew={surveyDefinition.questions.length < 10}
              handleAddPress={handleNewQuestion}
              handleChange={handleGeneralChange}
              handleDirectChange={handleGeneralDirectChange}
              handleDeletePress={() => setDeleteSurveyConfirmationIsOpen(true)}
              handleEditPress={handleEditPress}
              pendingIntroFile={pendingAudioFiles.message_intro}
              pendingEndFile={pendingAudioFiles.message_end}
              onAudioFileSelected={handleGeneralAudioFileSelected}
            />
          </TabPanel>

          {surveyDefinition.questions.map((question, idx) => (
            <TabPanel key={`survey-designer-tab-${idx}`} tabId={`survey-designer-tab-${idx}`}>
              <QuestionForm
                isNewSurvey={props.isNewSurvey}
                isSurveyDirty={isDirty}
                isEditMode={isEditMode}
                canAddNew={surveyDefinition.questions.length < 10}
                canDelete={true}
                question={question}
                index={idx}
                handleAddPress={handleNewQuestion}
                handleDeletePress={handleDeleteQuestionPress}
                handleChange={handleQuestionChange}
                handleEditPress={handleEditPress}
                pendingPromptFile={pendingAudioFiles.questions[idx]}
                onAudioFileSelected={handleQuestionAudioFileSelected}
              />
            </TabPanel>
          ))}
        </TabPanels>
      </Tabs>

      <ConfirmationModal
        isOpen={saveConfirmationIsOpen}
        isProcessingAction={isProcessing}
        modalHeader={'Save and Activate'}
        modalBody={
          <Text as={'p'}>
            {isProcessing
              ? saveProgress || 'Saving…'
              : 'Are you sure you wish to save the survey and make it active?'}
          </Text>
        }
        actionLabel={'Save'}
        actionIsDestructive={false}
        handleConfirmAction={handleSaveAction}
        handleCancelAction={() => setSaveConfirmationIsOpen(false)}
      />

      <ConfirmationModal
        isOpen={deleteSurveyConfirmationIsOpen}
        isProcessingAction={isProcessing}
        modalHeader={'Delete Survey'}
        modalBody={<Text as={'p'}>Are you sure you wish to delete the entire survey?</Text>}
        actionLabel={'Delete'}
        actionIsDestructive={true}
        handleConfirmAction={handleDeleteSurveyAction}
        handleCancelAction={() => setDeleteSurveyConfirmationIsOpen(false)}
      />

      <ConfirmationModal
        isOpen={deleteQuestionConfirmationIsOpen}
        isProcessingAction={isProcessing}
        modalHeader={'Delete Question'}
        modalBody={<Text as={'p'}>Are you sure you wish to delete this question?</Text>}
        actionLabel={'Delete'}
        actionIsDestructive={true}
        handleConfirmAction={() => handleDeleteQuestionAction(currentQuestion)}
        handleCancelAction={() => setDeleteQuestionConfirmationIsOpen(false)}
      />

      <ConfirmationModal
        isOpen={editConfirmationIsOpen}
        isProcessingAction={isProcessing}
        modalHeader={'Edit Survey'}
        modalBody={
          <>
            <Paragraph>
              Editing an existing survey can have unintended consequences to the survey results. Asking questions with
              different phrasing or order may make comparisons between previous responses and future responses invalid.
              Before proceeding consider creating a new survey instead of editing this survey.
            </Paragraph>
            <Paragraph>
              <strong>Are you sure you wish to edit this survey?</strong>
            </Paragraph>
          </>
        }
        actionLabel={'I understand'}
        actionIsDestructive={true}
        handleConfirmAction={handleEditAction}
        handleCancelAction={() => setEditConfirmationIsOpen(false)}
      />

      <Toaster {...toaster} />
    </Stack>
  );
};
export default SurveyDesigner;
