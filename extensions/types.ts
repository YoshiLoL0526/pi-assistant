export type QuestionKind = "single" | "multiple";

export type UiStyle = "animated" | "minimal" | "quiet";

export type AssistantConfig = {
	enabled: boolean;
	sound: boolean;
	ui: boolean;
	uiStyle: UiStyle;
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
