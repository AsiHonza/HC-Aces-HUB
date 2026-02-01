import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, { message: 'Jméno musí mít alespoň 2 znaky.' }),
  email: z.string().email({ message: 'Neplatná e-mailová adresa.' }),
  phone: z.string().min(9, { message: 'Telefonní číslo musí mít alespoň 9 znaků.' }),
  jerseyNumber: z.string().optional(),
  password: z.string().min(6, { message: 'Heslo musí mít alespoň 6 znaků.' }),
});

export const loginSchema = z.object({
  email: z.string().email({ message: 'Neplatná e-mailová adresa.' }),
  password: z.string().min(1, { message: 'Heslo je povinné.' }),
});

export const profileSchema = z.object({
    name: z.string().min(2, { message: 'Jméno musí mít alespoň 2 znaky.' }),
    phone: z.union([z.string().length(0), z.string().min(9, 'Telefonní číslo musí mít alespoň 9 znaků.')]).optional().or(z.literal("")).transform(e => e === "" || e === null ? undefined : e),
    jerseyNumber: z.string().optional(),
    dob: z.string().optional(),
  });
