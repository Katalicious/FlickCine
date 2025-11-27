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
        return res.render('register', { error: 'Preenche todos os campos.' });
    }

    if (confirmPassword && password !== confirmPassword) {
        return res.render('register', { error: 'Passwords não coincidem.' });
    }

    try {
        const userExists = db.prepare('SELECT Utilizador_ID FROM Utilizador WHERE Email = ?').get(email);
        if (userExists) {
            return res.render('register', { error: 'Email já registado.' });
        }

        const idadeCalculada = computeAgeFromDate(dataNascimento);
        const hashedPassword = await bcrypt.hash(password, 10);

        let avatarBuffer = null;
        try {
            const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(email)}&backgroundColor=transparent`;
            const response = await fetch(avatarUrl);
            if (response.ok) {
                const arrayBuf = await response.arrayBuffer();
                avatarBuffer = Buffer.from(arrayBuf);
            }
        } catch (e) {
            console.error("Erro ao gerar avatar:", e);
        }

        const insert = db.prepare(`
            INSERT INTO Utilizador (Name, Email, Password_Hash, Data_De_Nascimento, "Género", Idade, Swipes_Restantes, Avatar)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `);
        
        insert.run(name, email, hashedPassword, dataNascimento, sexo, idadeCalculada, 10, avatarBuffer);

        res.redirect('/login?registered=1');

    } catch (err) {
        console.error("Erro no registo:", err);
        res.render('register', { error: 'Erro ao criar conta.' });
    }
};

exports.login = async (req, res) => {
    const { email, password } = req.body;

    try {
        const user = db.prepare('SELECT * FROM Utilizador WHERE Email = ?').get(email);

        if (!user || !(await bcrypt.compare(password, user.Password_Hash))) {
            return res.render('login', { error: 'Dados incorretos.' });
        }

        req.session.isLoggedIn = true;
        req.session.user = {
            id: user.Utilizador_ID,
            name: user.Name,
            email: user.Email
        };

        res.redirect('/swipe');

    } catch (err) {
        console.error(err);
        res.render('login', { error: 'Erro no servidor.' });
    }
};

exports.logout = (req, res) => {
    req.session.destroy(() => res.redirect('/'));
};

exports.getProfile = (req, res) => {
    try {
        if (!req.session.user) return res.redirect('/login');
        const userId = req.session.user.id;
        
        const user = db.prepare('SELECT * FROM Utilizador WHERE Utilizador_ID = ?').get(userId);

        const watchlist = db.prepare(`
            SELECT f.tmbd_ID as id, f.Titulo as title, f.Capa as poster
            FROM Watchlist w
            JOIN Swipes s ON w.Swipe_ID = s.SWIPE_ID
            JOIN Filmes f ON s.tmbd_ID = f.tmbd_ID
            WHERE w.Utilizador_ID = ?
        `).all(userId);

        const userDisplay = {
            id: user.Utilizador_ID,
            Nome_de_Utilizador: user.Name,
            email: user.Email,
            idade: user.Idade,
            avatarUrl: `/auth/avatar/${user.Utilizador_ID}` 
        };

        res.render('profile', { user: userDisplay, watchlist: watchlist });
    } catch (err) {
        console.error(err);
        res.status(500).send("Erro no perfil");
    }
};

exports.getAvatarImage = (req, res) => {
    const userId = req.params.id;
    try {
        const user = db.prepare('SELECT Avatar FROM Utilizador WHERE Utilizador_ID = ?').get(userId);
        
        if (user && user.Avatar) {
            res.setHeader('Content-Type', 'image/svg+xml');
            res.send(user.Avatar);
        } else {
            res.redirect('/img/avatar_placeholder.png'); 
        }
    } catch (err) {
        console.error(err);
        res.status(404).send('Avatar não encontrado');
    }
};

exports.updateAvatar = async (req, res) => {
    try {
        const userId = req.session.user.id;
        const seed = Math.floor(Math.random() * 100000); 
        const avatarUrl = `https://api.dicebear.com/7.x/avataaars/svg?seed=${seed}&backgroundColor=transparent`;

        const response = await fetch(avatarUrl);
        if (!response.ok) throw new Error('Falha ao gerar avatar');

        const arrayBuf = await response.arrayBuffer();
        const avatarBuffer = Buffer.from(arrayBuf);

        const update = db.prepare('UPDATE Utilizador SET Avatar = ? WHERE Utilizador_ID = ?');
        update.run(avatarBuffer, userId);

        res.redirect('/profile?updated=1');

    } catch (err) {
        console.error("Erro update avatar:", err);
        res.redirect('/profile?error=1');
    }
};