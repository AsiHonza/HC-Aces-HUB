'use server'

import { redirect } from 'next/navigation'
import { z } from 'zod'

const registerSchema = z.object({
  name: z.string().min(2, { message: 'Jméno musí mít alespoň 2 znaky.' }),
  email: z.string().email({ message: 'Neplatná e-mailová adresa.' }),
  phone: z.string().min(9, { message: 'Telefonní číslo musí mít alespoň 9 znaků.' }),
  jerseyNumber: z.string().optional(),
  password: z.string().min(6, { message: 'Heslo musí mít alespoň 6 znaků.' }),
})

export async function register(prevState: any, formData: FormData) {
  const validatedFields = registerSchema.safeParse(
    Object.fromEntries(formData.entries())
  )

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Prosím, opravte chyby ve formuláři.',
    }
  }
  
  redirect(`/welcome`)
}

const loginSchema = z.object({
  email: z.string().email({ message: 'Neplatná e-mailová adresa.' }),
  password: z.string().min(1, { message: 'Heslo je povinné.' }),
})

export async function login(prevState: any, formData: FormData) {
  const validatedFields = loginSchema.safeParse(
    Object.fromEntries(formData.entries())
  )

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Prosím, opravte chyby ve formuláři.',
    }
  }

  // Simulate database operation & password check
  await new Promise((resolve) => setTimeout(resolve, 1000))

  const { email } = validatedFields.data;

  // Example of error handling from server
  if (email === 'error@example.com') {
    return {
      errors: {},
      message: 'Nesprávný e-mail nebo heslo.'
    }
  }

  redirect(`/welcome`)
}


const profileSchema = z.object({
    name: z.string().min(2, { message: 'Jméno musí mít alespoň 2 znaky.' }),
    phone: z.union([z.string().length(0), z.string().min(9, 'Telefonní číslo musí mít alespoň 9 znaků.')]).optional().transform(e => e === "" ? undefined : e),
    jerseyNumber: z.string().optional(),
    dob: z.string().optional(),
  });

export async function updateProfile(uid: string, prevState: any, formData: FormData) {
  const validatedFields = profileSchema.safeParse(
    Object.fromEntries(formData.entries())
  );

  if (!validatedFields.success) {
    return {
      errors: validatedFields.error.flatten().fieldErrors,
      message: 'Prosím, opravte chyby ve formuláři.',
      success: false,
    };
  }
  
  const params = new URLSearchParams();
  params.set('updated', 'true');
  
  redirect(`/dashboard/settings?${params.toString()}`);
}
