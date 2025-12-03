require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

const authRoutes = require('./routes/authRoutes');
const swipeRoutes = require('./routes/swipeRoutes');
const detailsRoutes = require('./routes/detailsRoutes');
const watchlistRoutes = require('./routes/watchlistRoutes');
const authMiddleware = require('./middlewares/authMiddleware');
const aboutRoutes = require('./routes/aboutRoutes');

const app = express();
const PORT = process.env.PORT || 3000;

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));

app.use(express.static(path.join(__dirname, 'public')));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'flickcine-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { maxAge: 1000 * 60 * 60 * 24 * 7 }
}));

app.use((req, res, next) => {
    res.locals.isLoggedIn = req.session.isLoggedIn || false;
    res.locals.user = req.session.user || null;
    next();
});

app.get('/', (req, res) => {
    res.render('landing');
});

app.use('/', authRoutes);
app.use('/swipe', authMiddleware, swipeRoutes);
app.use('/details', authMiddleware, detailsRoutes);
app.use('/watchlist', authMiddleware, watchlistRoutes);
app.use('/aboutus', aboutRoutes);

app.use((req, res) => {
    res.status(404).send('Página não encontrada');
});

app.listen(PORT, () => {
    console.log(`Servidor a correr em http://localhost:${PORT}`);
});