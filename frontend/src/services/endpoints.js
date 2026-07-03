import api, { unwrap } from '../lib/api';

// Every wrapper returns the API's { success, message, data } body (unwrapped),
// throwing on { success: false }. Components read `.data`.

// ---- Auth -------------------------------------------------------------------
export const authApi = {
  login: (email, password) =>
    unwrap(api.post('/auth.php?action=login', { email, password })),
  registerPatient: (data) =>
    unwrap(api.post('/auth.php?action=register-patient', data)),
  me: () => unwrap(api.get('/auth.php?action=me')),
  changePassword: (current, next) =>
    unwrap(api.post('/auth.php?action=change-password', { current, new: next })),
  forgotPassword: (email) =>
    unwrap(api.post('/auth.php?action=forgot-password', { email })),
  resetPassword: (token, password) =>
    unwrap(api.post('/auth.php?action=reset-password', { token, password })),
};

// ---- Public landing / booking ----------------------------------------------
export const publicAppointmentsApi = {
  services: () => unwrap(api.get('/public_appointments.php?view=services')),
  create: (data) => unwrap(api.post('/public_appointments.php', data)),
  availability: (date, serviceId) =>
    unwrap(
      api.get('/schedules.php', {
        params: { view: 'availability', date, service_id: serviceId || undefined },
      })
    ),
};

// ---- Doctor schedules (admin) ------------------------------------------------
export const schedulesApi = {
  list: (dentistId) =>
    unwrap(api.get('/schedules.php', { params: dentistId ? { dentist_id: dentistId } : {} })),
  create: (data) => unwrap(api.post('/schedules.php', data)),
  update: (id, data) => unwrap(api.put(`/schedules.php?id=${id}`, data)),
  remove: (id) => unwrap(api.delete(`/schedules.php?id=${id}`)),
};

// ---- Patient portal -----------------------------------------------------------
export const patientPortalApi = {
  appointments: () => unwrap(api.get('/patient_portal.php?view=appointments')),
  payments: () => unwrap(api.get('/patient_portal.php?view=payments')),
};

// ---- Dashboard --------------------------------------------------------------
export const dashboardApi = {
  overview: () => unwrap(api.get('/dashboard.php')),
};

// ---- Lookups ----------------------------------------------------------------
export const lookupsApi = {
  all: () => unwrap(api.get('/lookups.php')),
  only: (name) => unwrap(api.get(`/lookups.php?only=${name}`)),
};

// ---- Patients ---------------------------------------------------------------
export const patientsApi = {
  list: (params = {}) => unwrap(api.get('/patients.php', { params })),
  get: (id) => unwrap(api.get(`/patients.php?id=${id}`)),
  create: (data) => unwrap(api.post('/patients.php', data)),
  update: (id, data) => unwrap(api.put(`/patients.php?id=${id}`, data)),
  remove: (id) => unwrap(api.delete(`/patients.php?id=${id}`)),
};

// ---- Appointments -----------------------------------------------------------
export const appointmentsApi = {
  list: (params = {}) => unwrap(api.get('/appointments.php', { params })),
  get: (id) => unwrap(api.get(`/appointments.php?id=${id}`)),
  create: (data) => unwrap(api.post('/appointments.php', data)),
  update: (id, data) => unwrap(api.put(`/appointments.php?id=${id}`, data)),
  setStatus: (id, status) =>
    unwrap(api.put(`/appointments.php?id=${id}&action=status`, { status })),
  remove: (id) => unwrap(api.delete(`/appointments.php?id=${id}`)),
};

// ---- Treatments (clinical records) -----------------------------------------
export const treatmentsApi = {
  forPatient: (patientId) =>
    unwrap(api.get(`/treatments.php?patient_id=${patientId}`)),
  recent: (limit = 10) =>
    unwrap(api.get(`/treatments.php?recent=1&limit=${limit}`)),
  create: (data) => unwrap(api.post('/treatments.php', data)),
  update: (id, data) => unwrap(api.put(`/treatments.php?id=${id}`, data)),
  remove: (id) => unwrap(api.delete(`/treatments.php?id=${id}`)),
};

// ---- Dental records (files) -------------------------------------------------
export const recordsApi = {
  forPatient: (patientId) =>
    unwrap(api.get(`/dental_records.php?patient_id=${patientId}`)),
  upload: (formData, onProgress) =>
    unwrap(
      api.post('/dental_records.php', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: onProgress,
      })
    ),
  remove: (id) => unwrap(api.delete(`/dental_records.php?id=${id}`)),
  // Build an authenticated blob URL for previewing/downloading a file.
  fetchBlob: async (id) => {
    const res = await api.get(`/dental_records.php?download=${id}`, {
      responseType: 'blob',
    });
    return res.data;
  },
};

// ---- Inventory --------------------------------------------------------------
export const inventoryApi = {
  summary: () => unwrap(api.get('/inventory.php?view=summary')),
  list: (params = {}) => unwrap(api.get('/inventory.php', { params })),
  create: (data) => unwrap(api.post('/inventory.php', data)),
  update: (id, data) => unwrap(api.put(`/inventory.php?id=${id}`, data)),
  remove: (id) => unwrap(api.delete(`/inventory.php?id=${id}`)),
};

// ---- Expenses ---------------------------------------------------------------
export const expensesApi = {
  summary: () => unwrap(api.get('/expenses.php?view=summary')),
  list: (params = {}) => unwrap(api.get('/expenses.php', { params })),
  create: (data) => unwrap(api.post('/expenses.php', data)),
  update: (id, data) => unwrap(api.put(`/expenses.php?id=${id}`, data)),
  remove: (id) => unwrap(api.delete(`/expenses.php?id=${id}`)),
};

// ---- Payments / Revenue -----------------------------------------------------
export const paymentsApi = {
  revenue: () => unwrap(api.get('/payments.php?view=revenue')),
  list: (params = {}) => unwrap(api.get('/payments.php', { params })),
  create: (data) => unwrap(api.post('/payments.php', data)),
  update: (id, data) => unwrap(api.put(`/payments.php?id=${id}`, data)),
  remove: (id) => unwrap(api.delete(`/payments.php?id=${id}`)),
};

// ---- Users ------------------------------------------------------------------
export const usersApi = {
  list: (params = {}) => unwrap(api.get('/users.php', { params })),
  get: (id) => unwrap(api.get(`/users.php?id=${id}`)),
  create: (data) => unwrap(api.post('/users.php', data)),
  update: (id, data) => unwrap(api.put(`/users.php?id=${id}`, data)),
  setPassword: (id, password) =>
    unwrap(api.put(`/users.php?id=${id}&action=password`, { password })),
  remove: (id) => unwrap(api.delete(`/users.php?id=${id}`)),
};

// ---- Settings ---------------------------------------------------------------
export const settingsApi = {
  get: () => unwrap(api.get('/settings.php')),
  update: (data) => unwrap(api.put('/settings.php', data)),
};

// ---- Notifications ----------------------------------------------------------
export const notificationsApi = {
  list: (limit = 20) => unwrap(api.get(`/notifications.php?limit=${limit}`)),
  count: () => unwrap(api.get('/notifications.php?view=count')),
  markRead: (id) => unwrap(api.put(`/notifications.php?id=${id}`)),
  markAllRead: () => unwrap(api.put('/notifications.php?all=1')),
  remove: (id) => unwrap(api.delete(`/notifications.php?id=${id}`)),
};

// ---- Chatbot ----------------------------------------------------------------
export const chatbotApi = {
  send: (message) => unwrap(api.post('/chatbot.php', { message })),
  history: () => unwrap(api.get('/chatbot.php?history=1')),
};
