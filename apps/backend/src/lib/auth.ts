import "dotenv/config";
import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./prisma.js";

const isLocalhost = (process.env.BETTER_AUTH_BASE_URL || process.env.BETTER_AUTH_URL || "").includes("localhost");

export const auth = betterAuth({
    baseURL: process.env.BETTER_AUTH_BASE_URL || process.env.BETTER_AUTH_URL,
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
                defaultValue: "BUYER",
            },
        },
    },
    trustedOrigins: [
        process.env.FRONTEND_URL || "http://localhost:3000",
        process.env.BETTER_AUTH_BASE_URL || process.env.BETTER_AUTH_URL || "http://localhost:8000",
    ],
    advanced: isLocalhost ? undefined : {
        crossSubDomainCookies: {
            enabled: true,
            domain: "collector-shop.local",
        },
    },
    trustProxy: true,
});