const express = require('express')
const router = express.Router()
const bcrypt = require('bcrypt')
const Database = require('better-sqlite3')
const path = require('path')

const dbPath = path.resolve(__dirname, '../db/flickcine.sqlite')
const db = new Database(dbPath)

db.exec(`CREATE TABLE IF NOT EXISTS Utilizador (
	Utilizador_ID INTEGER PRIMARY KEY AUTOINCREMENT,
	Name TEXT,
	Email TEXT UNIQUE,
	Password_Hash TEXT,
	Data_De_Nascimento TEXT,
	Género TEXT,
	Idade INTEGER,
	Avatar BLOB,
	Swipes_Restantes INTEGER DEFAULT 10
);`)

function computeAgeFromDate(dateString) {
	const d = new Date(dateString)
	if (isNaN(d)) return null
	const today = new Date()
	let age = today.getFullYear() - d.getFullYear()
	const m = today.getMonth() - d.getMonth()
	if (m < 0 || (m === 0 && today.getDate() < d.getDate())) age--
	return age
}

router.post('/register', async (req, res) => {
	const name = req.body.name
	const email = req.body.email
	const password = req.body.password
	const confirmPassword = req.body['confirm-password']
	const dataDeNascimento = req.body.idade
	const genero = req.body.sexo

	if (!name || !email || !password || !confirmPassword || !dataDeNascimento || !genero) {
		return res.status(400).send('Todos os campos são obrigatórios.')
	}

	if (password !== confirmPassword) {
		return res.status(400).send('A palavra-passe e a confirmação não coincidem.')
	}

	try {
		const passwordHash = await bcrypt.hash(password, 10)
		const idadeComputed = computeAgeFromDate(dataDeNascimento)
		const insert = db.prepare(`INSERT INTO Utilizador (Name, Email, Password_Hash, Data_De_Nascimento, Género, Idade, Swipes_Restantes) VALUES (?, ?, ?, ?, ?, ?, ?)`)
		insert.run(name, email, passwordHash, dataDeNascimento, genero, idadeComputed, 10)
		return res.redirect('/register?registered=1')
	} catch (err) {
		if (err && err.code && err.code.includes('SQLITE_CONSTRAINT')) {
			return res.redirect('/register?error=duplicate')
		}
		console.error(err)
		return res.redirect('/register?error=server')
	}
})

module.exports = router