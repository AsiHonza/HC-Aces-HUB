export type User = {
    id: string;
    name: string;
    email: string;
    phoneNumber: string;
    jerseyNumber: string | null;
    role: 'admin' | 'classic';
    dob?: string;
};

export const mockUsers: User[] = [
    {
        id: '1',
        name: 'Jan Mlcak',
        email: 'janmlcak6@gmail.com',
        phoneNumber: '+420 111 222 333',
        jerseyNumber: '10',
        role: 'admin',
        dob: '1990-05-15',
    },
    {
        id: '2',
        name: 'Adam Hráč',
        email: 'adam.hrac@email.com',
        phoneNumber: '+420 222 333 444',
        jerseyNumber: '88',
        role: 'classic',
        dob: '1992-08-20',
    },
    {
        id: '3',
        name: 'Petr Novák',
        email: 'petr.novak@email.com',
        phoneNumber: '+420 333 444 555',
        jerseyNumber: '23',
        role: 'classic',
        dob: '1988-11-30',
    },
    {
        id: '4',
        name: 'Tomáš Dvořák',
        email: 'tomas.dvorak@email.com',
        phoneNumber: '+420 444 555 666',
        jerseyNumber: '15',
        role: 'classic',
    },
     {
        id: '5',
        name: 'Martin Černý',
        email: 'martin.cerny@email.com',
        phoneNumber: '+420 555 666 777',
        jerseyNumber: '7',
        role: 'classic',
    },
];
