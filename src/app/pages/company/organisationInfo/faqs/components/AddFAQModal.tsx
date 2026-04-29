import React, { useState, useEffect } from 'react';
import { Modal } from 'react-bootstrap';
import { FAQ } from '../types';

interface AddFAQModalProps {
  show: boolean;
  onHide: () => void;
  onSave: (question: string, answer: string) => void;
  editingFaq?: FAQ | null;
}

const AddFAQModal: React.FC<AddFAQModalProps> = ({ show, onHide, onSave, editingFaq }) => {
  const [question, setQuestion] = useState('');
  const [answer, setAnswer] = useState('');

  useEffect(() => {
    if (editingFaq) {
      setQuestion(editingFaq.question);
      setAnswer(editingFaq.answer);
    } else {
      setQuestion('');
      setAnswer('');
    }
  }, [editingFaq, show]);

  const handleSave = () => {
    if (question.trim() && answer.trim()) {
      onSave(question, answer);
      setQuestion('');
      setAnswer('');
      onHide();
    }
  };

  const handleCancel = () => {
    setQuestion('');
    setAnswer('');
    onHide();
  };

  return (
    <Modal show={show} onHide={handleCancel} centered size="lg">
      <Modal.Body style={{ padding: '32px' }}>
        <h2
          style={{
            fontSize: '24px',
            fontWeight: 600,
            color: '#000',
            marginBottom: '24px',
          }}
        >
          {editingFaq ? 'Edit Question And Answer' : 'Add New Question And Answer'}
        </h2>

        {/* Question Field */}
        <div className="mb-4">
          <label
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#000',
              marginBottom: '8px',
              display: 'block',
            }}
          >
            Question
          </label>
          <input
            type="text"
            className="form-control"
            placeholder="What are casual leaves?"
            value={question}
            onChange={(e) => setQuestion(e.target.value)}
            style={{
              backgroundColor: '#f3f6f9',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 16px',
              fontSize: '14px',
              color: '#000',
            }}
          />
        </div>

        {/* Answer Field */}
        <div className="mb-3">
          <label
            style={{
              fontSize: '14px',
              fontWeight: 600,
              color: '#000',
              marginBottom: '8px',
              display: 'block',
            }}
          >
            Answer
          </label>
          <textarea
            className="form-control"
            placeholder="What are casual leaves?"
            value={answer}
            onChange={(e) => {
              if (e.target.value.length <= 400) {
                setAnswer(e.target.value);
              }
            }}
            rows={6}
            style={{
              backgroundColor: '#f3f6f9',
              border: 'none',
              borderRadius: '6px',
              padding: '12px 16px',
              fontSize: '14px',
              color: '#000',
              resize: 'none',
            }}
          />
          <small
            style={{
              fontSize: '12px',
              color: '#8998ab',
              marginTop: '8px',
              display: 'block',
            }}
          >
            200- 400 characters max
          </small>
        </div>

        {/* Buttons */}
        <div className="d-flex gap-3 mt-4">
          <button
            onClick={handleSave}
            disabled={!question.trim() || !answer.trim()}
            style={{
              backgroundColor: '#9d4141',
              border: 'none',
              borderRadius: '6px',
              color: '#fff',
              fontSize: '14px',
              fontWeight: 500,
              padding: '12px 24px',
              cursor: question.trim() && answer.trim() ? 'pointer' : 'not-allowed',
              opacity: question.trim() && answer.trim() ? 1 : 0.6,
            }}
          >
            Save
          </button>
          <button
            onClick={handleCancel}
            style={{
              backgroundColor: 'transparent',
              border: '1px solid #d1d5db',
              borderRadius: '6px',
              color: '#000',
              fontSize: '14px',
              fontWeight: 500,
              padding: '12px 24px',
              cursor: 'pointer',
            }}
          >
            Cancel
          </button>
        </div>
      </Modal.Body>
    </Modal>
  );
};

export default AddFAQModal;
