// Plain-language names for each step type (shared by the curriculum browser and lesson player).
export const ACTIVITY_LABEL: Record<string, string> = {
  slide: "Slides",
  video: "Video",
  quiz_mcq: "Quick check",
  predict_output: "What will it print?",
  fix_bug: "Fix the bug",
  fill_blank: "Fill in the blank",
  parsons: "Put the lines in order",
  code_exercise: "Coding exercise",
  worksheet: "Worksheet",
  exit_question: "Last question",
};

// Colour for each step type tag in the lesson editor (the word is always shown too, so colour never works alone).
export const ACTIVITY_TINT: Record<string, string> = {
  video: "bg-[#DCEEFB] text-[#0B2E4A]",
  quiz_mcq: "bg-[#ECE5FA] text-[#2E1A5C]",
  code_exercise: "bg-[#BFE9CB] text-[#0B3D1E]",
  worksheet: "bg-[#D6F2DE] text-[#0B3D1E]",
  fill_blank: "bg-[#FEE4E2] text-[#8E1111]",
  slide: "bg-[#E0F1E5] text-[#0B3D1E]",
  predict_output: "bg-[#FFEBD2] text-[#4A2800]",
  fix_bug: "bg-[#FFEBD2] text-[#4A2800]",
  parsons: "bg-[#DCEEFB] text-[#0B2E4A]",
  exit_question: "bg-[#ECE5FA] text-[#2E1A5C]",
};
