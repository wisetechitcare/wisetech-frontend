import { useState, useEffect, memo, useMemo } from 'react';
import { useSelector } from 'react-redux';
import {
  Box,
  CircularProgress,
  IconButton,
  Stack,
  Tooltip,
  Typography,
} from '@mui/material';
import { RootState } from '@redux/store';
import { getTodo, createTodo, updateTodo, deleteTodo } from '@services/employee';
import { deleteConfirmation, errorConfirmation, successConfirmation } from '@utils/modal';
import { KTIcon } from '@metronic/helpers';
import * as Yup from 'yup';
import { Formik } from 'formik';
import { formatTime } from '@utils/dateFormats';
import { useColorMode } from '@app/theme/ColorMode';
import {
  GlassCard,
  GlassDialog,
  PlainDialogHeader,
  SegmentedControl,
  WtButton,
  WtCheckbox,
  WtEmptyState,
  WtField,
  alertDialog,
  label,
} from '@app/modules/common/components/ui';

const validationSchema = Yup.object().shape({
  description: Yup.string().required('Description is required'),
});

type TodoStatus = 'PENDING' | 'COMPLETED' | 'WONT_DO';

interface Todo {
  id: string;
  description: string;
  status: TodoStatus;
  createdAt: string;
}

const CARD_HEIGHT = 555;

function formatCreatedAt(createdAt: string): string {
  const createdAtDate = new Date(createdAt);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);

  const createdAtStr = createdAtDate.toISOString().split('T')[0];
  const todayStr = today.toISOString().split('T')[0];
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  const enGb = createdAtDate.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  });

  let displayDate = enGb;
  if (createdAtStr === todayStr) displayDate = `Today, ${enGb}`;
  else if (createdAtStr === yesterdayStr) displayDate = `Yesterday, ${enGb}`;

  return `${displayDate} ${formatTime(createdAtDate)}`;
}

