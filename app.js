require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');

// --- ROTAS (Comentadas temporariamente até ajustarmos a lógica) ---
// const authRoutes = require('./routes/authRoutes');
// const userRoutes = require('./routes/userRoutes');
// const swipeRoutes = require('./routes/swipeRoutes');
// const watchlistRoutes = require('./routes/watchlistRoutes');
// const detailsRoutes = require('./routes/detailsRoutes');

const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'flickcine-secret',
    resave: false,
    saveUninitialized: false
}));

app.use(express.static(path.join(__dirname, 'public')));

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.get('/', (req, res) => {
    res.render('landing');
});

app.get('/login', (req, res) => {
    res.render('login');
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/swipe', (req, res) => {
    res.render('swipe');
});

app.get('/profile', (req, res) => {
    res.render('profile');
});

app.get('/aboutus', (req, res) => {
    res.render('aboutus');
});

// --- ROTAS DA API (Reativar estas linhas quando configurarmos os controllers) ---
// app.use('/auth', authRoutes);
// app.use('/user', userRoutes);
// app.use('/swipe', swipeRoutes);
// app.use('/watchlist', watchlistRoutes);
// app.use('/filme', detailsRoutes);

// Rota de Erro 404
app.use((req, res) => {
    res.status(404).send('Página não encontrada');
});

app.listen(PORT, () => {
    console.log(`Servidor a correr em http://localhost:${PORT}`);
});