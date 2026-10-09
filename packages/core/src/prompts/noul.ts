export const IS_VISUAL_DIFF_QUESTION =
  'Is this DOM change a visual diff, meaning users would notice it on the rendered page (visible copy, layout, imagery, pricing or CTA changes) rather than a purely structural, meta or invisible change (scripts, meta tags, hidden elements, data attributes)?';

export const DIFF_WORTHY_QUESTION =
  'Is this analytics statement specific, backed by the cited numbers, and fixable through a code change in our product, rather than a vague observation or a tiny delta?';

export const REVIEW_CHANGE_QUESTION =
  'Does this git diff fully and correctly implement the requested change, without unrelated modifications?';
