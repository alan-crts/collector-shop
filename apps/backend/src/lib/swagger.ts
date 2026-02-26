import swaggerJsdoc from "swagger-jsdoc";

const options: swaggerJsdoc.Options = {
    definition: {
        openapi: "3.0.0",
        info: {
            title: "Collector Shop API Documentation",
            version: "1.0.0",
            description: "API documentation for the Collector Shop backend service.",
        },
        servers: [
            {
                url: "http://localhost:8000",
                description: "Development server",
            },
        ],
        components: {
            securitySchemes: {
                bearerAuth: {
                    type: "http",
                    scheme: "bearer",
                    bearerFormat: "JWT",
                },
            },
        },
    },
    apis: ["./src/routes/*.ts", "./src/controllers/*.ts"], // Path to the API docs
};

export const specs = swaggerJsdoc(options);
