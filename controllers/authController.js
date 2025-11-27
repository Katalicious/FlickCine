const db = require('../db/db');
const bcrypt = require('bcrypt');

function computeAgeFromDate(dateString) {
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return null;
    const today = new Date();
    let age = today.getFullYear() - d.getFullYear();
    const m = today.getMonth() - d.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < d.getDate())) {
        age--;
    }
    return age;
}

exports.register = async (req, res) => {
    const { name, email, password, "confirm-password": confirmPassword, idade: dataNascimento, sexo } = req.body;

    if (!name || !email || !password || !dataNascimento) {
        return res.render('register', { error: 'Preenche todos os campos obrigatórios.' });
    }

    if (confirmPassword && password !== confirmPassword) {
        return res.render('register', { error: 'As palavras-passe não coincidem.' });
    }

    try {
        const userExists = db.prepare('SELECT Utilizador_ID FROM Utilizador WHERE Email = ?').get(email);
        if (userExists) {
            return res.render('register', { error: 'Este email já está registado.' });
        }

        const idadeCalculada = computeAgeFromDate(dataNascimento);
        const hashedPassword = await bcrypt.hash(password, 10);

        const insert = db.prepare(`
            INSERT INTO Utilizador (Name, Email, Password_Hash, Data_De_Nascimento, "Género", Idade, Swipes_Restantes, Avatar)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        insert.run(name, email, hashedPassword, dataNascimento, sexo, idadeCalculada, 10, null);

        res.redirect('/login?registered=1');

    } catch (err) {
        console.error("Erro no registo:", err);
        res.render('register', { error: 'Erro ao criar conta. Tenta novamente.' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = db.prepare('SELECT * FROM Utilizador WHERE Email = ?').get(email);

        if (!user || !(await bcrypt.compare(password, user.Password_Hash))) {
            return res.render('login', { error: 'Email ou password incorretos.' });
        }

        req.session.isLoggedIn = true;
        req.session.user = {
            id: user.Utilizador_ID,
            name: user.Name,
            email: user.Email,
            avatar: user.Avatar
        };

        res.redirect('/swipe');

    } catch (err) {
        console.error("Erro no login:", err);
        res.render('login', { error: 'Erro no servidor.' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(() => {
        res.redirect('/');
    });
};

exports.getProfile = (req, res) => {
    try {
        if (!req.session || !req.session.user) {
            return res.redirect('/login');
        }

        const userId = req.session.user.id;

        const user = db.prepare('SELECT * FROM Utilizador WHERE Utilizador_ID = ?').get(userId);
        
        if (!user) {
            return res.redirect('/logout');
        }
        const watchlist = db.prepare(`
            SELECT 
                f.tmbd_ID as id, 
                f.Titulo as title, 
                f.Capa as poster
            FROM Watchlist w
            JOIN Swipes s ON w.Swipe_ID = s.SWIPE_ID
            JOIN Filmes f ON s.tmbd_ID = f.tmbd_ID
            WHERE w.Utilizador_ID = ?
        `).all(userId);

        const userDisplay = {
            id: user.Utilizador_ID,
            Nome_de_Utilizador: user.Name,
            email: user.Email,
            dataDeNascimento: user.Data_De_Nascimento,
            genero: user["Género"],
            idade: user.Idade,
            avatar: user.Avatar
        };

        res.render('profile', { user: userDisplay, watchlist: watchlist });

    } catch (err) {
        console.error("ERRO CRÍTICO NO PERFIL:", err);
        res.status(500).send(`<h1>Erro ao carregar perfil</h1><p>${err.message}</p>`);
    }
};