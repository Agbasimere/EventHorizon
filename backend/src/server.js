const mongoose = require('mongoose');
require('dotenv').config();
const logger = require('./config/logger');
const app = require('./app');

const PORT = process.env.PORT || 5000;

mongoose
    .connect(process.env.MONGO_URI)
    .then(() => {
        logger.info('Connected to MongoDB', {
            database: 'MongoDB',
            status: 'connected',
            uri: process.env.MONGO_URI?.replace(/\/\/.*@/, '//***@'),
        });

        let worker = null;

        try {
            const { createWorker } = require('./worker/processor');
            worker = createWorker();
            logger.info('BullMQ queue system enabled');
        } catch (error) {
            logger.warn('BullMQ worker initialization failed - queue system disabled', {
                error: error.message,
                note: 'Install and start Redis to enable background job processing',
            });
        }

        const eventPoller = require('./worker/poller');
        eventPoller.start();

        app.listen(PORT, () => {
            logger.info('Server started successfully', {
                port: PORT,
                environment: process.env.NODE_ENV || 'development',
                pid: process.pid,
                queueEnabled: worker !== null,
            });
        });

        process.on('SIGTERM', async () => {
            logger.info('SIGTERM received, shutting down gracefully');

            if (worker) {
                await worker.close();
            }

            await mongoose.connection.close();
            process.exit(0);
        });
    })
    .catch((err) => {
        logger.error('MongoDB connection failed', {
            error: err.message,
            stack: err.stack,
            database: 'MongoDB',
        });
        process.exit(1);
    });
