const express = require('express');
const sqlite3 = require('sqlite3').verbose();
const cors = require('cors');
const helmet = require('helmet');
const compression = require('compression');
const morgan = require('morgan');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(helmet());
app.use(compression());
app.use(cors());
app.use(morgan('combined'));
app.use(express.json());
app.use(express.static('.'));

// Database setup
const db = new sqlite3.Database('./portfolio.db', sqlite3.OPEN_READWRITE | sqlite3.OPEN_CREATE, (err) => {
    if (err) {
        console.error('Error opening database:', err.message);
    } else {
        console.log('Connected to SQLite database.');
        initializeDatabase();
    }
});

// Initialize database tables
function initializeDatabase() {
    // Portfolio projects table
    db.run(`CREATE TABLE IF NOT EXISTS projects (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        image_url TEXT NOT NULL,
        category TEXT NOT NULL,
        technologies TEXT NOT NULL,
        project_url TEXT,
        github_url TEXT,
        featured INTEGER DEFAULT 0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Blog posts table
    db.run(`CREATE TABLE IF NOT EXISTS blog_posts (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        content TEXT NOT NULL,
        excerpt TEXT NOT NULL,
        image_url TEXT NOT NULL,
        category TEXT NOT NULL,
        published INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Skills table
    db.run(`CREATE TABLE IF NOT EXISTS skills (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        level INTEGER NOT NULL,
        icon TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Contact messages table
    db.run(`CREATE TABLE IF NOT EXISTS contact_messages (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        name TEXT NOT NULL,
        email TEXT NOT NULL,
        subject TEXT,
        message TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )`);

    // Insert sample data
    insertSampleData();
}

// Insert sample data
function insertSampleData() {
    // Clear existing data to avoid duplicates
    db.run('DELETE FROM projects');
    db.run('DELETE FROM blog_posts');
    db.run('DELETE FROM skills');
    db.run('DELETE FROM contact_messages');
    
    // Sample projects
    const projects = [
        {
            title: 'E-Commerce Dashboard',
            description: 'Modern admin dashboard for managing online store with real-time analytics and inventory management. Features include sales tracking, customer management, and product catalog.',
            image_url: 'https://images.unsplash.com/photo-1460925895917-afdab827c52f?w=600&h=400&fit=crop&auto=format&quality=80',
            category: 'Web Development',
            technologies: 'React,Node.js,MongoDB,Chart.js',
            project_url: 'https://example.com/ecommerce',
            github_url: 'https://github.com/example/ecommerce',
            featured: 1
        },
        {
            title: 'Mobile Banking App',
            description: 'Secure and intuitive mobile banking application with biometric authentication and real-time transactions. Built with security and user experience in mind.',
            image_url: 'https://images.unsplash.com/photo-1551288049-bebda4e38f71?w=600&h=400&fit=crop&auto=format&quality=80',
            category: 'Mobile Development',
            technologies: 'React Native,TypeScript,Firebase',
            project_url: 'https://example.com/banking',
            github_url: 'https://github.com/example/banking',
            featured: 1
        },
        {
            title: 'SaaS Analytics Platform',
            description: 'Comprehensive analytics platform for businesses to track KPIs and generate custom reports. Features real-time data visualization and predictive analytics.',
            image_url: 'https://images.unsplash.com/photo-1551650975-87deedd944c3?w=600&h=400&fit=crop&auto=format&quality=80',
            category: 'Web Development',
            technologies: 'Vue.js,D3.js,Python,PostgreSQL',
            project_url: 'https://example.com/analytics',
            github_url: 'https://github.com/example/analytics',
            featured: 1
        },
        {
            title: 'Social Media Dashboard',
            description: 'Unified dashboard for managing multiple social media accounts with scheduling, analytics, and engagement tracking.',
            image_url: 'https://images.unsplash.com/photo-1611224923853-80b023f02d71?w=600&h=400&fit=crop&auto=format&quality=80',
            category: 'Web Development',
            technologies: 'Angular,Node.js,MongoDB,Socket.io',
            project_url: 'https://example.com/social',
            github_url: 'https://github.com/example/social',
            featured: 0
        },
        {
            title: 'AI Content Generator',
            description: 'Machine learning powered content generation tool for creating blog posts, social media content, and marketing copy.',
            image_url: 'https://images.unsplash.com/photo-1677442136019-21780ecad995?w=600&h=400&fit=crop&auto=format&quality=80',
            category: 'AI/ML',
            technologies: 'Python,TensorFlow,React,FastAPI',
            project_url: 'https://example.com/aigenerator',
            github_url: 'https://github.com/example/aigenerator',
            featured: 0
        },
        {
            title: 'Task Management System',
            description: 'Collaborative task management platform with real-time updates, team collaboration features, and project tracking.',
            image_url: 'https://images.unsplash.com/photo-1586953208448-b95a79798f07?w=600&h=400&fit=crop&auto=format&quality=80',
            category: 'Web Development',
            technologies: 'Vue.js,Node.js,PostgreSQL,Redis',
            project_url: 'https://example.com/tasks',
            github_url: 'https://github.com/example/tasks',
            featured: 0
        }
    ];

    const skills = [
        { name: 'React', category: 'Frontend', level: 90, icon: '⚛️' },
        { name: 'Vue.js', category: 'Frontend', level: 85, icon: '�' },
        { name: 'TypeScript', category: 'Frontend', level: 88, icon: '🔷' },
        { name: 'JavaScript', category: 'Frontend', level: 95, icon: '🟨' },
        { name: 'HTML/CSS', category: 'Frontend', level: 92, icon: '🎨' },
        { name: 'Node.js', category: 'Backend', level: 88, icon: '🟢' },
        { name: 'Python', category: 'Backend', level: 85, icon: '🐍' },
        { name: 'Express.js', category: 'Backend', level: 90, icon: '🚀' },
        { name: 'MongoDB', category: 'Database', level: 82, icon: '🍃' },
        { name: 'PostgreSQL', category: 'Database', level: 78, icon: '🐘' },
        { name: 'Redis', category: 'Database', level: 75, icon: '�' },
        { name: 'AWS', category: 'Cloud', level: 70, icon: '☁️' },
        { name: 'Git', category: 'Tools', level: 92, icon: '📦' },
        { name: 'Figma', category: 'Design', level: 80, icon: '🎨' }
    ];

    const blogPosts = [
        {
            title: 'Building Modern Web Applications with React',
            content: 'In this comprehensive guide, we explore best practices for building scalable and maintainable React applications...',
            excerpt: 'Learn the latest React patterns and best practices for building modern web applications.',
            image_url: 'https://images.unsplash.com/photo-1633356122544-f134324a6cee?w=600&h=400&fit=crop&auto=format&quality=80',
            category: 'Tutorial'
        },
        {
            title: 'The Future of Web Development',
            content: 'Exploring emerging trends and technologies that are shaping the future of web development...',
            excerpt: 'Discover the latest trends and technologies that will define the future of web development.',
            image_url: 'https://images.unsplash.com/photo-1517134191118-9d595e4c8c2b?w=600&h=400&fit=crop&auto=format&quality=80',
            category: 'Thoughts'
        },
        {
            title: 'Optimizing Web Performance',
            content: 'A deep dive into web performance optimization techniques and tools...',
            excerpt: 'Master the art of web performance optimization with these proven techniques.',
            image_url: 'https://images.unsplash.com/photo-1467232004584-a241de8bcf5d?w=600&h=400&fit=crop&auto=format&quality=80',
            category: 'Tutorial'
        }
    ];

    // Insert projects
    const insertProject = db.prepare(`INSERT OR IGNORE INTO projects 
        (title, description, image_url, category, technologies, project_url, github_url, featured) 
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)`);

    projects.forEach(project => {
        insertProject.run(
            project.title,
            project.description,
            project.image_url,
            project.category,
            project.technologies,
            project.project_url,
            project.github_url,
            project.featured
        );
    });
    insertProject.finalize();

    // Insert skills
    const insertSkill = db.prepare(`INSERT OR IGNORE INTO skills 
        (name, category, level, icon) VALUES (?, ?, ?, ?)`);

    skills.forEach(skill => {
        insertSkill.run(skill.name, skill.category, skill.level, skill.icon);
    });
    insertSkill.finalize();

    // Insert blog posts
    const insertBlogPost = db.prepare(`INSERT OR IGNORE INTO blog_posts 
        (title, content, excerpt, image_url, category) VALUES (?, ?, ?, ?, ?)`);

    blogPosts.forEach(post => {
        insertBlogPost.run(
            post.title,
            post.content,
            post.excerpt,
            post.image_url,
            post.category
        );
    });
    insertBlogPost.finalize();

    console.log('Sample data inserted successfully.');
}

// API Routes

// Get all projects
app.get('/api/projects', (req, res) => {
    const query = req.query.featured ? 'WHERE featured = 1' : '';
    db.all(`SELECT * FROM projects ${query} ORDER BY created_at DESC`, (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Get project by ID
app.get('/api/projects/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM projects WHERE id = ?', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (!row) {
            res.status(404).json({ error: 'Project not found' });
        } else {
            res.json(row);
        }
    });
});

// Get all skills
app.get('/api/skills', (req, res) => {
    db.all('SELECT * FROM skills ORDER BY level DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Get skills by category
app.get('/api/skills/:category', (req, res) => {
    const category = req.params.category;
    db.all('SELECT * FROM skills WHERE category = ? ORDER BY level DESC', [category], (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Get all blog posts
app.get('/api/blog', (req, res) => {
    db.all('SELECT * FROM blog_posts WHERE published = 1 ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Get blog post by ID
app.get('/api/blog/:id', (req, res) => {
    const id = req.params.id;
    db.get('SELECT * FROM blog_posts WHERE id = ? AND published = 1', [id], (err, row) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else if (!row) {
            res.status(404).json({ error: 'Blog post not found' });
        } else {
            res.json(row);
        }
    });
});

// Submit contact form
app.post('/api/contact', (req, res) => {
    const { name, email, subject, message } = req.body;

    if (!name || !email || !message) {
        return res.status(400).json({ error: 'Name, email, and message are required' });
    }

    const stmt = db.prepare(`INSERT INTO contact_messages 
        (name, email, subject, message) VALUES (?, ?, ?, ?)`);

    stmt.run([name, email, subject, message], function(err) {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.status(201).json({ 
                message: 'Contact form submitted successfully',
                id: this.lastID 
            });
        }
    });
    stmt.finalize();
});

// Get contact messages (admin only - in production, add authentication)
app.get('/api/contact', (req, res) => {
    db.all('SELECT * FROM contact_messages ORDER BY created_at DESC', (err, rows) => {
        if (err) {
            res.status(500).json({ error: err.message });
        } else {
            res.json(rows);
        }
    });
});

// Serve main page
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'index.html'));
});

// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Something went wrong!' });
});

// 404 handler
app.use((req, res) => {
    res.status(404).json({ error: 'Not found' });
});

// Start server
app.listen(PORT, () => {
    console.log(`Server running on http://localhost:${PORT}`);
    console.log(`Database: portfolio.db`);
    console.log(`API endpoints available at /api/*`);
});

// Graceful shutdown
process.on('SIGINT', () => {
    console.log('\nShutting down gracefully...');
    db.close((err) => {
        if (err) {
            console.error('Error closing database:', err.message);
        } else {
            console.log('Database connection closed.');
        }
        process.exit(0);
    });
});
