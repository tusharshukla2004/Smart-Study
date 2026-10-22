import { createSlice } from '@reduxjs/toolkit';

const uiSlice = createSlice({
  name: 'ui',
  initialState: {
    sidebarOpen: false,
    aiMatchModalOpen: false,
    createGroupModalOpen: false,
    createTaskModalOpen: false,
  },
  reducers: {
    toggleSidebar: (state) => {
      state.sidebarOpen = !state.sidebarOpen;
    },
    setSidebarOpen: (state, action) => {
      state.sidebarOpen = action.payload;
    },
    openAIMatchModal: (state) => {
      state.aiMatchModalOpen = true;
    },
    closeAIMatchModal: (state) => {
      state.aiMatchModalOpen = false;
    },
    openCreateGroupModal: (state) => {
      state.createGroupModalOpen = true;
    },
    closeCreateGroupModal: (state) => {
      state.createGroupModalOpen = false;
    },
    openCreateTaskModal: (state) => {
      state.createTaskModalOpen = true;
    },
    closeCreateTaskModal: (state) => {
      state.createTaskModalOpen = false;
    },
  },
});

export const {
  toggleSidebar,
  setSidebarOpen,
  openAIMatchModal,
  closeAIMatchModal,
  openCreateGroupModal,
  closeCreateGroupModal,
  openCreateTaskModal,
  closeCreateTaskModal,
} = uiSlice.actions;

export default uiSlice.reducer;
