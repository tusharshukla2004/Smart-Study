import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { TasksAPI } from '../../api';

export const fetchTasks = createAsyncThunk(
  'tasks/fetchTasks',
  async (params = '', { rejectWithValue }) => {
    try {
      const res = await TasksAPI.getAll(params);
      if (res && res.success) {
        return { tasks: res.tasks || [], stats: res.stats || { total: 0, completed: 0 } };
      }
      return rejectWithValue(res?.message || 'Failed to fetch tasks.');
    } catch (err) {
      return rejectWithValue(err.message || 'Network error.');
    }
  }
);

export const createTask = createAsyncThunk(
  'tasks/createTask',
  async (taskData, { rejectWithValue }) => {
    try {
      const res = await TasksAPI.create(taskData);
      if (res && res.success) {
        return res.task;
      }
      return rejectWithValue(res?.message || 'Failed to create task.');
    } catch (err) {
      return rejectWithValue(err.message || 'Network error.');
    }
  }
);

export const updateTask = createAsyncThunk(
  'tasks/updateTask',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const res = await TasksAPI.update(id, data);
      if (res && res.success) {
        return res.task;
      }
      return rejectWithValue(res?.message || 'Failed to update task.');
    } catch (err) {
      return rejectWithValue(err.message || 'Network error.');
    }
  }
);

export const deleteTask = createAsyncThunk(
  'tasks/deleteTask',
  async (id, { rejectWithValue }) => {
    try {
      const res = await TasksAPI.delete(id);
      if (res && res.success) {
        return id;
      }
      return rejectWithValue(res?.message || 'Failed to delete task.');
    } catch (err) {
      return rejectWithValue(err.message || 'Network error.');
    }
  }
);

const recalculateStats = (tasks) => {
  const total = tasks.length;
  const completed = tasks.filter((t) => t.status === 'completed').length;
  return { total, completed };
};

const tasksSlice = createSlice({
  name: 'tasks',
  initialState: {
    items: [],
    stats: { total: 0, completed: 0 },
    activeTab: 'all',
    loading: false,
    error: null,
  },
  reducers: {
    setActiveTab: (state, action) => {
      state.activeTab = action.payload;
    },
    clearTasksError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchTasks
    builder
      .addCase(fetchTasks.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTasks.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload.tasks;
        state.stats = action.payload.stats;
      })
      .addCase(fetchTasks.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // createTask
    builder
      .addCase(createTask.fulfilled, (state, action) => {
        state.items.push(action.payload);
        state.stats = recalculateStats(state.items);
      });

    // updateTask
    builder
      .addCase(updateTask.fulfilled, (state, action) => {
        const index = state.items.findIndex((t) => t._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
          state.stats = recalculateStats(state.items);
        }
      });

    // deleteTask
    builder
      .addCase(deleteTask.fulfilled, (state, action) => {
        state.items = state.items.filter((t) => t._id !== action.payload);
        state.stats = recalculateStats(state.items);
      });
  },
});

export const { setActiveTab, clearTasksError } = tasksSlice.actions;
export default tasksSlice.reducer;
