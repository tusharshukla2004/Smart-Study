import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import { AuthAPI, UserAPI, Session } from '../../api';

// Initial state loaded from localStorage if present
const initialToken = localStorage.getItem('ss_token') || null;
let initialUser = null;
try {
  initialUser = JSON.parse(localStorage.getItem('ss_user'));
} catch {
  initialUser = null;
}

export const loginUser = createAsyncThunk(
  'auth/loginUser',
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const res = await AuthAPI.login(email, password);
      if (res && res.success) {
        Session.saveLogin(res.token, res.user);
        return { user: res.user, token: res.token };
      }
      return rejectWithValue(res?.message || 'Login failed. Please check credentials.');
    } catch (err) {
      return rejectWithValue(err.message || 'Network error.');
    }
  }
);

export const signupUser = createAsyncThunk(
  'auth/signupUser',
  async (userData, { rejectWithValue }) => {
    try {
      const res = await AuthAPI.signup(userData);
      if (res && res.success) {
        Session.saveLogin(res.token, res.user);
        return { user: res.user, token: res.token };
      }
      return rejectWithValue(res?.message || 'Signup failed.');
    } catch (err) {
      return rejectWithValue(err.message || 'Network error.');
    }
  }
);

export const fetchUserProfile = createAsyncThunk(
  'auth/fetchUserProfile',
  async (_, { rejectWithValue }) => {
    try {
      const res = await UserAPI.getProfile();
      if (res && res.success) {
        Session.updateUser(res.user);
        return res.user;
      }
      return rejectWithValue(res?.message || 'Failed to fetch user profile.');
    } catch (err) {
      return rejectWithValue(err.message || 'Network error.');
    }
  }
);

export const updateUserProfile = createAsyncThunk(
  'auth/updateUserProfile',
  async (profileData, { rejectWithValue }) => {
    try {
      const res = await UserAPI.updateProfile(profileData);
      if (res && res.success) {
        Session.updateUser(res.user);
        return res.user;
      }
      return rejectWithValue(res?.message || 'Failed to update profile.');
    } catch (err) {
      return rejectWithValue(err.message || 'Network error.');
    }
  }
);

const authSlice = createSlice({
  name: 'auth',
  initialState: {
    user: initialUser,
    token: initialToken,
    isAuthenticated: !!initialToken,
    loading: false,
    error: null,
  },
  reducers: {
    logout: (state) => {
      state.user = null;
      state.token = null;
      state.isAuthenticated = false;
      state.error = null;
      localStorage.removeItem('ss_token');
      localStorage.removeItem('ss_user');
    },
    clearAuthError: (state) => {
      state.error = null;
    },
    setUser: (state, action) => {
      state.user = action.payload;
      if (action.payload) {
        state.isAuthenticated = true;
        Session.updateUser(action.payload);
      }
    },
  },
  extraReducers: (builder) => {
    // Login
    builder
      .addCase(loginUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(loginUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Signup
    builder
      .addCase(signupUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(signupUser.fulfilled, (state, action) => {
        state.loading = false;
        state.isAuthenticated = true;
        state.user = action.payload.user;
        state.token = action.payload.token;
      })
      .addCase(signupUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Fetch Profile
    builder
      .addCase(fetchUserProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
        state.isAuthenticated = true;
      })
      .addCase(fetchUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // Update Profile
    builder
      .addCase(updateUserProfile.pending, (state) => {
        state.loading = true;
      })
      .addCase(updateUserProfile.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(updateUserProfile.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { logout, clearAuthError, setUser } = authSlice.actions;
export default authSlice.reducer;
