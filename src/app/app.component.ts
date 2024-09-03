import { NgIf } from '@angular/common';
import { Component, OnInit, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterOutlet } from '@angular/router';

// Prerequisites:
// 1. Download Chrome Canary - https://www.google.com/chrome/canary/
// 2. Enable the following flags in Chrome Canary:
//          chrome://flags/#optimization-guide-on-device-model (set to "Enabled BypassPerfRequirement")
//          chrome://flags/#prompt-api-for-gemini-nano (set to "Enabled")
//          chrome://flags/#summarization-api-for-gemini-nano (set to "Enabled")
//          chrome://flags/#rewriter-api-for-gemini-nano (set to "Enabled")
//          chrome://flags/#writer-api-for-gemini-nano (set to "Enabled")

@Component({
    selector: 'app-root',
    standalone: true,
    imports: [RouterOutlet, NgIf, FormsModule],
    templateUrl: './app.component.html',
    styleUrl: './app.component.css',
})
export class AppComponent implements OnInit {
    areAiModelsReady = signal(false);
    inputText = '';
    outputText = signal('');

    async ngOnInit(): Promise<void> {
        // first, load the AI models
        try {
            await window.ai.assistant.create();
        } catch (ex) {}
        try {
            await window.ai.rewriter.create();
        } catch (ex) {}
        try {
            await window.ai.writer.create();
        } catch (ex) {}
        try {
            await window.ai.summarizer.create();
        } catch (ex) {}

        // wait until the AI models are ready (could take up to even 5 minutes on slower connections)
        let assistantCapabilities: AIAssistantCapabilities;
        do {
            assistantCapabilities = await window.ai.assistant.capabilities();
            await new Promise((resolve) => setTimeout(resolve, 100));
        } while (assistantCapabilities.available !== 'readily');

        let summarizerCapabilities: AISummarizerCapabilities;
        do {
            summarizerCapabilities = await window.ai.summarizer.capabilities();
            await new Promise((resolve) => setTimeout(resolve, 100));
        } while (summarizerCapabilities.available !== 'readily');

        let canDetectTranslations = false;
        while (!canDetectTranslations) {
            canDetectTranslations = await window.translation.canDetect();
            await new Promise((resolve) => setTimeout(resolve, 100));
        }

        console.log('Got the models in the browser, now we can work offline!');
        this.areAiModelsReady.set(true);
    }

    async prompt() {
        const session = await window.ai.assistant.create();
        const result = await session.prompt(this.inputText);
        console.log(result);
        this.outputText.set(`AI Prompt Result: ${result}`);
    }

    async summarize() {
        const summarizer = await window.ai.summarizer.create();
        const result = await summarizer.summarize(this.inputText);
        console.log(result);
        this.outputText.set(`AI Summary: ${result}`);
    }

    async write() {
        const writer = await window.ai.writer.create();
        const result = await writer.write(this.inputText);
        console.log(result);
        this.outputText.set(`AI Writer Result: ${result}`);
    }

    async rewrite() {
        const rewriter = await window.ai.rewriter.create();
        const result = await rewriter.rewrite(this.inputText);
        console.log(result);
        this.outputText.set(`AI Rewriter Result: ${result}`);
    }

    async detectLanguage() {
        const detector = await window.translation.createDetector();
        const result = await detector.detect(this.inputText);
        const sortedResult = result.sort((a, b) => b.confidence - a.confidence);
        console.log(result);
        this.outputText.set(
            `Top Detected Language: ${JSON.stringify(sortedResult[0])}`
        );
    }
}

declare global {
    interface Window {
        ai: {
            assistant: {
                create: () => Promise<AIAssistant>;
                capabilities: () => Promise<AIAssistantCapabilities>;
            };
            rewriter: {
                create: () => Promise<AIRewriter>;
            };
            writer: {
                create: () => Promise<AIWriter>;
            };
            summarizer: {
                create: () => Promise<AISummarizer>;
                capabilities: () => Promise<AISummarizerCapabilities>;
            };
        };
        translation: {
            canDetect: () => Promise<boolean>;
            createDetector: () => Promise<TranslationDetector>;
        };
    }
}

interface AIAssistant {
    maxTokens: number;
    temperature: number;
    tokensLeft: number;
    tokensSoFar: number;
    topK: number;
    prompt: (input: string) => Promise<string>;
}

interface AIAssistantCapabilities {
    available: string; // "readily"
    defaultTemperature: number;
    defaultTopK: number;
    maxTopK: number;
}

interface AIRewriter {
    length: string; // "as-is"
    sharedContext: string;
    tone: string; // "as-is"
    rewrite: (input: string) => Promise<string>;
}

interface AIWriter {
    sharedContext: string;
    write: (input: string) => Promise<string>;
}

interface AISummarizer {
    summarize: (input: string) => Promise<string>;
}

interface AISummarizerCapabilities {
    available: string; // "readily"
}

interface TranslationDetector {
    detect: (input: string) => Promise<TranslationResult[]>;
}

interface TranslationResult {
    confidence: number;
    detectedLanguage: string;
}
