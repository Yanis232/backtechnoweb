require('dotenv').config();
const express = require('express');
const mysql = require('mysql');
const cors = require('cors');

require('dotenv').config({ path: './info.env' }); // faites att ici à vos infos du fichier info.env


const app = express();
const PORT = process.env.PORT || 3000; 

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// connexion a la db "dbtechnoback" 
const db = mysql.createConnection({
    host: process.env.DB_HOST,
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
});

db.connect((err) => { // si erreur ici vérifiez le port - si votre db est correct -
    if (err) {
        console.error("Erreur de connexion à la database :", err);
        return;
    }
    console.log('Connection résussi à la DB de MySQL');
});

app.get('/', (req, res) => { // test serveur - voir console
    res.send('Le serveur node.js est fonctionnel');
});

// route POST pour crer un utilisateur
app.post('/register', (req, res) => {
    const { username, email, password } = req.body;

    if (!username || !email || !password) {
        return res.status(400).json({ message: "Les champs nom d'utilisateur, email, et mot de passe sont requis." });
    }

    const query = 'INSERT INTO users (username, email, password) VALUES (?, ?, ?)';

    db.query(query, [username, email, password], (err, result) => {
        if (err) {
            console.error("Erreur lors de l'ajout de l'utilisateur :", err);
            return res.status(500).json({ message: "Erreur lors de l'ajout de l'utilisateur" });
        }
        res.status(201).json({ message: 'Utilisateur créé avec succès' });
    });
});

// route POst pour la connexion
app.post('/login', (req, res) => {
    const { username, password } = req.body;

    if (!username || !password) {
        return res.status(400).json({ message: "Nom d'utilisateur et mot de passe requis." });
    }

    const query = 'SELECT * FROM users WHERE username = ?'; 
    db.query(query, [username], (err, results) => {
        if (err) {
            console.error("Erreur lors de la connexion :", err);
            return res.status(500).json({ message: 'Erreur lors de la connexion' });
        }

        if (results.length === 0 || results[0].password !== password) {
            return res.status(401).json({ message: "Nom d'utilisateur ou mot de passe incorrect." });
        }

        return res.json({ message: 'Connexion réussie!' });
    });
});


app.listen(PORT, () => { // mettre le listen apres les routes post
    console.log(`Serveur démarré sur le port ${PORT}`);
});
