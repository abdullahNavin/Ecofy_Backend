export type IdeaAssistantInput = {
  title?: string;
  categoryId?: string;
  problemStatement?: string;
  proposedSolution?: string;
  description?: string;
  isPaid?: boolean;
  price?: number;
  images?: string[];
  prompt?: string;
  ideaId?: string;
};

export type IdeaAssistantSuggestion = {
  title: string;
  categoryName: string;
  problemStatement: string;
  proposedSolution: string;
  description: string;
  rationale: string;
  improvementChecklist: string[];
};
