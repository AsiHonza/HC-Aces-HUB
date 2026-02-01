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

  const data = validatedFields.data;
  const role = data.email === 'janmlcak6@gmail.com' ? 'admin' : 'classic';

  // Simulate database operation, now including the role
  const userToSave = { ...data, role };
  
  // In a real app, you would save `userToSave` to your database.
  await new Promise((resolve) => setTimeout(resolve, 1000))
  
  const params = new URLSearchParams()
  params.set('name', data.name)
  params.set('email', data.email)
  params.set('phone', data.phone)
  if (data.jerseyNumber) {
    params.set('jerseyNumber', data.jerseyNumber)
  }
  params.set('role', role)

  redirect(`/welcome?${params.toString()}`)
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
  
  // Simulate fetching user data from a database
  let user: {name: string, email: string, phone: string, jerseyNumber?: string, role: string};

  if (email === 'adam.hrac@email.com') {
    user = { name: 'Adam Hráč', email: email, phone: '+420 222 333 444', jerseyNumber: '88', role: 'classic' };
  } else if (email === 'janmlcak6@gmail.com') {
    user = { name: 'Jan Mlcak', email: email, phone: '+420 111 222 333', jerseyNumber: '10', role: 'admin' };
  } else {
    // Basic name generation from email for other users
    const nameFromEmail = email.split('@')[0].replace(/[._0-9]/g, ' ').trim();
    user = {
      name: nameFromEmail.split(' ').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' '),
      email: email,
      phone: '+420 777 888 999',
      jerseyNumber: '99',
      role: 'classic'
    }
  }
  
  const params = new URLSearchParams()
  params.set('name', user.name)
  params.set('email', user.email)
  params.set('phone', user.phone)
  if (user.jerseyNumber) {
    params.set('jerseyNumber', user.jerseyNumber)
  }
  params.set('role', user.role)

  redirect(`/welcome?${params.toString()}`)
}


const profileSchema = z.object({
  name: z.string().min(2, { message: 'Jméno musí mít alespoň 2 znaky.' }),
  phone: z.string().min(9, { message: 'Telefonní číslo musí mít alespoň 9 znaků.' }).optional(),
  jerseyNumber: z.string().optional(),
  dob: z.string().optional(),
});

export async function updateProfile(currentParams: {[key: string]: string}, prevState: any, formData: FormData) {
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

  // Simulate database operation
  await new Promise((resolve) => setTimeout(resolve, 1000));

  const { name, jerseyNumber, dob, phone } = validatedFields.data;
  
  const params = new URLSearchParams(currentParams);
  params.set('name', name);
  if (jerseyNumber) {
    params.set('jerseyNumber', jerseyNumber);
  } else {
    params.delete('jerseyNumber');
  }

  if (dob) {
    params.set('dob', dob);
  } else {
    params.delete('dob');
  }
  
  if (phone) {
    params.set('phone', phone);
  } else {
    params.delete('phone');
  }

  params.set('updated', 'true');
  
  redirect(`/dashboard/settings?${params.toString()}`);
}
