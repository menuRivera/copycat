export type ProjectFormState = {
  fieldErrors: Record<string, string>;
  formError?: string;
};

export const initialProjectFormState: ProjectFormState = { fieldErrors: {} };
