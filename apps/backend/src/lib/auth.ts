import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma.js";

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_BASE_URL,
    database: prismaAdapter(prisma, {
        provider: "postgresql",
    }),
    emailAndPassword: {
        enabled: true,
    },
    user: {
        additionalFields: {
            role: {
                type: "string",
                values: ["BUYER", "SELLER", "ADMIN"],
                defaultValue: "BUYER",
            },
        },
    },
    trustedOrigins: [
        "http://localhost:3000",
        "http://localhost:8000",
    ],
});