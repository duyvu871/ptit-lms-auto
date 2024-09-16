export const LMS_OAUTH = "https://lms.ptit.edu.vn/auth_oauth/signin";
export const LMS_DOMAIN = "https://lms.ptit.edu.vn/";

export const MAX_RETRY = parseInt((process.env.MAX_RETRY_LOGIN || 3) as unknown as string);
export const RETRY_WAIT = parseInt((process.env.MAX_RETRY_LOGIN_WAIT || 1000) as unknown as string);
