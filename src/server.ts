import app from "./app";
import { env } from "./config/env";
import prisma from "./config/prisma"; // adjust path if needed

const startServer = async () => {
    try {
        await prisma.$connect();
        console.log("✅ Database connected");

        const server = app.listen(env.PORT, () => {
            console.log(`🚀 Ecofy API running on http://localhost:${env.PORT}`);
            console.log(`🌍 Environment: ${env.NODE_ENV}`);
        });

        // ─── Graceful Shutdown ────────────────────────────────────────────────
        const shutdown = async (signal: string) => {
            console.log(`\n⚠️  Received ${signal}. Shutting down...`);

            await prisma.$disconnect();
            server.close(() => {
                console.log("💤 Server closed");
                process.exit(0);
            });
        };

        process.on("SIGINT", shutdown);
        process.on("SIGTERM", shutdown);

    } catch (error) {
        console.error("❌ Failed to start server:", error);

        await prisma.$disconnect();
        process.exit(1);
    }
};

startServer();