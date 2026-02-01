import { z } from 'zod';

export const registerSchema = z.object({
  name: z.string().min(2, { message: 'Jméno musí mít alespoň 2 znaky.' }),
  email: z.string().email({ message: 'Neplatná e-mailová adresa.' }),
  phoneNumber: z.string().min(9, { message: 'Telefonní číslo musí mít alespoň 9 znaků.' }),
  jerseyNumber: z.string().optional(),
  playerType: z.enum(['player', 'goalie', 'member'], { required_error: 'Prosím, vyberte svou pozici.' }),
  password: z.string().min(6, { message: 'Heslo musí mít alespoň 6 znaků.' }),
});

export const loginSchema = z.object({
  email: z.string().email({ message: 'Neplatná e-mailová adresa.' }),
  password: z.string().min(1, { message: 'Heslo je povinné.' }),
});

export const profileSchema = z.object({
    name: z.string().min(2, { message: 'Jméno musí mít alespoň 2 znaky.' }),
    phoneNumber: z.union([z.string().length(0), z.string().min(9, 'Telefonní číslo musí mít alespoň 9 znaků.')]).optional().nullable(),
    jerseyNumber: z.string().optional().nullable(),
    dob: z.string().optional().nullable(),
  });

    