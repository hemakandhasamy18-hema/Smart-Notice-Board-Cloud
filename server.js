import express from 'express';
import cors from 'cors';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
    origin: '*',
    credentials: true
}));
app.use(express.json());

// Health Check Endpoint
app.get('/api/health', (req, res) => {
    res.json({
        status: 'online',
        service: 'Smart Notice Board Backend',
        timestamp: new Date().toISOString(),
        firebaseConfigured: true,
        collections: ['users', 'notices']
    });
});

// Status Endpoint
app.get('/api/status', (req, res) => {
    res.json({
        backendUrl: `http://localhost:${PORT}`,
        frontendUrl: 'http://localhost:3000',
        firestoreCollections: ['users', 'notices'],
        authMethods: ['Email/Password']
    });
});

app.listen(PORT, () => {
    console.log(`⚡ Backend server running on http://localhost:${PORT}`);
});
