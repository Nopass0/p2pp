import { NextResponse } from "next/server";
import { db } from "@/server/db";
import { z } from "zod";

const cookieSchema = z.object({
  name: z.string(),
  value: z.string(),
  domain: z.string(),
  path: z.string(),
  expiration_date: z.null(),
  host_only: z.null(),
  http_only: z.boolean(),
  same_site: z.null(),
  secure: z.boolean(),
  session: z.null(),
  store_id: z.null(),
});

const requestSchema = z.object({
  cookies: z.array(cookieSchema).or(z.string()),
  deviceToken: z.string(),
  transactions: z.array(z.object({
    amount_rub: z.number(),
    amount_usdt: z.number(),
    approved_at: z.string().nullable(),
    attachments: z.array(z.object({
      created_at: z.string(),
      custom_properties: z.object({}),
      extension: z.string(),
      file_name: z.string(),
      name: z.string(),
      original_url: z.string(),
      size: z.number()
    })),
    bank_code: z.string().nullable(),
    bank_label: z.string(),
    bank_name: z.string(),
    course: z.number(),
    created_at: z.string(),
    expired_at: z.string(),
    idex_id: z.string(),
    payment_method: z.string(),
    payment_method_id: z.null(),
    status: z.null(),
    success_count: z.number(),
    success_rate: z.number(),
    total_rub: z.number(),
    total_usdt: z.number(),
    trader_id: z.string(),
    trader_name: z.string(),
    transaction_id: z.string(),
    updated_at: z.string(),
    user_id: z.null(),
    wallet: z.string()
  })).optional(),
});

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const validatedData = requestSchema.parse(body);

    // Find user by device token
    const deviceToken = await db.deviceToken.findUnique({
      where: { token: validatedData.deviceToken },
      include: { user: true },
    });

    if (!deviceToken) {
      return NextResponse.json(
        { error: "Device token not found" },
        { status: 404 }
      );
    }

    const user = deviceToken.user;

    // Save cookies
    if (validatedData.cookies) {
      const cookies = Array.isArray(validatedData.cookies) 
        ? validatedData.cookies 
        : [{
            name: 'session',
            value: validatedData.cookies,
            domain: '',
            path: '/',
            expiration_date: null,
            host_only: null,
            http_only: true,
            same_site: null,
            secure: true,
            session: null,
            store_id: null,
          }];

      for (const cookie of cookies) {
        await db.gateCookie.upsert({
          where: {
            userId_cookie: {
              userId: user.id,
              cookie: cookie.value,
            },
          },
          update: {
            lastChecked: new Date(),
            isActive: true,
          },
          create: {
            userId: user.id,
            cookie: cookie.value,
            isActive: true,
          },
        });
      }
    }

    // Process transactions if present
    if (validatedData.transactions) {
      for (const transaction of validatedData.transactions) {
        // Check if transaction already exists
        const existingTransaction = await db.gateTransaction.findUnique({
          where: { transactionId: transaction.transaction_id },
        });

        if (!existingTransaction) {
          // Create new transaction
          await db.gateTransaction.create({
            data: {
              userId: user.id,
              transactionId: transaction.transaction_id,
              paymentMethodId: 1, // Default value, adjust as needed
              wallet: transaction.wallet,
              amountRub: transaction.amount_rub,
              amountUsdt: transaction.amount_usdt,
              totalRub: transaction.total_rub,
              totalUsdt: transaction.total_usdt,
              status: 0, // Default status, adjust as needed
              bankName: transaction.bank_name,
              bankLabel: transaction.bank_label,
              bankCode: transaction.bank_code,
              paymentMethod: transaction.payment_method,
              course: transaction.course,
              successCount: transaction.success_count,
              successRate: transaction.success_rate,
              approvedAt: transaction.approved_at ? new Date(transaction.approved_at) : null,
              expiredAt: transaction.expired_at ? new Date(transaction.expired_at) : null,
              attachments: transaction.attachments,
              traderId: parseInt(transaction.trader_id),
              traderName: transaction.trader_name,
              idexId: transaction.idex_id,
            },
          });
        }
      }
    }

    return NextResponse.json({
      success: true,
      message: "Data processed successfully",
    });
  } catch (error) {
    console.error("Error processing request:", error);
    
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: "Invalid request data", details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}