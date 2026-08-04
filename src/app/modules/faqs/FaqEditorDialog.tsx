import { useEffect, useState } from 'react';
import { KTIcon } from '@metronic/helpers';
import { GlassDialog, GlassHeader } from '@app/modules/common/components/ui/tw/Glass';
import { WtButton } from '@app/modules/common/components/ui/tw/Buttons';
import { Spinner } from '@app/modules/common/components/ui/tw/Spinner';
import {
    FAQ_ANSWER_MAX,
    FAQ_QUESTION_MAX,
    FAQ_SECTION_BY_ID,
    type Faq,
    type FaqType,
} from './types';

export interface FaqEditorDialogProps {
    open: boolean;
    /** Section the FAQ belongs to — shown as context, never editable on an existing FAQ. */
    sectionId: FaqType;
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
 * Limits mirror the server schema exactly (FAQ_QUESTION_MAX / FAQ_ANSWER_MAX),
 * so the client can never compose a payload the API will reject for length.
 */
export function FaqEditorDialog({ open, sectionId, faq, saving, onClose, onSave }: FaqEditorDialogProps) {
    const [question, setQuestion] = useState('');
    const [answer, setAnswer] = useState('');
    const [touched, setTouched] = useState(false);

    const section = FAQ_SECTION_BY_ID[sectionId];
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
    const questionError = !trimmedQuestion
        ? 'Question is required'
        : question.length > FAQ_QUESTION_MAX
            ? `Keep it under ${FAQ_QUESTION_MAX} characters`
            : '';
    const answerError = !trimmedAnswer
        ? 'Answer is required'
        : answer.length > FAQ_ANSWER_MAX
            ? `Keep it under ${FAQ_ANSWER_MAX} characters`
            : '';
    const canSave = !questionError && !answerError && !saving;

    const handleSubmit = async (event: React.FormEvent) => {
        event.preventDefault();
        setTouched(true);
        if (!canSave) return;
        await onSave({ question: trimmedQuestion, answer: trimmedAnswer });
    };

    const fieldClass =
        'w-full rounded-xl border border-[#E6E9EE] bg-white px-3.5 py-2.5 text-[14px] text-slate-900 ' +
        'placeholder:text-slate-400 outline-none transition-colors ' +
        'focus:border-[#1E3A8A] focus:ring-2 focus:ring-[#1E3A8A]/15 ' +
        'dark:border-[#30363d] dark:bg-[#0d1117] dark:text-slate-100 dark:placeholder:text-slate-500';

    return (
        <GlassDialog
            open={open}
            onClose={onClose}
            maxWidth="md"
            fullWidth
            header={
                <GlassHeader
                    title={isEdit ? 'Edit question' : 'Add a question'}
                    subtitle={section?.title}
                    icon={<KTIcon iconName={section?.icon ?? 'questionnaire-tablet'} className="fs-1 text-white" />}
                    onClose={onClose}
                />
            }
        >
            <form className="flex flex-col gap-5 p-5 sm:p-6" onSubmit={handleSubmit} noValidate>
                <div className="flex flex-col gap-1.5">
                    <label htmlFor="faq-question" className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                        Question <span className="text-rose-500">*</span>
                    </label>
                    <input
                        id="faq-question"
                        className={fieldClass}
                        value={question}
                        onChange={(event) => setQuestion(event.target.value)}
                        onBlur={() => setTouched(true)}
                        placeholder="e.g. How do I apply for casual leave?"
                        maxLength={FAQ_QUESTION_MAX}
                        aria-invalid={Boolean(touched && questionError)}
                        aria-describedby="faq-question-help"
                        autoFocus
                    />
                    <div id="faq-question-help" className="flex justify-between gap-3 text-[12px]">
                        <span className="text-rose-500">{touched ? questionError : ''}</span>
                        <span className="shrink-0 tabular-nums text-slate-400">
                            {question.length}/{FAQ_QUESTION_MAX}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col gap-1.5">
                    <label htmlFor="faq-answer" className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                        Answer <span className="text-rose-500">*</span>
                    </label>
                    <textarea
                        id="faq-answer"
                        className={`${fieldClass} min-h-[160px] resize-y leading-relaxed`}
                        value={answer}
                        onChange={(event) => setAnswer(event.target.value)}
                        onBlur={() => setTouched(true)}
                        placeholder={'Write the answer in plain language.\n\nStart a line with - or • for bullet points.'}
                        rows={7}
                        maxLength={FAQ_ANSWER_MAX}
                        aria-invalid={Boolean(touched && answerError)}
                        aria-describedby="faq-answer-help"
                    />
                    <div id="faq-answer-help" className="flex justify-between gap-3 text-[12px]">
                        <span className={touched && answerError ? 'text-rose-500' : 'text-slate-400'}>
                            {touched && answerError ? answerError : 'Line breaks are preserved; lines starting with - or • render as bullets.'}
                        </span>
                        <span className="shrink-0 tabular-nums text-slate-400">
                            {answer.length}/{FAQ_ANSWER_MAX}
                        </span>
                    </div>
                </div>

                <div className="flex flex-col-reverse gap-2.5 sm:flex-row sm:justify-end">
                    <WtButton ghost type="button" onClick={onClose} className="w-full sm:w-auto">
                        Cancel
                    </WtButton>
                    <WtButton
                        type="submit"
                        disabled={!canSave}
                        startIcon={saving ? <Spinner size={14} color="#fff" /> : undefined}
                        className="w-full sm:w-auto"
                    >
                        {saving ? 'Saving…' : isEdit ? 'Save changes' : 'Add question'}
                    </WtButton>
                </div>
            </form>
        </GlassDialog>
    );
}

export default FaqEditorDialog;
