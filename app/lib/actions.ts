"use server";

import { z } from "zod";
import { sql } from "@vercel/postgres";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { signIn } from "@/auth";
import { AuthError } from "next-auth";

const FormSchema = z.object({
    id: z.string(),
    customerId: z.string({
        invalid_type_error: "Please select a customer.",
    }),
    amount: z.coerce.number().gt(0, {
        message: "Please enter an amount greater than $0.",
    }),
    status: z.enum(["pending", "paid"], {
        invalid_type_error: "Please select an invoice status.",
    }),
    date: z.string(),
});

const CreateInvoice = FormSchema.omit({ id: true, date: true });

const CENTS_IN_A_DOLAR = 100;
const INVOICES_PAGE = "/dashboard/invoices";

type ErrorOptions = {
    [key: string]: string;
};

const Errors: ErrorOptions = {
    CredentialsSignin: "Invalid Credentials",
    AccessDenied: "Acess Denied",
};

export type State = {
    errors?: {
        customerId?: string[];
        amount?: string[];
        status?: string[];
    };
    message?: string | null;
};

export async function authenticate(
    prevState: string | undefined,
    formData: FormData
) {
    try {
        await signIn("credentials", formData);
    } catch (error) {
        if (error instanceof AuthError) {
            if (!Errors[error.type]) return "Something went wrong.";
            return Errors[error.type];
        }
        throw error;
    }
}

export async function createInvoice(prevState: State, formData: FormData) {
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get("customerId"),
        amount: formData.get("amount"),
        status: formData.get("status"),
    });

    if (!validatedFields.success)
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to Create Invoice",
        };

    const { amount, customerId, status } = validatedFields.data;

    const amountInCents = amount * CENTS_IN_A_DOLAR;
    const date = new Date().toISOString().split("T")[0];

    try {
        await sql`
        INSERT INTO invoices (customer_id, amount, status, date)
        VALUES (${customerId}, ${amountInCents}, ${status}, ${date})
    `;
    } catch (error) {
        return {
            message: `Database Error: Failed to Create Invoice. Cause: ${error}`,
        };
    }
    revalidatePath(INVOICES_PAGE);
    redirect(INVOICES_PAGE);
}

export async function updateInvoice(
    id: string,
    prevState: State,
    formData: FormData
) {
    console.log(id);
    console.log(formData);
    const validatedFields = CreateInvoice.safeParse({
        customerId: formData.get("customerId"),
        amount: formData.get("amount"),
        status: formData.get("status"),
    });

    if (!validatedFields.success)
        return {
            errors: validatedFields.error.flatten().fieldErrors,
            message: "Missing Fields. Failed to Update Invoice",
        };

    const { amount, customerId, status } = validatedFields.data;

    const amountInCents = amount * CENTS_IN_A_DOLAR;
    try {
        await sql`
            UPDATE invoices SET
            customer_id = ${customerId},
            amount = ${amountInCents}, 
            status = ${status}
            WHERE id = ${id}
        `;
    } catch (error) {
        return {
            message: `Database Error: Failed to Update Invoice. Cause: ${error}`,
        };
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
        return {
            message: `Database Error: Failed to Delete Invoice. Cause: ${error}`,
        };
    }
}
