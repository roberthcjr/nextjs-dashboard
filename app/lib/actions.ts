"use server";

import { z } from "zod";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string(),
    amount: z.coerce.number(),
    status: z.enum(["pending", "paid"]),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

const CENTS_IN_A_DOLAR = 100;
const INVOICES_PAGE = "/dashboard/invoices";

export async function createInvoice(formData: FormData) {
    try {
        const { amount, customerId, status } = CreateInvoice.parse({
            customerId: formData.get("customerId"),
            amount: formData.get("amount"),
            status: formData.get("status"),
        });

        const amountInCents = amount * CENTS_IN_A_DOLAR;
        const date = new Date().toISOString().split("T")[0];

        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
    } catch (error) {
        return { message: "Database Error: Failed to Create Invoice." };
    }
    revalidatePath(INVOICES_PAGE);
    redirect(INVOICES_PAGE);
}

export async function updateInvoice(id: string, formData: FormData) {
    try {
        const { amount, customerId, status } = CreateInvoice.parse({
            customerId: formData.get("customerId"),
            amount: formData.get("amount"),
            status: formData.get("status"),
        });

        const amountInCents = amount * CENTS_IN_A_DOLAR;

        await sql`
            UPDATE invoices SET
            customer_id = ${customerId},
            amount = ${amountInCents}, 
            status = ${status}
            WHERE id = ${id}
        `;
    } catch (error) {
        return { message: "Database Error: Failed to Update Invoice." };
    }
    revalidatePath(INVOICES_PAGE);
    redirect(INVOICES_PAGE);
}

export async function deleteInvoice(id: string) {
    try {
        await sql`DELETE FROM invoices WHERE id = ${id}`;
        revalidatePath(INVOICES_PAGE);
        return { message: "Invoice deleted" };
    } catch (error) {
        return { message: "Database Error: Failed to Delete Invoice." };
    }
}
