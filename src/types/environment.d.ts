declare global {
	namespace NodeJS {
		interface ProcessEnv {
			MAX_RETRY_LOGIN: number,
			MAX_RETRY_LOGIN_WAIT: number,
			SLINK_ID: string,
			SLINK_PASSWORD: string,
			COURSE_URL: string,
			GEMINI_API_KEY: string,
			GEMINI_API_MODEL: string,
			DELAY_BETWEEN_SLIDE: number,
		}
	}
}

export {};