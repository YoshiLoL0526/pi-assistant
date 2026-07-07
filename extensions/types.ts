export type QuestionKind = "single" | "multiple";

export type AssistantConfig = {
	enabled: boolean;
	sound: boolean;
};

export type AskOption = {
	label: string;
	value?: string;
	description?: string;
};

export type DisplayOption = AskOption & { isOther?: boolean };

export type AskUserDetails = {
	kind: QuestionKind;
	question: string;
	options: string[];
	answers: string[];
	customAnswers: string[];
	cancelled: boolean;
};
