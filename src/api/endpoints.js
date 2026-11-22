// Student + teacher endpoints, mirrored from the website's src/api/endpoints.js (irn-front-v2).
// Staff/admin endpoints are intentionally left out — the app has no admin area.
const E = {
    LOGIN: 'auth/login/',
    REGISTER: 'auth/register/',
    REGISTER_TEACHER: 'auth/register-teacher/',
    PROFILE: 'auth/profile/',
    TOKEN_REFRESH: 'auth/token/refresh/',
    TWOFA_VERIFY: 'auth/2fa/verify/',

    OLYMPIADS: 'olympiads/',
    OLYMPIADS_REORDER: 'olympiads/reorder/',
    OLYMPIAD_DETAIL: (id) => `olympiads/${id}/`,
    REGISTER_FOR_OLYMPIAD: (id) => `olympiads/${id}/register/`,

    // Exam uses grade_session_id
    EXAM_QUESTIONS: (gradeSessionId) => `exams/grade-session/${gradeSessionId}/questions/`,
    SUBMIT_EXAM: (gradeSessionId) => `exams/grade-session/${gradeSessionId}/submit/`,

    REGISTRATIONS: 'registrations/',
    REGISTRATION_DETAIL: (id) => `registrations/${id}/`,
    PERSONAL_RESULTS: 'exams/personal-results/',
    RESULT_ANALYSIS: (olympiadId) => `exams/${olympiadId}/analysis/`,

    PAYME_GET_LINK: (regId) => `payments/payme/get-link/${regId}/`,
    CLICK_GET_LINK: (regId) => `payments/click/get-link/${regId}/`,
    ALIF_GET_LINK: (regId) => `payments/alif/get-link/${regId}/`,
    XAZNA_GET_LINK: (regId) => `payments/xazna/get-link/${regId}/`,
    // Teacher pays for several students with one Click/Payme invoice
    GROUP_PAYMENT_CREATE: 'payments/group/create/',
    GROUP_PAYMENT_STATUS: (id) => `payments/group/${id}/status/`,

    NOTIFICATIONS: 'notifications/',
    NOTIFICATION_MARK_READ: (id) => `notifications/${id}/mark_as_read/`,
    NOTIFICATIONS_MARK_ALL_READ: 'notifications/mark_all_as_read/',
    REGIONS: 'regions/',
    APP_VERSION: 'app-version/',

    // Teacher cabinet
    TEACHER_COINS: 'admin/teacher-coins/', // leaderboard — readable by teachers
    TEACHER_COIN_HISTORY: (teacherId) => `admin/teacher-coins/${teacherId}/history/`,
    TEACHER_SEARCH: 'teachers/search/',
    TEACHER_STUDENTS: 'teacher/students/',
    TEACHER_ADD_STUDENT: 'teacher/add-student/',
    TEACHER_RESET_STUDENT_PASSWORD: (studentId) => `teacher/students/${studentId}/reset-password/`,
    TEACHER_MY_COINS: 'teacher/my-coins/',
    TEACHER_STUDENT_SEARCH: 'teacher/students-search/',
    TEACHER_RATING_STATUS: 'teacher/rating-status/',
    TEACHER_LINK_REQUESTS_INCOMING: 'teacher-link-requests/incoming/',
    TEACHER_LINK_REQUESTS_SENT: 'teacher-link-requests/sent/',
    TEACHER_LINK_REQUEST_REQUEST_TEACHER: 'teacher-link-requests/request-teacher/',
    TEACHER_LINK_REQUEST_INVITE_STUDENT: 'teacher-link-requests/invite-student/',
    TEACHER_LINK_REQUEST_ACCEPT: (id) => `teacher-link-requests/${id}/accept/`,
    TEACHER_LINK_REQUEST_REJECT: (id) => `teacher-link-requests/${id}/reject/`,

    // Coin System v2.1 (subject teachers, balances, verification tickets)
    STUDENT_MY_TEACHERS: 'teachers/my-teachers/',
    STUDENT_CONFIRM_SUBJECT_TEACHER: 'teachers/student-confirm-subject/',
    STUDENT_SET_NO_TEACHER: 'teachers/set-no-teacher/',
    STUDENT_CHANGE_SUBJECT_TEACHER: 'teachers/change-subject-teacher/',
    STUDENT_MANUAL_SUBJECT_TEACHER: 'teachers/manual-subject-teacher/',
    TEACHER_BALANCES_OVERVIEW: 'teachers/balances-overview/',
    TEACHER_DEDUCTED_HISTORY: 'teachers/deducted-history/',
    TEACHER_CREATE_DISPUTE_TICKET: 'teachers/create-dispute-ticket/',

    // Support
    SUPPORT_TICKETS: 'support/tickets/',
    SUPPORT_TICKET_DETAIL: (id) => `support/tickets/${id}/`,
    SUPPORT_RESOLVE_TICKET: (id) => `support/tickets/${id}/resolve/`,
    SUPPORT_REPLIES: 'support/replies/',

    BOOKS: 'books/',
    BOOK_ORDERS: 'book-orders/',
    BOOK_ORDERS_CHECKOUT: 'book-orders/checkout/',
    BTS_POINTS: 'bts-points/',
};

export default E;
