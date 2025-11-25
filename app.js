require('dotenv').config();
const express = require('express');
const session = require('express-session');
const path = require('path');
const Database = require('better-sqlite3');
const bcrypt = require('bcrypt');

// --- ROTAS (Comentadas temporariamente até ajustarmos a lógica) ---
// const authRoutes = require('./routes/authRoutes');
// const userRoutes = require('./routes/userRoutes');
// const swipeRoutes = require('./routes/swipeRoutes');
// const watchlistRoutes = require('./routes/watchlistRoutes');
// const detailsRoutes = require('./routes/detailsRoutes');

const createAcRoutes = require('./routes/createAcRoutes'); 


const app = express();
const PORT = 3000;

app.use(express.json());
app.use(express.urlencoded({ extended: true }));

app.use(session({
    secret: 'flickcine-secret',
    resave: false,
    saveUninitialized: false
}));

app.use((req, res, next) => {
    if (typeof req.session.isLoggedIn === 'undefined') {
        req.session.isLoggedIn = false;
    }

    if (req.session.isLoggedIn) {
        res.locals.user = {
            id: 1,
            name: 'Teste',
            email: 'teste@flickcine.com',
            avatar: 'avatar1'
        };
    } else {
        res.locals.user = null;
    }
    next();
});

const requireLogin = (req, res, next) => {
    if (req.session.isLoggedIn) {
        next(); 
    } else {
        res.redirect('/login'); // passar isto para middleware assim que possivel.
    }
};

app.use(express.static(path.join(__dirname, 'public')));

app.use('/auth', createAcRoutes);

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'views'));


app.get('/', (req, res) => {
    res.render('landing');
});

app.get('/login', (req, res) => {
    res.render('login');
});

const dbPath = path.join(__dirname, 'db', 'flickcine.sqlite');
let db;
try {
    db = new Database(dbPath);
} catch (err) {
    console.error('Não foi possível abrir a base de dados:', err.message);
}

app.post('/login', async (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).render('login');
    }
    if (!db) return res.status(500).render('login');

    try {
        const row = db.prepare('SELECT * FROM Utilizador WHERE Email = ?').get(email);
        if (!row) {
            return res.status(401).render('login');
        }
        const match = await bcrypt.compare(password, row.Password_Hash);
        if (!match) return res.status(401).render('login');

        req.session.isLoggedIn = true;
        req.session.user = { id: row.Utilizador_ID, name: row.Name, email: row.Email, avatar: row.Avatar };
        res.redirect('/swipe');
    } catch (err) {
        console.error('Login error:', err);
        res.status(500).render('login');
    }
});

app.get('/register', (req, res) => {
    res.render('register');
});

app.get('/swipe', requireLogin, (req, res) => {
    res.render('swipe');
});

app.get('/profile', requireLogin, (req, res) => {
    const userID = req.session && req.session.user && req.session.user.id;
    if (!userID) {
        return res.status(401).redirect('/login');
    }

    try {
    const row = db.prepare('SELECT Utilizador_ID, Name, Email, Data_De_Nascimento, Género, Idade FROM Utilizador WHERE Utilizador_ID = ?').get(userID);
    if (!row) return res.status(404).send('Utilizador não encontrado');

    const user = {
        id: row.Utilizador_ID,
        Nome_de_Utilizador: row.Name,
        email: row.Email,
        dataDeNascimento: row.Data_De_Nascimento,
        genero: row.Género,
        idade: row.Idade
    };

    res.render('profile', { user });
    } catch (err) {
        console.error(err);
        res.status(500).send('Erro interno do servidor');
    }
});


app.get('/details/:id', (req, res) => {
    res.render('details', { 
        movieId: req.params.id,
        page: 'details' 
    });
});

app.get('/debug/toggle', (req, res) => {
    req.session.isLoggedIn = !req.session.isLoggedIn;
    const paginaAnterior = req.get('Referer') || '/';
    res.redirect(paginaAnterior);
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