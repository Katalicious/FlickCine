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
        const { sort, genre, start, end } = req.query;
        let sql = `
            SELECT f.*, 
                   w.Swipe_ID as SWIPE_ID,
                   f.Capa as poster,    -- Alias para garantir que o JS encontra
                   f.Titulo as title,   -- Alias para garantir que o JS encontra
                   f.tmbd_ID as id
            FROM Watchlist w
            JOIN Swipes s ON w.Swipe_ID = s.SWIPE_ID
            JOIN "Filmes/séries" f ON s.tmbd_ID = f.tmbd_ID
            WHERE w.Utilizador_ID = ?
        `;

        const params = [userId];

        if (genre && genre !== 'todos') {
            const mapGenres = {
                'acao': 'Ação', 'comedia': 'Comédia', 'drama': 'Drama',
                'terror': 'Terror', 'ficcao-cientifica': 'Ficção científica',
                'animacao': 'Animação', 'aventura': 'Aventura', 'familia': 'Família',
                'fantasia': 'Fantasia', 'historia': 'História', 'musica': 'Música',
                'misterio': 'Mistério', 'romance': 'Romance', 'thriller': 'Thriller',
                'guerra': 'Guerra', 'faroeste': 'Faroeste', 'crime': 'Crime',
                'documentario': 'Documentário'
            };
            const termo = mapGenres[genre] || genre; 
            sql += ` AND f.Generos LIKE ?`;
            params.push(`%${termo}%`);
        }

        if (start) {
            sql += ` AND "Data_de_Lançamento" >= ?`; 
            params.push(start);
        }
        if (end) {
            sql += ` AND "Data_de_Lançamento" <= ?`;
            params.push(end);
        }

        switch (sort) {
            case 'titulo-asc': sql += ` ORDER BY f.Titulo ASC`; break;
            case 'titulo-desc': sql += ` ORDER BY f.Titulo DESC`; break;
            case 'recente-antigo': sql += ` ORDER BY "Data_de_Lançamento" DESC`; break;
            case 'antigo-recente': sql += ` ORDER BY "Data_de_Lançamento" ASC`; break;
            case 'data-adicao':
            default: sql += ` ORDER BY w.Swipe_ID DESC`; break;
        }

        const user = db.prepare('SELECT * FROM Utilizador WHERE Utilizador_ID = ?').get(userId);
        const watchlist = db.prepare(sql).all(...params);

        const userDisplay = {
            id: user.Utilizador_ID,
            Nome_de_Utilizador: user.Name,
            email: user.Email,
            idade: user.Idade,
            avatarUrl: `/avatars/${user.Utilizador_ID}` 
        };

        res.render('profile', { user: userDisplay, watchlist: watchlist });

    } catch (err) {
        console.error("Erro no perfil:", err);

        if (err.message.includes('no such column')) {
             console.log("Tentando carregar perfil sem filtros de data devido a erro de colunas...");
             try {
                const fallbackSql = `
                    SELECT f.*, w.Swipe_ID, f.Capa as poster, f.Titulo as title, f.tmbd_ID as id
                    FROM Watchlist w
                    JOIN Swipes s ON w.Swipe_ID = s.SWIPE_ID
                    JOIN "Filmes/séries" f ON s.tmbd_ID = f.tmbd_ID
                    WHERE w.Utilizador_ID = ?
                    ORDER BY w.Swipe_ID DESC
                `;
                const fallbackList = db.prepare(fallbackSql).all(userId);
                const user = db.prepare('SELECT * FROM Utilizador WHERE Utilizador_ID = ?').get(userId);
                
                return res.render('profile', { 
                    user: { ...user, Nome_de_Utilizador: user.Name, avatarUrl: `/avatars/${user.Utilizador_ID}` }, 
                    watchlist: fallbackList 
                });
             } catch (e2) {
                 console.error("Erro fatal:", e2);
             }
        }
        res.status(500).send("Erro ao carregar perfil: " + err.message);
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
            res.redirect('/images/default-avatar.svg'); 
        }
    } catch (err) {
        console.error(err);
        res.status(404).send('Avatar não encontrado');
    }
};

exports.updateAvatar = async (req, res) => {
    try {
        const userId = req.session.user.id;
        let seed;
        if (req.body && req.body.avatarId) {
            const m = String(req.body.avatarId).match(/avatar_(\d+)/);
            if (m) seed = parseInt(m[1], 10) * 99;
        }
        if (!seed) seed = Math.floor(Math.random() * 100000);
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
exports.updatePassword = async (req, res) => {
    try {
        const { currentPassword, newPassword, confirmPassword } = req.body;
        const userId = req.session.user.id;
        
        if (!currentPassword || !newPassword || !confirmPassword) {
            return res.redirect('/profile?error=empty_fields');
        }

        if (newPassword !== confirmPassword) {
            return res.redirect('/profile?error=mismatch');
        }

        const user = db.prepare('SELECT Password_Hash FROM Utilizador WHERE Utilizador_ID = ?').get(userId);

        if (!user) return res.redirect('/logout');

        const match = await bcrypt.compare(currentPassword, user.Password_Hash);
        if (!match) {
            return res.redirect('/profile?error=wrong_current');
        }

        const newHashedPassword = await bcrypt.hash(newPassword, 10);

        const update = db.prepare('UPDATE Utilizador SET Password_Hash = ? WHERE Utilizador_ID = ?');
        update.run(newHashedPassword, userId);

        console.log(`Password alterada para o utilizador ${userId}`);
        res.redirect('/profile?success=password_updated');

    } catch (err) {
        console.error("Erro ao mudar password:", err);
        res.redirect('/profile?error=server');
    }
};