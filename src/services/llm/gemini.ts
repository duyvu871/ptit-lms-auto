import type {
    Content,
    GenerationConfig,
    GenerativeModel,
    Part,
    SafetySetting} from '@google/generative-ai';
import {
    GoogleGenerativeAI,
    HarmBlockThreshold,
    HarmCategory
} from '@google/generative-ai';
import { ChatbotService } from './base.ts';
import {logger} from "../../utils/logger.ts";
import * as clc from "../../utils/cli-color.ts";

export class GeminiChatService extends ChatbotService {
    private genAI: GoogleGenerativeAI;
    private model: GenerativeModel;

    constructor(apiKey: string, model: string) {
        super();
        this.genAI = new GoogleGenerativeAI(apiKey);
        this.model = this.genAI.getGenerativeModel({
            model: model || 'gemini-1.5-flash-latest',
        });
        logger(clc.success(`Initialized Gemini Chat Service with model: ${model}`));
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

    public async startChat(isUsePrompt: boolean) {return "";}

    public async sendMessage(
        message: string
    ): Promise<string> {
        const messageContent: string | (string | Part)[] = [{text: message,}];

        const chatSession = this.model.startChat({
            generationConfig: this.generationConfig,
            safetySettings: this.safetySettings,
        });

        const result = await chatSession.sendMessage(messageContent);
        return result.response.text();
    }
}
