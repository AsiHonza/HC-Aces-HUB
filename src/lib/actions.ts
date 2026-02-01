'use server'

import { redirect } from 'next/navigation'
import { registerSchema, loginSchema, profileSchema } from './schemas';


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
  
  return {
    errors: {},
    message: '',
    success: true,
  };
}
