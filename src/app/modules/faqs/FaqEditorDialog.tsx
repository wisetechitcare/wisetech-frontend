import { useEffect, useState } from 'react';
import { Box, CircularProgress, Stack, TextField } from '@mui/material';
import { KTIcon } from '@metronic/helpers';
// Same MUI glass kit as the Leave Policy / Sandwich Leave benchmark.
import { WtButton, GlassDialog, GlassHeader } from '@app/modules/common/components/ui';
import { FAQ_ANSWER_MAX, FAQ_QUESTION_MAX, type Faq } from './types';

export interface FaqEditorDialogProps {
    open: boolean;
    /** Section the FAQ belongs to — shown as context, never editable on an existing FAQ. */
    sectionTitle: string;
    sectionIcon: string;
    /** Present when editing; omit to create. */
    faq?: Faq | null;
    saving?: boolean;
    onClose: () => void;
    onSave: (values: { question: string; answer: string }) => void | Promise<void>;
}

/**
 * THE FAQ editor. Replaces three separate add/edit modals that had three
 * different validation rules (one Formik+Yup, one uncontrolled useState with a
 * silent 400-char truncation, one with no length rule at all).
 *
 * Fields follow the Sandwich Leave rule editor: plain MUI `TextField`,
 * `size="small"`, label notched into the border, `multiline` for prose. No
 * bespoke field styling — the theme owns it, so these inputs match every other
 * form in the app and stay correct in dark mode for free.
 *
 * Limits mirror the server schema exactly (FAQ_QUESTION_MAX / FAQ_ANSWER_MAX),
 * so the client can never compose a payload the API will reject for length.
 */
export function FaqEditorDialog({
    open, sectionTitle, sectionIcon, faq, saving, onClose, onSave,
}: FaqEditorDialogProps) {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [touched, setTouched] = useState(false);

    const isEdit = Boolean(faq);

    // Reset whenever the dialog opens or switches target, so a previous edit
    // never bleeds into the next one.
    useEffect(() => {
        if (!open) return;
        setQuestion(faq?.question ?? '');
        setAnswer(faq?.answer ?? '');
        setTouched(false);
    }, [open, faq]);

    const trimmedQuestion = question.trim();
    const trimmedAnswer = answer.trim();
    const questionError = touched && !trimmedQuestion ? 'Question is required' : '';
    const answerError = touched && !trimmedAnswer ? 'Answer is required' : '';
    const canSave = Boolean(trimmedQuestion) && Boolean(trimmedAnswer) && !saving;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setTouched(true);
        if (!canSave) return;
        await onSave({ question: trimmedQuestion, answer: trimmedAnswer });
    };

    return (
        <GlassDialog
            open={open}
            onClose={onClose}
            maxWidth="sm"
            fullWidth
            header={
                <GlassHeader
                    title={isEdit ? 'Edit question' : 'Add a question'}
                    subtitle={sectionTitle}
                    icon={<KTIcon iconName={sectionIcon} className="fs-1" />}
                    onClose={onClose}
                />
            }
        >
            <Box
                component="form"
                onSubmit={handleSubmit}
                noValidate
                sx={{ p: { xs: 2, sm: 2.75 } }}
            >
                <Stack spacing={2.5}>
                    <TextField
                        autoFocus
                        label="Question"
                        required
                        value={question}
                        onChange={(event) => setQuestion(event.target.value)}
                        onBlur={() => setTouched(true)}
                        placeholder="e.g. How do I apply for casual leave?"
                        inputProps={{ maxLength: FAQ_QUESTION_MAX }}
                        error={Boolean(questionError)}
                        // The counter lives in helperText so it shares the field's
                        // baseline and turns red with the error, instead of being a
                        // separate row that has to be kept in sync by hand.
                        helperText={questionError || `${question.length}/${FAQ_QUESTION_MAX}`}
                        fullWidth
                        size="small"
                    />

                    <TextField
                        label="Answer"
                        required
                        value={answer}
                        onChange={(event) => setAnswer(event.target.value)}
                        onBlur={() => setTouched(true)}
                        placeholder={'Write the answer in plain language.\n\nStart a line with - or • for bullet points.'}
                        inputProps={{ maxLength: FAQ_ANSWER_MAX }}
                        error={Boolean(answerError)}
                        helperText={
                            answerError ||
                            `Line breaks are preserved; lines starting with - or • render as bullets. · ${answer.length}/${FAQ_ANSWER_MAX}`
                        }
                        multiline
                        minRows={6}
                        maxRows={14}
                        fullWidth
                        size="small"
                    />

                    <Stack
                        direction={{ xs: 'column-reverse', sm: 'row' }}
                        spacing={1.25}
                        justifyContent="flex-end"
                    >
                        <WtButton ghost type="button" onClick={onClose}>
                            Cancel
                        </WtButton>
                        <WtButton
                            type="submit"
                            disabled={!canSave}
                            startIcon={saving ? <CircularProgress size={14} sx={{ color: 'inherit' }} /> : undefined}
                        >
                            {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add question'}
                        </WtButton>
                    </Stack>
                </Stack>
            </Box>
        </GlassDialog>
    );
}

export default FaqEditorDialog;
