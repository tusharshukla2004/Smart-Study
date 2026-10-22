import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { GroupsAPI } from '../../api';

export const fetchGroups = createAsyncThunk(
  'groups/fetchGroups',
  async (params = '', { rejectWithValue }) => {
    try {
      const res = await GroupsAPI.getAll(params);
      if (res && res.success) {
        return res.groups || [];
      }
      return rejectWithValue(res?.message || 'Failed to fetch groups.');
    } catch (err) {
      return rejectWithValue(err.message || 'Network error.');
    }
  }
);

export const createGroup = createAsyncThunk(
  'groups/createGroup',
  async (groupData, { rejectWithValue }) => {
    try {
      const res = await GroupsAPI.create(groupData);
      if (res && res.success) {
        return res.group;
      }
      return rejectWithValue(res?.message || 'Failed to create group.');
    } catch (err) {
      return rejectWithValue(err.message || 'Network error.');
    }
  }
);

export const joinGroup = createAsyncThunk(
  'groups/joinGroup',
  async (groupId, { rejectWithValue }) => {
    try {
      const res = await GroupsAPI.join(groupId);
      if (res && res.success) {
        return res.group;
      }
      return rejectWithValue(res?.message || 'Failed to join group.');
    } catch (err) {
      return rejectWithValue(err.message || 'Network error.');
    }
  }
);

export const leaveGroup = createAsyncThunk(
  'groups/leaveGroup',
  async (groupId, { rejectWithValue }) => {
    try {
      const res = await GroupsAPI.leave(groupId);
      if (res && res.success) {
        return res.group;
      }
      return rejectWithValue(res?.message || 'Failed to leave group.');
    } catch (err) {
      return rejectWithValue(err.message || 'Network error.');
    }
  }
);

const groupsSlice = createSlice({
  name: 'groups',
  initialState: {
    items: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearGroupsError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchGroups
    builder
      .addCase(fetchGroups.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchGroups.fulfilled, (state, action) => {
        state.loading = false;
        state.items = action.payload;
      })
      .addCase(fetchGroups.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // createGroup
    builder
      .addCase(createGroup.fulfilled, (state, action) => {
        state.items.unshift(action.payload);
      });

    // joinGroup
    builder
      .addCase(joinGroup.fulfilled, (state, action) => {
        const index = state.items.findIndex((g) => g._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });

    // leaveGroup
    builder
      .addCase(leaveGroup.fulfilled, (state, action) => {
        const index = state.items.findIndex((g) => g._id === action.payload._id);
        if (index !== -1) {
          state.items[index] = action.payload;
        }
      });
  },
});

export const { clearGroupsError } = groupsSlice.actions;
export default groupsSlice.reducer;
