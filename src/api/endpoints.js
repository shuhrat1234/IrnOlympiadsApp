// Full endpoint map, mirrored from the website's src/api/endpoints.js.
const E = {
    LOGIN: 'auth/login/',
    TELEGRAM_WEBAPP_AUTH: 'auth/telegram-webapp/',
    REGISTER: 'auth/register/',
    REGISTER_TEACHER: 'auth/register-teacher/',
    PROFILE: 'auth/profile/',
    TOKEN_REFRESH: 'auth/token/refresh/',
    TWOFA_VERIFY: 'auth/2fa/verify/',
    TWOFA_SETUP: 'auth/2fa/setup/',
    TWOFA_CONFIRM: 'auth/2fa/confirm/',
    TWOFA_DISABLE: 'auth/2fa/disable/',

    OLYMPIADS: 'olympiads/',
    OLYMPIADS_REORDER: 'olympiads/reorder/',
    OLYMPIAD_DETAIL: (id) => `olympiads/${id}/`,
    REGISTER_FOR_OLYMPIAD: (id) => `olympiads/${id}/register/`,
    OLYMPIAD_START: (id) => `olympiads/${id}/start_now/`,
    OLYMPIAD_FINISH: (id) => `olympiads/${id}/finish_now/`,

    SUB_OLYMPIADS: 'subs/',
    SUB_OLYMPIAD_DETAIL: (id) => `subs/${id}/`,

    // Grade-specific sessions (new)
    GRADE_SESSIONS: 'grade-sessions/',
    GRADE_SESSION_DETAIL: (id) => `grade-sessions/${id}/`,
    GRADE_SESSION_START: (id) => `grade-sessions/${id}/start_now/`,
    GRADE_SESSION_FINISH: (id) => `grade-sessions/${id}/finish_now/`,

    TESTS: 'tests/',
    TEST_DETAIL: (id) => `tests/${id}/`,
    QUESTIONS: 'questions/',
    QUESTION_DETAIL: (id) => `questions/${id}/`,
    USERS: 'users/',
    USER_DETAIL: (id) => `users/${id}/`,

    // Exam now uses grade_session_id
    EXAM_QUESTIONS: (gradeSessionId) => `exams/grade-session/${gradeSessionId}/questions/`,
    SUBMIT_EXAM: (gradeSessionId) => `exams/grade-session/${gradeSessionId}/submit/`,

    REGISTRATIONS: 'registrations/',
    REGISTRATION_DETAIL: (id) => `registrations/${id}/`,
    PERSONAL_RESULTS: 'exams/personal-results/',
    ALL_RESULTS: 'exams/all-results/',
    RESULT_ANALYSIS: (olympiadId) => `exams/${olympiadId}/analysis/`,


    PAYME_PAY: 'payments/payme/',
    CLICK_PAY: 'payments/click/',
    PAYME_GET_LINK: (regId) => `payments/payme/get-link/${regId}/`,
    CLICK_GET_LINK: (regId) => `payments/click/get-link/${regId}/`,

    NOTIFICATIONS: 'notifications/',
    NOTIFICATION_MARK_READ: (id) => `notifications/${id}/mark_as_read/`,
    NOTIFICATIONS_MARK_ALL_READ: 'notifications/mark_all_as_read/',
    NOTIFICATIONS_SEED: 'notifications/seed/',
    NOTIFICATIONS_SEND: 'notifications/send/',
    ADMIN_STATS: 'admin/stats/',
    TEACHER_COINS: 'admin/teacher-coins/',
    TEACHER_COIN_HISTORY: (teacherId) => `admin/teacher-coins/${teacherId}/history/`,
    TEACHER_SEARCH: 'teachers/search/',
    TEACHER_STUDENTS: 'teacher/students/',
    TEACHER_ADD_STUDENT: 'teacher/add-student/',
    TEACHER_RESET_STUDENT_PASSWORD: (studentId) => `teacher/students/${studentId}/reset-password/`,
    TEACHER_MY_COINS: 'teacher/my-coins/',
    TEACHER_COIN_ADJUSTMENTS: 'teacher-coin-adjustments/',
    TEACHER_COIN_ADJUSTMENT_DETAIL: (id) => `teacher-coin-adjustments/${id}/`,
    TEACHER_STUDENT_SEARCH: 'teacher/students-search/',
    TEACHER_LINK_REQUESTS: 'teacher-link-requests/',
    TEACHER_LINK_REQUESTS_INCOMING: 'teacher-link-requests/incoming/',
    TEACHER_LINK_REQUESTS_SENT: 'teacher-link-requests/sent/',
    TEACHER_LINK_REQUEST_REQUEST_TEACHER: 'teacher-link-requests/request-teacher/',
    TEACHER_LINK_REQUEST_INVITE_STUDENT: 'teacher-link-requests/invite-student/',
    TEACHER_LINK_REQUEST_ACCEPT: (id) => `teacher-link-requests/${id}/accept/`,
    TEACHER_LINK_REQUEST_REJECT: (id) => `teacher-link-requests/${id}/reject/`,
    REGIONS: 'regions/',

    // Support
    SUPPORT_TICKETS: 'support/tickets/',
    SUPPORT_TICKET_DETAIL: (id) => `support/tickets/${id}/`,
    SUPPORT_RESOLVE_TICKET: (id) => `support/tickets/${id}/resolve/`,
    SUPPORT_REPLIES: 'support/replies/',

    // Edit Requests (coordinator → admin approval workflow)
    EDIT_REQUESTS: 'edit-requests/',
    EDIT_REQUEST_DETAIL: (id) => `edit-requests/${id}/`,
    EDIT_REQUEST_APPROVE: (id) => `edit-requests/${id}/approve/`,
    EDIT_REQUEST_REJECT: (id) => `edit-requests/${id}/reject/`,

    BOOKS: 'books/',
    BOOK_DETAIL: (id) => `books/${id}/`,

    TELEGRAM_USERS: 'telegram/users/',
    TELEGRAM_BROADCAST: 'telegram/broadcast/',
    BOOK_ORDERS: 'book-orders/',
    BOOK_ORDER_DETAIL: (id) => `book-orders/${id}/`,
    BOOK_ORDERS_CHECKOUT: 'book-orders/checkout/',
    BOOK_ORDER_UPDATE_STATUS: (id) => `book-orders/${id}/update_status/`,

    BTS_POINTS: 'bts-points/',
    BTS_POINT_DETAIL: (id) => `bts-points/${id}/`,
    BONUS_RECIPIENTS: 'bonus-recipients/',
    BONUS_RECIPIENT_DETAIL: (id) => `bonus-recipients/${id}/`,

    // Visa applicants
    VISA_APPLICANTS: 'visa/applicants/',
    VISA_APPLICANT_DETAIL: (id) => `visa/applicants/${id}/`,
    VISA_APPLICANT_BULK_STATUS: 'visa/applicants/bulk_update_status/',
    VISA_APPLICANT_BULK_ASSIGN: 'visa/applicants/bulk_assign/',
    VISA_APPLICANT_BULK_CREATE: 'visa/applicants/bulk_create/',
    VISA_DOCUMENTS: 'visa/documents/',
    VISA_DOCUMENT_DETAIL: (id) => `visa/documents/${id}/`,
    VISA_DOCUMENT_DOWNLOAD: (id) => `visa/documents/${id}/download/`,
    VISA_NOTES: 'visa/notes/',
    VISA_NOTE_DETAIL: (id) => `visa/notes/${id}/`,
    VISA_TASKS: 'visa/tasks/',
    VISA_TASK_DETAIL: (id) => `visa/tasks/${id}/`,
    VISA_AUDIT_LOGS: 'visa/audit-logs/',

    // Bulk participant import / Final Round permission
    FINAL_ROUND_BATCHES: 'final-round/batches/',
    FINAL_ROUND_BATCH_DETAIL: (id) => `final-round/batches/${id}/`,
    FINAL_ROUND_BATCH_INGEST_ROWS: (id) => `final-round/batches/${id}/ingest_rows/`,
    FINAL_ROUND_BATCH_ANALYZE: (id) => `final-round/batches/${id}/analyze/`,
    FINAL_ROUND_BATCH_ASSIGN: (id) => `final-round/batches/${id}/assign_permission/`,
    FINAL_ROUND_ROWS: 'final-round/rows/',
    FINAL_ROUND_ROW_DETAIL: (id) => `final-round/rows/${id}/`,
    FINAL_ROUND_ROWS_BULK_EDIT: 'final-round/rows/bulk_edit/',
    FINAL_ROUND_ROW_RESOLVE: (id) => `final-round/rows/${id}/resolve/`,
    FINAL_ROUND_PERMISSIONS: 'final-round/permissions/',

    // Attendance (Telegram bot check-in/out)
    ATTENDANCE_EMPLOYEES: 'attendance/employees/',
    ATTENDANCE_EMPLOYEE_DETAIL: (id) => `attendance/employees/${id}/`,
    ATTENDANCE_EMPLOYEE_SWITCH_GROUP: (id) => `attendance/employees/${id}/switch-group/`,
    ATTENDANCE_SESSIONS: 'attendance/sessions/',
    ATTENDANCE_STATS: 'attendance/stats/',
    ATTENDANCE_LEAVE_RECORDS: 'attendance/leave-records/',
    ATTENDANCE_LEAVE_RECORD_DETAIL: (id) => `attendance/leave-records/${id}/`,
    ATTENDANCE_EXPORT: 'attendance/export/',
};

export default E;
