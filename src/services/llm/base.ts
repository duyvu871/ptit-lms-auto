import type { Content, GenerationConfig, SafetySetting } from '@google/generative-ai';
import { HarmBlockThreshold, HarmCategory } from '@google/generative-ai';

export type MimeTypes =
	'image/png'
	| 'image/png-sequence'
	| 'image/webp'
	| 'image/webp-sequence'
	| 'image/gif'
	| 'image/gif-sequence'
	| 'image/svg+xml'
	| 'image/svg+xml-sequence'
	| 'image/bmp'
	| 'image/bmp-sequence'
	| 'image/tiff'
	| 'image/tiff-sequence'
	| 'image/x-icon'
	| 'image/x-icon-sequence'
	| 'image/vnd.microsoft.icon'
	| 'image/vnd.microsoft.icon-sequence'
	| 'image/vnd.wap.wbmp'
	| 'image/vnd.wap.wbmp-sequence'
	| 'image/heic'
	| 'image/heif'
	| 'image/heif-sequence'
	| 'image/heic-sequence'
	| 'image/hej2'
	| 'image/hej2-sequence'
	| 'image/avif'
	| 'image/avif-sequence'
	| 'image/jxl'
	| 'image/jxl-sequence'
	| 'image/jpm'
	| 'image/jpm-sequence'
	| 'image/jpx'
	| 'image/jpx-sequence'
	| 'image/jpg'
	| 'image/jpg-sequence'
	| 'image/jpeg'
	| 'image/jpeg-sequence';

export abstract class ChatbotService {
	protected generationConfig: GenerationConfig;
	protected safetySettings: SafetySetting[];

	protected constructor() {
		this.generationConfig = {
			temperature: 1,
			topP: 0.95,
			topK: 64,
			maxOutputTokens: 8192,
			responseMimeType: 'text/plain',
		};
		this.safetySettings = [
			{
				category: HarmCategory.HARM_CATEGORY_HARASSMENT,
				threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
			},
			{
				category: HarmCategory.HARM_CATEGORY_HATE_SPEECH,
				threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
			},
			{
				category: HarmCategory.HARM_CATEGORY_SEXUALLY_EXPLICIT,
				threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
			},
			{
				category: HarmCategory.HARM_CATEGORY_DANGEROUS_CONTENT,
				threshold: HarmBlockThreshold.BLOCK_MEDIUM_AND_ABOVE,
			},
		];
	}

	// Abstract methods to be implemented by specific chatbot services
	abstract startChat(isUsePrompt: boolean): Promise<string>;
	abstract sendMessage(
		message: string
	): Promise<string>;

	/**
	 * Generate a message from a prompt
	 * @param content base64 encoded asset
	 * @param mimeType mime type of the asset
	 * @returns
	 */
	protected fileToGenerativePath(
		content: string,
		mimeType: MimeTypes
	): {
		inlineData: {
			data: string;
			mimeType: MimeTypes;
		};
	} {
		return {
			inlineData: {
				data: content,
				mimeType,
			},
		};
	}

	protected async fetchToBase64WithMimeType(url: string) {
		try {
			// validate url
			const urlObj = new URL(url);
			if (!urlObj.protocol.startsWith('http')) {
				return {
					contentType: null,
					base64Data: null,
				};
			}

			const response = await fetch(url);
			if (!response.ok) {
				throw new Error(`HTTP error! status: ${response.status}`);
			}

			const contentType = response.headers.get('Content-Type');
			const blob = await response.blob();
			const buffer = await blob.arrayBuffer();
			const base64String = Buffer.from(buffer).toString('base64');

			return {
				contentType,
				base64Data: base64String,
			};
		} catch (error) {
			console.error('Error fetching or converting to base64:', error);
			return null;
		}
	}
}