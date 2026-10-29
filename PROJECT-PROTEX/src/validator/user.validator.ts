export const validateUser = (
  nama: string,
  email: string,
  password?: string,
): boolean => {
  if (nama.trim() === "") return false;
  if (!email.includes("@") || !email.includes(".")) return false;
  if (password !== undefined && password.length < 6) return false;

  return true;
};
