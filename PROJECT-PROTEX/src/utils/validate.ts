export const isValidId = (id: number): boolean => {
  return id > 0 && Number.isInteger(id);
};

export const isValidEmail = (email: string): boolean => {
  return email.includes("@") && email.includes(".");
};

export const isNonEmptyString = (value: string): boolean => {
  return value.trim() !== "";
};