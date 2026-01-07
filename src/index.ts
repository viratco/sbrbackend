import express, { Request, Response, NextFunction } from 'express';
import cors from 'cors';
import { PrismaClient } from '@prisma/client';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import { upload } from './middleware/upload';

const ADMIN_EMAIL = 'sbrdomain1@gmail.com';
const ADMIN_PASS = 'sbradmin123';

dotenv.config();

const app = express();
const prisma = new PrismaClient();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Health Check
app.get('/', (req: Request, res: Response) => {
    res.json({ message: 'SBR Estates Backend (TS + Prisma) is running' });
});

// Test DB Connection
app.get('/api/test-db', async (req: Request, res: Response) => {
    try {
        const result = await prisma.$queryRaw`SELECT NOW()`;
        res.json({ success: true, message: 'Connected', result });
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// Middleware to authenticate JWT
const authenticateToken = (req: Request, res: Response, next: NextFunction) => {
    const authHeader = req.headers['authorization'];
    const token = authHeader && authHeader.split(' ')[1];

    if (!token) return res.sendStatus(401);

    jwt.verify(token, process.env.JWT_SECRET as string, (err: any, user: any) => {
        if (err) return res.sendStatus(403);
        (req as any).user = user;
        next();
    });
};

// === AUTH API ===
app.post('/api/admin/login', (req: Request, res: Response) => {
    const { email, password } = req.body;

    if (email === ADMIN_EMAIL && password === ADMIN_PASS) {
        const token = jwt.sign({ email }, process.env.JWT_SECRET as string, { expiresIn: '24h' });
        res.json({ success: true, token });
    } else {
        res.status(401).json({ success: false, message: 'Invalid credentials' });
    }
});

// === LEADS API ===
app.post('/api/leads', async (req: Request, res: Response) => {
    try {
        const { name, phone } = req.body;
        const lead = await prisma.lead.create({
            data: { name, phone }
        });
        res.json({ success: true, lead });
    } catch (error: any) {
        console.error('Error creating lead:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/leads', authenticateToken, async (req: Request, res: Response) => {
    try {
        const leads = await prisma.lead.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(leads);
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

// === PROPERTIES API ===
app.post('/api/properties', authenticateToken, upload.array('images', 10), async (req: any, res: any) => {
    try {
        console.log('Files:', req.files);
        console.log('Body:', req.body);

        const { title, location, type, description, status } = req.body;

        // Get S3 URLs from uploaded files
        const imageUrls = req.files ? (req.files as Express.MulterS3.File[]).map(file => file.location) : [];

        const property = await prisma.property.create({
            data: {
                title,
                location,
                type: type || 'Villa',
                description,
                status: status || 'For Sale',
                // price removed
                images: imageUrls
            }
        });
        res.status(201).json({ success: true, property });
    } catch (error: any) {
        console.error('Error creating property:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

app.get('/api/properties', async (req: Request, res: Response) => {
    try {
        const properties = await prisma.property.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(properties);
    } catch (error: any) {
        res.status(500).json({ success: false, error: error.message });
    }
});

app.delete('/api/properties/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        const { id } = req.params;
        await prisma.property.delete({
            where: { id: Number(id) }
        });
        res.json({ success: true, message: 'Property deleted successfully' });
    } catch (error: any) {
        console.error('Error deleting property:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

// === BLOG API ===
app.get('/api/posts', async (req: Request, res: Response) => {
    try {
        const posts = await prisma.blogPost.findMany({ orderBy: { createdAt: 'desc' } });
        res.json(posts);
    } catch (error) {
        console.error('Error fetching posts:', error);
        res.status(500).json({ error: 'Failed to fetch posts' });
    }
});

app.get('/api/posts/:id', async (req: Request, res: Response) => {
    try {
        const post = await prisma.blogPost.findUnique({ where: { id: parseInt(req.params.id) } });
        if (post) res.json(post);
        else res.status(404).json({ error: 'Post not found' });
    } catch (error) {
        console.error('Error fetching post:', error);
        res.status(500).json({ error: 'Failed to fetch post' });
    }
});

app.post('/api/posts', authenticateToken, upload.single('image'), async (req: Request, res: Response) => {
    try {
        const { title, category, excerpt, content, date } = req.body;

        let imageUrl = '';
        if (req.file) {
            // @ts-ignore
            imageUrl = req.file.location; // S3 URL
        }

        const post = await prisma.blogPost.create({
            data: {
                title,
                category,
                excerpt,
                content,
                date: date || new Date().toLocaleDateString(),
                image: imageUrl
            }
        });
        res.json({ success: true, post });
    } catch (error) {
        console.error('Error creating post:', error);
        res.status(500).json({ error: 'Failed to create post' });
    }
});

app.delete('/api/posts/:id', authenticateToken, async (req: Request, res: Response) => {
    try {
        await prisma.blogPost.delete({ where: { id: parseInt(req.params.id) } });
        res.json({ success: true });
    } catch (error) {
        console.error('Error deleting post:', error);
        res.status(500).json({ error: 'Failed to delete post' });
    }
});

app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Test DB at http://localhost:${PORT}/api/test-db`);
});
