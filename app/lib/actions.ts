'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { redirect } from 'next/navigation';
import postgres from 'postgres';

const sql = postgres(process.env.POSTGRES_URL!, { ssl: 'require' });

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(), // change from a string to a number
    status: z.enum(['pending', 'paid']),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });
// Use Zod to update the expected types
const UpdateInvoice = FormSchema.omit({ id: true, date: true});

export async function createInvoice(formData: FormData) {
    const { customerId, amount, status } = CreateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });
    const amountInCents = amount * 100;
    // invoice creation date
    const date = new Date().toISOString().split('T')[0];

    await sql `
    INSERT INTO invoices (customer_id, amount, status, date)
    VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;

    // revalidate to fetch fresh data from the server
    revalidatePath('/dashboard/invoices');
    // redirect back to invoice page
    redirect('/dashboard/invoices');
}

export async function updateInvoice(id: string, formData: FormData) {
    const { customerId, amount, status } = UpdateInvoice.parse({
        customerId: formData.get('customerId'),
        amount: formData.get('amount'),
        status: formData.get('status'),
    });

    const amountInCents = amount * 100;

    await sql`
        UPDATE invoices
        SET customer_id = ${customerId}, amount, = ${amountInCents}, status = ${status}
        WHERE id = ${id}
    `;

    // Clear client cache and make a new server request
    revalidatePath('/dashboard/invoices');
    // Redirect user to invoice page
    redirect('/dashboard/invoices');
}

export async function deleteInvoice(id: string) {
    await sql `
        DELETE FROM invoices WHERE id = ${id}
    `;

    // Trigger a new server request and re-render the table
    revalidatePath('/dashboard/invoices');
}