import axios from "axios";

const api = axios.create({
  baseURL: "/api",
});

// Attach auth token to every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("aurora_token");
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Auto-redirect on 401
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401 && typeof window !== "undefined") {
      localStorage.removeItem("aurora_token");
      localStorage.removeItem("aurora_user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  },
);

// ============ Auth ============
export const authAPI = {
  login: (email: string, password: string) =>
    api.post("/auth/login", { email, password }),
  register: (data: {
    email: string;
    password: string;
    name: string;
    role: string;
  }) => api.post("/auth/register", data),
  listUsers: () => api.get("/auth/users"),
  deleteUser: (id: string) => api.delete(`/auth/users/${id}`),
  me: () => api.get("/auth/me"),
};



// ============ Leads ============
export const leadsAPI = {
  list: (params?: { status?: string; interest_level?: string }) =>
    api.get("/leads", { params }),
  create: (data: Record<string, unknown>) => api.post("/leads", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/leads/${id}`, data),
  delete: (id: string) => api.delete(`/leads/${id}`),
};

// ============ Price List ============
export const pricelistAPI = {
  convert: (formData: FormData) => {
    return api.post("/pricelist/convert", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      responseType: "blob",
    });
  },
  list: () => api.get("/pricelist"),
};

// ============ Analytics ============
export const analyticsAPI = {
  dashboard: () => api.get("/analytics/dashboard"),
};

// ============ Pipelines ============
export const pipelinesAPI = {
  list: () => api.get("/pipelines"),
  listArchived: () => api.get("/pipelines/archived"),
  get: (id: string) => api.get(`/pipelines/${id}`),
  create: (data: { name: string; description?: string }) =>
    api.post("/pipelines", data),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/pipelines/${id}`, data),
  delete: (id: string) => api.delete(`/pipelines/${id}`),
  archive: (id: string) => api.post(`/pipelines/${id}/archive`),
  unarchive: (id: string) => api.delete(`/pipelines/${id}/archive`),
};

// ============ Design Cards ============
export const designCardsAPI = {
  list: (pipeline_id: string) =>
    api.get("/design-cards", { params: { pipeline_id } }),
  get: (id: string) => api.get(`/design-cards/${id}`),
  create: (formData: FormData) =>
    api.post("/design-cards", formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  updateStage: (id: string, stage: string) =>
    api.patch(`/design-cards/${id}`, { stage }),
  update: (id: string, data: Record<string, unknown>) =>
    api.patch(`/design-cards/${id}`, data),
  updateReference: (id: string, formData: FormData) =>
    api.post(`/design-cards/${id}/reference`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  uploadCad: (id: string, formData: FormData) =>
    api.post(`/design-cards/${id}/cad`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  uploadFinal: (id: string, formData: FormData) =>
    api.post(`/design-cards/${id}/final`, formData, {
      headers: { "Content-Type": "multipart/form-data" },
    }),
  myStats: () => api.get("/design-cards/my-stats"),
};

// ============ Comments ============
export const commentsAPI = {
  list: (designCardId: string) =>
    api.get(`/design-cards/${designCardId}/comments`),
  create: (designCardId: string, comment_text: string) =>
    api.post(`/design-cards/${designCardId}/comments`, { comment_text }),
};

export default api;
