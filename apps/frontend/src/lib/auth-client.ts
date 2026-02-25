import { createAuthClient } from "better-auth/react"
import { inferAdditionalFields } from "better-auth/client/plugins";

export const authClient = createAuthClient({
    baseURL: "http://localhost:8000",
    plugins: [inferAdditionalFields({
        user: {
            role: {
                type: "string"
            }
        }
    })],
})

export type Session = typeof authClient.$Infer.Session
