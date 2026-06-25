import axios from 'axios';

const API = axios.create({
  baseURL: import.meta.env.VITE_BACKEND_URL ? `${import.meta.env.VITE_BACKEND_URL}/api` : '/api',
  withCredentials: true,
  timeout: 300000 // 5 minutes for larger media uploads
});

// Add auth token to every request
API.interceptors.request.use((config) => {
  const token = localStorage.getItem('tribe_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle 401 responses
API.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Don't redirect if already on auth pages (login, signup, forgot-password)
      const authPages = ['/login', '/signup', '/forgot-password'];
      const currentPath = window.location.pathname;
      if (!authPages.includes(currentPath)) {
        localStorage.removeItem('tribe_token');
        localStorage.removeItem('tribe_user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// Auth API
export const authAPI = {
  signup: (data) => API.post('/auth/signup', data),
  login: (data) => API.post('/auth/login', data),
  getMe: () => API.get('/auth/me'),
  forgotPassword: (email) => API.post('/auth/forgot-password', { email }),
  verifyOTP: (email, otp) => API.post('/auth/verify-otp', { email, otp }),
  resetPassword: (resetToken, newPassword) => API.post('/auth/reset-password', { resetToken, newPassword }),
  verifyEmail: (email, otp) => API.post('/auth/verify-email', { email, otp })
};

// User API
export const userAPI = {
  getProfile: (id) => API.get(`/users/${id}`),
  updateProfile: (data) => API.put('/users/profile', data),
  searchUsers: (query) => API.get(`/users/search?q=${query}`),
  getAllUsers: () => API.get('/users'),
  followUser: (id) => API.post(`/users/${id}/follow`),
  unfollowUser: (id) => API.post(`/users/${id}/unfollow`),
  sendFriendRequest: (id) => API.post(`/users/${id}/friend-request`),
  acceptFriendRequest: (id) => API.post(`/users/friend-request/${id}/accept`),
  rejectFriendRequest: (id) => API.post(`/users/friend-request/${id}/reject`),
  getFriendRequests: () => API.get('/users/friend-requests'),
  getNotifications: () => API.get('/users/notifications'),
  markNotificationsRead: () => API.put('/users/notifications/read')
};

// Chat API
export const chatAPI = {
  getConversations: () => API.get('/chat/conversations'),
  createConversation: (participantId) => API.post('/chat/conversations', { participantId }),
  createGroup: (data) => API.post('/chat/groups', data),
  getMessages: (conversationId, page = 1) => API.get(`/chat/messages/${conversationId}?page=${page}`),
  sendMessage: (data) => API.post('/chat/messages', data),
  addGroupMember: (groupId, userId) => API.post(`/chat/groups/${groupId}/members`, { userId }),
  removeGroupMember: (groupId, userId) => API.delete(`/chat/groups/${groupId}/members/${userId}`),
  leaveGroup: (groupId) => API.post(`/chat/groups/${groupId}/leave`),
  startMeeting: (groupId, type) => API.post(`/chat/groups/${groupId}/meeting/start`, { type }),
  endMeeting: (groupId) => API.post(`/chat/groups/${groupId}/meeting/end`)
};

// Post API
export const postAPI = {
  createPost: (data) => API.post('/posts', data),
  getFeed: (page = 1) => API.get(`/posts/feed?page=${page}`),
  getAllPosts: (page = 1) => API.get(`/posts?page=${page}`),
  getUserPosts: (userId) => API.get(`/posts/user/${userId}`),
  likePost: (id) => API.post(`/posts/${id}/like`),
  commentPost: (id, text) => API.post(`/posts/${id}/comment`, { text }),
  likeComment: (postId, commentId) => API.post(`/posts/${postId}/comment/${commentId}/like`),
  editComment: (postId, commentId, text) => API.put(`/posts/${postId}/comment/${commentId}`, { text }),
  deleteComment: (postId, commentId) => API.delete(`/posts/${postId}/comment/${commentId}`),
  replyComment: (postId, commentId, text) => API.post(`/posts/${postId}/comment/${commentId}/reply`, { text }),
  likeReply: (postId, commentId, replyId) => API.post(`/posts/${postId}/comment/${commentId}/reply/${replyId}/like`),
  savePost: (id) => API.post(`/posts/${id}/save`),
  getSavedPosts: () => API.get('/posts/saved'),
  deletePost: (id) => API.delete(`/posts/${id}`)
};

// Story API
export const storyAPI = {
  createStory: (data) => API.post('/stories', data),
  getStories: () => API.get('/stories'),
  editStory: (id, data) => API.put(`/stories/${id}`, data),
  deleteStory: (id) => API.delete(`/stories/${id}`),
  reactToStory: (id) => API.post(`/stories/${id}/like`),
  addReaction: (id, emoji) => API.post(`/stories/${id}/react`, { emoji }),
  commentOnStory: (id, text) => API.post(`/stories/${id}/comment`, { text }),
  viewStory: (id) => API.post(`/stories/${id}/view`)
};

export default API;