const TodoList = memo(() => {
  const { mode } = useColorMode();
  const employeeId = useSelector((state: RootState) => state.employee.currentEmployee?.id);

  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedTab, setSelectedTab] = useState<TodoStatus>('PENDING');
  const [editTodo, setEditTodo] = useState<{ id: string; description: string; status: string } | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(0);
  const [todos, setTodos] = useState<Todo[]>([]);
  const todosPerPage = 6;

  const handleClose = () => setShowModal(false);

  const handleEditShow = (todo: Todo) => {
    setEditTodo(todo);
    setShowEditModal(true);
  };

  const handleEditClose = () => {
    setShowEditModal(false);
    setEditTodo(null);
  };

  const handleUpdateTodo = async () => {
    if (!editTodo || !employeeId) return;
    const existingTodo = todos.find((todo) => todo.id === editTodo.id);
    if (!existingTodo) return;
    if (editTodo.description === existingTodo.description && editTodo.status === existingTodo.status) {
      alertDialog({ icon: 'info', title: 'No changes detected!', text: "You didn't modify anything." });
      return;
    }
    try {
      if (editTodo.description.length > 200) {
        alertDialog({
          icon: 'warning',
          title: 'Description should not exceed 200 characters.',
          text: 'Total characters: ' + editTodo.description.length,
        });
        return;
      }
      await updateTodo(employeeId, editTodo.id, {
        description: editTodo.description,
        status: editTodo.status,
      });
      handleEditClose();
      fetchTodos();
      successConfirmation('successfully updated!');
    } catch (error) {
      console.error('Error updating todo:', error);
      errorConfirmation('Failed to update the todo. Please try again.');
    }
  };

  const handleDeleteTodo = async (todoId: string) => {
    if (!employeeId) return;
    try {
      const confirmed = await deleteConfirmation('Todo deleted successfully!');
      if (!confirmed) return;
      await deleteTodo(employeeId, todoId);
      fetchTodos();
    } catch (error) {
      console.error('Error deleting todo:', error);
      errorConfirmation('Failed to delete the todo. Please try again.');
    }
  };

  const fetchTodos = async () => {
    if (!employeeId) return;
    setLoading(true);
    try {
      const response = await getTodo(employeeId);
      if (response?.data?.statusCode === 200 && Array.isArray(response.data.data)) {
        setTodos(response.data.data);
      } else {
        console.warn('Unexpected API response:', response);
        setTodos([]);
      }
    } catch (error) {
      console.error('Error fetching todos:', error);
      setTodos([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTodos();
  }, [employeeId]);

  useEffect(() => {
    setCurrentPage(0);
  }, [selectedTab]);

  const filteredTodos = todos.filter((todo) => todo.status === selectedTab);
  const totalPages = filteredTodos.length > 0 ? Math.ceil(filteredTodos.length / todosPerPage) : 1;
  const paginatedTodos = filteredTodos.slice(
    currentPage * todosPerPage,
    (currentPage + 1) * todosPerPage,
  );

  const handleToggleStatus = async (todoId: string) => {
    if (!employeeId) return;
    try {
      const existingTodo = todos.find((todo) => todo.id === todoId);
      if (!existingTodo) return;
      const newStatus: TodoStatus = existingTodo.status === 'PENDING' ? 'COMPLETED' : 'PENDING';
      setTodos((prevTodos) =>
        prevTodos.map((todo) => (todo.id === todoId ? { ...todo, status: newStatus } : todo)),
      );
      setTimeout(async () => {
        await updateTodo(employeeId, todoId, { status: newStatus });
        fetchTodos();
      }, 300);
    } catch (error) {
      console.error('Error updating todo status:', error);
      errorConfirmation('Failed to update status. Please try again.');
    }
  };

  const tabOptions = useMemo(
    () => [
      { value: 'PENDING' as const, label: 'Pending' },
      { value: 'COMPLETED' as const, label: 'Completed' },
      { value: 'WONT_DO' as const, label: "Won't Do" },
    ],
    [],
  );

  const statusOptions = useMemo(
    () => [
      { value: 'PENDING', label: 'Pending' },
      { value: 'COMPLETED', label: 'Completed' },
      { value: 'WONT_DO', label: "Won't Do" },
    ],
    [],
  );

  return (
    <>
      <GlassCard
        preset="section"
        sx={{
          height: CARD_HEIGHT,
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
        }}
      >
        <Stack spacing={2} sx={{ height: '100%', minHeight: 0 }}>
          <Stack direction="row" alignItems="center" justifyContent="space-between" gap={1.5}>
            <Typography
              sx={{
                fontWeight: 700,
                fontSize: { xs: 17, sm: 19 },
                color: label(mode, 'primary'),
                letterSpacing: '-0.02em',
              }}
            >
              My To-Do’s
            </Typography>
            <WtButton tone="primary" onClick={() => setShowModal(true)}>
              New To-Do
            </WtButton>
          </Stack>

          <SegmentedControl
            ariaLabel="To-do status"
            options={tabOptions}
            value={selectedTab}
            onChange={setSelectedTab}
            fullWidth
          />

          <Box sx={{ flex: 1, minHeight: 0, overflow: 'auto' }}>
            {loading ? (
              <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 280 }}>
                <CircularProgress size={32} />
              </Stack>
            ) : filteredTodos.length > 0 ? (
              <Stack spacing={0.5} divider={<Box sx={{ borderBottom: 1, borderColor: 'divider' }} />}>
                {paginatedTodos.map((todo) => (
                  <Stack
                    key={todo.id}
                    direction="row"
                    alignItems="flex-start"
                    justifyContent="space-between"
                    gap={1}
                    sx={{ py: 1.25 }}
                  >
                    <Stack direction="row" alignItems="flex-start" gap={1} sx={{ minWidth: 0, flex: 1 }}>
                      {selectedTab === 'PENDING' && (
                        <WtCheckbox
                          checked={todo.status === 'COMPLETED'}
                          onChange={() => handleToggleStatus(todo.id)}
                          size="sm"
                          sx={{ mt: -0.5 }}
                          inputProps={{ 'aria-label': 'Mark complete' }}
                        />
                      )}
                      {selectedTab === 'COMPLETED' && (
                        <Box
                          aria-hidden
                          sx={{
                            width: 22,
                            height: 22,
                            mt: 0.25,
                            borderRadius: 1,
                            bgcolor: 'rgba(22, 163, 74, 0.12)',
                            color: 'success.main',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 14,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          ✔
                        </Box>
                      )}
                      {selectedTab === 'WONT_DO' && (
                        <Box
                          aria-hidden
                          sx={{
                            width: 22,
                            height: 22,
                            mt: 0.25,
                            borderRadius: 1,
                            bgcolor: 'rgba(225, 29, 72, 0.12)',
                            color: 'error.main',
                            display: 'grid',
                            placeItems: 'center',
                            fontSize: 14,
                            fontWeight: 700,
                            flexShrink: 0,
                          }}
                        >
                          ✖
                        </Box>
                      )}
                      <Tooltip title={todo.description} placement="top">
                        <Box sx={{ minWidth: 0 }}>
                          <Typography
                            sx={{
                              fontSize: 14,
                              fontWeight: 500,
                              color: label(mode, 'primary'),
                              whiteSpace: 'nowrap',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                            }}
                          >
                            {todo.description}
                          </Typography>
                          <Typography sx={{ fontSize: 12, color: label(mode, 'secondary'), mt: 0.25 }}>
                            {formatCreatedAt(todo.createdAt)}
                          </Typography>
                        </Box>
                      </Tooltip>
                    </Stack>
                    <Stack direction="row" spacing={0.25} sx={{ flexShrink: 0 }}>
                      <IconButton
                        size="small"
                        aria-label="Edit to-do"
                        onClick={() => handleEditShow(todo)}
                        sx={{ color: label(mode, 'secondary') }}
                      >
                        <KTIcon iconName="pencil" className="fs-3" />
                      </IconButton>
                      <IconButton
                        size="small"
                        aria-label="Delete to-do"
                        onClick={() => handleDeleteTodo(todo.id)}
                        sx={{ color: 'error.main' }}
                      >
                        <KTIcon iconName="trash" className="fs-3" />
                      </IconButton>
                    </Stack>
                  </Stack>
                ))}
              </Stack>
            ) : (
              <Stack alignItems="center" justifyContent="center" sx={{ minHeight: 240 }}>
                <WtEmptyState
                  dense
                  title={
                    selectedTab === 'PENDING'
                      ? 'No pending to-dos'
                      : selectedTab === 'COMPLETED'
                        ? 'No completed to-dos'
                        : 'No skipped to-dos'
                  }
                  hint="Add something you need to get done."
                  actionLabel="New To-Do"
                  onAction={() => setShowModal(true)}
                />
              </Stack>
            )}
          </Box>

          {filteredTodos.length > todosPerPage && (
            <Stack direction="row" alignItems="center" justifyContent="flex-end" spacing={1.5}>
              <IconButton
                size="small"
                disabled={currentPage === 0}
                aria-label="Previous page"
                onClick={() => setCurrentPage((prev) => Math.max(prev - 1, 0))}
              >
                <KTIcon iconName="arrow-left" className="fs-3" />
              </IconButton>
              <Typography sx={{ fontSize: 13, color: label(mode, 'secondary') }}>
                {currentPage + 1} / {totalPages}
              </Typography>
              <IconButton
                size="small"
                disabled={currentPage >= totalPages - 1}
                aria-label="Next page"
                onClick={() =>
                  setCurrentPage((prev) => (prev < totalPages - 1 ? prev + 1 : prev))
                }
              >
                <KTIcon iconName="arrow-right" className="fs-3" />
              </IconButton>
            </Stack>
          )}
        </Stack>
      </GlassCard>

      <GlassDialog
        open={showModal}
        onClose={handleClose}
        maxWidth="sm"
        plain
        header={<PlainDialogHeader title="Add New To-Do" onClose={handleClose} />}
      >
        <Formik
          initialValues={{ description: '' }}
          validationSchema={validationSchema}
          onSubmit={async (values, { setSubmitting, resetForm }) => {
            try {
              if (values.description.length > 200) {
                alertDialog({
                  icon: 'warning',
                  title: 'Description should not exceed 200 characters.',
                  text: 'Total characters: ' + values.description.length,
                });
                return;
              }
              await createTodo({ employeeId, description: values.description });
              resetForm();
              handleClose();
              fetchTodos();
              successConfirmation('Todo created successfully');
            } catch (error) {
              console.error('Error creating todo:', error);
              errorConfirmation('Failed to create the todo. Please try again.');
            } finally {
              setSubmitting(false);
            }
          }}
        >
          {({ handleSubmit, isSubmitting, values, setFieldValue, errors, touched }) => (
            <Box
              component="form"
              noValidate
              onSubmit={handleSubmit}
              sx={{ p: 2.5, display: 'flex', flexDirection: 'column', gap: 2 }}
            >
              <WtField
                label="Description"
                value={values.description}
                onChange={(v) => setFieldValue('description', v)}
                multiline
                minRows={3}
                hint="Must be between 1 – 200 characters"
                error={touched.description ? errors.description : undefined}
                fullWidth
              />
              <Stack direction="row" justifyContent="flex-end" spacing={1}>
                <WtButton ghost type="button" onClick={handleClose}>
                  Cancel
                </WtButton>
                <WtButton tone="primary" type="submit" disabled={isSubmitting}>
                  {isSubmitting ? 'Saving…' : 'Save'}
                </WtButton>
              </Stack>
            </Box>
          )}
        </Formik>
      </GlassDialog>

      <GlassDialog
        open={showEditModal}
        onClose={handleEditClose}
        maxWidth="sm"
        plain
        header={<PlainDialogHeader title="Edit To-Do" onClose={handleEditClose} />}
      >
        <Stack spacing={2} sx={{ p: 2.5 }}>
          <WtField
            label="Description"
            value={editTodo?.description || ''}
            onChange={(v) =>
              setEditTodo((prev) => (prev ? { ...prev, description: v } : null))
            }
            multiline
            minRows={3}
            fullWidth
          />
          <WtField
            label="Status"
            value={editTodo?.status || 'PENDING'}
            onChange={(v) =>
              setEditTodo((prev) => (prev ? { ...prev, status: String(v) } : null))
            }
            options={statusOptions}
            fullWidth
          />
          <Stack direction="row" justifyContent="flex-end" spacing={1}>
            <WtButton ghost type="button" onClick={handleEditClose}>
              Cancel
            </WtButton>
            <WtButton tone="primary" type="button" onClick={handleUpdateTodo}>
              Save
            </WtButton>
          </Stack>
        </Stack>
      </GlassDialog>
    </>
  );
});

export default TodoList;
